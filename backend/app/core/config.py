"""
تنظیمات بارگذاری‌شده از محیط (فایل .env کنار backend یا متغیرهای سیستم).

استفاده از pydantic-settings اطمینان می‌دهد نوع فیلدها اعتبارسنجی می‌شود.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """تمام مقادیر قابل تنظیم از بیرون بدون تغییر کد."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "CORALAY Shop API"
    debug: bool = False

    # اتصال SQLAlchemy — پیش‌فرض لوکال با Postgres docker-compose
    database_url: str = "postgresql+psycopg2://coralay:coralay_dev@localhost:5432/coralay"

    # MinIO — endpoint بدون طرح؛ secure=false برای http لوکال
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "coralayminio"
    minio_secret_key: str = "coralayminio_dev_change_me"
    minio_bucket: str = "coralay-assets"
    minio_secure: bool = False

    # لیست مبداهای مجاز برای CORS؛ برای چند دامنه با ویرگول جدا کنید
    cors_origins: str = "http://localhost:3000"

    jwt_secret: str = "coralay-dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7

    # ذخیرهٔ محلی فایل‌ها وقتی MinIO در دسترس نیست
    upload_dir: str = "uploads"
    public_api_url: str = "http://localhost:8000"

    # OTP توسعه — وقتی sms.ir تنظیم نشده
    dev_otp_code: str = "123456"

    # sms.ir — https://sms.ir/
    sms_ir_api_key: str = ""
    sms_ir_template_id: int = 0
    sms_ir_api_base: str = "https://api.sms.ir"

    # آدرس فرانت برای ریدایرکت پس از پرداخت
    frontend_url: str = "http://localhost:3000"

    # زرین‌پال — می‌توان در پنل ادمین هم override شود
    zarinpal_merchant_id: str = ""
    zarinpal_sandbox: bool = True
    payment_gateway: str = "mock"

    # هاست‌های مجاز — برای TrustedHostMiddleware (ویرگول‌جداکننده)
    trusted_hosts: str = "localhost,127.0.0.1"

    # فقط در حالت mock — اگر خالی باشد confirm بدون secret فقط در debug مجاز است
    mock_payment_secret: str = ""


WEAK_SECRETS = frozenset({
    "coralay-dev-secret-change-in-production",
    "change-me-in-production",
    "coralayminio_dev_change_me",
})


def validate_production_settings() -> None:
    """در تولید (debug=false) تنظیمات خطرناک را رد می‌کند."""
    if settings.debug:
        return
    if settings.jwt_secret in WEAK_SECRETS or len(settings.jwt_secret) < 32:
        raise RuntimeError(
            "JWT_SECRET باید در تولید یک رشته تصادفی حداقل ۳۲ کاراکتر باشد"
        )
    origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
    if not origins:
        raise RuntimeError("CORS_ORIGINS باید در تولید تنظیم شود")
    if settings.database_url.startswith("sqlite"):
        raise RuntimeError("SQLite در تولید مجاز نیست — از Postgres استفاده کنید")


settings = Settings()
