import { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppDataSource } from "../data-source.js";
import { Broadcast } from "../entities/Broadcast.js";
import { Contact } from "../entities/Contact.js";
import { Lead } from "../entities/Lead.js";
import { ActivityItem } from "../entities/ActivityItem.js";
import { env } from "../env.js";

/**
 * The `/go/:id` link adapters post into comments/chat (see
 * adapters/types.ts `postCallToAction`). Returns null when PUBLIC_BASE_URL
 * isn't set yet — callers must skip posting rather than post a broken
 * localhost link nobody outside the dev machine can reach.
 */
export function buildLeadCaptureUrl(broadcastId: string): string | null {
  if (!env.publicBaseUrl) return null;
  return `${env.publicBaseUrl}/go/${broadcastId}`;
}

/**
 * Public (unauthenticated) lead capture. Platform comment APIs never expose
 * a viewer's email/phone — YouTube, Facebook and Zoom all withhold that by
 * design. The only honest way to collect it is to ask the viewer directly:
 * the agent drops this page's link in chat/description, an interested
 * viewer fills it in themselves, and that submission — not the platform
 * API — is what reaches Contact/Lead.
 */
export const CONTACT_REQUEST_TEXT = "I ask the agent hosting this tour to contact me about this property using the email or phone number I provide. This does not subscribe me to marketing messages.";
export const submitSchema = z.object({
  contactRequested: z.literal(true),
  name: z.string().trim().min(1).max(255),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  phone: z.string().trim().min(3).max(50).optional().or(z.literal("")),
  message: z.string().trim().max(1000).optional(),
});

export async function leadCaptureRoutes(app: FastifyInstance): Promise<void> {
  const broadcasts = AppDataSource.getRepository(Broadcast);

  app.get<{ Params: { id: string } }>("/public/broadcasts/:id", async (request, reply) => {
    const broadcast = await broadcasts.findOne({ where: { id: request.params.id }, relations: ["property"] });
    if (!broadcast) return reply.code(404).send({ error: "Broadcast not found" });

    return {
      id: broadcast.id,
      status: broadcast.status,
      property: {
        address: broadcast.property.address,
        price: broadcast.property.price,
        imageUrl: broadcast.property.imageUrl,
      },
    };
  });

  app.post<{ Params: { id: string } }>("/public/broadcasts/:id/leads", async (request, reply) => {
    const broadcast = await broadcasts.findOne({ where: { id: request.params.id } });
    if (!broadcast) return reply.code(404).send({ error: "Broadcast not found" });

    const body = submitSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid submission" });
    const { name, email, phone, message } = body.data;
    if (!email && !phone) return reply.code(400).send({ error: "Provide an email or phone number" });

    const lead = await AppDataSource.transaction(async (manager) => {
      const contacts = manager.getRepository(Contact);
      const leads = manager.getRepository(Lead);
      const activityItems = manager.getRepository(ActivityItem);
      const contact = await contacts.save(
        contacts.create({ name, email: email || null, phone: phone || null }),
      );

      const lead = await leads.save(
        leads.create({
          contactId: contact.id,
          source: "form",
          sourcePlatform: null,
          broadcastId: broadcast.id,
          propertyId: broadcast.propertyId,
          status: "new",
        }),
      );

      await activityItems.save(
        activityItems.create({
          contactId: contact.id,
          type: "lead_capture_form",
          summary: message ? `Submitted the live-stream contact form: "${message}"` : "Submitted the live-stream contact form",
          broadcastId: broadcast.id,
        }),
      );

      await activityItems.save(activityItems.create({
        contactId: contact.id, broadcastId: broadcast.id, type: "contact_request",
        summary: JSON.stringify({ version: "2026-09-13-v1", text: CONTACT_REQUEST_TEXT, requestedAt: new Date().toISOString(), source: "broadcast_contact_form", marketingSubscription: false }),
      }));
      return lead;
    });
    return reply.code(201).send({ leadId: lead.id });
  });

  app.get<{ Params: { id: string } }>("/go/:id", async (request, reply) => {
    if (!await broadcasts.findOne({ where: { id: request.params.id } })) return reply.code(404).send({ error: "Broadcast not found" });
    reply.type("text/html").send(renderPage(request.params.id));
  });
}

function renderPage(broadcastId: string): string {
  const id = JSON.stringify(broadcastId).replace(/</g, "\\u003c");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Get in touch</title>
<style>
  body { font-family: system-ui, sans-serif; background: #fff8fa; color: #362832; margin: 0; padding: 24px 16px; }
  .card { max-width: 420px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 24px; }
  img { width: 100%; border-radius: 8px; margin-bottom: 12px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .price { color: #876d7a; margin: 0 0 16px; }
  label { display: block; font-size: 13px; margin: 12px 0 4px; color: #876d7a; }
  input, textarea { width: 100%; box-sizing: border-box; padding: 10px; border-radius: 8px; border: 1px solid #f1dfe7; background: #fff8fa; color: #362832; font-size: 15px; }
  button { width: 100%; margin-top: 18px; padding: 12px; border-radius: 8px; border: none; background: #dc568c; color: #fff; font-weight: 700; font-size: 15px; cursor: pointer; }
  button:disabled { opacity: 0.6; }
  #msg { margin-top: 14px; font-size: 14px; }
</style>
</head>
<body>
  <div class="card">
    <div id="property">Loading property…</div>
    <form id="form">
      <label for="name">Name *</label>
      <input id="name" required maxlength="255" />
      <label for="email">Email</label>
      <input id="email" type="email" maxlength="255" />
      <label for="phone">Phone</label>
      <input id="phone" type="tel" maxlength="50" />
      <label for="message">Message</label>
      <textarea id="message" rows="3" maxlength="1000"></textarea>
      <p>Please provide an email or phone number. Your details go to the agent responsible for this tour. <a href="/legal/privacy" target="_blank" rel="noopener">Privacy and deletion requests</a>.</p>
      <label><input id="contactRequested" type="checkbox" required style="width:auto" />${CONTACT_REQUEST_TEXT}</label>
      <button type="submit">Send my details</button>
    </form>
    <div id="msg"></div>
  </div>

<script>
const broadcastId = ${id};
const propertyEl = document.getElementById("property");
const form = document.getElementById("form");
const msgEl = document.getElementById("msg");

fetch("/public/broadcasts/" + broadcastId)
  .then((r) => r.json())
  .then((data) => {
    if (!data.property) throw new Error("Property unavailable");
    propertyEl.replaceChildren();
    if (data.property.imageUrl && (data.property.imageUrl.startsWith("https://") || data.property.imageUrl.startsWith("http://"))) {
      const img = document.createElement("img");
      img.src = data.property.imageUrl;
      img.alt = "Property tour";
      propertyEl.append(img);
    }
    const heading = document.createElement("h1");
    heading.textContent = data.property.address;
    const price = document.createElement("p");
    price.className = "price";
    price.textContent = data.property.price ?? "";
    propertyEl.append(heading, price);
  })
  .catch(() => { propertyEl.textContent = "Property tour"; });

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const submitBtn = form.querySelector("button");
  submitBtn.disabled = true;
  msgEl.textContent = "";
  try {
    const res = await fetch("/public/broadcasts/" + broadcastId + "/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactRequested: document.getElementById("contactRequested").checked,
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        phone: document.getElementById("phone").value,
        message: document.getElementById("message").value,
      }),
    });
    if (!res.ok) throw new Error((await res.json()).error || "Could not submit");
    form.style.display = "none";
    msgEl.textContent = "Thanks — the agent will be in touch shortly.";
  } catch (err) {
    msgEl.textContent = "Error: " + err.message;
    submitBtn.disabled = false;
  }
});
</script>
</body>
</html>`;
}

