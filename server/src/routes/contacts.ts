import { FastifyInstance } from "fastify";
import { AppDataSource } from "../data-source.js";
import { Contact } from "../entities/Contact.js";
import { ActivityItem } from "../entities/ActivityItem.js";
import { requireAuth } from "../requireAuth.js";
import { serializeActivityItem, serializeContact } from "../serialize.js";

export async function contactRoutes(app: FastifyInstance): Promise<void> {
  const contacts = AppDataSource.getRepository(Contact);
  const activityItems = AppDataSource.getRepository(ActivityItem);

  app.get<{ Params: { id: string } }>("/contacts/:id", { preHandler: requireAuth }, async (request, reply) => {
    const contact = await contacts.findOne({ where: { id: request.params.id } });
    if (!contact) return reply.code(404).send({ error: "Contact not found" });
    return serializeContact(contact);
  });

  app.get<{ Params: { id: string } }>("/contacts/:id/activity", { preHandler: requireAuth }, async (request) => {
    const items = await activityItems.find({
      where: { contactId: request.params.id },
      order: { createdAt: "DESC" },
    });
    return items.map(serializeActivityItem);
  });
}
