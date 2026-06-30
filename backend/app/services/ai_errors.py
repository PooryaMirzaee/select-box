"""خطاهای سرویس طراحی هوشمند — پیام کاربر جدا از جزئیات فنی."""

from __future__ import annotations


class AiServiceError(Exception):
    """خطای قابل نمایش به کاربر بدون افشای سرویس‌دهندهٔ پشتیبان."""

    def __init__(self, user_message: str, *, internal: str | None = None, retryable: bool = False):
        super().__init__(user_message)
        self.user_message = user_message
        self.internal = internal or user_message
        self.retryable = retryable


# پیام‌های عمومی — بدون نام AvalAI
MSG_BUSY = (
    "الان تقاضا برای طراحی هوشمند زیاد است. "
    "لطفاً حدود یک دقیقه صبر کنید و دوباره «ساخت طرح» را بزنید."
)
MSG_UNAVAILABLE = "طراحی هوشمند در این لحظه در دسترس نیست. چند دقیقه بعد دوباره امتحان کنید."
MSG_NO_IMAGE = "طرحی ساخته نشد — توضیح را کمی واضح‌تر بنویسید و دوباره تلاش کنید."
MSG_NOT_CONFIGURED = "طراحی هوشمند هنوز فعال نشده است."
