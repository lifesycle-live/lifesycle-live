import { FastifyReply, FastifyRequest } from "fastify";
import { verifyAccessToken } from "./auth.js";

export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const header = request.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;

  if (!token) {
    return reply.code(401).send({ error: "Missing bearer token" });
  }

  try {
    const claims = verifyAccessToken(token);
    (request as FastifyRequest & { agentId: string }).agentId = claims.agentId;
  } catch {
    return reply.code(401).send({ error: "Invalid or expired token" });
  }
}
