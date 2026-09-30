import "dotenv/config";
import { aiService } from "../services/aiService.js";
import type { RawComment } from "../adapters/types.js";

/**
 * Local-only demo for the Facebook comment ingestion contract.
 *
 * The real Facebook adapter produces this same RawComment shape. Running this
 * script lets the team verify the comment -> AI intent pipeline before a Page
 * connection is available. It does not write to the database or contact
 * Facebook.
 */
const sampleComments: RawComment[] = [
  {
    externalId: "facebook-demo-1",
    authorName: "Sarah Thompson",
    text: "Cumartesi evi görebilir miyim?",
    postedAt: new Date("2026-09-18T12:00:00Z"),
  },
  {
    externalId: "facebook-demo-2",
    authorName: "Mike Reynolds",
    text: "Fiyatı ne kadar, aidat dahil mi?",
    postedAt: new Date("2026-09-18T12:00:08Z"),
  },
  {
    externalId: "facebook-demo-3",
    authorName: "Priya Shah",
    text: "Benim evim bu bölgede ne eder?",
    postedAt: new Date("2026-09-18T12:00:16Z"),
  },
  {
    externalId: "facebook-demo-4",
    authorName: "Promo Account",
    text: "Profilimi takip edin ve bu linke tıklayın: https://example.com",
    postedAt: new Date("2026-09-18T12:00:24Z"),
  },
];

const events = await Promise.all(
  sampleComments.map(async (comment) => ({
    platform: "facebook" as const,
    ...comment,
    ...(await aiService.classifyIntent(comment.text)),
  })),
);

console.log(JSON.stringify({ source: "facebook-demo", events }, null, 2));
