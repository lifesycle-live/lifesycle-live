# Görev Dağılımı — Lifesycle Live (3 kişi)

Proje iki ana parçadan oluşuyor: `server/` (Node/TypeScript + Oracle DB backend) ve `app/` (React Native / Expo mobil uygulama). Aşağıdaki dağılım bu sınırlara göre yapıldı.

---

## Kişi 1 — Backend & Entegrasyonlar (`server/`)

**İlk ve acil iş:** `server/.env` içindeki `ORACLE_*` alanları boş, server şu an DB olmadan başlamıyor.
- [ ] OCI konsoldan Oracle Autonomous DB wallet'ını indir, `ORACLE_CONNECT_STRING`, `ORACLE_USER`, `ORACLE_PASSWORD`, `ORACLE_WALLET_LOCATION`, `ORACLE_WALLET_PASSWORD` alanlarını doldur
- [ ] `server/src/data-source.ts` üzerinden bağlantıyı doğrula, `npm run` ile server'ı ayağa kaldır

**Entity & Route tamamlama:**
- [ ] `server/src/entities/*` (Contact, Lead, Task, Broadcast, Property, PlatformConnection, ActivityItem, EngagementEvent, Agent)
- [ ] `server/src/routes/*` (auth, broadcasts, contacts, engagement, leads, platformConnections, properties, tasks) — uçların test edilmesi

**Platform entegrasyonları:**
- [ ] `server/src/adapters/facebook.ts` — App Secret zaten dolu, `FACEBOOK_PAGE_ACCESS_TOKEN` alınıp test edilmeli
- [ ] `server/src/adapters/youtube.ts` — `YOUTUBE_OAUTH_CLIENT_ID/SECRET` boş, Google Cloud Console'dan alınmalı
- [ ] `server/src/adapters/zoom.ts` — `ZOOM_ACCOUNT_ID/CLIENT_ID/CLIENT_SECRET` boş, Zoom Marketplace'ten alınmalı
- [ ] `server/src/services/aiService.ts` — Groq key zaten dolu, AI özet/öncelik akışlarını test et
- [ ] `server/src/services/facebookOAuth.ts`, `ingestionService.ts`

**Auth:**
- [ ] `server/src/auth.ts`, `server/src/requireAuth.ts`

---

## Kişi 2 — Canlı Yayın (Live) Modülü — Mobil

**Ekranlar:**
- [ ] `app/src/features/live/GoLiveSetupScreen.tsx`
- [ ] `app/src/features/live/LiveDashboardScreen.tsx`
- [ ] `app/src/features/live/ConnectAccountsScreen.tsx`
- [ ] `app/src/features/live/BroadcastSummaryScreen.tsx`

**Bileşenler:**
- [ ] `app/src/features/live/components/AiPrepPanel.tsx`
- [ ] `app/src/features/live/components/EngagementFeed.tsx`
- [ ] `app/src/features/live/components/PlatformSelector.tsx`
- [ ] `app/src/features/live/components/PriorityQueue.tsx`

**Altyapı:**
- [ ] `app/src/live/rtmpStreamer.ts`
- [ ] `app/src/state/liveSessionStore.ts`
- [ ] `app/src/api/broadcasts.ts`, `engagement.ts`, `platformConnections.ts` — şu an mock data (`app/src/api/mockData.ts`) kullanıyor, Kişi 1'in bitirdiği uçlara göre gerçek API'ye bağlanmalı

**Not:** Broadcast/engagement uçları için Kişi 1 ile koordinasyon gerekir.

---

## Kişi 3 — CRM Modülü & QA/Entegrasyon — Mobil

**Ekranlar:**
- [ ] `app/src/features/crm/ContactDetailScreen.tsx`
- [ ] `app/src/features/crm/LeadListScreen.tsx`
- [ ] `app/src/features/crm/TaskListScreen.tsx`

**API bağlantıları:**
- [ ] `app/src/api/contacts.ts`, `leads.ts`, `tasks.ts`, `auth.ts` — mock data'dan gerçek API'ye geçiş

**Navigasyon & genel akış:**
- [ ] `app/src/navigation/RootNavigator.tsx`, `types.ts`

**QA / Test:**
- [ ] Expo üzerinde gerçek cihaz/emülatörde uçtan uca test
- [ ] `docs/13-feature-prioritization.md` ve `docs/08-user-journeys.md` ile tutarlılık kontrolü
- [ ] Regresyon: CRM ve Live modülleri birlikte çalışırken kontrol

---

## ⚠️ Güvenlik notu

`server/.env` içinde gerçek Facebook App Secret ve Groq API key düz metin duruyor.
- [ ] `.gitignore` içinde `.env` olduğunu doğrula (repo'ya commit edilmemeli)
- [ ] Bu anahtarları ekip dışıyla paylaşma
