// Shared domain types. Mirrors the object model described in
// docs/06-system-architecture.md and docs/09-crm-integration.md.
// These shapes are the contract between screens and src/api/* — when the
// real Lifesycle API details land, only src/api/* should need to change.

export type PlatformId =
  | "facebook"
  | "youtube"
  | "zoom"
  | "linkedin"
  | "instagram"
  | "tiktok";

/**
 * Per docs/04-technical-feasibility.md: only these platforms support a true
 * one-click publish. The rest require the agent to start natively in the
 * platform's own app; Lifesycle only listens/assists for those.
 */
export const ONE_CLICK_PLATFORMS: PlatformId[] = ["facebook", "youtube", "zoom"];
export const ASSISTED_PLATFORMS: PlatformId[] = ["linkedin", "instagram", "tiktok"];

export interface PlatformInfo {
  id: PlatformId;
  label: string;
  mode: "one-click" | "assisted";
  note: string;
}

export const PLATFORM_CATALOG: Record<PlatformId, PlatformInfo> = {
  facebook: { id: "facebook", label: "Facebook Live", mode: "one-click", note: "starts instantly" },
  youtube: { id: "youtube", label: "YouTube Live", mode: "one-click", note: "starts instantly" },
  zoom: { id: "zoom", label: "Zoom (private/webinar)", mode: "one-click", note: "starts instantly" },
  linkedin: {
    id: "linkedin",
    label: "LinkedIn Live",
    mode: "assisted",
    note: "must be scheduled in advance",
  },
  instagram: {
    id: "instagram",
    label: "Instagram Live",
    mode: "assisted",
    note: "you start this in Instagram — we'll capture comments after",
  },
  tiktok: {
    id: "tiktok",
    label: "TikTok Live",
    mode: "assisted",
    note: "you start this in TikTok — chat capture is experimental (beta)",
  },
};

export type BroadcastStatus = "scheduled" | "live" | "ended" | "failed";

export interface Property {
  id: string;
  address: string;
  price?: string;
  thumbnailUrl?: string;
}

export interface Broadcast {
  id: string;
  property: Property;
  agentId: string;
  status: BroadcastStatus;
  startedAt?: string;
  endedAt?: string;
  platforms: PlatformId[];
  /** Per-platform ingest info returned by the backend once a broadcast starts. */
  ingest?: Partial<Record<PlatformId, { rtmpUrl: string; streamKey: string }>>;
}

export interface BroadcastSummary {
  broadcastId: string;
  peakViewers: number;
  commentCount: number;
  leadsCreated: number;
  highlightClips: { id: string; url: string; label: string; durationSeconds: number }[];
  transcriptUrl?: string;
  recordingUrl?: string;
}

export type EngagementIntent = "question" | "viewing_request" | "valuation_ask" | "spam" | "other";

/** Reflects the differing latency per platform documented in docs/05-api-research.md. */
export type EngagementFreshness = "live" | "delayed" | "pending";

export interface EngagementEvent {
  id: string;
  broadcastId: string;
  platform: PlatformId;
  freshness: EngagementFreshness;
  authorName: string;
  text: string;
  intent: EngagementIntent;
  intentConfidence: number;
  createdAt: string;
  convertedToLeadId?: string;
  convertedToTaskId?: string;
}

export interface Contact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
}

export type LeadSource = "broadcast" | "web_form" | "portal_enquiry" | "manual";

export interface Lead {
  id: string;
  contact: Contact;
  source: LeadSource;
  sourcePlatform?: PlatformId;
  broadcastId?: string;
  propertyId?: string;
  status: "new" | "contacted" | "qualified" | "lost" | "won";
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  contactId?: string;
  leadId?: string;
  broadcastId?: string;
  dueAt?: string;
  done: boolean;
}

export interface ActivityItem {
  id: string;
  contactId: string;
  type: "engagement_event" | "note" | "call" | "email" | "task_created";
  summary: string;
  createdAt: string;
  broadcastId?: string;
}
