# SelectBox — فروشگاه لوازم خانگی و سبک زندگی

پلتفرم فروشگاه آنلاین فارسی (RTL) برای **selectbox.ir** — لوازم خانگی، سبک زندگی و وسایل روزمره.

## بخش‌ها

- **backend**: FastAPI، SQLAlchemy، REST تحت `/api/v1`
- **frontend**: Next.js 15 (App Router)، Tailwind
- **docker-compose.yml**: PostgreSQL 16 و MinIO

## پیش‌نیازها

- Docker (برای Postgres و MinIO)
- Python 3.12+
- Node.js 20+ و npm

## ۱) زیرساخت

```bash
docker compose up -d
```

## ۲) بک‌اند

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
export PYTHONPATH=.
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Seed دادهٔ نمونه:

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

- فروشگاه: http://localhost:3000
- API: http://localhost:8000/health
- محصول نمونه: `/product/samsung-rt28-refrigerator`

## پنل ادمین

- آدرس: `http://localhost:3000/admin/login`
- پس از seed: `09120000000` / `admin123`

## مشتری

- OTP توسعه: کد `123456`
- کوپن نمونه: `SELECTBOX10` (۱۰٪ تخفیف)

## دیپلوی

```bash
bash scripts/configure-selectbox.sh
```

راهنمای کامل: `DEPLOY.md`
