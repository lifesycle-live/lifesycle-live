import { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { AppDataSource } from "../data-source.js";
import { Broadcast } from "../entities/Broadcast.js";
import { Property } from "../entities/Property.js";
import { EngagementEvent } from "../entities/EngagementEvent.js";
import { Lead } from "../entities/Lead.js";
import { requireAuth } from "../requireAuth.js";
import { getAdapter } from "../adapters/registry.js";
import { PlatformId } from "../adapters/types.js";
import { serializeBroadcast, serializeBroadcastSummary } from "../serialize.js";
import { startIngestion, stopIngestion } from "../services/ingestionService.js";

const startBroadcastSchema = z.object({
  propertyId: z.string().min(1),
  platforms: z.array(z.string()).min(1),
});

function agentIdOf(request: FastifyRequest): string {
  return (request as FastifyRequest & { agentId: string }).agentId;
}

export async function broadcastRoutes(app: FastifyInstance): Promise<void> {
  const broadcasts = AppDataSource.getRepository(Broadcast);
  const properties = AppDataSource.getRepository(Property);
  const engagementEvents = AppDataSource.getRepository(EngagementEvent);
  const leads = AppDataSource.getRepository(Lead);

  app.post("/broadcasts", { preHandler: requireAuth }, async (request, reply) => {
    const body = startBroadcastSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid propertyId/platforms payload" });

    const property = await properties.findOne({ where: { id: body.data.propertyId } });
    if (!property) return reply.code(404).send({ error: "Property not found" });

    const platforms = body.data.platforms as PlatformId[];
    let broadcast = broadcasts.create({
      propertyId: property.id,
      property,
      agentId: agentIdOf(request),
      status: "scheduled",
      platforms: JSON.stringify(platforms),
      peakViewers: 0,
    });
    broadcast = await broadcasts.save(broadcast);

    const ingest: Record<string, { rtmpUrl: string; streamKey: string }> = {};
    const failures: string[] = [];

    for (const platform of platforms) {
      const adapter = getAdapter(platform);
      if (!adapter) {
        failures.push(`${platform}: no adapter implemented (assisted-only platform, per docs/04-technical-feasibility.md)`);
        continue;
      }
      try {
        ingest[platform] = await adapter.publish(broadcast.id);
      } catch (err) {
        failures.push(err instanceof Error ? err.message : String(err));
      }
    }

    if (failures.length > 0) {
      broadcast.status = "failed";
      await broadcasts.save(broadcast);
      return reply.code(422).send({
        error: "Could not start broadcast on all selected platforms",
        details: failures,
      });
    }

    broadcast.status = "live";
    broadcast.startedAt = new Date();
    broadcast.ingest = JSON.stringify(ingest);
    await broadcasts.save(broadcast);

    startIngestion(broadcast, app.log);

    return serializeBroadcast(broadcast);
  });

  app.post<{ Params: { id: string } }>("/broadcasts/:id/end", { preHandler: requireAuth }, async (request, reply) => {
    const broadcast = await broadcasts.findOne({ where: { id: request.params.id }, relations: ["property"] });
    if (!broadcast) return reply.code(404).send({ error: "Broadcast not found" });

    const platforms = JSON.parse(broadcast.platforms) as PlatformId[];
    for (const platform of platforms) {
      const adapter = getAdapter(platform);
      if (adapter?.configured) {
        await adapter.end(broadcast.id).catch(() => undefined);
      }
    }

    broadcast.status = "ended";
    broadcast.endedAt = new Date();
    await broadcasts.save(broadcast);

    stopIngestion(broadcast.id, app.log);

    return serializeBroadcast(broadcast);
  });

  app.get<{ Params: { id: string } }>("/broadcasts/:id/summary", { preHandler: requireAuth }, async (request, reply) => {
    const broadcast = await broadcasts.findOne({ where: { id: request.params.id }, relations: ["property"] });
    if (!broadcast) return reply.code(404).send({ error: "Broadcast not found" });

    const [commentCount, leadsCreated] = await Promise.all([
      engagementEvents.count({ where: { broadcastId: broadcast.id } }),
      leads.count({ where: { broadcastId: broadcast.id } }),
    ]);

    // Highlight clip generation depends on a working transcript/recording
    // pipeline (docs/13-feature-prioritization.md, V2) — genuinely empty
    // until that's built, rather than a fabricated placeholder list.
    return serializeBroadcastSummary(broadcast, commentCount, leadsCreated, []);
  });
}
