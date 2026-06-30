# راهنمای دیپلوی CORALAY

این پروژه شامل **Next.js** (فرانت)، **FastAPI** (API)، **PostgreSQL** (دیتابیس) و **MinIO** (ذخیره فایل) است. برای تولید، همه سرویس‌ها با Docker Compose روی یک سرور اجرا می‌شوند.

## پیش‌نیاز سرور

| مورد | حداقل پیشنهادی |
|------|----------------|
| RAM | ۴ گیگ (۸ گیگ اگر حذف پس‌زمینه AI فعال باشد) |
| CPU | ۲ هسته |
| دیسک | ۲۰ گیگ + فضای آپلود |
| OS | Ubuntu 22.04+ یا هر توزیع با Docker |
| نرم‌افزار | Docker 24+ و Docker Compose v2 |

```bash
# نصب Docker (اوبونتو)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

## معماری

```
                    ┌─────────────┐
  کاربر ──HTTPS──►  │   Nginx     │  :80
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
      ┌─────────┐    ┌─────────┐    ┌──────────┐
      │  web    │    │   api   │    │ postgres │
      │ Next.js │    │ FastAPI │    │          │
      └─────────┘    └────┬────┘    └──────────┘
                          │
                     ┌────▼────┐
                     │  minio  │
                     └─────────┘
```

- **یک دامنه** برای سایت و API (مثلاً `https://shop.example.com`)
- Nginx درخواست‌های `/api/` را به بک‌اند و بقیه را به فرانت می‌فرستد
- داده‌ها در volumeهای Docker پایدار می‌مانند (دیتابیس، فایل‌ها، MinIO)

---

## دیپلوی اولیه (گام‌به‌گام)

### ۱. کلون پروژه روی سرور

```bash
git clone <آدرس-مخزن> coralay
cd coralay
```

### ۲. تنظیم متغیرهای محیط

```bash
cp .env.production.example .env.production
nano .env.production
```

| متغیر | توضیح |
|-------|--------|
| `PUBLIC_SITE_URL` | آدرس عمومی سایت با `https://` |
| `NEXT_PUBLIC_API_URL` | خالی بگذارید (همان دامنه) |
| `POSTGRES_PASSWORD` | رمز قوی دیتابیس |
| `JWT_SECRET` | رشته تصادفی حداقل ۳۲ کاراکتر |
| `MINIO_ROOT_PASSWORD` | رمز MinIO |
| `TRUSTED_HOSTS` | دامنه بدون `https://`، مثلاً `shop.example.com,nginx,api` |

تولید `JWT_SECRET`:

```bash
openssl rand -hex 32
```

### ۳. اجرای دیپلوی

```bash
./scripts/deploy.sh
```

یا از ریشه پروژه:

```bash
npm run deploy
```

اولین build ممکن است ۱۰–۲۰ دقیقه طول بکشد (دانلود مدل rembg برای حذف پس‌زمینه).

### ۴. SSL (HTTPS)

Nginx داخل Docker روی پورت ۸۰ گوش می‌دهد. برای HTTPS یکی از این روش‌ها:

**روش A — Caddy جلوی Docker (ساده‌ترین)**

```bash
sudo apt install -y caddy
```

فایل `/etc/caddy/Caddyfile`:

```
shop.example.com {
    reverse_proxy localhost:80
}
```

```bash
sudo systemctl reload caddy
```

**روش B — Certbot + Nginx روی میزبان**

پورت `HTTP_PORT` را در `.env.production` به `8080` تغییر دهید و Nginx/Caddy میزبان را روی ۴۴۳ تنظیم کنید.

### ۵. بررسی سلامت

```bash
curl http://localhost/health
# {"status":"ok"}

curl -I http://localhost/
```

---

## آپدیت بعدی (روتین)

هر بار که کد جدید دارید:

```bash
cd coralay
./scripts/deploy.sh --pull
```

یا:

```bash
npm run deploy:pull
```

این کار:
1. `git pull` می‌زند
2. ایمیج‌ها را دوباره build می‌کند
3. سرویس‌ها را بدون downtime زیاد restart می‌کند

**داده‌ها حفظ می‌شوند** — volumeهای `pgdata`، `miniodata` و `uploads` پاک نمی‌شوند.

---

## دستورات مفید

```bash
# وضعیت سرویس‌ها
docker compose -f docker-compose.prod.yml --env-file .env.production ps

# لاگ زنده API
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f api

# لاگ فرانت
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f web

# ری‌استارت یک سرویس
docker compose -f docker-compose.prod.yml --env-file .env.production restart api

# توقف کامل (داده‌ها باقی می‌ماند)
docker compose -f docker-compose.prod.yml --env-file .env.production down
```

---

## بکاپ

### دیتابیس

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production \
  exec -T postgres pg_dump -U coralay coralay > backup-$(date +%F).sql
```

بازیابی:

```bash
cat backup.sql | docker compose -f docker-compose.prod.yml --env-file .env.production \
  exec -T postgres psql -U coralay coralay
```

### فایل‌های آپلود

```bash
docker run --rm \
  -v coralay_uploads:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/uploads-$(date +%F).tar.gz -C /data .
```

---

## تنظیمات تولید

| سرویس | محل تنظیم |
|--------|-----------|
| SMS، درگاه پرداخت، تنظیمات فروشگاه | پنل ادمین `/admin/settings` |
| متغیرهای حساس (JWT، DB) | `.env.production` |
| DNS | رکورد A به IP سرور |

### زرین‌پال

در `.env.production`:

```
PAYMENT_GATEWAY=zarinpal
ZARINPAL_MERCHANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
ZARINPAL_SANDBOX=false
```

سپس `./scripts/deploy.sh` را اجرا کنید.

### پیامک (sms.ir)

```
SMS_IR_API_KEY=...
SMS_IR_TEMPLATE_ID=123456
```

---

## توسعهٔ لوکال (بدون دیپلوی کامل)

فقط دیتابیس و MinIO در Docker:

```bash
docker compose up -d
```

سپس در دو ترمینال:

```bash
npm run dev:backend   # پورت 8000
npm run dev           # پورت 3000
```

فایل‌های env نمونه: `backend/.env.example` و `frontend/.env.example`

---

## عیب‌یابی

| مشکل | راه‌حل |
|------|--------|
| `JWT_SECRET باید...` | در `.env.production` رمز ۳۲+ کاراکتری تنظیم کنید و `DEBUG` نباید true باشد |
| اتصال API از مرورگر | `PUBLIC_SITE_URL` و `CORS` باید همان دامنه باشد؛ `NEXT_PUBLIC_API_URL` خالی بماند |
| تصاویر لود نمی‌شوند | مسیر `/api/media/` از nginx به API می‌رود — لاگ nginx و api را ببینید |
| حذف پس‌زمینه کند | اولین درخواست مدل ONNX را دانلود می‌کند؛ RAM کافی لازم است |
| پورت ۸۰ اشغال است | `HTTP_PORT=8080` در `.env.production` |

---

## فایل‌های مرتبط

| فایل | نقش |
|------|-----|
| `docker-compose.prod.yml` | استک تولید |
| `docker-compose.yml` | Postgres + MinIO برای توسعه |
| `.env.production.example` | نمونه متغیرها |
| `scripts/deploy.sh` | اسکریپت deploy/update |
| `infra/nginx/prod.conf` | پیکربندی Nginx |
| `frontend/Dockerfile` | ایمیج Next.js |
| `backend/Dockerfile` | ایمیج FastAPI |
