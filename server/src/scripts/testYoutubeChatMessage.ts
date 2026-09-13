import "dotenv/config";
import { getYoutubeAccessToken } from "../services/youtubeOAuth.js";

const liveChatId = process.argv[2];
const messageText = process.argv[3] ?? "Bu ev kac metrekare, ilgileniyorum";
if (!liveChatId) {
  console.error("usage: tsx testYoutubeChatMessage.ts <liveChatId> [messageText]");
  process.exit(1);
}

const token = await getYoutubeAccessToken();
const res = await fetch("https://www.googleapis.com/youtube/v3/liveChat/messages?part=snippet", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    snippet: {
      liveChatId,
      type: "textMessageEvent",
      textMessageDetails: { messageText },
    },
  }),
});
console.log(res.status, await res.text());
