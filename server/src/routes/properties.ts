import { FastifyInstance } from "fastify";
import { AppDataSource } from "../data-source.js";
import { Property } from "../entities/Property.js";
import { requireAuth } from "../requireAuth.js";
import { serializeProperty } from "../serialize.js";
import { aiService } from "../services/aiService.js";

export async function propertyRoutes(app: FastifyInstance): Promise<void> {
  const properties = AppDataSource.getRepository(Property);

  app.get("/properties", { preHandler: requireAuth }, async () => {
    const rows = await properties.find();
    return rows.map(serializeProperty);
  });

  app.get<{ Params: { id: string } }>("/properties/:id/ai-prep", { preHandler: requireAuth }, async (request, reply) => {
    const property = await properties.findOne({ where: { id: request.params.id } });
    if (!property) return reply.code(404).send({ error: "Property not found" });

    const prep = await aiService.generatePrep(property);
    return { ...prep, suggestedStartTime: undefined };
  });
}
