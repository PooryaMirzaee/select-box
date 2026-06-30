"""
اجتماع تمام روترهای نسخه ۱ API تحت پیشوند /api/v1.

ترتیب include تأثیری بر مسیرهای همپوشانی ندارد؛ هر روتر پیشوند فرعی خود را دارد.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    admin,
    admin_ai,
    admin_blog,
    admin_business,
    admin_ext,
    admin_banners,
    admin_header,
    admin_homepage,
    admin_users,
    ai,
    analytics,
    auth,
    blog,
    business,
    cart,
    catalog,
    chat,
    chat_ws,
    checkout,
    customizer,
    media,
    payments,
)

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(catalog.router)
api_router.include_router(blog.router)
api_router.include_router(business.router)
api_router.include_router(cart.router)
api_router.include_router(customizer.router)
api_router.include_router(ai.router)
api_router.include_router(auth.router)
api_router.include_router(checkout.router)
api_router.include_router(payments.router)
api_router.include_router(admin.router)
api_router.include_router(admin_users.router)
api_router.include_router(admin_ext.router)
api_router.include_router(admin_header.router)
api_router.include_router(admin_homepage.router)
api_router.include_router(admin_banners.router)
api_router.include_router(admin_business.router)
api_router.include_router(admin_blog.router)
api_router.include_router(admin_ai.router)
api_router.include_router(media.router)
api_router.include_router(chat.router)
api_router.include_router(chat.admin_router)
api_router.include_router(chat_ws.router)
api_router.include_router(analytics.router)
api_router.include_router(analytics.admin_router)
