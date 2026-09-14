# Görev Dağılımı — Lifesycle Live (3 kişi)

Proje iki ana parçadan oluşuyor: `server/` (Node/TypeScript + Fastify + Oracle DB backend) ve `app/` (React Native / Expo mobil uygulama).

**Şu anki durum:** İskelet hazır. Entity'ler, route'lar, mobil ekranlar ve Facebook OAuth "hesap bağlama" akışı yazılmış durumda. **Eksik olan asıl iş: sosyal medya platformlarına gerçekten bağlanmak ve canlı yayın sırasında yorum/etkileşim verisini çekmek.** Platform adapter'larının `publish()` / `end()` / `fetchComments()` metotları şu an sadece `throw new Error("... not implemented yet")` diyor.

---

# 🗓️ 3 GÜNLÜK BİTİRME PLANI (Sep 11–13)

> Görsel tek-sayfa versiyon: https://claude.ai/code/artifact/bd8e4fd4-93c4-4526-9c8d-deb9a00668b0
> Mimari detay: `docs/18-platform-integration-plan.md` · Platform `.env` kurulumları: `server/.env.example`

**Sprint tanımı (Definition of Done):**
- [ ] Agent uygulamadan **kendi** Facebook + YouTube hesabını bağlıyor → `platform_connection` tablosuna per-agent token satırı düşüyor
- [ ] Yayına girince her bağlı platformda gerçek broadcast açılıyor; bağlantı yoksa o platform okunabilir bir hata ile başarısız oluyor
- [ ] Gerçek yorumlar `ingestionService` → Groq `classifyIntent` → `EngagementEvent` → feed akışına giriyor (dedupe + cursor çalışıyor)
- [ ] Canlı yorumdan lead/task'e çevirme → Report sekmesinde görünüyor
- [ ] Bitir → summary ekranı `/broadcasts/:id/summary`'den gerçek sayıları okuyor
- [ ] Secret'lar git dışında; seed şifresi + `JWT_SECRET` yenilendi; sunucu HTTPS'te deploy, tüm redirect URI'ler güncellendi

### ✅ Sprint öncesi bitmiş olanlar
- [x] Server Supabase/Postgres'e taşındı, ayakta
- [x] App auth akışı: login ekranı + cross-platform token saklama + auth gate (`app/src/features/auth/`, `state/authStore.ts`, `api/storage.ts`)
- [x] `YoutubeAdapter` gerçek implementasyon (şimdilik `.env` refresh token ile) + `npm run youtube:auth` yardımcısı
- [x] App UI yenileme: Listings galerisi + PropertyDetail + renkli PlatformSelector + foto galeri
- [x] Property entity zenginleştirme (bedrooms/bathrooms/type/summary/features/images)
- [x] `docs/18-platform-integration-plan.md` + `server/.env.example` platform kurulum adımları

---

## GÜN 1 — Thu · Temeller (per-agent OAuth çatısı + Connect Accounts ekranı)
*Bugün yayın yok — bu, her platformun tekrar kullanacağı altyapı.*

### P1 — Backend
- [x] Tüm REST uçlarını curl/Postman ile doğrula (auth, properties, broadcasts, engagement, platform-connections) — Supabase geçişinde bozulanları düzelt (auth/login, properties, platform-connections, leads, tasks, contacts/:id doğrulandı; 404 alınan tek uç `/contacts` zaten mevcut değildi, sorun yok)
- [x] **[KRİTİK]** `server/src/oauth/` oluştur: provider registry + generic `GET /auth/:platform/start` + `/callback`; mevcut Facebook mantığını `oauth/facebook.ts`'e taşı
- [x] `PlatformConnection.refreshToken` kolonu + `oauth/refresh.ts` helper (geçerli access token döner, rotasyonu DB'ye yazar)
- [ ] **[KRİTİK]** Meta app: oluştur, Facebook Login for Business ekle, redirect URI kaydet, `publish_video` + pages izinlerini iste, ekibi test user yap. `APP_ID/SECRET` → `.env`. `/auth/facebook/*` connection satırı yazıyor mu doğrula — **manuel adım, Meta for Developers hesabı gerekiyor; `.env`'de FACEBOOK_APP_ID/SECRET şu an boş**

### P2 — Live modülü (mobil)
- [x] **[KRİTİK]** Platform-agnostik deep-link handler: `lifesyclelive://connect-callback?platform=&status=`; `app.json` scheme = `lifesyclelive` doğru, `connectPlatform()` `openAuthSessionAsync` ile parametreleri platform bağımsız okuyor (Expo Go canlı cihaz testi hâlâ P3/D3 regresyonunda yapılmalı)
- [x] `ConnectAccountsScreen` yeniden: her platform için satır, `expo-web-browser` `openAuthSessionAsync` ile Connect, Disconnect, durum `GET /platform-connections`'dan (artık `CONNECTABLE_PLATFORMS` listesiyle platform bağımsız)
- [x] `app/src/api/platformConnections.ts` gerçek uçlara bağla; connect yolundaki mock dalını kaldır (generic `connectPlatform()`; `USE_MOCKS` dalı offline fallback olarak kalıyor, kasıtlı)

### P3 — CRM / QA (mobil)
- [x] `api/{contacts,leads,tasks,engagement}.ts` gerçek uçlara; `USE_MOCKS` sadece offline fallback kalsın — doğrulandı (2026-09-11): her fonksiyon `USE_MOCKS` dalıyla `apiRequest` çağırıyor, mock-only fonksiyon yok
- [x] Report sekmesi ekranları (tek ekran: `ReportScreen.tsx`, Leads+Tasks birleşik) gerçek veriye; `QueryBoundary` ile boş + hata durumları var (`ContactDetailScreen`, `BroadcastSummaryScreen` de gerçek uçlara bağlı)
- [ ] `docs/08-user-journeys.md`'den uçtan uca test checklist'i yaz; temiz Supabase test verisi hazırla

**Gün sonu devir:** P1 → P2: `/auth/:platform/start` (`{ authUrl }` döner) + deep-link parametre şekli sabitlendi. P3 test verisi seed'ini paylaşır.

---

## GÜN 2 — Fri · Yayına gir (Facebook + YouTube uçtan uca)

### P1 — Backend
- [x] **[KRİTİK]** `PlatformAdapter`'ı `PublishContext { agentId, connection }` alacak şekilde refactor et; `registry` + `routes/broadcasts.ts` + `ingestionService.ts` boyunca taşı (her poll'da connection'ı yeniden yükle) — `oauth/refresh.ts`'teki `resolveAgentConnection()` kullanılıyor
- [x] **[KRİTİK]** `FacebookAdapter`'ı gerçekten yaz: `publish` → `POST /<page-id>/live_videos` (`stream_url`'i böl); `fetchComments` → `/<video-id>/comments`; `end` → `end_live_video=true`. (`videoId` yerine mevcut `IngestInfo.providerRef.liveVideoId` deseni kullanıldı, YouTube ile tutarlı) — kod tamam, henüz gerçek Meta app ile test edilmedi (`.env`'de FACEBOOK_APP_ID/SECRET boş)
- [ ] `/auth/youtube/*` provider ekle (Google OAuth → refresh token `platform_connection`'a); `YoutubeAdapter`'ı `.env` token'dan per-agent connection'a geçir
- [ ] Gerçek FB + YT yayınıyla ingestion döngüsünü test et: dedupe (`externalId`), cursor (`since`), Groq sınıflandırma — **bloklandı:** FB Meta app kurulumu bekliyor, YT kanalında canlı yayın izni aktivasyonu bekleniyor (~24 saat)

### P2 — Live modülü
- [x] `PlatformSelector` sadece bağlı platformları aktif etsin; bağlı olmayanlarda "Önce bağla" ipucu — (2026-09-11) `PropertyDetailScreen` artık `getPlatformConnections()` çekiyor, one-click platformlar bağlı değilse disabled + "Connect first — tap to go to Connect Accounts" (tıklayınca `ConnectAccounts`'a yönlendiriyor); varsayılan seçim artık hardcoded facebook/youtube değil, gerçekten bağlı olanlar. Assisted platformlar (instagram/linkedin/tiktok) artık toggle edilemeyen bilgi çipi — onları seçip Go Live'a basmak `routes/broadcasts.ts`'te "no adapter" nedeniyle **tüm** broadcast'i 422 ile düşürüyordu (bu, kasıtlı honest-scaffold davranışı — sahte veri döndürmek yerine), UI artık bu garantili hataya hiç izin vermiyor
- [x] **BUG (2026-09-13)** — kullanıcı Facebook bağlıyken Go Live'ın 422 ile düştüğünü bildirdi ("youtube is not configured yet"): `PropertyDetailScreen` YouTube'u OAuth'u olmadığı için **her zaman bağlı** sayıyordu (satır ~51), sunucuda `YOUTUBE_*` boş olsa bile — bu yüzden Facebook seçiliyken YouTube da otomatik seçiliyor ve `/broadcasts` tüm platformların başarılı olmasını şart koştuğu için (broadcasts.ts:96) Facebook'un kendisi başarılı olsa bile broadcast `failed` oluyordu. Ayrıca bu durumda zaten oluşturulmuş Facebook live video'su hiç `end()` edilmiyordu (orphaned). Düzeltildi: `PropertyDetailScreen` artık `getPlatformAvailability()`'den gerçek `youtube.configured` değerini okuyor; `broadcasts.ts` artık kısmi başarısızlıkta zaten yayına giren platformları best-effort `end()` ile kapatıyor.
- [x] `broadcasts.ts` + `engagement.ts` tamamen gerçek; happy-path mock'ları kaldır — doğrulandı, mock-only kod yok
- [x] **[KRİTİK]** `LiveDashboardScreen`: gerçek `/broadcasts/:id/engagement` polling → feed + priority queue; ENCODER paneli gerçek RTMP hedefi + izleme linki — doğrulandı (`activeBroadcast.ingest`'ten gerçek `rtmpUrl`/`streamKey` okunuyor)
- [x] `BroadcastSummaryScreen` → `/broadcasts/:id/summary`; `liveSessionStore` scheduled → live → ended geçişleri — doğrulandı

### P3 — CRM / QA
- [ ] Yorum → lead/task kuralını P1 ile netleştir (hangi intent'ler çevrilir), çevrilen satırlar Report sekmesinde görünüyor mu doğrula — gerçek yayın verisi gerektiriyor, henüz test edilemedi
- [x] `AiPrepPanel`'i gerçek prep ucuna bağla — doğrulandı, `PropertyDetailScreen` → `getAiPrep()` → `server/src/routes/properties.ts` `/properties/:id/ai-prep`
- [ ] Facebook üzerinde ilk tam uçtan uca deneme; bug'ları repro adımlarıyla kaydet — Meta app kurulumu (60 günlük hesap) bekliyor

**Gün sonu devir:** P1 `EngagementEvent` şeklini dondurur (`freshness`, `intent`, `intentConfidence`). P2 + P3 tüm ekranların bunu kendi adapter'ı olmadan okuduğunu onaylar.

---

## GÜN 3 — Sat · Zoom, sağlamlaştır, yayınla

### P1 — Backend
- [~] `/auth/zoom/*` per-agent OAuth eklendi (`oauth/zoom.ts`, User-managed OAuth + refresh token rotasyonu); `ZoomAdapter.publish` hâlâ açık hata fırlatıyor — Zoom'un RTMP yönü ters (meeting'den dışa custom stream), IngestInfo{rtmpUrl,streamKey} modeline nasıl oturacağı netleşmeden fake veri dönülmedi, bkz. `adapters/zoom.ts` yorum
- [x] Instagram + TikTok: sadece kimlik-bağlama provider'ları (`oauth/instagram.ts` Facebook app üzerinden, `oauth/tiktok.ts` Login Kit), go-live yolu yok — assisted olarak işaretli
- [ ] **[KRİTİK]** `accessToken`/`refreshToken`'ı at-rest şifrele (app seviyesi), Supabase RLS aç, `.env` gitignored doğrula, seed şifresi + `JWT_SECRET` yenile
- [ ] **[KRİTİK]** Sunucuyu HTTPS'te deploy et; Meta/Google/Zoom konsollarındaki tüm `localhost:4000` redirect URI'lerini değiştir
- [ ] **[KRİTİK]** Gerçek lansmandan önce `server/src/routes/legal.ts`'deki placeholder Terms/Privacy sayfalarını gerçek metinle değiştir (ya da hukuki metin hazır olana kadar gerçek kullanıcıya açma); TikTok domain-verification route'ları (`oauth.ts`, `TIKTOK_DOMAIN_VERIFICATION*`) tek seferlik kurulum amaçlıydı, `.env`'den kaldırılabilir

#### Zoom / Instagram / LinkedIn / TikTok — developer console kurulumu (manuel, kullanıcı)
Kod hazır (`oauth/zoom.ts`, `oauth/instagram.ts`, `oauth/linkedin.ts`, `oauth/tiktok.ts`), sadece `.env` kimlik bilgileri eksik. Detaylı adımlar `server/.env.example` içinde her platformun bloğunda da var. X (Twitter) kasıtlı olarak kapsam dışı bırakıldı — üründe hiç yok, kullanıcı onayıyla atlandı (2026-09-11).

- [x] **Zoom** — marketplace.zoom.us'ta "General App" → "User-managed" app oluşturuldu (Zoom'un yeni UI'ında scope isimleri `meeting:write:meeting`, `meeting:read:meeting`, `user:read:user`). Redirect URL ngrok domain'i ile eklendi: `https://shadily-feed-tapioca.ngrok-free.dev/auth/zoom/callback` (Zoom `http://localhost` kabul etmiyor, HTTPS şart). `ZOOM_CLIENT_ID`/`ZOOM_CLIENT_SECRET` → `server/.env`
- [x] Zoom: `/auth/zoom/start` → consent → `/auth/zoom/callback` akışı uçtan uca test edildi, `PlatformConnection` satırı (platform=zoom, externalAccountName="Medine") doğrulandı
- [~] **Instagram — BLOKLANDI (2026-09-11), araya bırakıldı.** Kurulum tamamlandı: Instagram profesyonel hesabı (`@estat_eagent123`) oluşturuldu, Estate-agent Page'ine bağlandı (Business Suite "Bağlı Varlıklar" bunu doğruluyor), Facebook app'e `instagram_basic` izni eklendi, `pages_show_list`+`instagram_basic` token'a "granted" olarak yansıyor (debug logla doğrulandı). Buna rağmen `/me/accounts` **hep boş dizi `[]`** dönüyor — kök neden: Page, "Lifesycle-live" iş portföyüne (Business Portfolio) ait olduğu için klasik scope-tabanlı `/dialog/oauth` bu Page'i döndürmüyor. Denendi ve işe yaramadı: (1) app'i Facebook'tan kaldırıp yeniden bağlama, (2) Business Settings → Entegrasyonlar → Bağlı Uygulamalar (boştu, "Business Integrations" üzerinden app zaten aktifti ama asset-picker yoktu), (3) **Facebook Login for Business → Configurations** ile `config_id` tabanlı akışa geçiş (kod `oauth/instagram.ts` + `env.ts`'te güncellendi, `INSTAGRAM_LOGIN_CONFIG_ID=1575707484298374` `.env`'de) — bu da aynı boş sonucu verdi, muhtemelen Configuration'a Page tam atanmamış
- [ ] Instagram devam: ya (a) oluşturulan Configuration'ın **Assets/İzinler** sekmesinde Estate-agent Page'inin gerçekten seçili olduğunu ekran görüntüsüyle doğrula, ya da (b) tamamen ayrı **"API setup with Instagram login"** akışına geç (Page/Business Portfolio'ya hiç ihtiyaç duymuyor, ayrı Instagram App ID `1055706684126420` zaten oluşmuş durumda) — bu, `oauth/instagram.ts`'in yeniden yazılmasını gerektirir (farklı authorize/token endpoint'leri: instagram.com/oauth/authorize, scope `instagram_business_basic`)
- [ ] **LinkedIn** — www.linkedin.com/developers/apps → Create app → Products'a **"Sign In with LinkedIn using OpenID Connect"** ekle → Auth sekmesinde redirect URL: `https://shadily-feed-tapioca.ngrok-free.dev/auth/linkedin/callback` → `LINKEDIN_CLIENT_ID`/`LINKEDIN_CLIENT_SECRET` → `server/.env`
- [ ] LinkedIn: `/auth/linkedin/start` akışını test et, `PlatformConnection` satırı (platform=linkedin) yazılıyor mu doğrula
- [x] **TikTok** — developers.tiktok.com'da app oluşturuldu, **Sandbox** modunda (Production App Review'un istediği ToS/Privacy Policy/demo video sandbox'ta gerekmiyor) Login Kit + `user.info.basic` scope + Web redirect URI eklendi, Target Users'a test hesabı eklendi. Doğrulama için `server/src/routes/legal.ts` altında geçici `/legal/terms` + `/legal/privacy` placeholder sayfaları eklendi (bazı konsollar bu URL'leri app kaydı için zorunlu tutuyor — gerçek lansmandan önce değiştirilmeli). TikTok'un "URL properties" domain doğrulaması için `oauth.ts`'e iki geçici route eklendi (`env.tiktok.domainVerification`/`domainVerificationFilename`, `.env`'den okunuyor)
- [x] TikTok: `/auth/tiktok/start` → consent → callback akışı uçtan uca test edildi, `PlatformConnection` satırı (platform=tiktok, externalAccountName="estateagent33") doğrulandı
- [x] `ConnectAccountsScreen`'de Zoom/TikTok "Connected · <hesap adı>" gösteriyor mu doğrulandı (2026-09-11, Playwright ile app'in web build'i üzerinden canlı test): Facebook "Connected · Estate-agent", Zoom "Connected · Medine", TikTok "Connected · estateagent33", LinkedIn/Instagram "Not connected" + Connect butonu, YouTube "Not available yet" — hepsi doğru

### P2 — Live modülü
- [x] Instagram + TikTok için assisted rozeti — `ConnectAccountsScreen` artık `CONNECTABLE_PLATFORMS`'a eklendikleri için Connect/Disconnect gösteriyor, `PlatformSelector` zaten "Assisted — you start it in the app" grubunda listeliyor
- [ ] Canlı ekranlarda boş / hata / yeniden bağlanma durumlarını cilala
- [ ] App `.env`'i deploy edilen API'ye çevir; cihazda tam akışı tekrar doğrula

### P3 — CRM / QA
- [ ] **[KRİTİK]** Fiziksel cihazda tam regresyon: login → FB + YT bağla → yayına gir (OBS push) → yorum sınıflandırıldı → lead'e çevir → bitir → summary → lead/task Report'ta görünür
- [ ] `docs/08` + `docs/13` ile tutarlılık; bug bash, triyaj, P0'ları P1/P2 ile düzelt
- [ ] `README.md` + `TASKS.md` durum güncelle; 3 dakikalık demo senaryosu yaz

**Ship kapısı:** P3'ün regresyon koşusu release kapısıdır — deploy edilmiş API'ye karşı gerçek cihazda geçer, ya da D3 geçene kadar akşama sarkar.

---

## 📞 Yorum yapandan iletişim bilgisi — platform platform strateji (2026-09-13)

**Neden bu şekilde:** Hiçbir platformun API'si yorum yapanın telefon/e-posta/WhatsApp'ını vermiyor (bkz. `routes/leadCapture.ts` başındaki not) — bunlar platformların gizlilik politikası gereği API yüzeyinde hiç yok, ve scraping/reverse-image-search/3. parti veri satıcısıyla eşleştirme yoluyla bunu elde etmeye çalışmak KVKK/GDPR ihlali + platform ToS ihlali olur, yapılmayacak. Tek meşru yol: kişiyi **kendi isteğiyle** bilgisini bırakmaya davet etmek. Bunun için zaten bir form var: `GET /go/:broadcastId` (`routes/leadCapture.ts`) — isim + e-posta/telefon + mesaj alıp `Contact`/`Lead` oluşturuyor. Kalan iş, bu linki her platformda mümkün olan en görünür yere koymak.

- [x] **Facebook** — `FacebookAdapter.postCallToAction()` eklendi: yayın başlar başlamaz `/{live-video-id}/comments`'e CTA linkini ilk yorum olarak atıyor (`server/src/adapters/facebook.ts`). API'de "pin" yok ama ilk yorum olmak `filter=stream` kronolojik sırada üstte kalıyor.
- [x] **YouTube** — `YoutubeAdapter.postCallToAction()` eklendi: `liveChat/messages` insert ile aynı link chat'e yazılıyor; Data API'de pin endpoint'i olmadığından `ctaRepeatMs=5dk` ile `ingestionService` aynı mesajı periyodik tekrar gönderiyor ki chat kayarken kaybolmasın (`server/src/adapters/youtube.ts`, `server/src/services/ingestionService.ts`). **Ek manuel adım (agent):** YouTube Studio'dan bu mesajı elle "Pin" etmek istersen orada da sabitleyebilirsin — API bunu yapamıyor.
- [x] `routes/broadcasts.ts`: yayın `live` olur olmaz, `postCallToAction` destekleyen her platforma best-effort (broadcast'i düşürmeden) CTA gönderiliyor; link `PUBLIC_BASE_URL` env'i boşsa hiç gönderilmiyor (kırık localhost linki atılmasın diye) — **`.env`'e `PUBLIC_BASE_URL` eklenmeli** (ngrok/prod domain)
- [ ] **Zoom** — REST API'de canlı toplantı/webinar chat'ine dışarıdan mesaj yazma uç noktası yok (Zoom Chat API, Team Chat kanalları için, meeting-içi chat için değil) → `postCallToAction` uygulanamıyor. Gerçekçi yol: **webinar kaydı** zaten e-posta soruyor (kayıt formu = açık rıza) — bunu zorunlu tut, ayrıca CTA linkini webinar açıklamasına/kayıt onay e-postasına koy. `ZoomAdapter.publish` zaten bloklu (TASKS Gün 3 notu), bu adım onunla birlikte netleşecek
- [ ] **Instagram** — Live sırasında yorum/DM API'si yok (bkz. `.env.example` INSTAGRAM bloğu). Mekanizma: agent, yayın sırasında sesli/ekranda "yorum yazın, WhatsApp'tan dönüş yapacağız" der + kendi **wa.me click-to-chat** linkini (`https://wa.me/<agent numarası>`) bio/story'ye veya ekranda gösterir. Sunucu tarafında otomatik yapılabilecek bir şey yok; app tarafında iş: `GoLiveSetupScreen`/`LiveDashboardScreen`'de Instagram (ve LinkedIn/TikTok) seçiliyken "Bunu ekranda göster / kopyala" butonuyla `wa.me` linkini veya `/go/:id` linkini agent'a hazır sun
- [ ] **LinkedIn** — Live API yok (assisted-only). Aynı manuel model: agent CTA linkini kendi eliyle bir yorum olarak yapıştırır/pinler (LinkedIn UI'ı yorum pinlemeyi destekliyor, sadece API üzerinden değil)
- [ ] **TikTok** — Live API partner-kapalı (assisted-only). Aynı manuel model; TikTok yorumlarda tıklanabilir link göstermeyebiliyor, o yüzden en gerçekçi CTA burada agent'ın sesli söylediği kısa bir `wa.me` numarası/bio linki
- [ ] **App UI**: Instagram/LinkedIn/TikTok seçiliyken (assisted grubu) `PlatformSelector`/`GoLiveSetupScreen`'e "CTA linkini kopyala" kısayolu ekle — agent'ın yayın sırasında elle paylaşacağı `/go/:id` linkini tek dokunuşla panoya alsın
- [x] **YouTube CTA gerçek yayınla doğrulandı (2026-09-13):** `PUBLIC_BASE_URL` `.env`'e eklendi (mevcut ngrok domain'i), gerçek `.env` refresh token'ıyla iki test broadcast'i açılıp `liveChat/messages`'ta CTA linki doğrudan YouTube API'siyle okunarak teyit edildi. Bu sırada bir bug bulundu + düzeltildi: `ingestionService`'te `lastCtaAt` her platform için `0`'dan başladığından ilk poll tetiğinde (6sn sonra) CTA anında bir kez daha gönderiliyordu (broadcasts.ts'in ilk gönderimiyle üst üste) — `startIngestion` artık `lastCtaAt`'i `Date.now()` ile seed ediyor, ikinci testte tek mesaj doğrulandı. `/go/:id` sayfası da ngrok üzerinden gerçek tarayıcı isteğiyle test edildi, doğru render ediyor.
- [x] **Facebook bağlantısı çözüldü (2026-09-13) — kök neden Business Portfolio.** Estate-agent Page'i "Lifesycle-live" İşletme Portfolyosuna ait olduğu için klasik scope-tabanlı `/dialog/oauth` (`pages_show_list` vb.) `/me/accounts`'ta hep boş dizi dönüyordu (`no_managed_pages`) — `auth_type=rerequest` bile Page seçim ekranını hiç göstermedi (Business-owned Page'ler bu akışa hiç dahil değil). **Çözüm:** App Dashboard → Facebook Login for Business → Configurations'ta **"System-user access token"** tipinde yeni bir configuration oluşturuldu (`1791821211826533`), Assets adımında Pages + "Asset Required" işaretlendi, aynı 4 izin (`pages_show_list/pages_read_engagement/pages_manage_posts/publish_video`) eklendi. Kod tarafı: `oauth/facebook.ts` artık `env.facebook.loginConfigId` doluysa `config_id` ile, boşsa eski `scope` ile URL kuruyor (`env.ts`, `FACEBOOK_LOGIN_CONFIG_ID` — Instagram'ın `loginConfigId`'siyle aynı desen). Bu akışta Meta ayrıca "yeni varlık için işletme bilgisi" adımı istedi (Ad/E-posta/Ülke/**Website** — Website alanına `127.0.0.1` gibi geçersiz bir şey değil, gerçek erişilebilir bir URL gerekiyor; `PUBLIC_BASE_URL/health` kullanıldı, kök `/` 404 döndüğü için ilk denemede reddedilmişti). Sonuç: `GET /platform-connections` artık `facebook: Estate-agent` gösteriyor, doğrulandı.
- [ ] **Facebook CTA/gerçek yayın hâlâ bloklu — bu sefer Meta App Review yüzünden.** Bağlantı çalışıyor ama `POST /broadcasts` ile gerçek `live_videos` denemesi Graph API hatası (#10) verdi: *"To use live-video-api on behalf of people who are not admins, developers and testers of your app, your use of this endpoint must be reviewed and approved by Facebook."* Medine'nin kişisel hesabı App Roles'ta zaten var, ama System-user configuration'dan gelen Page token'ı Facebook'un review-muafiyeti (tester/admin/developer) kontrolünden farklı bir kimlik gibi değerlendiriliyor — yani "tester ekle" ile çözülecek bir şey değil, gerçek App Review şart. **Yapılacaklar (agent, developers.facebook.com üzerinden, manuel):**
  - [ ] **İş doğrulaması (Business Verification)** — Meta Business Suite → Business Settings → Security Center → Start verification (Advanced Access için genelde şart)
  - [x] `server/src/routes/legal.ts`'deki Terms/Privacy placeholder'ları gerçek içerikle değiştirildi (2026-09-13) — hangi Facebook izinlerinin ne için kullanıldığı, hangi verinin hiç toplanmadığı (yorumcu telefon/e-posta — bkz. `leadCapture.ts`), veri saklama/silme, iletişim maddeleri var. `https://shadily-feed-tapioca.ngrok-free.dev/legal/privacy` + `/legal/terms` çalışıyor. **Dikkat: bu ngrok tüneline bağlı — App Review başvurusundan önce kalıcı bir domain'e (prod deploy) taşınmalı, tünel kapanırsa linkler ölür ve review reddedilir**
  - [ ] App Dashboard → App Review → Permissions and Features → şu izinler için **Advanced Access** talep et: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `publish_video` (+ ayrıca "Live Video API" feature'ının kendisi ayrı listeleniyorsa onu da)
  - [ ] Her izin için Meta'nın istediği **ekran kaydı (screencast)**: gerçek go-live akışının (Connect Accounts → property seç → yayına gir → Facebook'ta canlı video oluşuyor) çalışır halde gösterilmesi gerekiyor
  - [ ] Başvuruyu gönder, sonucu bekle (günler sürebilir — TASKS.md'nin "⏸️ Parked" bölümündeki bilinen risk buydu zaten)
  - [ ] Review onaylanana kadar **YouTube CTA + ingestion akışıyla devam** — o taraf tamamen çalışır ve test edildi (yukarıdaki madde)

---

## ⏸️ Parked — fast-follow, bu sprint değil
- **Uygulama içi kamera → RTMP push.** Expo dev build + native modül + cihaz testi gerekir. Demo OBS / telefon RTMP uygulamasından ENCODER panelindeki hedefe push ile.
- **Meta App Review & YouTube app verification.** Günler süren kuyruk — sprint dev modda, ekip test user.
- **Token şifreleme → KMS.** D3 app-seviyesi yapar; managed KMS sonraki sertleştirme.
- **Çoklu Page / kanal seçici.** Şimdilik ilk Page/kanal otomatik bağlanır.

## ⚠️ Riskler
- **Adapter refactor (D2, P1)** aynı anda 4 dosyaya dokunur — öğleyi geçerse YouTube D3'e kayar, D2 demosunu tek başına Facebook taşır.
- **Zoom RTMP** agent'ın kendi ücretli planında bir özellik; yoksa Zoom connect çalışır ama go-live tasarım gereği plan hatası döner.
- **TikTok Live API** partner-kapalı, sprint içinde verilmez — sadece kimlik bağlama.
- **Expo Go'da deep link** kararsız olabilir; `openAuthSessionAsync` dönmezse D1'de dev build fallback.

---

# 📎 Referans: orijinal görev dağılımı (detay)

## 🎯 Sprint hedefi: "Bağlan → Yayına gir → Yorumları çek"

Bir agent uygulamadan Facebook hesabını bağlayabilmeli, bir mülk için yayına girebilmeli ve yayın sırasında gelen yorumlar AI ile sınıflandırılıp `EngagementFeed`'de görünmeli. Facebook uçtan uca çalışınca YouTube ve Zoom aynı desenle eklenecek.

---

## Kişi 1 — Backend: DB + Facebook entegrasyonu (uçtan uca)

### 0. ✅ BİTTİ — server ayağa kalktı (DB artık Supabase/Postgres, Oracle kaldırıldı)
- [x] Supabase projesi (`lifesycle-live`, Session pooler port 5432) → `server/.env` `DATABASE_URL`
- [x] `npm install` (yeni: `pg`, `dotenv`; `oracledb` kaldırıldı)
- [x] `npm run seed` (demo agent: agent@lifesycle.example / changeme123) + `npm run dev`
- [x] `GET http://localhost:4000/health` → `{ ok: true, db: true }`
- [ ] `server/src/routes/*` uçlarını (auth, contacts, leads, tasks, properties, broadcasts, engagement, platform-connections) Postman/curl ile tek tek doğrula

### 1. Facebook app kurulumu (Meta for Developers)
- [ ] Meta for Developers'ta uygulama oluştur, **Facebook Login for Business** + **Live Video API** ürünlerini ekle
- [ ] `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` → `server/.env`
- [ ] "Valid OAuth Redirect URIs" listesine `FACEBOOK_OAUTH_REDIRECT_URI` değerini ekle (`http://localhost:4000/auth/facebook/callback`)
- [ ] İzinler: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `publish_video` — App Review öncesi kendi test kullanıcılarıyla test edilebilir
- [ ] `server/src/services/facebookOAuth.ts` akışını test et: `/auth/facebook/start` → consent → `/auth/facebook/callback` → `PlatformConnection` satırı Page token ile kaydediliyor mu?

### 2. Facebook adapter'ı gerçekten yaz — `server/src/adapters/facebook.ts`
Şu an 3 metot da stub. Graph API v21 ile:
- [ ] **Token kaynağı:** Adapter artık `env.facebook.pageAccessToken` yerine ilgili agent'ın `PlatformConnection.accessToken` (Page token) değerini kullanmalı. Bu, adapter arayüzünün stateless singleton olmaktan çıkıp yayına giren agent'ın bağlantısını alması demek → `PlatformAdapter` arayüzü + `adapters/registry.ts` + `routes/broadcasts.ts` + `ingestionService.ts` bu token'ı taşıyacak şekilde güncellenmeli
- [ ] `publish()` — `POST /{page-id}/live_videos` → dönen `stream_url`'i `rtmpUrl` + `streamKey` olarak böl, `live_video_id`'yi sakla (yorum çekmek için lazım). `IngestInfo`'ya `videoId?: string` alanı eklenmeli
- [ ] `fetchComments()` — `GET /{live-video-id}/comments?filter=stream&since=<ts>&order=reverse_chronological` → her yorumu `RawComment`'e map et (`externalId: c.id`, `authorName: c.from.name`, `text: c.message`, `postedAt: new Date(c.created_time)`)
- [ ] `end()` — `POST /{live-video-id}` `end_live_video=true`
- [ ] Rate limit / token expiry / silinen yorum hatalarını yut, `ingestionService` bir sonraki poll'da tekrar denesin

### 3. Ingestion + AI doğrulama
- [ ] `server/src/services/ingestionService.ts` — gerçek Facebook yorumlarıyla poll döngüsünü test et, dedupe (`externalId`) ve cursor (`since`) mantığının çalıştığını doğrula
- [ ] `server/src/services/aiService.ts` — Groq key dolu; `classifyIntent` ve özet/öncelik akışlarını gerçek yorum metinleriyle test et
- [ ] `EngagementEvent` satırları `/broadcasts/:id/engagement` ucundan mobil uygulamaya düşüyor mu?

### 4. (Facebook bitince) YouTube + Zoom
- [ ] **YouTube:** `facebookOAuth.ts` benzeri bir OAuth akışı yok — Google Cloud Console'dan `YOUTUBE_OAUTH_CLIENT_ID/SECRET` al, `/auth/youtube/start` + `/auth/youtube/callback` route'larını ekle (refresh token'ı `PlatformConnection`'a kaydet). `youtube.ts` adapter: `liveBroadcasts`/`liveStreams` insert+bind, yorumlar için `liveChatMessages.list` (dönen `pollingIntervalMillis`'e uy)
- [ ] **Zoom:** Server-to-Server OAuth (`ZOOM_ACCOUNT_ID/CLIENT_ID/CLIENT_SECRET`). `zoom.ts` adapter: meeting/webinar oluştur + RTMP live streaming aç. Chat canlı çekilemiyor → `commentFreshness = "delayed"`, yayın sonrası meeting chat history'den çek

---

## Kişi 2 — Canlı Yayın (Live) Modülü — Mobil

### Hesap bağlama akışı
- [ ] `app/src/features/live/ConnectAccountsScreen.tsx` — şu an sadece `facebook` `CONNECTABLE`. Deep-link callback'ini (`lifesyclelive://connect-callback`) yakalayıp `connectFacebook()` sonucunu ekrana yansıt
- [ ] `app/src/api/platformConnections.ts` — `connectFacebook()` / `getPlatformConnections()` / `disconnectPlatform()` gerçek uçlara bağlı mı, deep-link dönüşü doğru parse ediliyor mu test et
- [ ] `app/app.json` `scheme` = `lifesyclelive` olduğunu ve OAuth redirect'inin uygulamaya geri döndüğünü doğrula

### Yayın akışı — mock'tan gerçeğe
- [ ] `app/src/api/broadcasts.ts`, `engagement.ts` — `app/src/api/mockData.ts` yerine gerçek API (Kişi 1'in uçları hazır oldukça)
- [ ] `app/src/features/live/GoLiveSetupScreen.tsx` — platform seçici sadece bağlı hesapları göstersin
- [ ] `app/src/live/rtmpStreamer.ts` — `publish()`'ten dönen `rtmpUrl`/`streamKey` ile gerçek RTMP push (Expo'da RTMP kısıtları — `docs/04-technical-feasibility.md` kontrol et)
- [ ] `app/src/features/live/LiveDashboardScreen.tsx` + `components/EngagementFeed.tsx` + `PriorityQueue.tsx` — `/broadcasts/:id/engagement` polling'i ile gerçek yorum akışı
- [ ] `app/src/features/live/components/AiPrepPanel.tsx` — AI hazırlık verisi gerçek uçtan
- [ ] `app/src/features/live/BroadcastSummaryScreen.tsx` — `/broadcasts/:id/summary` ucuna bağla
- [ ] `app/src/state/liveSessionStore.ts` — yayın durumu (scheduled/live/ended) state yönetimi

**Not:** Adapter token değişikliği (Kişi 1, madde 2) API sözleşmesini etkilemez; koordinasyon `EngagementEvent` alanları (`freshness`, `intent`, `intentConfidence`) üzerinden.

---

## Kişi 3 — CRM Modülü & QA/Entegrasyon — Mobil

### CRM ekranları — mock'tan gerçeğe
- [ ] `app/src/features/crm/ContactDetailScreen.tsx`, `LeadListScreen.tsx`, `TaskListScreen.tsx`
- [ ] `app/src/api/contacts.ts`, `leads.ts`, `tasks.ts`, `auth.ts` — `mockData.ts`'ten gerçek API'ye geçiş
- [ ] Yayından oluşan lead'ler (`EngagementEvent` intent = "buying_interest" → `Lead`) CRM'de görünüyor mu — Kişi 1 ile ingestion→lead köprüsünü netleştir

### Navigasyon & genel akış
- [ ] `app/src/navigation/RootNavigator.tsx`, `types.ts` — Connect / Live / CRM akışları arası geçiş, deep-link (`connect-callback`) handler
- [ ] `app/src/api/client.ts`, `config.ts` — base URL / auth token interceptor'ı gerçek ortama göre

### QA / Test
- [ ] Expo (v57 — `app/AGENTS.md`) gerçek cihaz/emülatörde uçtan uca: login → hesap bağla → yayına gir → yorum gör → yayını bitir → özet
- [ ] `docs/13-feature-prioritization.md` ve `docs/08-user-journeys.md` ile tutarlılık kontrolü
- [ ] Regresyon: CRM ve Live modülleri birlikte çalışırken

---

## ⚠️ Güvenlik notu

- [ ] `server/.gitignore` içinde `.env` olduğunu doğrula — App Secret, Groq key, Page access token'lar repoya girmemeli
- [ ] `PlatformConnection.accessToken` DB'de düz metin — en azından uygulama seviyesinde şifreleme (V2). Supabase'te Row Level Security'yi aç (API zaten service key ile bağlanıyor ama yine de)
- [ ] Facebook Page access token'ları ekip dışıyla paylaşılmamalı
