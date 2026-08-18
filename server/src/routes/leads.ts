import { FastifyInstance } from "fastify";
import { AppDataSource } from "../data-source.js";
import { Lead } from "../entities/Lead.js";
import { requireAuth } from "../requireAuth.js";
import { serializeLead } from "../serialize.js";

export async function leadRoutes(app: FastifyInstance): Promise<void> {
  const leads = AppDataSource.getRepository(Lead);

  app.get("/leads", { preHandler: requireAuth }, async () => {
    const rows = await leads.find({ relations: ["contact"], order: { createdAt: "DESC" } });
    return rows.map(serializeLead);
  });

  app.get<{ Params: { id: string } }>("/leads/:id", { preHandler: requireAuth }, async (request, reply) => {
    const lead = await leads.findOne({ where: { id: request.params.id }, relations: ["contact"] });
    if (!lead) return reply.code(404).send({ error: "Lead not found" });
    return serializeLead(lead);
  });
}
