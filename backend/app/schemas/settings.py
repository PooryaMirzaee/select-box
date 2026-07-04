from pydantic import BaseModel, Field

from app.schemas.sms import SmsTemplate


class ShopSettingsPublic(BaseModel):
    shop_name: str
    shop_description: str
    default_meta_title: str
    default_meta_description: str
    site_url: str
    shipping_flat_toman: int
    currency_label: str
    payment_gateway: str
    card_transfer_enabled: bool = True
    card_number: str = ""
    card_holder: str = ""
    card_bank_name: str = ""
    card_transfer_instructions: str = ""
    contact_phone: str = ""
    contact_email: str = ""
    contact_whatsapp: str = ""
    contact_telegram: str = ""
    contact_instagram: str = ""
    contact_address: str = ""
    contact_hours: str = ""
    google_analytics_id: str = ""


class ShopSettingsAdmin(ShopSettingsPublic):
    zarinpal_merchant_id: str = ""
    zarinpal_sandbox: bool = True
    zarinpal_callback_url: str = ""
    sms_enabled: bool = False
    sms_ir_api_key: str = ""
    sms_ir_api_key_set: bool = False
    sms_ir_api_base: str = "https://api.sms.ir"
    sms_ir_line_number: str = ""
    dev_otp_code: str = "123456"
    sms_templates: list[SmsTemplate] = Field(default_factory=list)
    avalai_enabled: bool = False
    avalai_api_key: str = ""
    avalai_api_key_set: bool = False
    avalai_image_model: str = "gemini-2.5-flash-image"
    avalai_require_login: bool = True
    avalai_max_per_user_hour: int = 3
    avalai_max_per_user_day: int = 8
    avalai_max_global_day: int = 50
    avalai_max_per_ip_hour: int = 5
    avalai_cooldown_seconds: int = 45


class ShopSettingsPatch(BaseModel):
    shop_name: str | None = None
    shop_description: str | None = None
    default_meta_title: str | None = None
    default_meta_description: str | None = None
    site_url: str | None = None
    shipping_flat_toman: int | None = None
    currency_label: str | None = None
    payment_gateway: str | None = None
    card_transfer_enabled: bool | None = None
    card_number: str | None = None
    card_holder: str | None = None
    card_bank_name: str | None = None
    card_transfer_instructions: str | None = None
    zarinpal_merchant_id: str | None = None
    zarinpal_sandbox: bool | None = None
    zarinpal_callback_url: str | None = None
    google_analytics_id: str | None = None
    contact_phone: str | None = None
    contact_email: str | None = None
    contact_whatsapp: str | None = None
    contact_telegram: str | None = None
    contact_instagram: str | None = None
    contact_address: str | None = None
    contact_hours: str | None = None
    sms_enabled: bool | None = None
    sms_ir_api_key: str | None = None
    sms_ir_api_base: str | None = None
    sms_ir_line_number: str | None = None
    dev_otp_code: str | None = None
    sms_templates: list[SmsTemplate] | None = None
    avalai_enabled: bool | None = None
    avalai_api_key: str | None = None
    avalai_image_model: str | None = None
    avalai_require_login: bool | None = None
    avalai_max_per_user_hour: int | None = None
    avalai_max_per_user_day: int | None = None
    avalai_max_global_day: int | None = None
    avalai_max_per_ip_hour: int | None = None
    avalai_cooldown_seconds: int | None = None
