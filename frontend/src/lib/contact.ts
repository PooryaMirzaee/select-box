import type { ShopContactInfo } from "@/lib/contact-info";

export type { ShopContactInfo };

export function pickContactInfo(
  settings: Partial<ShopContactInfo> | null | undefined,
): ShopContactInfo {
  return {
    contact_phone: settings?.contact_phone?.trim() ?? "",
    contact_email: settings?.contact_email?.trim() ?? "",
    contact_whatsapp: settings?.contact_whatsapp?.trim() ?? "",
    contact_telegram: settings?.contact_telegram?.trim() ?? "",
    contact_instagram: settings?.contact_instagram?.trim() ?? "",
    contact_address: settings?.contact_address?.trim() ?? "",
    contact_hours: settings?.contact_hours?.trim() ?? "",
  };
}

export function hasContactInfo(contact: ShopContactInfo): boolean {
  return Object.values(contact).some(Boolean);
}

export function phoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function telHref(phone: string): string {
  const digits = phoneDigits(phone);
  if (!digits) return "";
  if (digits.startsWith("0")) return `tel:+98${digits.slice(1)}`;
  if (digits.startsWith("98")) return `tel:+${digits}`;
  return `tel:${digits}`;
}

export function mailtoHref(email: string): string {
  return email ? `mailto:${email}` : "";
}

export function whatsappHref(value: string): string {
  const digits = phoneDigits(value);
  if (!digits) return "";
  const normalized = digits.startsWith("0") ? `98${digits.slice(1)}` : digits;
  return `https://wa.me/${normalized}`;
}

export function telegramHref(value: string): string {
  const handle = value.replace(/^@/, "").trim();
  return handle ? `https://t.me/${handle}` : "";
}

export function instagramHref(value: string): string {
  const handle = value.replace(/^@/, "").trim();
  if (!handle) return "";
  if (handle.startsWith("http")) return handle;
  return `https://instagram.com/${handle}`;
}

export type ContactLinkItem = {
  key: string;
  label: string;
  value: string;
  href: string;
  external?: boolean;
};

export function buildContactLinks(contact: ShopContactInfo): ContactLinkItem[] {
  const items: ContactLinkItem[] = [];

  if (contact.contact_phone) {
    items.push({
      key: "phone",
      label: "تلفن",
      value: contact.contact_phone,
      href: telHref(contact.contact_phone),
    });
  }
  if (contact.contact_email) {
    items.push({
      key: "email",
      label: "ایمیل",
      value: contact.contact_email,
      href: mailtoHref(contact.contact_email),
    });
  }
  if (contact.contact_whatsapp) {
    items.push({
      key: "whatsapp",
      label: "واتساپ",
      value: contact.contact_whatsapp,
      href: whatsappHref(contact.contact_whatsapp),
      external: true,
    });
  }
  if (contact.contact_telegram) {
    items.push({
      key: "telegram",
      label: "تلگرام",
      value: contact.contact_telegram.startsWith("@")
        ? contact.contact_telegram
        : `@${contact.contact_telegram}`,
      href: telegramHref(contact.contact_telegram),
      external: true,
    });
  }
  if (contact.contact_instagram) {
    const display = contact.contact_instagram.startsWith("http")
      ? contact.contact_instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "@")
      : contact.contact_instagram.startsWith("@")
        ? contact.contact_instagram
        : `@${contact.contact_instagram}`;
    items.push({
      key: "instagram",
      label: "اینستاگرام",
      value: display,
      href: instagramHref(contact.contact_instagram),
      external: true,
    });
  }
  if (contact.contact_address) {
    items.push({
      key: "address",
      label: "آدرس",
      value: contact.contact_address,
      href: `https://maps.google.com/?q=${encodeURIComponent(contact.contact_address)}`,
      external: true,
    });
  }

  return items;
}
