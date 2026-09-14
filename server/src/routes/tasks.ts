import { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { Brackets } from "typeorm";
import { AppDataSource } from "../data-source.js";
import { Task } from "../entities/Task.js";
import { Broadcast } from "../entities/Broadcast.js";
import { requireAuth } from "../requireAuth.js";
import { serializeTask } from "../serialize.js";
import { aiService } from "../services/aiService.js";
import { env } from "../env.js";

const taskSchema = z.object({ title: z.string().trim().min(1).max(1000), description: z.string().trim().max(10000).optional(), broadcastId: z.string().uuid().optional() });
const agentIdOf = (request: FastifyRequest) => (request as FastifyRequest & { agentId: string }).agentId;
export async function taskRoutes(app: FastifyInstance): Promise<void> {
  const tasks = AppDataSource.getRepository(Task);
  // Legacy broadcast tasks inherit their broadcast's owner. Unowned legacy
  // tasks are not exposed to every signed-in agent.
  const owned = (agentId: string) => tasks.createQueryBuilder('task').leftJoin('task.broadcast', 'broadcast').where(new Brackets(q => q.where('task.agentId = :agentId', { agentId }).orWhere('task.agentId IS NULL AND broadcast.agentId = :agentId', { agentId })));
  app.get('/ai/status', { preHandler: requireAuth }, async () => ({ provider: env.ai.provider || 'rules', configured: env.ai.provider === 'groq' && !!env.ai.groqApiKey, taskDrafting: env.ai.provider === 'groq' && !!env.ai.groqApiKey, model: env.ai.provider === 'groq' ? env.ai.groqModel : undefined }));
  app.post('/tasks/draft', { preHandler: requireAuth }, async (request, reply) => {
    const body = z.object({ context: z.string().trim().min(3).max(6000) }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: 'Enter a comment or task notes (3–6000 characters).' });
    try { return await aiService.generateTask(body.data.context); }
    catch (error) { return reply.code(503).send({ error: error instanceof Error ? error.message : 'AI drafting failed' }); }
  });
  app.get('/tasks', { preHandler: requireAuth }, async request => (await owned(agentIdOf(request)).orderBy('task.dueAt', 'ASC').getMany()).map(serializeTask));
  app.post('/tasks', { preHandler: requireAuth }, async (request, reply) => {
    const body = taskSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: 'A title is required; description must be at most 10000 characters.' });
    const agentId = agentIdOf(request);
    if (body.data.broadcastId && !await AppDataSource.getRepository(Broadcast).findOneBy({ id: body.data.broadcastId, agentId })) return reply.code(404).send({ error: 'Broadcast not found' });
    return reply.code(201).send(serializeTask(await tasks.save(tasks.create({ ...body.data, agentId, done: false }))));
  });
  app.patch<{ Params: { id: string } }>('/tasks/:id', { preHandler: requireAuth }, async (request, reply) => {
    const body = z.object({ done: z.boolean() }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: 'Expected { done: boolean }' });
    const existing = await owned(agentIdOf(request)).andWhere('task.id = :id', { id: request.params.id }).getOne();
    if (!existing) return reply.code(404).send({ error: 'Task not found' });
    existing.done = body.data.done;
    return serializeTask(await tasks.save(existing));
  });
}
