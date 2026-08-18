import { FastifyInstance } from "fastify";
import { AppDataSource } from "../data-source.js";
import { EngagementEvent } from "../entities/EngagementEvent.js";
import { Contact } from "../entities/Contact.js";
import { Lead } from "../entities/Lead.js";
import { Task } from "../entities/Task.js";
import { ActivityItem } from "../entities/ActivityItem.js";
import { requireAuth } from "../requireAuth.js";
import { serializeEngagementEvent } from "../serialize.js";

export async function engagementRoutes(app: FastifyInstance): Promise<void> {
  const engagementEvents = AppDataSource.getRepository(EngagementEvent);
  const contacts = AppDataSource.getRepository(Contact);
  const leads = AppDataSource.getRepository(Lead);
  const tasks = AppDataSource.getRepository(Task);
  const activityItems = AppDataSource.getRepository(ActivityItem);

  app.get<{ Params: { id: string } }>("/broadcasts/:id/engagement", { preHandler: requireAuth }, async (request) => {
    const events = await engagementEvents.find({
      where: { broadcastId: request.params.id, dismissed: false },
      order: { createdAt: "DESC" },
    });
    return events.map(serializeEngagementEvent);
  });

  app.post<{ Params: { id: string } }>("/engagement/:id/convert-to-lead", { preHandler: requireAuth }, async (request, reply) => {
    const event = await engagementEvents.findOne({ where: { id: request.params.id }, relations: ["broadcast"] });
    if (!event) return reply.code(404).send({ error: "Engagement event not found" });

    // No real per-platform contact identity resolution yet (needs the
    // platform adapters to be live) — creates a fresh contact from the
    // author name for now rather than guessing a de-dup match.
    const contact = await contacts.save(contacts.create({ name: event.authorName }));

    const lead = await leads.save(
      leads.create({
        contactId: contact.id,
        source: "broadcast",
        sourcePlatform: event.platform,
        broadcastId: event.broadcastId,
        propertyId: event.broadcast.propertyId,
        status: "new",
      }),
    );

    event.convertedToLeadId = lead.id;
    await engagementEvents.save(event);

    await activityItems.save(
      activityItems.create({
        contactId: contact.id,
        type: "engagement_event",
        summary: `Commented on live broadcast: "${event.text}"`,
        broadcastId: event.broadcastId,
      }),
    );

    return { leadId: lead.id };
  });

  app.post<{ Params: { id: string } }>("/engagement/:id/convert-to-task", { preHandler: requireAuth }, async (request, reply) => {
    const event = await engagementEvents.findOne({ where: { id: request.params.id } });
    if (!event) return reply.code(404).send({ error: "Engagement event not found" });

    const task = await tasks.save(
      tasks.create({
        title: `Follow up with ${event.authorName}: "${event.text}"`,
        broadcastId: event.broadcastId,
        done: false,
      }),
    );

    event.convertedToTaskId = task.id;
    await engagementEvents.save(event);

    return { taskId: task.id };
  });

  app.post<{ Params: { id: string } }>("/engagement/:id/dismiss", { preHandler: requireAuth }, async (request, reply) => {
    const event = await engagementEvents.findOne({ where: { id: request.params.id } });
    if (!event) return reply.code(404).send({ error: "Engagement event not found" });

    event.dismissed = true;
    await engagementEvents.save(event);
    return reply.code(204).send();
  });
}
