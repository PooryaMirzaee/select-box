export type PresetColor = { name: string; hex: string };

export const PRESET_COLORS: PresetColor[] = [
  { name: "سفید", hex: "#f5f5f5" },
  { name: "مشکی", hex: "#1a1a1a" },
  { name: "نقره‌ای", hex: "#c0c0c0" },
  { name: "استیل", hex: "#a8a8a8" },
  { name: "خاکستری", hex: "#6b7280" },
  { name: "طلایی", hex: "#c9a227" },
];

export const PRESET_SIZES = [] as const;

export function slugPart(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u0600-\u06FF-]/g, "");
}
