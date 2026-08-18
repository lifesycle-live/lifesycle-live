import { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppDataSource } from "../data-source.js";
import { Task } from "../entities/Task.js";
import { requireAuth } from "../requireAuth.js";
import { serializeTask } from "../serialize.js";

const patchTaskSchema = z.object({ done: z.boolean() });

export async function taskRoutes(app: FastifyInstance): Promise<void> {
  const tasks = AppDataSource.getRepository(Task);

  app.get("/tasks", { preHandler: requireAuth }, async () => {
    const rows = await tasks.find({ order: { dueAt: "ASC" } });
    return rows.map(serializeTask);
  });

  app.patch<{ Params: { id: string } }>("/tasks/:id", { preHandler: requireAuth }, async (request, reply) => {
    const body = patchTaskSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid payload, expected { done: boolean }" });

    const existing = await tasks.findOne({ where: { id: request.params.id } });
    if (!existing) return reply.code(404).send({ error: "Task not found" });

    existing.done = body.data.done;
    await tasks.save(existing);
    return serializeTask(existing);
  });
}
