import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AppDataSource } from '../data-source.js';
import { Broadcast } from '../entities/Broadcast.js';
import { requireAuth } from '../requireAuth.js';
import { startIngestion } from '../services/ingestionService.js';
import { pushRelay, startRelay, stopAllRelays, stopRelay } from '../services/videoRelay.js';

export async function videoRelayRoutes(app: FastifyInstance) {
  const repository = AppDataSource.getRepository(Broadcast);
  app.addHook('onClose', async () => stopAllRelays());
  app.post<{ Params: { id: string; action: string } }>('/broadcasts/:id/video/:action', { preHandler: requireAuth, bodyLimit: 3 * 1024 * 1024 }, async (request, reply) => {
    const agentId = (request as FastifyRequest & { agentId: string }).agentId;
    const broadcast = await repository.findOneBy({ id: request.params.id, agentId });
    if (!broadcast) return reply.code(404).send({ error: 'Broadcast not found' });
    try {
      if (request.params.action === 'stop') { stopRelay(broadcast.id); return { ok: true }; }
      if (broadcast.status !== 'live') return reply.code(409).send({ error: 'This broadcast is no longer active.' });
      if (request.params.action === 'start') {
        const ingest = JSON.parse(broadcast.ingest || '{}').youtube;
        if (!ingest?.rtmpUrl || !ingest?.streamKey) return reply.code(422).send({ error: 'This broadcast has no YouTube ingest connection.' });
        const sessionId = await startRelay(broadcast.id, `${ingest.rtmpUrl.replace(/\/$/, '')}/${ingest.streamKey}`);
        startIngestion(broadcast, app.log);
        return { sessionId };
      }
      if (request.params.action === 'chunk') {
        const body = z.object({ sessionId: z.string().uuid(), sequence: z.number().int().nonnegative(), data: z.string().min(1).max(2800000).regex(/^[A-Za-z0-9+/]+={0,2}$/) }).parse(request.body);
        await pushRelay(broadcast.id, body.sessionId, body.sequence, Buffer.from(body.data, 'base64'));
        return { ok: true };
      }
      return reply.code(404).send({ error: 'Unknown video action' });
    } catch (error) { return reply.code(422).send({ error: error instanceof Error ? error.message : 'Video relay failed' }); }
  });
}
