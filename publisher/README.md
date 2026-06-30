# Avan Publisher

اپلیکیشن **لوکال** برای دریافت محصولات از فروشگاه CORALAY و انتشار خودکار در کانال‌های فروش و شبکه‌های اجتماعی.

## معماری

```
CORALAY API  ──►  Avan Publisher  ──►  Channel Adapters
(localhost:8000)      (CLI)              ├── Instagram
                                         ├── Telegram
                                         ├── Digikala
                                         ├── Torob
                                         ├── Basalam
                                         └── Website
```

- **Plugin-based channels**: هر کانال یک `ChannelAdapter` مستقل است
- **Pipeline**: orchestrator مرکزی برای اجرای سناریوهای انتشار
- **Local state**: SQLite برای تاریخچه انتشار و cache محصولات
- **Config-driven**: فعال/غیرفعال کردن کانال‌ها از `config/channels.yaml`

## نصب

```bash
cd publisher
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e .
cp .env.example .env
```

## راه‌اندازی

1. بک‌اند CORALAY باید در حال اجرا باشد (`npm run dev:backend`)
2. فایل `.env` را تنظیم کنید
3. لاگین ادمین:

```bash
avan-publisher login
```

## رابط گرافیکی (UI)

```bash
# یک‌بار: ساخت UI
cd web && npm install && npm run build

# اجرای داشبورد لوکال
avan-publisher serve
# → http://127.0.0.1:8765
```

صفحات:
- **داشبورد** — وضعیت API و آمار محصولات
- **محصولات** — لیست و فیلتر
- **انتشار** — انتخاب محصول + کانال + dry-run
- **کانال‌ها** — وضعیت پیکربندی
- **تاریخچه** — لاگ انتشارها

## دستورات CLI

| دستور | توضیح |
|-------|-------|
| `avan-publisher health` | بررسی اتصال به API |
| `avan-publisher login` | احراز هویت و ذخیره توکن |
| `avan-publisher products list` | لیست محصولات |
| `avan-publisher products show <slug\|id>` | جزئیات محصول |
| `avan-publisher products sync` | همگام‌سازی با cache لوکال |
| `avan-publisher channels list` | کانال‌های ثبت‌شده |
| `avan-publisher publish -p <id> -c instagram,telegram` | انتشار |
| `avan-publisher publish -p 1 -c torob --dry-run` | شبیه‌سازی |
| `avan-publisher status` | تاریخچه انتشار |

## افزودن کانال جدید

1. فایل جدید در `avan_publisher/channels/` بسازید:

```python
from avan_publisher.channels.base import ChannelAdapter
from avan_publisher.core.registry import register_channel

@register_channel
class MyChannel(ChannelAdapter):
    channel_id = "my_channel"
    name = "My Channel"
    description = "..."

    @classmethod
    def validate_config(cls, config: dict) -> list[str]:
        return []

    def publish(self, ctx):
        ...
```

2. در `channels/__init__.py` import کنید
3. در `config/channels.yaml` اضافه کنید

## ساختار پروژه

```
publisher/
├── avan_publisher/
│   ├── api/           # HTTP client + models
│   ├── channels/      # Channel adapters (plugins)
│   ├── core/          # Pipeline, registry, store
│   └── cli.py         # Typer CLI
├── config/
│   └── channels.yaml
├── tests/
└── pyproject.toml
```

## توسعه

```bash
pip install -e ".[dev]"
pytest
ruff check avan_publisher
```

## وضعیت کانال‌ها

| کانال | وضعیت |
|-------|-------|
| website | فعال — verify listing |
| torob | فعال — pull-based via backend |
| instagram | stub — آماده توسعه |
| telegram | stub — آماده توسعه |
| digikala | stub — آماده توسعه |
| basalam | stub — آماده توسعه |
