from pydantic import BaseModel, Field


class SmsTemplateParam(BaseModel):
    name: str = Field(min_length=1, max_length=64, description="نام پارامتر در پنل sms.ir (بدون #)")
    label_fa: str = Field(default="", max_length=120)


class SmsTemplate(BaseModel):
    id: str = Field(min_length=1, max_length=64, pattern=r"^[a-z][a-z0-9_]*$")
    label_fa: str = Field(min_length=1, max_length=120)
    template_id: int = Field(ge=0, description="شناسه قالب در پنل sms.ir")
    enabled: bool = True
    parameters: list[SmsTemplateParam] = Field(default_factory=list)


class SmsTestIn(BaseModel):
    phone: str = Field(min_length=10, max_length=20)
    template_id: str = Field(default="otp_login", description="شناسه داخلی پترن")


class SmsTestOut(BaseModel):
    ok: bool
    detail: str
    sms_sent: bool = False
