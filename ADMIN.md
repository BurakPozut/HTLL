# Drop kayıtları

`/api/subscribe` formu Cloudflare D1 üzerindeki `subscribers` tablosuna kaydeder.
Telefon isteğe bağlıdır. E-posta küçük harfe çevrilir ve tekildir; tekrar gönderim
mevcut kayıt bilgilerini değiştirmez. Bildirim izni sürümü ve UTC kayıt zamanı tutulur.
Bu bir müşteri hesabı oluşturmaz ve e-posta/SMS göndermez.

## Yerel kurulum

1. `npm run db:local` — mevcut SQL migrations dosyalarını yerel veritabanına uygular.
2. `npm run admin:setup` — `.env.local` içine rastgele yönetici şifresi ekler.
   Var olan şifreyi değiştirmez. İlk oluşturulan erişim bilgisi `work/admin-access.txt`
   içindedir; bu dosya Git'e girmez.
3. Sunucuyu yeniden başlat: `npm run dev`.
4. `/admin` adresinden giriş yap. Arama, 50 kayıtlık sayfalama ve filtrelenmiş CSV
   indirme bulunur. CSV tek seferde en fazla 10.000 kayıt indirir.

Yerel kayıtlar `.wrangler/state` altında saklanır ve sunucu yeniden başlasa da kalır.
Bu klasörü silmek yerel verileri siler. Bunlar internetteki canlı veritabanına
otomatik aktarılmaz. `npm run db:generate` tablo değişiklikleri için yeni migration üretir.

## Canlıya geçiş

- `.openai/hosting.json` D1 binding adı `DB` olarak tanımlıdır. Hosting ortamında gerçek
  D1 veritabanı bağlanmalı ve `drizzle/` SQL migration dosyaları uygulanmalıdır.
- `HTLL_ADMIN_PASSWORD` en az 20 karakterlik ayrı bir üretim sırrı olarak ayarlanmalıdır.
  Yerel `.env.local` veya erişim dosyası yayınlanmamalıdır.
- Yönetim oturumu HttpOnly, SameSite=Strict çerezle 8 saat geçerlidir; HTTPS'te Secure
  kullanır. Ham oturum anahtarları veritabanında saklanmaz. Oturumsuz liste/CSV erişimi
  reddedilir; POST istekleri aynı origin ile sınırlandırılır.
- Şifre değiştirirken mevcut oturumları da iptal etmek için `admin_sessions` tablosunu
  temizle. Kullanıcının tarayıcısından yapılan çıkış ilgili oturumu anında siler.
- Gerçek ziyaretçilerden veri toplamadan önce markanın iletişim ve gizlilik metinlerini
  yayın akışına ekle. Mevcut kutu yalnızca drop bildirimi amacını belirtir.

`npm run test:registration` doğrulama/CSV testlerini çalıştırır. Eski `npm test` komutu
başlangıç şablonundaki eksik rendered-html test dosyasına işaret etmeye devam eder.
