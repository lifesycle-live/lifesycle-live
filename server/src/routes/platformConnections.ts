import { FastifyInstance, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../data-source.js";
import { PlatformConnection } from "../entities/PlatformConnection.js";
import { requireAuth } from "../requireAuth.js";
import { env } from "../env.js";
import {
  buildFacebookAuthUrl,
  exchangeCodeForUserToken,
  exchangeForLongLivedUserToken,
  facebookOAuthConfigured,
  fetchManagedPages,
} from "../services/facebookOAuth.js";

function agentIdOf(request: FastifyRequest): string {
  return (request as FastifyRequest & { agentId: string }).agentId;
}

interface OAuthState {
  agentId: string;
}

// Generous enough to cover an agent slowly picking through the Facebook
// consent screen, short enough that a leaked/replayed state token is useless
// within minutes.
const OAUTH_STATE_TTL_SECONDS = 60 * 10;

function facebookCallbackDeepLink(status: "success" | "error", message?: string): string {
  const params = new URLSearchParams({ platform: "facebook", status });
  if (message) params.set("message", message);
  return `${env.appScheme}://connect-callback?${params.toString()}`;
}

/**
 * Per-agent "connect your accounts" flow. Each agent has their own
 * PlatformConnection row per platform (Facebook Page id/token, eventually
 * YouTube channel/refresh token, ...) instead of the app sharing one
 * hardcoded credential from .env — see FACEBOOK_PAGE_ACCESS_TOKEN's comment
 * in .env.example for why that var is dev-only.
 */
export async function platformConnectionRoutes(app: FastifyInstance): Promise<void> {
  const connections = AppDataSource.getRepository(PlatformConnection);

  app.get("/platform-connections", { preHandler: requireAuth }, async (request) => {
    const rows = await connections.find({ where: { agentId: agentIdOf(request) } });
    // accessToken is deliberately never sent to the client.
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

  app.get("/auth/facebook/start", { preHandler: requireAuth }, async (request, reply) => {
    if (!facebookOAuthConfigured()) {
      return reply.code(422).send({
        error: "Facebook is not configured on the server yet. Add FACEBOOK_APP_ID/FACEBOOK_APP_SECRET to server/.env.",
      });
    }
    const state = jwt.sign({ agentId: agentIdOf(request) } satisfies OAuthState, env.jwtSecret, {
      expiresIn: OAUTH_STATE_TTL_SECONDS,
    });
    return { authUrl: buildFacebookAuthUrl(state) };
  });

  // Facebook redirects the agent's browser here directly — there's no bearer
  // token on this request, which is exactly what `state` (a signed JWT) is
  // for: it's how we recover which agent started the flow.
  app.get<{ Querystring: { code?: string; state?: string; error?: string } }>(
    "/auth/facebook/callback",
    async (request, reply) => {
      const { code, state, error } = request.query;

      if (error || !code || !state) {
        return reply.redirect(facebookCallbackDeepLink("error", error ?? "missing_code"));
      }

      let agentId: string;
      try {
        agentId = (jwt.verify(state, env.jwtSecret) as OAuthState).agentId;
      } catch {
        return reply.redirect(facebookCallbackDeepLink("error", "invalid_or_expired_state"));
      }

      try {
        const shortLivedToken = await exchangeCodeForUserToken(code);
        const userToken = await exchangeForLongLivedUserToken(shortLivedToken);
        const pages = await fetchManagedPages(userToken);

        if (pages.length === 0) {
          return reply.redirect(facebookCallbackDeepLink("error", "no_managed_pages"));
        }

        // MVP: auto-connect the first Page this agent manages. An agent
        // managing multiple Pages can only get the first one this way until
        // a page-picker step is added in front of this save.
        const page = pages[0];
        const existing = await connections.findOne({ where: { agentId, platform: "facebook" } });

        await connections.save(
          connections.create({
            ...(existing ? { id: existing.id } : {}),
            agentId,
            platform: "facebook",
            accessToken: page.access_token,
            externalAccountId: page.id,
            externalAccountName: page.name,
          }),
        );

        return reply.redirect(facebookCallbackDeepLink("success"));
      } catch (err) {
        request.log.error({ err }, "Facebook OAuth callback failed");
        return reply.redirect(facebookCallbackDeepLink("error", "token_exchange_failed"));
      }
    },
  );
}
