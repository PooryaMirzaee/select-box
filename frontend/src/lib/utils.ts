import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** قیمت‌ها در API به تومان ذخیره می‌شوند */
export function formatPrice(value: string | number) {
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "۰";
  return new Intl.NumberFormat("fa-IR").format(Math.round(n));
}

export function formatToman(value: string | number, suffix = true) {
  const formatted = formatPrice(value);
  return suffix ? `${formatted} تومان` : formatted;
}
