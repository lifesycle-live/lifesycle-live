import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AppDataSource } from '../data-source.js';
import { Broadcast } from '../entities/Broadcast.js';
import { requireAuth } from '../requireAuth.js';
import { startIngestion } from '../services/ingestionService.js';
import { assertIngestTarget, pushRelay, relayOwner, relayStatus, startRelay, stopAllRelays, stopRelay } from '../services/videoRelay.js';

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
  rtmpUrl: z.string().min(1).max(500).refine((value) => /^rtmps?:\/\//i.test(value.trim()), {
    message: 'The server URL should start with rtmp:// or rtmps://. Copy it from the platform\'s stream setup.',
  }),
  // Both platforms show the URL and the key next to each other and the two
  // get swapped; pasting the URL into the key built a target the encoder
  // could not publish to, and the only sign of it was the connection
  // repeatedly dropping (observed 2026-09-30).
  streamKey: z.string().min(1).max(500).refine((value) => !/^rtmps?:\/\//i.test(value.trim()) && !value.includes('://'), {
    message: 'That is the server URL, not the stream key. The key is the second field on the platform, with no rtmp:// in front of it.',
  }),
});

const chunkSchema = z.object({
  sessionId: z.string().uuid(),
  sequence: z.number().int().nonnegative(),
  data: z.string().min(1).max(2800000).regex(/^[A-Za-z0-9+/]+={0,2}$/),
});

function ingestTarget(ingest: { rtmpUrl: string; streamKey: string }): string {
  return `${ingest.rtmpUrl.trim().replace(/\/$/, '')}/${ingest.streamKey.trim()}`;
}

export async function videoRelayRoutes(app: FastifyInstance) {
  const repository = AppDataSource.getRepository(Broadcast);
  app.addHook('onClose', async () => stopAllRelays());
  app.post<{ Params: { id: string; action: string } }>('/broadcasts/:id/video/:action', { preHandler: requireAuth, bodyLimit: 3 * 1024 * 1024 }, async (request, reply) => {
    const agentId = (request as FastifyRequest & { agentId: string }).agentId;
    try {
      if (request.params.action === 'chunk') {
        const body = chunkSchema.parse(request.body);
        // Authorised against the running relay rather than the database. The
        // lookup every other action does is a round trip to Supabase, which
        // measured 285ms on average and spiked past two seconds (2026-09-30)
        // — on a request that arrives every 500ms, so it ate more than half
        // the budget and its spikes stalled the browser's serial upload. A
        // stall is never recovered, which is what left the stream tens of
        // seconds behind. The relay only exists between start and stop, and
        // ending a broadcast stops it, so this is not a weaker check.
        const owner = relayOwner(request.params.id);
        if (owner !== undefined && owner !== agentId) return reply.code(404).send({ error: 'Broadcast not found' });
        await pushRelay(request.params.id, body.sessionId, body.sequence, Buffer.from(body.data, 'base64'));
        return { ok: true };
      }
      const broadcast = await repository.findOneBy({ id: request.params.id, agentId });
      if (!broadcast) return reply.code(404).send({ error: 'Broadcast not found' });
      if (request.params.action === 'stop') { stopRelay(broadcast.id); return { ok: true }; }
      // Answered even once the broadcast has ended, so the dashboard can still
      // say which destination dropped and why.
      if (request.params.action === 'health') return relayStatus(broadcast.id);
      if (broadcast.status !== 'live') return reply.code(409).send({ error: 'This broadcast is no longer active.' });
      if (request.params.action === 'target') {
        const body = manualTargetSchema.parse(request.body);
        // Reject an unusable destination here rather than at start, so the
        // agent finds out while they still have the platform's page open.
        assertIngestTarget(ingestTarget(body));
        const ingest = JSON.parse(broadcast.ingest || '{}');
        ingest[body.platform] = { rtmpUrl: body.rtmpUrl.trim(), streamKey: body.streamKey.trim() };
        broadcast.ingest = JSON.stringify(ingest);
        await repository.save(broadcast);
        // The key itself is never echoed back.
        return { ok: true, platform: body.platform };
      }
      if (request.params.action === 'start') {
        const platforms = z.array(z.string().regex(/^[a-z]{2,20}$/)).min(1).catch(['youtube'])
          .parse((request.body as { platforms?: string[] } | undefined)?.platforms);
        const ingest = JSON.parse(broadcast.ingest || '{}');
        const missing = platforms.filter((platform) => !ingest[platform]?.rtmpUrl || !ingest[platform]?.streamKey);
        if (missing.length) return reply.code(422).send({ error: `This broadcast has no ingest connection for ${missing.join(', ')}.` });
        const sessionId = await startRelay(broadcast.id, agentId, platforms.map((platform) => ({ platform, target: ingestTarget(ingest[platform]) })));
        startIngestion(broadcast, app.log);
        return { sessionId };
      }
      return reply.code(404).send({ error: 'Unknown video action' });
    } catch (error) {
      // A ZodError's message is the whole issue list as JSON, which was being
      // shown to the agent verbatim. They only need the first thing to fix.
      if (error instanceof z.ZodError) return reply.code(422).send({ error: error.issues[0]?.message ?? 'That input is not valid.' });
      return reply.code(422).send({ error: error instanceof Error ? error.message : 'Video relay failed' });
    }
  });
}
