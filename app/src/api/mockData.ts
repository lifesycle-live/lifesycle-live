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
  {
    id: "prop-1",
    address: "42 Willow Street",
    price: "Offers over £450,000",
    propertyType: "3-bed semi-detached house",
    bedrooms: 3,
    bathrooms: 2,
    imageUrl:
      "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=70",
    summary:
      "A beautifully renovated family home moments from Green Park station. Open-plan kitchen/diner opening onto a south-facing garden, with a converted loft study.",
    features: ["Renovated kitchen (2023)", "South-facing garden", "Loft study", "EPC rating B", "2 min to station"],
    images: [
      "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=70",
      "https://images.unsplash.com/photo-1556909212-d5b604d0c90d?auto=format&fit=crop&w=1200&q=70",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=70",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=70",
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=70",
    ],
  },
  {
    id: "prop-2",
    address: "12 Elm Court",
    price: "£325,000",
    propertyType: "2-bed apartment",
    bedrooms: 2,
    bathrooms: 1,
    imageUrl:
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=70",
    summary:
      "Bright top-floor apartment with a private balcony and river views. Allocated parking, secure entry, and a share of freehold.",
    features: ["Private balcony", "River views", "Allocated parking", "Share of freehold", "Chain free"],
    images: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=70",
      "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=1200&q=70",
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=70",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=70",
    ],
  },
  {
    id: "prop-3",
    address: "8 Riverside Mews",
    price: "£610,000",
    propertyType: "4-bed townhouse",
    bedrooms: 4,
    bathrooms: 3,
    imageUrl:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=70",
    summary:
      "Spacious three-storey townhouse in a quiet gated mews. Integral garage, roof terrace, and underfloor heating throughout the ground floor.",
    features: ["Gated development", "Integral garage", "Roof terrace", "Underfloor heating", "Walk to riverside"],
    images: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=70",
      "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1200&q=70",
      "https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=1200&q=70",
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=70",
      "https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1200&q=70",
    ],
  },
  {
    id: "prop-4",
    address: "5 Orchard Lane",
    price: "£279,950",
    propertyType: "2-bed cottage",
    bedrooms: 2,
    bathrooms: 1,
    imageUrl:
      "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=70",
    summary:
      "Charming end-of-terrace cottage with exposed beams and a wood-burning stove. Cottage garden to the rear, walking distance to the village high street.",
    features: ["Exposed beams", "Wood-burning stove", "Cottage garden", "Off-street parking"],
    images: [
      "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=70",
      "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=70",
      "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1200&q=70",
      "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=70",
    ],
  },
  {
    id: "prop-5",
    address: "27 Highfield Road",
    price: "Offers over £725,000",
    propertyType: "5-bed detached house",
    bedrooms: 5,
    bathrooms: 3,
    imageUrl:
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=70",
    summary:
      "Substantial detached family home on a private plot. Double garage, home office annex, and a newly landscaped garden with patio.",
    features: ["Double garage", "Home office annex", "Landscaped garden", "Underfloor heating", "EPC rating A"],
    images: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=70",
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=70",
      "https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1200&q=70",
      "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=70",
      "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=70",
    ],
  },
  {
    id: "prop-6",
    address: "3 Harbourview Court",
    price: "£389,000",
    propertyType: "2-bed apartment",
    bedrooms: 2,
    bathrooms: 2,
    imageUrl:
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=70",
    summary:
      "Modern harbourside apartment with floor-to-ceiling windows and a private balcony. Secure underground parking and concierge.",
    features: ["Harbour views", "Underground parking", "Concierge", "En-suite master", "Lift access"],
    images: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=70",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=70",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=70",
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=70",
    ],
  },
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
