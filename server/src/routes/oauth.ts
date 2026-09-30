import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { randomBytes, createHash } from "node:crypto";
import { AppDataSource } from "../data-source.js";
import { PlatformConnection } from "../entities/PlatformConnection.js";
import { requireAuth } from "../requireAuth.js";
import { env } from "../env.js";
import { getOAuthProvider } from "../oauth/registry.js";

function agentIdOf(request: FastifyRequest): string {
  return (request as FastifyRequest & { agentId: string }).agentId;
}
interface Session {
  agentId: string; platform: string; verifier: string; expires: number; web: boolean;
  status: "pending" | "processing" | "success" | "error"; message?: string;
}
// Single-process scaffold: restarting the server expires pending consent flows.
// Use a shared expiring store before running multiple server instances.
export async function oauthRoutes(app: FastifyInstance): Promise<void> {
  const connections = AppDataSource.getRepository(PlatformConnection);
  const sessions = new Map<string, Session>();
  const sweep = setInterval(() => { for (const [id, session] of sessions) if (session.expires <= Date.now()) sessions.delete(id); }, 60000);
  sweep.unref();
  app.addHook("onClose", async () => { clearInterval(sweep); sessions.clear(); });

  function finish(reply: FastifyReply, session: Session) {
    reply.header("Cache-Control", "no-store").header("Referrer-Policy", "no-referrer");
    if (session.web) return reply.type("text/html").send('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lifesycle connection</title></head><body style="font-family:system-ui;background:#fff8fa;color:#362832;padding:40px;text-align:center"><h1>Return to Lifesycle Live</h1><p>Your connection result is available in the app. You can close this window.</p></body></html>');
    const params = new URLSearchParams({ platform: session.platform, status: session.status });
    if (session.message) params.set("message", session.message);
    return reply.redirect(`${env.appConnectRedirectUrl}?${params}`);
  }
  if (env.tiktok.domainVerificationFilename && /^tiktok[\w-]+\.txt$/.test(env.tiktok.domainVerificationFilename)) {
    app.get(`/${env.tiktok.domainVerificationFilename}`, async (_request, reply) => reply.type("text/plain").send(env.tiktok.domainVerification));
  }
  app.get<{ Params: { platform: string }; Querystring: { client?: string } }>("/auth/:platform/start", { preHandler: requireAuth }, async (request, reply) => {
    const { platform } = request.params;
    const provider = getOAuthProvider(platform);
    if (!provider) return reply.code(404).send({ error: "No account connection flow for this platform." });
    if (!provider.configured()) return reply.code(422).send({ error: `${platform}: application credentials are missing. Configure server/.env using .env.example.` });
    const agentId = agentIdOf(request);
    // Bound active sessions and discard this agent's previous attempt on this platform.
    for (const [id, session] of sessions) if (session.expires <= Date.now() || (session.agentId === agentId && session.platform === platform)) sessions.delete(id);
    if (sessions.size >= 10000) return reply.code(503).send({ error: "Too many pending connections. Try again shortly." });
    const state = randomBytes(32).toString("base64url");
    const verifier = randomBytes(32).toString("base64url");
    sessions.set(state, { agentId, platform, verifier, expires: Date.now() + 600000, web: request.query.client === "web", status: "pending" });
    reply.header("Cache-Control", "no-store");
    return { sessionId: state, authUrl: provider.buildAuthUrl(state, createHash("sha256").update(verifier).digest("base64url")) };
  });
  app.get<{ Params: { platform: string; sessionId: string } }>("/auth/:platform/status/:sessionId", { preHandler: requireAuth }, async (request, reply) => {
    const session = sessions.get(request.params.sessionId);
    reply.header("Cache-Control", "no-store");
    if (!session || session.expires <= Date.now() || session.agentId !== agentIdOf(request) || session.platform !== request.params.platform) return reply.code(404).send({ error: "Connection session expired. Please reconnect." });
    return { status: session.status, message: session.message };
  });
  async function callback(request: FastifyRequest<{ Params: { platform: string }; Querystring: { code?: string; state?: string; error?: string } }>, reply: FastifyReply) {
    const { platform } = request.params;
    const { state, code, error } = request.query;
    const session = typeof state === "string" ? sessions.get(state) : undefined;
    if (!session || session.expires <= Date.now() || session.platform !== platform || session.status !== "pending") return reply.code(400).send({ error: "Invalid, expired or already used connection session. Reconnect from the app." });
    session.status = "processing"; // Consume before asynchronous exchange, blocking replay.
    if (error || typeof code !== "string" || !code) {
      session.status = "error"; session.message = "Authorization was declined or no authorization code was returned.";
      return finish(reply, session);
    }
    try {
      const result = await getOAuthProvider(platform)!.handleCallback(code, session.verifier);
      if (sessions.get(state!) !== session || session.expires <= Date.now()) throw new Error("Connection session superseded or expired");
      if (!result.accessToken || !result.externalAccountId || !result.externalAccountName) throw new Error("Incomplete account response");
      const existing = await connections.findOne({ where: { agentId: session.agentId, platform } });
      await connections.save(connections.create({ ...(existing ? { id: existing.id } : {}), agentId: session.agentId, platform, accessToken: result.accessToken, refreshToken: result.refreshToken ?? null, expiresAt: result.expiresAt ?? null, externalAccountId: result.externalAccountId, externalAccountName: result.externalAccountName }));
      session.status = "success";
    } catch (err) {
      // Provider responses may contain tokens; never put raw upstream errors in logs or redirect URLs.
      console.log("🔥 FACEBOOK GİZLİ HATASI: ", err);
      request.log.warn({ platform }, "OAuth connection failed");
      session.status = "error";
      session.message = "Connection failed. Check application permissions, account eligibility and the exact callback URL, then retry.";
    } finally { session.verifier = ""; }
    return finish(reply, session);
  }
  app.get("/auth/:platform/callback", callback);
  app.get<{ Params: { platform: string }; Querystring: { code?: string; state?: string; error?: string } }>("/auth/:platform/callback/", async (request, reply) => {
    if (request.params.platform === "tiktok" && !request.query.state && !request.query.code && env.tiktok.domainVerification) return reply.type("text/plain").send(env.tiktok.domainVerification);
    return callback(request, reply);
  });
}