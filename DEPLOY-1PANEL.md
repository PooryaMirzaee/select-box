# راهنمای دیپلوی CORALAY روی 1Panel (گام‌به‌گام)

این راهنما فرض می‌کند یک سرور لینوکسی تازه (Ubuntu 22.04+) داری و می‌خواهی کل استک
(Next.js + FastAPI + PostgreSQL + MinIO + Nginx) را با **Docker Compose** زیر مدیریت
**1Panel** بالا بیاوری و با دامنه و HTTPS رایگان منتشر کنی.

> نسخهٔ کد روی گیت‌هاب: `https://github.com/PooryaMirzaee/coralay`

---

## نمای کلی معماری روی سرور

```
کاربر ──HTTPS(443)──► OpenResty (خودِ 1Panel)
                          │  reverse proxy
                          ▼
                   nginx پروژه  (پورت 8090 روی هاست)
              ┌───────────┼───────────┐
              ▼           ▼            ▼
            web         api        postgres / minio
          Next.js     FastAPI
```

نکتهٔ کلیدی: خودِ 1Panel یک وب‌سرور (OpenResty) دارد که پورت‌های ۸۰ و ۴۴۳ را می‌گیرد.
پس nginx داخلی پروژه را روی یک پورت داخلی آزاد می‌گذاریم و دامنه را با **Reverse Proxy** خود
1Panel به آن وصل می‌کنیم؛ گواهی SSL را هم 1Panel به‌صورت رایگان (Let's Encrypt) می‌گیرد.

> در این راهنما پورت **8090** استفاده شده است. چون روی سرور تو پورت‌های ۸۰۸۰ و ۸۰۸۱
> توسط سایت‌های دیگر اشغال شده‌اند، از این‌ها استفاده نکن. اگر ۸۰۹۰ هم اشغال بود، هر پورت
> آزاد دیگری (مثلاً ۸۰۹۱، ۸۰۹۲، ...) را انتخاب کن. برای دیدن پورت‌های اشغال‌شده:
>
> ```bash
> ss -ltnp | grep -E ':(808[0-9]|809[0-9])'   # هر چه چاپ شد یعنی اشغال است
> ```
>
> هر مقداری که انتخاب کردی، همان را در گام‌های بعد به‌جای `8090` بگذار (هم در `HTTP_PORT`
> فایل `.env` و هم در آدرس Reverse Proxy).

---

## پیش‌نیازها

| مورد | حداقل |
|------|-------|
| RAM | ۴ گیگ (۸ گیگ پیشنهادی، چون حذف پس‌زمینه AI رم می‌خورد) |
| CPU | ۲ هسته |
| دیسک | ۲۰ گیگ + فضای آپلود |
| OS | Ubuntu 22.04+ |
| دامنه | یک رکورد **A** که به IP سرور اشاره کند (مثلاً `shop.example.com`) |

قبل از شروع مطمئن شو DNS دامنه به IP سرور وصل است (با `ping shop.example.com` چک کن).

---

## گام ۱ — نصب 1Panel

به سرور SSH بزن و اسکریپت رسمی را اجرا کن:

```bash
curl -sSL https://resource.fit2cloud.com/1panel/package/v2/quick_start.sh -o quick_start.sh
sudo bash quick_start.sh
```

> اگر این آدرس تغییر کرده بود، نسخهٔ به‌روز را از سایت رسمی 1Panel بردار.

در پایان نصب، 1Panel این‌ها را چاپ می‌کند که **یادداشت کن**:
- آدرس پنل (مثلاً `http://IP:PORT/خط‌چین`)
- نام کاربری و رمز
- پورت پنل (یک پورت تصادفی)

1Panel هنگام نصب، **Docker و Docker Compose** را هم نصب می‌کند؛ پس نیازی به نصب جداگانه نیست.

سپس وارد پنل وب 1Panel شو.

---

## گام ۲ — باز کردن پورت‌ها در فایروال

در 1Panel به مسیر زیر برو و مطمئن شو این پورت‌ها باز هستند:

**هاست (Hosts) → فایروال (Firewall)**

- پورت پنل 1Panel (همان که موقع نصب داد)
- پورت **80** و **443** (برای سایت و SSL)

پورت **8090** را عمومی **باز نکن** — فقط داخل سرور استفاده می‌شود.

---

## گام ۳ — گرفتن کد روی سرور

از داخل 1Panel یک ترمینال باز کن:

**هاست (Hosts) → ترمینال (Terminal)**  (یا مستقیم با SSH)

پروژه را داخل پوشهٔ Compose خودِ 1Panel کلون می‌کنیم تا 1Panel آن را به‌صورت یک
«Compose» بشناسد:

```bash
# نصب git اگر نبود
apt-get update && apt-get install -y git

# کلون داخل مسیر Compose خود 1Panel
mkdir -p /opt/1panel/docker/compose
cd /opt/1panel/docker/compose

# ── روش ۱ (ساده‌تر): اگر مخزن Public است ──
git clone https://github.com/PooryaMirzaee/coralay.git coralay

# ── روش ۲ (پیشنهادی برای مخزن Private): SSH ──
# ابتدا کلید SSH روی سرور بساز و public key را در GitHub → Settings → SSH keys اضافه کن:
#   ssh-keygen -t ed25519 -C "coralay-server" -f ~/.ssh/id_ed25519 -N ""
#   cat ~/.ssh/id_ed25519.pub
# سپس:
# git clone git@github.com:PooryaMirzaee/coralay.git coralay

# ── روش ۳ (Private با HTTPS): Personal Access Token ──
# GitHub → Settings → Developer settings → Personal access tokens → Fine-grained token
# دسترسی: Repository → coralay → Contents: Read
# git clone https://pooryamirzaee:<TOKEN>@github.com/PooryaMirzaee/coralay.git coralay

cd coralay

# فایل تولید را به نام پیش‌فرض docker-compose.yml کپی کن
cp docker-compose.prod.yml docker-compose.yml
```

> چرا کپی؟ 1Panel به‌صورت پیش‌فرض دنبال فایلی به نام `docker-compose.yml` در هر پوشه
> داخل `/opt/1panel/docker/compose/` می‌گردد. فایل اصلی تولید پروژه `docker-compose.prod.yml`
> است؛ با کپی‌کردنش به `docker-compose.yml` هم 1Panel آن را در تب Compose نشان می‌دهد و هم
> دستور `docker compose` به‌صورت خودکار فایل `.env` کنارش را می‌خواند.

---

## گام ۴ — ساخت فایل متغیرهای محیط (`.env`)

داخل همان پوشه، نمونه را کپی کن:

```bash
cp .env.production.example .env
```

مقادیر تصادفی امن بساز:

```bash
openssl rand -hex 32   # برای JWT_SECRET
openssl rand -hex 16   # برای رمز Postgres
openssl rand -hex 16   # برای رمز MinIO
```

حالا فایل `.env` را ویرایش کن (با `nano .env` یا از طریق **Files** در 1Panel) و این مقادیر را تنظیم کن:

```ini
# دامنهٔ عمومی با https
PUBLIC_SITE_URL=https://shop.example.com

# خالی بماند تا API از همان دامنه استفاده کند
NEXT_PUBLIC_API_URL=

# مهم: پورت داخلی آزاد (۸۰۸۰ و ۸۰۸۱ روی سرورت اشغال‌اند، پس از آن‌ها استفاده نکن)
HTTP_PORT=8090

POSTGRES_USER=coralay
POSTGRES_PASSWORD=<خروجی openssl>
POSTGRES_DB=coralay

MINIO_ROOT_USER=coralayminio
MINIO_ROOT_PASSWORD=<خروجی openssl>
MINIO_BUCKET=coralay-assets

JWT_SECRET=<خروجی openssl rand -hex 32>

# دامنه (بدون https) + نام سرویس‌های داخلی — حتماً دامنهٔ واقعی را بگذار
TRUSTED_HOSTS=shop.example.com,nginx,api,localhost

# پرداخت (فعلاً mock؛ بعداً زرین‌پال)
PAYMENT_GATEWAY=mock
ZARINPAL_MERCHANT_ID=
ZARINPAL_SANDBOX=true

# پیامک sms.ir (اختیاری)
SMS_IR_API_KEY=
SMS_IR_TEMPLATE_ID=0
```

> ⚠️ نکات امنیتی: `JWT_SECRET` باید حداقل ۳۲ کاراکتر باشد و رمزها را حتماً عوض کن.
> فایل `.env` در `.gitignore` هست و هرگز روی گیت‌هاب نمی‌رود.

---

## گام ۵ — بالا آوردن سرویس‌ها

دو روش داری؛ هر کدام راحت‌تر بود.

### روش A — از داخل UI خود 1Panel (پیشنهادی)

1. در 1Panel برو به **Containers → Compose (编排)**.
2. پروژهٔ `coralay` باید در لیست دیده شود (چون داخل پوشهٔ Compose کلون شد).
   اگر نبود، روی **Create** بزن و پوشهٔ `/opt/1panel/docker/compose/coralay` را انتخاب کن.
3. روی **Up / Start (启动)** بزن.

1Panel شروع به build و اجرای کانتینرها می‌کند. **اولین build ممکن است ۱۰ تا ۲۰ دقیقه طول بکشد**
(دانلود مدل حذف پس‌زمینه و وابستگی‌های Next.js). صبور باش.

### روش B — از ترمینال (همان نتیجه)

```bash
cd /opt/1panel/docker/compose/coralay
docker compose up -d --build
```

بعد از تمام شدن، وضعیت را ببین:

```bash
docker compose ps
```

باید سرویس‌های `postgres`, `api`, `web`, `nginx` در حالت `running/healthy` باشند.

تست سلامت محلی:

```bash
curl http://localhost:8090/health
# باید {"status":"ok"} بدهد
```

---

## گام ۶ — ساخت ادمین اولیه

جداول دیتابیس هنگام بالا آمدن `api` به‌صورت خودکار ساخته می‌شوند، اما کاربر ادمین باید یک‌بار
ساخته شود. اسکریپت `seed.py` داخل ایمیج نیست، پس آن را داخل کانتینر کپی و اجرا می‌کنیم:

```bash
cd /opt/1panel/docker/compose/coralay

# فقط ساخت/ریست ادمین (بدون داده‌ی نمونه)
docker compose cp backend/scripts/seed.py api:/app/seed.py
docker compose exec api python seed.py reset-admin
```

خروجی باید بدهد: `رمز ادمین بازنشانی شد: 09120000000 / admin123`

> اگر داده‌ی نمونه (دسته‌بندی/محصول/کوپن) هم می‌خواهی، به‌جای آرگومان `reset-admin` همان
> `python seed.py` را اجرا کن. برای فروشگاه واقعی، فقط `reset-admin` کافی است.

**حتماً بعد از اولین ورود، رمز ادمین `admin123` را از پنل عوض کن.**

---

## گام ۷ — اتصال دامنه و HTTPS با 1Panel

حالا سرویس روی `127.0.0.1:8090` بالاست. با OpenResty خود 1Panel آن را روی دامنه + SSL منتشر می‌کنیم.

1. در 1Panel برو به **Websites (网站) → Create Website (创建网站)**.
2. نوع را **Reverse Proxy (反向代理)** انتخاب کن.
3. مقادیر:
   - **Domain (主域名):** `shop.example.com`
   - **Proxy address (代理地址):** `http://127.0.0.1:8090`
4. ذخیره کن.
5. وارد همان وب‌سایت شو → تب **HTTPS** → گزینهٔ صدور گواهی **Let's Encrypt** را فعال کن و
   **Apply** بزن. (1Panel خودش گواهی رایگان می‌گیرد و تمدید خودکار می‌کند.)
6. گزینهٔ **Force HTTPS / HTTP→HTTPS** را روشن کن.

> اگر هنگام صدور گواهی خطا گرفتی، یعنی DNS هنوز به سرور وصل نیست یا پورت ۸۰ بسته است؛
> اول گام ۲ و رکورد A را چک کن.

### تنظیم هدرهای پراکسی (مهم برای آپلود فایل و WebSocket)

در تنظیمات همان وب‌سایت، بخش **Reverse Proxy → Config / Custom Nginx** این‌ها را اضافه کن
(تا آپلود فایل بزرگ و اتصال درست کار کند):

```nginx
client_max_body_size 64m;
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

ذخیره و reload کن.

---

## گام ۸ — بررسی نهایی

در مرورگر باز کن:

- `https://shop.example.com` → ویترین فروشگاه
- `https://shop.example.com/health` → `{"status":"ok"}`
- `https://shop.example.com/admin/login` → ورود ادمین با `09120000000` / `admin123`

اگر همه‌چیز بالاست، تمام است. 🎉

---

## آپدیت در آینده (نسخهٔ جدید کد)

هر وقت کد جدید روی گیت‌هاب رفت:

```bash
cd /opt/1panel/docker/compose/coralay
git pull
cp docker-compose.prod.yml docker-compose.yml
docker compose up -d --build
```

داده‌ها حفظ می‌شوند چون در volumeهای داکر (`pgdata`, `uploads`) ذخیره شده‌اند.

---

## بکاپ

### دیتابیس

```bash
cd /opt/1panel/docker/compose/coralay
docker compose exec -T postgres pg_dump -U coralay coralay > backup-$(date +%F).sql
```

> 1Panel هم در بخش **Databases** و **Cron Jobs** امکان بکاپ زمان‌بندی‌شده دارد؛ می‌توانی از آن استفاده کنی.

### فایل‌های آپلود

```bash
docker run --rm -v coralay_uploads:/data -v $(pwd):/backup \
  alpine tar czf /backup/uploads-$(date +%F).tar.gz -C /data .
```

---

## عیب‌یابی

| مشکل | راه‌حل |
|------|--------|
| `Password authentication is not supported` هنگام clone | مخزن Private است؛ GitHub رمز عبور نمی‌پذیرد. از **SSH** (روش ۲) یا **Personal Access Token** (روش ۳) در گام ۳ استفاده کن، یا مخزن را در GitHub → Settings → General → Danger zone → **Change visibility** به Public تغییر بده |
| گواهی SSL صادر نمی‌شود | DNS (رکورد A) و باز بودن پورت ۸۰ را چک کن |
| پورت ۸۰ اشغال است هنگام up | یعنی `HTTP_PORT` را روی ۸۰ گذاشتی؛ آن را در `.env` به `8090` تغییر بده و دوباره up کن |
| تصاویر/آپلود کار نمی‌کند | هدر `client_max_body_size 64m;` در reverse proxy خود 1Panel را اضافه کن |
| API از مرورگر وصل نمی‌شود | `PUBLIC_SITE_URL` باید دقیقاً دامنهٔ https باشد و `NEXT_PUBLIC_API_URL` خالی بماند |
| خطای `JWT_SECRET باید...` | در `.env` یک رشتهٔ ۳۲+ کاراکتری بگذار و `DEBUG` نباید true باشد |
| حذف پس‌زمینه کند است | اولین درخواست مدل ONNX را دانلود می‌کند؛ رم کافی لازم است |
| لاگ‌ها | `docker compose logs -f api` و `docker compose logs -f web` (یا از تب Logs کانتینر در 1Panel) |

---

## درگاه پرداخت زرین‌پال (بعداً)

در `.env`:

```ini
PAYMENT_GATEWAY=zarinpal
ZARINPAL_MERCHANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
ZARINPAL_SANDBOX=false
```

سپس `docker compose up -d --build` را دوباره اجرا کن.
