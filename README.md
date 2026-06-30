# =============================================================================
# آون — فروشگاه لوکس (اسکلت Local-First)
# -----------------------------------------------------------------------------
# راهنمای سریع اجرا؛ جزئیات معماری در پوشه docs/
# =============================================================================

این مخزن شامل سه بخش است.

کامنت‌ها در سراسر کد (بک‌اند، فرانت، Docker، …) به **فارسی** افزوده شده‌اند؛ مستندات تکمیلی در پوشه **`docs/`** است.

- **backend**: FastAPI، مدل‌های SQLAlchemy، REST تحت `/api/v1`
- **frontend**: Next.js 15 (App Router)، Tailwind، سئو پویا
- **docker-compose.yml**: PostgreSQL 16 و MinIO

## مستندات جداگانه

فهرست کامل سندها: **[`docs/README.md`](docs/README.md)**

راهنمای دیپلوی production: **[`docs/DEPLOY.md`](docs/DEPLOY.md)**

## پیش‌نیازها

- Docker (برای Postgres و MinIO)
- Python 3.12+ با `pip` و در صورت تمایل `venv`
- Node.js 20+ و npm (برای فرانت‌اند)

## ۱) زیرساخت

```bash
docker compose up -d
```

## ۲) بک‌اند

اگر **Docker / Postgres** در دسترس نیست، در `backend/.env` مقدار `DATABASE_URL=sqlite:///./avan_local.db` را بگذارید (فایل `.env` نمونه در مخزن برای همین تنظیم شده است). برای Postgres رسمی همان رشتهٔ اتصال `postgresql+psycopg2://...` را پس از `docker compose up` استفاده کنید.

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # ویندوز: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
export PYTHONPATH=.
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

در ترمینال دیگر (با همان `PYTHONPATH` و venv):

```bash
cd backend && source .venv/bin/activate && PYTHONPATH=. python scripts/seed.py
```

## ۳) فرانت‌اند

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

- ویترین: [http://localhost:3000](http://localhost:3000)
- API سلامت: [http://localhost:8000/health](http://localhost:8000/health)
- نمونه محصول (پس از seed): `/product/batman-tshirt`

## Nginx

نمونهٔ پروکسی معکوس در `infra/nginx/default.conf`؛ جزئیات در [`docs/setup-and-deploy.md`](docs/setup-and-deploy.md).

## پنل ادمین

- آدرس: `http://localhost:3000/admin/login`
- پس از seed: موبایل `09120000000` — رمز `admin123`
- آپلود موکاپ در بخش «طرح‌ها»

## مشتری

- ورود OTP (توسعه): کد ثابت `123456` در `DEV_OTP_CODE`
- کوپن نمونه: `AVAN10` (۱۰٪ تخفیف)

## نکات تولید

- `JWT_SECRET` و رمز ادمین را عوض کنید
- برای Postgres/MinIO از `docker compose` استفاده کنید
- درگاه پرداخت فعلاً شبیه‌ساز است؛ اتصال زرین‌پال در `payments` باقی مانده
