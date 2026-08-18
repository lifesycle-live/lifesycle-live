import {
  ActivityItem,
  Broadcast,
  BroadcastSummary,
  Contact,
  EngagementEvent,
  Lead,
  Property,
  Task,
} from "../types/models";

export const mockProperties: Property[] = [
  { id: "prop-1", address: "42 Willow Street", price: "Offers over £450,000" },
  { id: "prop-2", address: "12 Elm Court", price: "£325,000" },
  { id: "prop-3", address: "8 Riverside Mews", price: "£610,000" },
];

export const mockContacts: Contact[] = [
  { id: "contact-1", name: "Sarah Thompson", phone: "+44 7700 900001" },
  { id: "contact-2", name: "Mike Reynolds", phone: "+44 7700 900002" },
  { id: "contact-3", name: "Priya Shah", email: "priya@example.com" },
];

export const mockLeads: Lead[] = [
  {
    id: "lead-1",
    contact: mockContacts[0],
    source: "broadcast",
    sourcePlatform: "facebook",
    broadcastId: "broadcast-1",
    propertyId: "prop-1",
    status: "new",
    createdAt: new Date().toISOString(),
  },
  {
    id: "lead-2",
    contact: mockContacts[1],
    source: "broadcast",
    sourcePlatform: "youtube",
    broadcastId: "broadcast-1",
    propertyId: "prop-1",
    status: "contacted",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "lead-3",
    contact: mockContacts[2],
    source: "web_form",
    status: "qualified",
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
];

export const mockTasks: Task[] = [
  {
    id: "task-1",
    title: "Book viewing for Sarah Thompson — 42 Willow Street",
    contactId: "contact-1",
    leadId: "lead-1",
    broadcastId: "broadcast-1",
    dueAt: new Date(Date.now() + 86400000).toISOString(),
    done: false,
  },
  {
    id: "task-2",
    title: "Follow up with Mike Reynolds re: EPC rating",
    contactId: "contact-2",
    leadId: "lead-2",
    broadcastId: "broadcast-1",
    done: false,
  },
];

export const mockActivity: Record<string, ActivityItem[]> = {
  "contact-1": [
    {
      id: "act-1",
      contactId: "contact-1",
      type: "engagement_event",
      summary: "Commented on live broadcast: \"Is this still available?\"",
      createdAt: new Date().toISOString(),
      broadcastId: "broadcast-1",
    },
    {
      id: "act-2",
      contactId: "contact-1",
      type: "task_created",
      summary: "Task created: Book viewing",
      createdAt: new Date().toISOString(),
      broadcastId: "broadcast-1",
    },
  ],
};

export const mockEngagementFeed: EngagementEvent[] = [
  {
    id: "eng-1",
    broadcastId: "broadcast-1",
    platform: "facebook",
    freshness: "live",
    authorName: "Sarah T.",
    text: "Is this still available?",
    intent: "viewing_request",
    intentConfidence: 0.92,
    createdAt: new Date().toISOString(),
  },
  {
    id: "eng-2",
    broadcastId: "broadcast-1",
    platform: "youtube",
    freshness: "delayed",
    authorName: "Mike R.",
    text: "What's the EPC rating?",
    intent: "question",
    intentConfidence: 0.81,
    createdAt: new Date().toISOString(),
  },
  {
    id: "eng-3",
    broadcastId: "broadcast-1",
    platform: "instagram",
    freshness: "pending",
    authorName: "—",
    text: "Comments available after this stream ends",
    intent: "other",
    intentConfidence: 0,
    createdAt: new Date().toISOString(),
  },
];

export const mockBroadcastSummary: BroadcastSummary = {
  broadcastId: "broadcast-1",
  peakViewers: 214,
  commentCount: 38,
  leadsCreated: 6,
  highlightClips: [
    { id: "clip-1", url: "", label: "\"renovated kitchen\"", durationSeconds: 18 },
    { id: "clip-2", url: "", label: "\"walking to station\"", durationSeconds: 24 },
  ],
  transcriptUrl: "",
  recordingUrl: "",
};

export function createMockBroadcast(propertyId: string, platforms: Broadcast["platforms"]): Broadcast {
  const property = mockProperties.find((p) => p.id === propertyId) ?? mockProperties[0];
  return {
    id: "broadcast-1",
    property,
    agentId: "agent-1",
    status: "live",
    startedAt: new Date().toISOString(),
    platforms,
    ingest: Object.fromEntries(
      platforms.map((p) => [p, { rtmpUrl: `rtmps://mock.ingest/${p}`, streamKey: `mock-key-${p}` }]),
    ),
  };
}
