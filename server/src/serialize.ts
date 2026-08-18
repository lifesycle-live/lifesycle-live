import { ActivityItem } from "./entities/ActivityItem.js";
import { Broadcast } from "./entities/Broadcast.js";
import { Contact } from "./entities/Contact.js";
import { EngagementEvent } from "./entities/EngagementEvent.js";
import { Lead } from "./entities/Lead.js";
import { Property } from "./entities/Property.js";
import { Task } from "./entities/Task.js";

export function serializeProperty(p: Property) {
  return { id: p.id, address: p.address, price: p.price ?? undefined, thumbnailUrl: p.thumbnailUrl ?? undefined };
}

export function serializeContact(c: Contact) {
  return { id: c.id, name: c.name, phone: c.phone ?? undefined, email: c.email ?? undefined, avatarUrl: c.avatarUrl ?? undefined };
}

export function serializeBroadcast(b: Broadcast) {
  return {
    id: b.id,
    property: serializeProperty(b.property),
    agentId: b.agentId,
    status: b.status,
    startedAt: b.startedAt ? new Date(b.startedAt).toISOString() : undefined,
    endedAt: b.endedAt ? new Date(b.endedAt).toISOString() : undefined,
    platforms: JSON.parse(b.platforms),
    ingest: b.ingest ? JSON.parse(b.ingest) : undefined,
  };
}

export function serializeBroadcastSummary(
  b: Broadcast,
  commentCount: number,
  leadsCreated: number,
  highlightClips: { id: string; url: string; label: string; durationSeconds: number }[],
) {
  return {
    broadcastId: b.id,
    peakViewers: b.peakViewers,
    commentCount,
    leadsCreated,
    highlightClips,
    transcriptUrl: b.transcriptUrl ?? undefined,
    recordingUrl: b.recordingUrl ?? undefined,
  };
}

export function serializeEngagementEvent(e: EngagementEvent) {
  return {
    id: e.id,
    broadcastId: e.broadcastId,
    platform: e.platform,
    freshness: e.freshness,
    authorName: e.authorName,
    text: e.text,
    intent: e.intent,
    intentConfidence: e.intentConfidence,
    createdAt: new Date(e.createdAt).toISOString(),
    convertedToLeadId: e.convertedToLeadId ?? undefined,
    convertedToTaskId: e.convertedToTaskId ?? undefined,
  };
}

export function serializeLead(l: Lead) {
  return {
    id: l.id,
    contact: serializeContact(l.contact),
    source: l.source,
    sourcePlatform: l.sourcePlatform ?? undefined,
    broadcastId: l.broadcastId ?? undefined,
    propertyId: l.propertyId ?? undefined,
    status: l.status,
    createdAt: new Date(l.createdAt).toISOString(),
  };
}

export function serializeTask(t: Task) {
  return {
    id: t.id,
    title: t.title,
    contactId: t.contactId ?? undefined,
    leadId: t.leadId ?? undefined,
    broadcastId: t.broadcastId ?? undefined,
    dueAt: t.dueAt ? new Date(t.dueAt).toISOString() : undefined,
    done: t.done,
  };
}

export function serializeActivityItem(a: ActivityItem) {
  return {
    id: a.id,
    contactId: a.contactId,
    type: a.type,
    summary: a.summary,
    createdAt: new Date(a.createdAt).toISOString(),
    broadcastId: a.broadcastId ?? undefined,
  };
}
