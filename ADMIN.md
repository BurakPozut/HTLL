# Drop kayıtları

`/api/subscribe` formu Supabase üzerindeki `subscribers` tablosuna kaydeder.
Telefon isteğe bağlıdır. E-posta küçük harfe çevrilir ve tekildir; tekrar gönderim
mevcut kayıt bilgilerini değiştirmez. Bildirim izni sürümü ve UTC kayıt zamanı tutulur.
Bu bir müşteri hesabı oluşturmaz ve e-posta/SMS göndermez.

Cloudflare Worker üzerinde `SUPABASE_URL` ve `SUPABASE_SECRET_KEY` secret'ları
tanımlanmalıdır. Secret key tarayıcıya gönderilmez ve Git'e eklenmez. D1 yalnızca
yönetici oturumları ile istek limitlerini saklamak için kullanılmaya devam eder.

## Yerel kurulum

1. `npm run db:local` — mevcut SQL migrations dosyalarını yerel veritabanına uygular.
2. `npm run admin:setup` — `.env.local` içine rastgele yönetici şifresi ekler.
   Var olan şifreyi değiştirmez. İlk oluşturulan erişim bilgisi `work/admin-access.txt`
   içindedir; bu dosya Git'e girmez.
3. Sunucuyu yeniden başlat: `npm run dev`.
4. `/admin` adresinden giriş yap. Arama, 50 kayıtlık sayfalama ve filtrelenmiş CSV
   indirme bulunur. CSV tek seferde en fazla 10.000 kayıt indirir.

Yerel yönetici oturumları ve istek limitleri `.wrangler/state` altında saklanır.
Waitlist kayıtları, yerel geliştirmede de yapılandırdığınız Supabase projesine yazılır.
Canlı verileri etkilememek için geliştirme ve üretim için ayrı Supabase projeleri kullanın.

## Canlıya geçiş

- D1 binding adı `DB` olarak tanımlanmalıdır. Hosting ortamında gerçek D1 veritabanı
  bağlanmalı ve `drizzle/` SQL migration dosyalarındaki `admin_sessions` ile
  `request_limits` tabloları uygulanmalıdır. `subscribers` tablosunun D1 kopyası artık
  uygulama tarafından kullanılmaz.
- `SUPABASE_URL` ve `SUPABASE_SECRET_KEY` Cloudflare secret olarak ayarlanmalıdır.
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
