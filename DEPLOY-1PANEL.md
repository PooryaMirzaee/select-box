# راهنمای دیپلوی SelectBox روی 1Panel (گام‌به‌گام)

فروشگاه **SelectBox** (`selectbox.ir`) — Next.js + FastAPI + PostgreSQL + Nginx داخلی.

مخزن: **https://github.com/PooryaMirzaee/select-box**

---

## نمای کلی روی سرور شما

روی سرور فعلاً چند استک Docker دارید:

| استک | کانتینرها | شبکه |
|------|-----------|------|
| CORALAY | `coralay-nginx`, `coralay-web`, `coralay-api`, `coralay-postgres` | `172.20.0.x` |
| ChillBar | `chillbar-web`, `chillbar-admin`, `chillbar-api`, `chillbar-postgres` | `172.19.0.x` |
| 1Panel | `1Panel-openresty` | پورت **80** و **443** روی هاست |

SelectBox هم **استک جدا** می‌شود (`selectbox-*`) و **نباید** پورت ۸۰/۴۴۳ را بگیرد.

```
کاربر ──HTTPS(443)──► OpenResty (1Panel)
                          │  reverse proxy
                          ▼
              nginx داخلی SelectBox  (پورت داخلی مثلاً 8092)
         ┌──────────┼──────────┐
         ▼          ▼          ▼
       web        api     postgres (فقط داخل Docker)
     Next.js    FastAPI
```

### قانون طلایی پورت‌ها

| پورت | وضعیت روی سرور شما | SelectBox |
|------|-------------------|-----------|
| **80 / 443** | اشغال — OpenResty 1Panel | ❌ استفاده نکن |
| **5432** | احتمالاً postgresهای coralay/chillbar | ❌ Postgres SelectBox فقط داخل شبکه Docker است (پورت هاست باز نمی‌شود) |
| **8090–8092** | معمولاً آزاد برای پروژه‌های جدید | ✅ `HTTP_PORT` را اینجا بگذار |

قبل از دیپلوی پورت آزاد پیدا کن:

```bash
ss -ltnp | grep -E ':(80|443|5432|808[0-9]|809[0-9])'
```

اولین پورت آزاد در بازه ۸۰۹۰–۸۰۹۹ را انتخاب کن (مثلاً **8092** اگر ۸۰۹۰ اشغال است).

---

## گام ۱ — ورود به 1Panel

از آدرس پنل (مثلاً `http://IP:PORT/...`) وارد شو.

فایروال (**هاست → فایروال**):
- **80** و **443** باز باشند (برای SSL و OpenResty)
- پورت داخلی SelectBox (مثلاً 8092) را **عمومی باز نکن** — فقط `127.0.0.1` کافی است

---

## گام ۲ — کلون پروژه

**هاست → ترمینال** (یا SSH):

```bash
apt-get update && apt-get install -y git

mkdir -p /opt/1panel/docker/compose
cd /opt/1panel/docker/compose

# Public
git clone https://github.com/PooryaMirzaee/select-box.git selectbox

# یا SSH (مخزن Private)
# git clone git@github.com:PooryaMirzaee/select-box.git selectbox

cd selectbox
cp docker-compose.prod.yml docker-compose.yml
```

---

## گام ۳ — ساخت `.env`

```bash
cp env.docker.example .env
```

رمزهای تصادفی:

```bash
openssl rand -hex 32   # JWT_SECRET
openssl rand -hex 16   # POSTGRES_PASSWORD
```

ویرایش `.env` (فقط `KEY=VALUE` — بدون کامنت اضافه):

```ini
PUBLIC_SITE_URL=https://selectbox.ir
NEXT_PUBLIC_API_URL=
HTTP_PORT=8092

POSTGRES_USER=selectbox
POSTGRES_PASSWORD=<خروجی openssl>
POSTGRES_DB=selectbox

JWT_SECRET=<خروجی openssl rand -hex 32>
TRUSTED_HOSTS=selectbox.ir,www.selectbox.ir,nginx,api,localhost,127.0.0.1
CORS_ORIGINS=https://selectbox.ir,https://www.selectbox.ir

PAYMENT_GATEWAY=mock
ZARINPAL_MERCHANT_ID=
ZARINPAL_SANDBOX=true
SMS_IR_API_KEY=
SMS_IR_TEMPLATE_ID=0
```

> ⚠️ اگر قبلاً `docker compose up` زدی، `POSTGRES_PASSWORD` را عوض نکن مگر `docker compose down -v` (دیتابیس پاک می‌شود).

### روش سریع (اسکریپت خودکار)

```bash
HTTP_PORT=8092 bash scripts/configure-selectbox.sh
```

این اسکریپت `.env` می‌سازد، build می‌کند، seed و ادمین را هم اجرا می‌کند.

---

## گام ۴ — بالا آوردن سرویس‌ها

### از UI 1Panel

1. **Containers → Compose**
2. پوشه `selectbox` را ببین (یا Create → مسیر `/opt/1panel/docker/compose/selectbox`)
3. **Up / Start**

### از ترمینال

```bash
cd /opt/1panel/docker/compose/selectbox
docker compose up -d --build
```

اولین build حدود **۱۰–۱۵ دقیقه** (Next.js + Python).

بررسی:

```bash
docker compose ps
# selectbox-postgres-1, selectbox-api-1, selectbox-web-1, selectbox-nginx-1 → healthy

curl http://127.0.0.1:8092/health
# {"status":"ok"}
```

کانتینرهای جدید (`selectbox-*`) با coralay و chillbar **تداخل نام/شبکه ندارند** چون `name: selectbox` در compose جداست.

---

## گام ۵ — ادمین و داده نمونه

```bash
cd /opt/1panel/docker/compose/selectbox
docker compose cp backend/scripts/seed.py api:/app/seed.py
docker compose exec -T api python seed.py          # داده نمونه (اختیاری — فقط اگر DB خالی)
docker compose exec -T api python seed.py reset-admin

# محصولات نمونهٔ اضافه (غیرمخرب — دادهٔ فعلی را پاک نمی‌کند)
docker compose cp backend/scripts/seed_demo_products.py api:/app/seed_demo_products.py
docker compose exec -T api python seed_demo_products.py
```

ورود: `https://selectbox.ir/admin/login` — `09120000000` / `admin123`

تنظیم کارت‌به‌کارت: **ادمین → تنظیمات → کارت‌به‌کارت**

---

## گام ۶ — Reverse Proxy در 1Panel

1. **Websites → Create Website → Reverse Proxy**
2. دامنه: `selectbox.ir` و `www.selectbox.ir`
3. آدرس پراکسی: `http://127.0.0.1:8092` (همان `HTTP_PORT`)
4. تب **HTTPS** → Let's Encrypt → Apply
5. **Force HTTPS** را فعال کن

### هدرهای سفارشی (آپلود رسید و فایل)

در **Reverse Proxy → Custom Nginx**:

```nginx
client_max_body_size 64m;
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

### CDN (پارس‌پک و مشابه)

- رکورد **A** → IP سرور
- **Bypass Cache** برای `/api/*` و `/admin/*`
- اگر HTTP کار می‌کند ولی HTTPS نه → SSL CDN را **Flexible** یا در 1Panel گواهی فعال کن

---

## گام ۷ — بررسی نهایی

```bash
bash scripts/check-deploy.sh
```

در مرورگر:

| آدرس | انتظار |
|------|--------|
| `https://selectbox.ir` | صفحه فروشگاه |
| `https://selectbox.ir/health` | `{"status":"ok"}` |
| `https://selectbox.ir/admin/login` | پنل ادمین |
| `https://selectbox.ir/checkout` | تسویه + کارت‌به‌کارت |

---

## آپدیت بعدی

```bash
cd /opt/1panel/docker/compose/selectbox
git pull
cp docker-compose.prod.yml docker-compose.yml
docker compose up -d --build
```

فقط nginx:

```bash
git pull && bash scripts/reload-nginx.sh
```

---

## بکاپ

```bash
# دیتابیس
docker compose exec -T postgres pg_dump -U selectbox selectbox > backup-$(date +%F).sql

# آپلودها
docker run --rm -v selectbox_uploads:/data -v $(pwd):/backup \
  alpine tar czf /backup/uploads-$(date +%F).tar.gz -C /data .
```

---

## عیب‌یابی

| مشکل | راه‌حل |
|------|--------|
| پورت اشغال / `address already in use` | `HTTP_PORT` دیگری انتخاب کن (8093، 8094، ...) |
| `JWT_SECRET باید...` | در `.env` رشته ۳۲+ کاراکتری؛ `DEBUG` نباید true باشد |
| `password authentication failed` | رمز Postgres با volume قدیمی فرق دارد → `docker compose down -v` و دوباره up |
| 502 از دامنه | `docker compose ps` — api/web healthy؟ پراکسی به پورت درست؟ |
| ادمین خالی | `bash scripts/check-admin.sh` — rebuild `web` |
| build → 403 Docker Hub | آینه registry در 1Panel → Container → Setting → Registry Mirrors |
| کارت‌به‌کارت | شماره کارت در ادمین → تنظیمات؛ رسید در جزئیات سفارش |

---

## زرین‌پال (بعداً)

در `.env`:

```ini
PAYMENT_GATEWAY=zarinpal
ZARINPAL_MERCHANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
ZARINPAL_SANDBOX=false
```

سپس `docker compose up -d --build` و در ادمین callback را هم چک کن.
