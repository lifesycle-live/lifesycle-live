import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AppDataSource } from '../data-source.js';
import { Broadcast } from '../entities/Broadcast.js';
import { requireAuth } from '../requireAuth.js';
import { startIngestion } from '../services/ingestionService.js';
import { assertIngestTarget, pushRelay, startRelay, stopAllRelays, stopRelay } from '../services/videoRelay.js';

/**
 * A destination the agent pasted in by hand. Instagram (and TikTok/LinkedIn)
 * expose no API to create a broadcast, but their own web tools hand out an
 * RTMP URL and a stream key the agent can copy — see
 * docs/04-technical-feasibility.md. Saving one here lets the existing relay
 * publish to it; the key is per-broadcast on Instagram's side, so this is
 * pasted again for each broadcast rather than stored on the account.
 */
const manualTargetSchema = z.object({
  platform: z.string().regex(/^[a-z]{2,20}$/),
  rtmpUrl: z.string().min(1).max(500),
  streamKey: z.string().min(1).max(500),
});

function ingestTarget(ingest: { rtmpUrl: string; streamKey: string }): string {
  return `${ingest.rtmpUrl.replace(/\/$/, '')}/${ingest.streamKey}`;
}

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
      if (request.params.action === 'target') {
        const body = manualTargetSchema.parse(request.body);
        // Reject an unusable destination here rather than at start, so the
        // agent finds out while they still have the platform's page open.
        assertIngestTarget(ingestTarget(body));
        const ingest = JSON.parse(broadcast.ingest || '{}');
        ingest[body.platform] = { rtmpUrl: body.rtmpUrl, streamKey: body.streamKey };
        broadcast.ingest = JSON.stringify(ingest);
        await repository.save(broadcast);
        // The key itself is never echoed back.
        return { ok: true, platform: body.platform };
      }
      if (request.params.action === 'start') {
        const platform = z.string().regex(/^[a-z]{2,20}$/).catch('youtube').parse((request.body as { platform?: string } | undefined)?.platform);
        const ingest = JSON.parse(broadcast.ingest || '{}')[platform];
        if (!ingest?.rtmpUrl || !ingest?.streamKey) return reply.code(422).send({ error: `This broadcast has no ${platform} ingest connection.` });
        const sessionId = await startRelay(broadcast.id, ingestTarget(ingest), platform);
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
