# 02 — Market Research

## How real estate uses live video today

Agents already use live and short-form video heavily, and it works: video listings generate roughly **403% more inquiries** than listings without video, and **73% of homeowners** say they're more likely to list with an agent who offers video marketing — yet only around **26% of agents** consistently use video for every listing, leaving a large addressable gap [[Real Estate Video Statistics 2025]](https://worldmetrics.org/real-estate-video-statistics/) [[Real Estate Marketing Statistics 2026]](https://www.reel-e.ai/blog/real-estate-marketing-statistics).

Platform usage among agents for lead generation, per recent surveys: **Facebook 89%**, **Instagram 65%**, **YouTube 32%**, and **TikTok 28%** (roughly doubling year-over-year) [[Real Estate Marketing Statistics 2026]](https://www.reel-e.ai/blog/real-estate-marketing-statistics). Instagram Reels reportedly generate 67% more engagement than static posts on real-estate accounts, and short (<60s) property videos get 2.5x more shares than longer content — meaning the audience is heavily weighted toward exactly the platforms (IG, TikTok) where a native one-click live API is *not* available (see [04](04-technical-feasibility.md)).

Live streaming specifically: live-streamed property tours saw about **150% growth in 2022** and the trend has continued, with live video called out repeatedly as a top real-estate social media tactic for Q&A-style engagement on new listings [[Real Estate Video Statistics 2025]](https://worldmetrics.org/real-estate-video-statistics/).

## Where live streaming happens today, and its ceiling

Virtual open houses today are run through one of three disconnected tool categories:
1. **3D/static tour platforms** (Matterport, Zillow 3D Home/Showcase) — high production value, zero live interactivity; these are pre-recorded scans, not broadcasts [[Matterport vs Zillow Showcase]](https://squarefootphotography.com/virtual-property-tours-matterport-and-zillow-showcase/).
2. **Generic video/conferencing tools repurposed for real estate** (Zoom, Facebook Live, Instagram Live) — genuinely live and interactive, but completely outside any real-estate-specific system; Zillow's own guidance for listing a "live" open house is literally "paste a Zoom or YouTube link" [[CloudPano: Posting Virtual Open Houses]](https://www.cloudpano.com/blog/mls-marketing-tips-posting-virtual-open-houses-to-attract-buyers-llrze).
3. **Open-house lead-capture apps** (Curb Hero, Open Home Pro, Showable, Wave Connect) — solve digital sign-in and automated follow-up for *in-person* opens, not live-streamed ones. Even so, industry data says **most agents capture fewer than 30% of open-house visitors as usable leads**, illustrating how leaky manual capture is even in the physical/simple case [[Showable 2026 guide]](https://showable.co/blog/open-house-sign-in-apps).

No product in the category currently combines *(a)* a live, interactive broadcast, *(b)* real-estate-specific context (property, valuation, viewing request), and *(c)* structured CRM capture of what happens in the stream. That's the gap Lifesycle Live targets.

## Demand signal summary

| Signal | Data point | Source |
|---|---|---|
| Video drives inquiries | +403% inquiries vs. non-video listings | worldmetrics.org |
| Sellers reward video | 73% more likely to list with a video-using agent | reel-e.ai |
| Underused today | Only 26% of agents use video on every listing | reel-e.ai |
| Facebook dominance | 89% of agents use FB for lead gen | reel-e.ai |
| TikTok growth | Agent usage doubled YoY to 28% | reel-e.ai |
| Live-specific growth | ~150% growth in live-streamed tours (2022→ongoing) | worldmetrics.org |
| Lead capture is leaky today | <30% of open-house visitors become usable leads | showable.co |

## Adjacent proof-of-model: live commerce

Outside real estate, live-shopping platforms have already validated "chat during a livestream → structured lead/order" as a business model: **CommentSold** has driven ~$4B in lifetime sales across 7,000+ merchants and multistreams to TikTok, Facebook, Instagram, and the merchant's own site; **Whatnot** and **TalkShopLive** run similar real-time chat-to-purchase flows, with TalkShopLive charging ~10% GMV commission plus a per-product fee [[Live Shopping Platforms 2026]](https://sourceforge.net/software/live-shopping/) [[Bambuser vs CommentSold vs TalkShopLive]](https://www.influencers-time.com/bambuser-vs-commentsold-vs-talkshoplive-for-mid-market-brand/). Industry guidance explicitly flags that **CRM attribution must be planned as part of initial platform setup, not bolted on afterward** — validating Lifesycle Live's premise that the CRM integration is the differentiator, not the video pipe itself.

## Market implication for Lifesycle Live

- Build for the platforms where the audience and the API access line up (Facebook, YouTube, Zoom-sourced restream) as true one-click MVP targets.
- Treat Instagram and TikTok — where agent adoption is growing fastest but API access is weakest — as "assisted" integrations (capture chat/comments and drive CRM automation around a stream the agent starts natively in-app), not blockers to launch.
- Position against the status quo of "paste a Zoom link into Zillow" and disconnected open-house sign-in apps, not against Matterport/Zillow (which are non-live and complementary, not competitive).
