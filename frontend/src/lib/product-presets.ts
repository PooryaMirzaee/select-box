export type PresetColor = { name: string; hex: string };

export const PRESET_COLORS: PresetColor[] = [
  { name: "مشکی", hex: "#1a1a1a" },
  { name: "سفید", hex: "#f5f5f5" },
  { name: "خاکستری", hex: "#6b7280" },
  { name: "سرمه‌ای", hex: "#1e3a5f" },
  { name: "بژ", hex: "#d4c4a8" },
  { name: "قرمز", hex: "#b91c1c" },
];

export const PRESET_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

export function slugPart(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u0600-\u06FF-]/g, "");
}
