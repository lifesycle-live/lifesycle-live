import { FastifyInstance, FastifyRequest } from "fastify";
import { AppDataSource } from "../data-source.js";
import { PlatformConnection } from "../entities/PlatformConnection.js";
import { requireAuth } from "../requireAuth.js";
import { getOAuthProvider, listOAuthPlatforms } from "../oauth/registry.js";
import { env, isConfigured } from "../env.js";

function agentIdOf(request: FastifyRequest): string {
  return (request as FastifyRequest & { agentId: string }).agentId;
}

/**
 * Read/manage an agent's connected accounts. The actual "connect" OAuth
 * flow (per platform) lives in `routes/oauth.ts` — this file only lists and
 * disconnects the PlatformConnection rows it produces.
 */
export async function platformConnectionRoutes(app: FastifyInstance): Promise<void> {
  const connections = AppDataSource.getRepository(PlatformConnection);
  app.get("/platform-connections/availability", { preHandler: requireAuth }, async () => [
    ...listOAuthPlatforms().map(platform => ({ platform, configured: getOAuthProvider(platform)!.configured(), note: platform === "facebook" ? "Page connection; live video and comments require approved Page permissions." : platform === "zoom" ? "Account connection available; meeting broadcast and chat are not integrated." : "Account connection available; live broadcast and comments are not integrated." })),
    { platform: "youtube", configured: isConfigured(env.youtube.clientId, env.youtube.clientSecret, env.youtube.refreshToken), note: "Uses the channel configured on the server." },
  ]);

  app.get("/platform-connections", { preHandler: requireAuth }, async (request) => {
    const rows = await connections.find({ where: { agentId: agentIdOf(request) } });
    // accessToken/refreshToken are deliberately never sent to the client.
    return rows.map((c) => ({
      platform: c.platform,
      externalAccountName: c.externalAccountName,
      connectedAt: c.createdAt.toISOString(),
    }));
  });

  app.delete<{ Params: { platform: string } }>(
    "/platform-connections/:platform",
    { preHandler: requireAuth },
    async (request, reply) => {
      await connections.delete({ agentId: agentIdOf(request), platform: request.params.platform });
      return reply.code(204).send();
    },
  );
}
