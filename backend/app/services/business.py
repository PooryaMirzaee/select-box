"""منطق لندینگ و درخواست سفارش سازمانی."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.business import BusinessLanding, BusinessQuoteRequest
from app.schemas.business import (
    BusinessFeature,
    BusinessFaq,
    BusinessGalleryItem,
    BusinessLandingPublic,
    BusinessPricingTier,
    BusinessProcessStep,
    BusinessStat,
    BusinessTestimonial,
    BusinessTrustBadge,
    BusinessTrustLogo,
    BusinessUseCase,
)
from app.services.storage import public_url

HUB_SLUG = "hub"
PRODUCT_LANDING_SLUGS = frozenset()


def _default_trust_content(slug: str) -> dict:
    """محتوای پیش‌فرض گالری و اعتمادسازی."""
    gallery_titles = {
        "hub": "پروژه‌های تأمین لوازم خانگی",
        "kitchen": "تأمین لوازم آشپزخانه",
        "laundry": "تأمین لوازم شستشو",
        "climate": "تأمین سرمایش و گرمایش",
    }
    logos = [
        BusinessTrustLogo(name_fa="سازنده مسکن"),
        BusinessTrustLogo(name_fa="هتل و اقامتگاه"),
        BusinessTrustLogo(name_fa="شرکت خدماتی"),
        BusinessTrustLogo(name_fa="مجتمع تجاری"),
        BusinessTrustLogo(name_fa="اداره و سازمان"),
    ]
    badges = [
        BusinessTrustBadge(icon="check", title="گارانتی اصلی", description="تمام محصولات با گارانتی معتبر"),
        BusinessTrustBadge(icon="package", title="پیش‌فاکتور رسمی", description="قیمت شفاف پیش از خرید"),
        BusinessTrustBadge(icon="sparkles", title="مشاوره تخصصی", description="راهنمایی در انتخاب محصول"),
        BusinessTrustBadge(icon="shirt", title="ارسال پروژه‌ای", description="تحویل منظم برای پروژه‌های بزرگ"),
    ]
    testimonials = [
        BusinessTestimonial(
            quote="برای ۴۰ واحد مسکونی لوازم آشپزخانه تأمین کردیم — کیفیت و زمان تحویل عالی بود.",
            author_name="سارا محمدی",
            author_role="مدیر پروژه",
            company="سازنده مسکن",
            rating=5,
        ),
        BusinessTestimonial(
            quote="پیش‌فاکتور سریع و شفاف بود. تیم پشتیبانی در انتخاب برند و مدل راهنمایی کرد.",
            author_name="امیر رضایی",
            author_role="مدیر تدارکات",
            company="هتل پنج‌ستاره",
            rating=5,
        ),
        BusinessTestimonial(
            quote="لوازم خانگی دفتر جدیدمان را یکجا از SelectBox خریدیم — بسته‌بندی و نصب مرتب.",
            author_name="نیلوفر کریمی",
            author_role="مدیر اداری",
            company="شرکت فناوری",
            rating=5,
        ),
    ]
    return {
        "gallery_images": [],
        "gallery_title": gallery_titles.get(slug, gallery_titles["hub"]),
        "trust_logos": logos,
        "trust_badges": badges,
        "testimonials": testimonials,
        "trust_section_title": "مورد اعتماد سازمان‌ها و پروژه‌ها",
    }


def _resolve_gallery_item(raw: dict) -> BusinessGalleryItem:
    url = None
    if raw.get("storage_key"):
        url = public_url(raw["storage_key"])
    elif raw.get("external_url"):
        url = raw["external_url"]
    return BusinessGalleryItem(
        id=str(raw.get("id", "")),
        caption_fa=raw.get("caption_fa"),
        sort_order=int(raw.get("sort_order", 0)),
        storage_key=raw.get("storage_key"),
        external_url=raw.get("external_url"),
        image_url=url,
    )


def _resolve_trust_logo(raw: dict) -> BusinessTrustLogo:
    key = raw.get("storage_key")
    return BusinessTrustLogo(
        name_fa=raw.get("name_fa", ""),
        storage_key=key,
        logo_url=public_url(key) if key else None,
    )


def _default_hub() -> dict:
    return {
        "slug": HUB_SLUG,
        "name_fa": "سفارش عمده",
        "title": "تأمین لوازم خانگی برای پروژه‌ها و سازمان‌ها",
        "subtitle": "برای ساختمان، هتل، اداره و پروژه‌های بزرگ — قیمت عمده، گارانتی اصلی و ارسال منظم.",
        "hero_badge": "B2B · سفارش عمده",
        "meta_title": "سفارش عمده لوازم خانگی — SelectBox",
        "meta_description": "تأمین لوازم خانگی برای پروژه‌ها و سازمان‌ها با قیمت پلکانی، گارانتی اصلی و پشتیبانی اختصاصی.",
        "min_order_qty": 5,
        "features": [
            BusinessFeature(
                icon="package",
                title="قیمت پلکانی",
                description="هرچه حجم سفارش بیشتر، قیمت واحد کمتر — مناسب پروژه‌های بزرگ.",
            ),
            BusinessFeature(
                icon="sparkles",
                title="مشاوره تخصصی",
                description="انتخاب بهترین برند و مدل متناسب با نیاز پروژه.",
            ),
            BusinessFeature(
                icon="check",
                title="پیش‌فاکتور رسمی",
                description="پیش از خرید، پیش‌فاکتور شفاف دریافت کنید.",
            ),
            BusinessFeature(
                icon="shirt",
                title="گارانتی اصلی",
                description="تمام محصولات با گارانتی معتبر و خدمات پس از فروش.",
            ),
        ],
        "pricing_tiers": [],
        "use_cases": [
            BusinessUseCase(
                title="پروژه‌های مسکونی",
                description="تأمین یکجای لوازم آشپزخانه و شستشو برای واحدهای مسکونی.",
            ),
            BusinessUseCase(
                title="هتل و اقامتگاه",
                description="لوازم خانگی استاندارد برای اتاق‌ها و آشپزخانه.",
            ),
            BusinessUseCase(
                title="ادارات و سازمان‌ها",
                description="تجهیز فضای اداری و آبدارخانه با لوازم باکیفیت.",
            ),
        ],
        "process_steps": [
            BusinessProcessStep(title="ثبت درخواست", description="فرم را پر کنید یا با ما تماس بگیرید."),
            BusinessProcessStep(title="پیش‌فاکتور", description="ظرف ۲۴ ساعت پیش‌فاکتور و زمان تحویل."),
            BusinessProcessStep(title="تأیید و تأمین", description="پس از تأیید، تأمین و کنترل کیفیت."),
            BusinessProcessStep(title="ارسال", description="ارسال منظم به سراسر کشور با بسته‌بندی ایمن."),
        ],
        "faqs": [
            BusinessFaq(
                question="حداقل سفارش چند عدد است؟",
                answer="بسته به نوع محصول از ۵ عدد شروع می‌شود؛ برای پروژه‌های بزرگ شرایط ویژه داریم.",
            ),
            BusinessFaq(
                question="آیا نصب هم انجام می‌دهید؟",
                answer="برای برخی محصولات مانند کولر گازی، هماهنگی نصب امکان‌پذیر است.",
            ),
            BusinessFaq(
                question="زمان تحویل چقدر است؟",
                answer="بسته به حجم سفارش، معمولاً ۳ تا ۱۰ روز کاری.",
            ),
        ],
        "stats": [
            BusinessStat(value="۲۴h", label="پاسخ پیش‌فاکتور"),
            BusinessStat(value="۵+", label="حداقل سفارش"),
            BusinessStat(value="۱۰۰٪", label="گارانتی اصلی"),
        ],
        "cta_primary": "درخواست پیش‌فاکتور",
        "cta_secondary": "مشاهده محصولات",
        "sort_order": 0,
        **_default_trust_content("hub"),
    }


def _default_product(slug: str) -> dict:
    presets: dict[str, dict] = {
        "tshirt": {
            "name_fa": "تیشرت سازمانی",
            "title": "تیشرت سازمانی — چاپ عمده با کیفیت",
            "subtitle": "پنبه درجه یک، چاپ ماندگار، سایزبندی کامل برای تیم و رویداد.",
            "hero_badge": "تیشرت · B2B",
            "meta_title": "سفارش عمده تیشرت سازمانی",
            "meta_description": "تیشرت سازمانی با چاپ DTG، قیمت پلکانی از ۱۰ عدد، لوگو و طرح اختصاصی.",
            "min_order_qty": 10,
            "pricing_tiers": [
                BusinessPricingTier(min_qty=10, unit_price_toman=320000, label_fa="۱۰–۴۹ عدد"),
                BusinessPricingTier(min_qty=50, unit_price_toman=285000, label_fa="۵۰–۹۹ عدد"),
                BusinessPricingTier(min_qty=100, unit_price_toman=250000, label_fa="۱۰۰+ عدد"),
            ],
            "use_cases": [
                BusinessUseCase(title="تیم فروش و پشتیبانی", description="یکدست‌سازی ظاهر تیم در رویدادها."),
                BusinessUseCase(title="کمپین‌های تبلیغاتی", description="Merch تبلیغاتی با طرح برند."),
            ],
            "sort_order": 1,
        },
        "hoodie": {
            "name_fa": "هودی سازمانی",
            "title": "هودی سازمانی — گرم، باکیفیت، برنددار",
            "subtitle": "هودی ضخیم با چاپ دوطرفه — ایده‌آل برای هدایای سازمانی و تیم‌های فنی.",
            "hero_badge": "هودی · B2B",
            "meta_title": "سفارش عمده هودی سازمانی",
            "meta_description": "هودی سازمانی با چاپ باکیفیت، قیمت عمده و Design Lab.",
            "min_order_qty": 10,
            "pricing_tiers": [
                BusinessPricingTier(min_qty=10, unit_price_toman=580000, label_fa="۱۰–۴۹ عدد"),
                BusinessPricingTier(min_qty=50, unit_price_toman=520000, label_fa="۵۰–۹۹ عدد"),
                BusinessPricingTier(min_qty=100, unit_price_toman=470000, label_fa="۱۰۰+ عدد"),
            ],
            "use_cases": [
                BusinessUseCase(title="هدایای پایان سال", description="هودی برنددار برای کارکنان."),
                BusinessUseCase(title="رویدادهای فنی", description="Merch برای hackathon و meetup."),
            ],
            "sort_order": 2,
        },
        "mug": {
            "name_fa": "ماگ سازمانی",
            "title": "ماگ سازمانی — هدیه‌ای ماندگار",
            "subtitle": "ماگ سرامیک با چاپ سابلیمیشن — مناسب هدایای مشتری و دفتر.",
            "hero_badge": "ماگ · B2B",
            "meta_title": "سفارش عمده ماگ سازمانی",
            "meta_description": "ماگ سازمانی با چاپ باکیفیت، حداقل ۱۰ عدد، لوگو اختصاصی.",
            "min_order_qty": 10,
            "pricing_tiers": [
                BusinessPricingTier(min_qty=10, unit_price_toman=95000, label_fa="۱۰–۴۹ عدد"),
                BusinessPricingTier(min_qty=50, unit_price_toman=82000, label_fa="۵۰–۹۹ عدد"),
                BusinessPricingTier(min_qty=100, unit_price_toman=72000, label_fa="۱۰۰+ عدد"),
            ],
            "use_cases": [
                BusinessUseCase(title="هدایای مشتری", description="ماگ برنددار در بسته خوش‌آمد."),
                BusinessUseCase(title="دفتر و فضای کار", description="ماگ یکدست برای تیم."),
            ],
            "sort_order": 3,
        },
    }
    base = presets[slug]
    shared_features = [
        BusinessFeature(icon="package", title="بسته‌بندی عمده", description="بسته‌بندی مناسب ارسال سازمانی."),
        BusinessFeature(icon="sparkles", title="طرح اختصاصی", description="لوگو و برندینگ روی محصول."),
        BusinessFeature(icon="check", title="نمونه تأیید", description="قبل از تولید انبوه، نمونه تأیید می‌شود."),
    ]
    shared_steps = [
        BusinessProcessStep(title="انتخاب تعداد", description="تعداد و سایزها را مشخص کنید."),
        BusinessProcessStep(title="ارسال طرح", description="لوگو یا استفاده از Design Lab."),
        BusinessProcessStep(title="پیش‌فاکتور", description="قیمت نهایی ظرف ۲۴ ساعت."),
        BusinessProcessStep(title="تولید و ارسال", description="تولید، QC و ارسال."),
    ]
    shared_faqs = [
        BusinessFaq(question="چه سایزهایی موجود است؟", answer="S تا XXL برای پوشاک؛ برای ماگ یک سایز استاندارد."),
        BusinessFaq(question="آیا نمونه قبل از تولید می‌دهید؟", answer="برای سفارش‌های بالای ۵۰ عدد، نمونه تأیید ارسال می‌شود."),
    ]
    return {
        "slug": slug,
        "features": shared_features,
        "process_steps": shared_steps,
        "faqs": shared_faqs,
        "stats": [
            BusinessStat(value=str(base["min_order_qty"]), label="حداقل سفارش"),
            BusinessStat(value="۵–۱۴", label="روز تحویل"),
            BusinessStat(value="QC", label="کنترل کیفیت"),
        ],
        "cta_primary": "درخواست پیش‌فاکتور",
        "cta_secondary": "مشاهده کاتالوگ",
        **base,
        **_default_trust_content(slug),
    }


def _serialize_list(items: list) -> list:
    out = []
    for item in items:
        out.append(item.model_dump() if hasattr(item, "model_dump") else item)
    return out


def ensure_default_landings(db: Session) -> None:
    """ایجاد لندینگ‌های پیش‌فرض اگر وجود نداشته باشند."""
    existing = {r.slug for r in db.scalars(select(BusinessLanding)).all()}
    to_add: list[dict] = []
    if HUB_SLUG not in existing:
        to_add.append(_default_hub())
    for slug in PRODUCT_LANDING_SLUGS:
        if slug not in existing:
            to_add.append(_default_product(slug))
    for data in to_add:
        row = BusinessLanding(
            slug=data["slug"],
            name_fa=data["name_fa"],
            title=data["title"],
            subtitle=data.get("subtitle"),
            hero_badge=data.get("hero_badge"),
            meta_title=data.get("meta_title"),
            meta_description=data.get("meta_description"),
            min_order_qty=data.get("min_order_qty", 10),
            features=[f.model_dump() if hasattr(f, "model_dump") else f for f in data.get("features", [])],
            pricing_tiers=[
                t.model_dump() if hasattr(t, "model_dump") else t for t in data.get("pricing_tiers", [])
            ],
            use_cases=[
                u.model_dump() if hasattr(u, "model_dump") else u for u in data.get("use_cases", [])
            ],
            process_steps=[
                s.model_dump() if hasattr(s, "model_dump") else s for s in data.get("process_steps", [])
            ],
            faqs=[f.model_dump() if hasattr(f, "model_dump") else f for f in data.get("faqs", [])],
            stats=_serialize_list(data.get("stats", [])),
            gallery_images=_serialize_list(data.get("gallery_images", [])),
            gallery_title=data.get("gallery_title"),
            trust_logos=_serialize_list(data.get("trust_logos", [])),
            trust_badges=_serialize_list(data.get("trust_badges", [])),
            testimonials=_serialize_list(data.get("testimonials", [])),
            trust_section_title=data.get("trust_section_title"),
            cta_primary=data.get("cta_primary", "درخواست پیش‌فاکتور"),
            cta_secondary=data.get("cta_secondary"),
            sort_order=data.get("sort_order", 0),
            is_published=True,
        )
        db.add(row)
    if to_add:
        db.commit()

    backfill_trust_content(db)


def backfill_trust_content(db: Session) -> None:
    """پر کردن گالری و اعتمادسازی برای لندینگ‌های قدیمی."""
    rows = list(db.scalars(select(BusinessLanding)).all())
    changed = False
    for row in rows:
        defaults = _default_trust_content(row.slug)
        if not row.gallery_images:
            row.gallery_images = _serialize_list(defaults["gallery_images"])
            row.gallery_title = defaults.get("gallery_title")
            changed = True
        if not row.trust_logos:
            row.trust_logos = _serialize_list(defaults["trust_logos"])
            changed = True
        if not row.trust_badges:
            row.trust_badges = _serialize_list(defaults["trust_badges"])
            changed = True
        if not row.testimonials:
            row.testimonials = _serialize_list(defaults["testimonials"])
            row.trust_section_title = defaults.get("trust_section_title")
            changed = True
    if changed:
        db.commit()


def landing_to_public(row: BusinessLanding) -> BusinessLandingPublic:
    gallery = sorted(row.gallery_images or [], key=lambda g: g.get("sort_order", 0))
    return BusinessLandingPublic(
        slug=row.slug,
        name_fa=row.name_fa,
        title=row.title,
        subtitle=row.subtitle,
        hero_badge=row.hero_badge,
        meta_title=row.meta_title,
        meta_description=row.meta_description,
        hero_image_url=public_url(row.hero_image_key) if row.hero_image_key else None,
        min_order_qty=row.min_order_qty,
        features=row.features or [],
        pricing_tiers=row.pricing_tiers or [],
        use_cases=row.use_cases or [],
        process_steps=row.process_steps or [],
        faqs=row.faqs or [],
        stats=row.stats or [],
        gallery_images=[_resolve_gallery_item(g) for g in gallery if g],
        gallery_title=row.gallery_title,
        trust_logos=[_resolve_trust_logo(l) for l in (row.trust_logos or []) if l],
        trust_badges=row.trust_badges or [],
        testimonials=row.testimonials or [],
        trust_section_title=row.trust_section_title,
        cta_primary=row.cta_primary,
        cta_secondary=row.cta_secondary,
    )


def get_hub(db: Session) -> BusinessLanding | None:
    return db.scalar(select(BusinessLanding).where(BusinessLanding.slug == HUB_SLUG, BusinessLanding.is_published))


def get_product_landing(db: Session, slug: str) -> BusinessLanding | None:
    if slug not in PRODUCT_LANDING_SLUGS:
        return None
    return db.scalar(
        select(BusinessLanding).where(BusinessLanding.slug == slug, BusinessLanding.is_published)
    )


def list_published_product_landings(db: Session) -> list[BusinessLanding]:
    return list(
        db.scalars(
            select(BusinessLanding)
            .where(BusinessLanding.slug.in_(PRODUCT_LANDING_SLUGS), BusinessLanding.is_published)
            .order_by(BusinessLanding.sort_order, BusinessLanding.id)
        ).all()
    )


def list_all_landings(db: Session) -> list[BusinessLanding]:
    return list(
        db.scalars(select(BusinessLanding).order_by(BusinessLanding.sort_order, BusinessLanding.id)).all()
    )


def unit_price_for_qty(tiers: list[dict], qty: int) -> int | None:
    if not tiers:
        return None
    sorted_tiers = sorted(tiers, key=lambda t: t.get("min_qty", 0), reverse=True)
    for tier in sorted_tiers:
        if qty >= int(tier.get("min_qty", 0)):
            return int(tier.get("unit_price_toman", 0))
    return int(sorted_tiers[-1].get("unit_price_toman", 0)) if sorted_tiers else None


def create_quote(db: Session, data: dict) -> BusinessQuoteRequest:
    row = BusinessQuoteRequest(**data)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_quotes(db: Session, status: str | None = None, limit: int = 50, offset: int = 0) -> list[BusinessQuoteRequest]:
    q = select(BusinessQuoteRequest).order_by(BusinessQuoteRequest.created_at.desc())
    if status:
        q = q.where(BusinessQuoteRequest.status == status)
    return list(db.scalars(q.limit(limit).offset(offset)).all())
