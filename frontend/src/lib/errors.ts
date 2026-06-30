/** متن‌ها و پیکربندی صفحات خطا — یک منبع برای UI و پیام‌های API */

export type ErrorKind =
  | "not_found"
  | "product_not_found"
  | "design_not_found"
  | "studio_not_found"
  | "order_not_found"
  | "server_error"
  | "forbidden"
  | "unauthorized"
  | "network"
  | "maintenance"
  | "checkout_failed"
  | "customizer_unavailable";

export type ErrorSurface = "shop" | "admin" | "lab" | "standalone";

export type ErrorAction = {
  label: string;
  href?: string;
  primary?: boolean;
  retry?: boolean;
};

export type ErrorContent = {
  kind: ErrorKind;
  code: string;
  codeFa?: string;
  title: string;
  description: string;
  hint?: string;
};

export const ERROR_CONTENT: Record<ErrorKind, ErrorContent> = {
  not_found: {
    kind: "not_found",
    code: "404",
    codeFa: "۴۰۴",
    title: "این صفحه پیدا نشد",
    description: "شاید آدرس را اشتباه وارد کرده‌اید، یا این صفحه جابه‌جا یا حذف شده.",
    hint: "از دکمه‌های زیر به مسیر درست برگردید.",
  },
  product_not_found: {
    kind: "product_not_found",
    code: "404",
    codeFa: "۴۰۴",
    title: "محصول پیدا نشد",
    description: "این محصول هنوز منتشر نشده، حذف شده، یا موقتاً در دسترس نیست.",
    hint: "محصولات مشابه را در کاتالوگ ببینید.",
  },
  design_not_found: {
    kind: "design_not_found",
    code: "404",
    codeFa: "۴۰۴",
    title: "طرح پیدا نشد",
    description: "این طرح وجود ندارد یا هنوز تأیید نشده است.",
    hint: "استودیوهای دیگر را مرور کنید.",
  },
  studio_not_found: {
    kind: "studio_not_found",
    code: "404",
    codeFa: "۴۰۴",
    title: "استودیو پیدا نشد",
    description: "این استودیو حذف شده یا آدرس آن عوض شده.",
    hint: "لیست استودیوهای فعال را ببینید.",
  },
  order_not_found: {
    kind: "order_not_found",
    code: "404",
    codeFa: "۴۰۴",
    title: "سفارش پیدا نشد",
    description: "کد پیگیری اشتباه است یا این سفارش متعلق به حساب دیگری است.",
    hint: "از بخش سفارش‌های حساب کاربری پیگیری کنید.",
  },
  server_error: {
    kind: "server_error",
    code: "500",
    codeFa: "۵۰۰",
    title: "خطایی رخ داد",
    description: "مشکل از سمت ما بود — تیم فنی در جریان است.",
    hint: "چند لحظه بعد دوباره تلاش کنید.",
  },
  forbidden: {
    kind: "forbidden",
    code: "403",
    codeFa: "۴۰۳",
    title: "دسترسی مجاز نیست",
    description: "شما اجازهٔ دیدن این صفحه را ندارید.",
    hint: "با حساب دیگری وارد شوید یا به پشتیبانی پیام دهید.",
  },
  unauthorized: {
    kind: "unauthorized",
    code: "401",
    codeFa: "۴۰۱",
    title: "ابتدا وارد شوید",
    description: "برای ادامه باید وارد حساب کاربری شوید.",
    hint: "پس از ورود، به همین صفحه برمی‌گردید.",
  },
  network: {
    kind: "network",
    code: "—",
    title: "اتصال برقرار نشد",
    description: "سرور پاسخ نمی‌دهد — اینترنت یا بک‌اند را بررسی کنید.",
    hint: "اگر در حال توسعه هستید، uvicorn را روی پورت ۸۰۰۰ اجرا کنید.",
  },
  maintenance: {
    kind: "maintenance",
    code: "503",
    codeFa: "۵۰۳",
    title: "در حال به‌روزرسانی",
    description: "فروشگاه موقتاً در دسترس نیست — به‌زودی برمی‌گردیم.",
    hint: "از صفحهٔ اصلی بعداً دوباره سر بزنید.",
  },
  checkout_failed: {
    kind: "checkout_failed",
    code: "—",
    title: "پرداخت انجام نشد",
    description: "تراکنش کامل نشد یا توسط شما لغو شد.",
    hint: "سبد خرید را بررسی کنید و دوباره تلاش کنید.",
  },
  customizer_unavailable: {
    kind: "customizer_unavailable",
    code: "—",
    title: "آزمایشگاه طراحی در دسترس نیست",
    description: "قالب این محصول پیدا نشد یا هنوز تنظیم نشده.",
    hint: "از صفحهٔ سفارشی‌سازی محصول دیگری را انتخاب کنید.",
  },
};

/** پیام‌های کوتاه برای toast / فرم / API */
export const ERROR_MESSAGES = {
  generic: "خطایی رخ داد — دوباره تلاش کنید.",
  network: "اتصال به سرور برقرار نشد.",
  unauthorized: "لطفاً وارد حساب کاربری شوید.",
  forbidden: "شما اجازهٔ این عملیات را ندارید.",
  notFound: "مورد درخواستی پیدا نشد.",
  validation: "اطلاعات واردشده نامعتبر است.",
  cartEmpty: "سبد خرید خالی است.",
  designEmpty: "اول یک طرح اضافه کنید.",
  uploadFailed: "آپلود فایل انجام نشد.",
  saveFailed: "ذخیره انجام نشد.",
  loginFailed: "ورود ناموفق — کد را دوباره بررسی کنید.",
  otpExpired: "کد تأیید منقضی شده — کد جدید بگیرید.",
  paymentFailed: "پرداخت انجام نشد.",
  stockUnavailable: "موجودی این تنوع کافی نیست.",
  sessionExpired: "نشست شما منقضی شده — دوباره وارد شوید.",
} as const;

export function errorActions(kind: ErrorKind, surface: ErrorSurface): ErrorAction[] {
  const retry: ErrorAction = { label: "تلاش دوباره", primary: true, retry: true };

  if (surface === "admin") {
    switch (kind) {
      case "unauthorized":
        return [{ label: "ورود ادمین", href: "/admin/login", primary: true }];
      case "forbidden":
        return [
          { label: "داشبورد", href: "/admin", primary: true },
          { label: "فروشگاه", href: "/" },
        ];
      case "server_error":
      case "network":
        return [retry, { label: "داشبورد", href: "/admin" }];
      default:
        return [
          { label: "داشبورد", href: "/admin", primary: true },
          { label: "فروشگاه", href: "/" },
        ];
    }
  }

  if (surface === "lab") {
    switch (kind) {
      case "customizer_unavailable":
      case "not_found":
        return [
          { label: "انتخاب محصول", href: "/customize", primary: true },
          { label: "صفحهٔ اصلی", href: "/" },
        ];
      case "server_error":
      case "network":
        return [retry, { label: "آزمایشگاه طراحی", href: "/customize" }];
      default:
        return [
          { label: "آزمایشگاه طراحی", href: "/customize", primary: true },
          { label: "صفحهٔ اصلی", href: "/" },
        ];
    }
  }

  switch (kind) {
    case "product_not_found":
      return [
        { label: "کاتالوگ", href: "/catalog", primary: true },
        { label: "صفحهٔ اصلی", href: "/" },
      ];
    case "design_not_found":
    case "studio_not_found":
      return [
        { label: "استودیوها", href: "/studios", primary: true },
        { label: "کاتالوگ", href: "/catalog" },
      ];
    case "order_not_found":
      return [
        { label: "حساب من", href: "/account", primary: true },
        { label: "صفحهٔ اصلی", href: "/" },
      ];
    case "unauthorized":
      return [
        { label: "ورود", href: "/login", primary: true },
        { label: "صفحهٔ اصلی", href: "/" },
      ];
    case "checkout_failed":
      return [
        { label: "سبد خرید", href: "/cart", primary: true },
        { label: "کاتالوگ", href: "/catalog" },
      ];
    case "customizer_unavailable":
      return [
        { label: "سفارشی‌سازی", href: "/customize", primary: true },
        { label: "کاتالوگ", href: "/catalog" },
      ];
    case "server_error":
    case "network":
      return [retry, { label: "صفحهٔ اصلی", href: "/" }];
    case "maintenance":
      return [{ label: "صفحهٔ اصلی", href: "/", primary: true }];
    default:
      return [
        { label: "صفحهٔ اصلی", href: "/", primary: true },
        { label: "کاتالوگ", href: "/catalog" },
        { label: "آزمایشگاه طراحی", href: "/customize" },
      ];
  }
}

/** استخراج پیام قابل‌نمایش از خطای API یا fetch */
export function getErrorMessage(error: unknown, fallback = ERROR_MESSAGES.generic): string {
  if (error == null) return fallback;
  if (typeof error === "string") return error.trim() || fallback;
  if (error instanceof Error) {
    const msg = error.message.trim();
    if (!msg) return fallback;
    if (/failed to fetch|networkerror|load failed/i.test(msg)) return ERROR_MESSAGES.network;
    if (/401|unauthorized/i.test(msg)) return ERROR_MESSAGES.unauthorized;
    if (/403|forbidden/i.test(msg)) return ERROR_MESSAGES.forbidden;
    if (/404|not found/i.test(msg)) return ERROR_MESSAGES.notFound;
    return msg;
  }
  return fallback;
}
