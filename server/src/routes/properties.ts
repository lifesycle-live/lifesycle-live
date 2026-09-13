import { FastifyInstance } from "fastify";
import { AppDataSource } from "../data-source.js";
import { Property } from "../entities/Property.js";
import { requireAuth } from "../requireAuth.js";
import { serializeProperty } from "../serialize.js";
import { aiService } from "../services/aiService.js";
import { z } from "zod";

export const propertyInput = z.object({
  address: z.string().trim().min(3).max(500),
  price: z.string().trim().max(255),
  propertyType: z.string().trim().min(1).max(120),
  bedrooms: z.number().int().min(0).max(100).optional(),
  bathrooms: z.number().int().min(0).max(100).optional(),
  summary: z.string().trim().max(2000),
  features: z.array(z.string().trim().min(1).max(160)).max(30),
  // Bounded inline photos for the scaffold; move to object storage for larger portfolios.
  images: z.array(z.string().max(1400000).refine(value => /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value), "Choose JPEG, PNG or WebP photos")).max(6),
});

export async function propertyRoutes(app: FastifyInstance): Promise<void> {
  const properties = AppDataSource.getRepository(Property);
  app.post("/properties", { preHandler: requireAuth, bodyLimit: 9 * 1024 * 1024 }, async (request, reply) => {
    const input = propertyInput.safeParse(request.body);
    if (!input.success) return reply.code(400).send({ error: "Check property fields and photo sizes.", details: input.error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`) });
    const { features, images, ...fields } = input.data;
    const property = await properties.save(properties.create({ ...fields, features: JSON.stringify(features), images: JSON.stringify(images) }));
    return reply.code(201).send(serializeProperty(property));
  });

  app.get("/properties", { preHandler: requireAuth }, async () => {
    const rows = await properties.find({ order: { address: "ASC" } });
    return rows.map(serializeProperty);
  });

  app.get<{ Params: { id: string } }>("/properties/:id", { preHandler: requireAuth }, async (request, reply) => {
    const property = await properties.findOne({ where: { id: request.params.id } });
    if (!property) return reply.code(404).send({ error: "Property not found" });
    return serializeProperty(property);
  });

  app.get<{ Params: { id: string } }>("/properties/:id/ai-prep", { preHandler: requireAuth }, async (request, reply) => {
    const property = await properties.findOne({ where: { id: request.params.id } });
    if (!property) return reply.code(404).send({ error: "Property not found" });

    const prep = await aiService.generatePrep(property);
    return { ...prep, suggestedStartTime: undefined };
  });
}
