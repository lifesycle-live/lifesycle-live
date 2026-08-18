import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { AppDataSource } from "../data-source.js";
import { Agent } from "../entities/Agent.js";
import { signAccessToken, signRefreshToken } from "../auth.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const agents = AppDataSource.getRepository(Agent);

  app.post("/auth/login", async (request, reply) => {
    const body = loginSchema.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "Invalid email/password payload" });
    }

    const agent = await agents.findOne({ where: { email: body.data.email } });
    if (!agent) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const passwordOk = await bcrypt.compare(body.data.password, agent.passwordHash);
    if (!passwordOk) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    return {
      accessToken: signAccessToken(agent.id),
      refreshToken: signRefreshToken(agent.id),
      expiresAt: Date.now() + 1000 * 60 * 60,
    };
  });
}
