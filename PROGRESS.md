# Mission Progress — Lifesycle Live

Son güncelleme: 2026-09-14. Detaylı görev bazlı takip için `TASKS.md`, mimari için `CLAUDE.md`.

## 🎯 Misyon
Emlak danışmanının tek dokunuşla birden fazla platformda canlı yayına girmesi, CRM'in
yayın sırasında yorumları izleyip lead/task'e çevirmesi ve AI'ın yayın öncesi/sırası/sonrasında
devreye girmesi. Sprint hedefi: **"Bağlan → Yayına gir → Yorumları çek"** — önce Facebook,
sonra aynı desenle YouTube ve Zoom.

## ✅ Bitmiş / Çalışan
- **Backend altyapı**: Server Oracle'dan Supabase/Postgres'e taşındı, ayakta (`GET /health`).
- **Auth**: App'te login ekranı + token saklama + auth gate; JWT access/refresh backend'de var.
- **Per-agent OAuth çatısı**: Genel `oauth/` provider registry + `/auth/:platform/start`/`callback`
  deseni; Facebook, YouTube, Zoom, Instagram, LinkedIn, TikTok için kod yazıldı.
- **Facebook**: OAuth bağlantısı çözüldü (Business Portfolio kaynaklı `no_managed_pages` sorunu,
  System-user access token configuration ile aşıldı). `FacebookAdapter` (`publish`/`fetchComments`/
  `end`) gerçek Graph API çağrılarıyla yazıldı. CTA (yorumcuları `/go/:id` formuna yönlendirme)
  ilk yorum olarak otomatik atılıyor.
- **YouTube**: `YoutubeAdapter` gerçek implementasyon, `npm run youtube:auth` yardımcı script'i.
  CTA + ingestion **gerçek yayınla uçtan uca doğrulandı** (2026-09-13) — şu an tek tam çalışan platform.
- **Zoom**: OAuth bağlantısı uçtan uca test edildi (`PlatformConnection` satırı doğrulandı);
  `publish()` henüz yazılmadı (RTMP yönü ters olduğu için tasarım netleşmeden fake veri dönülmüyor).
- **Instagram / TikTok**: Kimlik-bağlama (identity-only) OAuth çalışıyor ve doğrulandı; go-live
  API'leri yok, bilinçli olarak "assisted" (elle paylaşılan CTA linki) modelde bırakıldı.
- **LinkedIn**: Kod hazır, developer console kurulumu henüz yapılmadı.
- **App UI**: Listings galerisi, PropertyDetail, renkli PlatformSelector (sadece bağlı platformları
  aktif ediyor), foto galerisi, `ConnectAccountsScreen` tüm platformları gösteriyor ve doğrulandı.
- **Live Dashboard**: Gerçek `/broadcasts/:id/engagement` polling, ENCODER paneli gerçek RTMP hedefi.
- **Report sekmesi**: Leads + Tasks birleşik ekran, gerçek uçlara bağlı; `BroadcastSummaryScreen`
  gerçek özet ucundan okuyor.
- **Legal**: Terms/Privacy sayfaları gerçek içerikle dolduruldu (Facebook App Review başvurusu için).
- **Bug fix (2026-09-13)**: Facebook bağlıyken YouTube'un yanlışlıkla "her zaman bağlı" sayılıp
  broadcast'i 422 ile düşürmesi düzeltildi; kısmi başarısızlıkta zaten açılmış platformlar artık
  best-effort kapatılıyor (orphaned live video kalmıyor).

## 🚧 Bloklanmış / Beklemede
- **Facebook canlı yayın**: Bağlantı çalışıyor ama gerçek `live_videos` isteği Graph API #10
  hatası veriyor — **Meta App Review şart** (Advanced Access: `pages_show_list`,
  `pages_read_engagement`, `pages_manage_posts`, `publish_video` + Live Video API). Business
  Verification, ekran kaydı ve başvuru hâlâ yapılmadı; onay günler sürebilir.
- **Zoom `publish()`**: Zoom'un RTMP modeli (meeting'den dışa custom stream) `IngestInfo`
  modeline nasıl oturacağı netleşmeden fake veri dönülmüyor — açık hata fırlatıyor.
- **Instagram**: Business Portfolio kaynaklı aynı sorun; Configuration asset ataması ya da
  ayrı "API setup with Instagram login" akışına geçiş gerekiyor.
- **LinkedIn**: Developer console app kurulumu henüz yapılmadı.

## 📋 Kalan kritik işler (TASKS.md'den)
- Meta App Review başvurusu (Business Verification → izin talebi → screencast → submit).
- Token'ları at-rest şifreleme + Supabase RLS açma; seed şifresi + `JWT_SECRET` yenileme.
- Sunucuyu HTTPS'te (kalıcı domain) deploy etme — ngrok tüneli App Review için yeterli değil.
- Fiziksel cihazda tam regresyon: login → FB+YT bağla → yayına gir → yorum sınıflandı →
  lead'e çevir → bitir → summary → Report'ta görünür.
- Assisted platformlar (Instagram/LinkedIn/TikTok) için app'te "CTA linkini kopyala" kısayolu.

## 📝 Not
Bu bir dürüst iskelet (honest scaffold) projesi — yapılandırılmamış/yazılmamış entegrasyonlar
sahte veri döndürmek yerine açık hata fırlatıyor (`CLAUDE.md`). İlerleme ölçütü "ekranda bir şey
görünüyor mu" değil, "gerçek platform API'siyle doğrulandı mı" — yukarıdaki "doğrulandı" ibareleri
bu anlama geliyor.
