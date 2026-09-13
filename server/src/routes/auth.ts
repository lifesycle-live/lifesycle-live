import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { AppDataSource } from "../data-source.js";
import { Agent } from "../entities/Agent.js";
import { signAccessToken, signRefreshToken } from "../auth.js";
import { timingSafeEqual } from "node:crypto";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const agents = AppDataSource.getRepository(Agent);

  app.post("/auth/register", async (request, reply) => {
    const invitation = process.env.REGISTRATION_INVITE_CODE;
    if (!invitation) return reply.code(503).send({ error: "Registration requires a team invitation. Ask the administrator to configure REGISTRATION_INVITE_CODE." });
    const body = z.object({
      name: z.string().trim().min(1).max(255),
      inviteCode: z.string().min(1).max(255),
      email: z.string().trim().email().max(255).transform(value => value.toLowerCase()),
      password: z.string().min(12).max(72).refine(value => Buffer.byteLength(value, "utf8") <= 72),
    }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Provide a name, valid email and a password of 12–72 bytes." });
    const { name, email, password } = body.data;
    const supplied = Buffer.from(body.data.inviteCode);
    const expected = Buffer.from(invitation);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return reply.code(403).send({ error: "Invalid team invitation code." });
    if (await agents.findOne({ where: { email } })) return reply.code(409).send({ error: "An account already exists. Please sign in." });
    try {
      const agent = await agents.save(agents.create({ name, email, passwordHash: await bcrypt.hash(password, 12) }));
      return reply.code(201).send({ accessToken: signAccessToken(agent.id), refreshToken: signRefreshToken(agent.id), expiresAt: Date.now() + 3600000 });
    } catch (error) {
      if ((error as { driverError?: { code?: string } }).driverError?.code === "23505") return reply.code(409).send({ error: "An account already exists. Please sign in." });
      throw error;
    }
  });

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
