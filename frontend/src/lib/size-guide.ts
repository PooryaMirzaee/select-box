export type SizeGuideData = {
  enabled: boolean;
  title: string;
  intro: string;
  image_key: string | null;
  image_url?: string | null;
  columns: string[];
  rows: string[][];
  notes: string[];
};

export const EMPTY_SIZE_GUIDE: SizeGuideData = {
  enabled: false,
  title: "راهنمای سایز",
  intro: "",
  image_key: null,
  columns: ["سایز", "عرض سینه (cm)", "قد (cm)"],
  rows: [],
  notes: [],
};

export function normalizeSizeGuide(raw: unknown): SizeGuideData {
  if (!raw || typeof raw !== "object") return { ...EMPTY_SIZE_GUIDE };
  const o = raw as Record<string, unknown>;
  return {
    enabled: Boolean(o.enabled),
    title: typeof o.title === "string" && o.title.trim() ? o.title : EMPTY_SIZE_GUIDE.title,
    intro: typeof o.intro === "string" ? o.intro : "",
    image_key: typeof o.image_key === "string" ? o.image_key : null,
    image_url: typeof o.image_url === "string" ? o.image_url : null,
    columns: Array.isArray(o.columns)
      ? o.columns.map((c) => String(c))
      : [...EMPTY_SIZE_GUIDE.columns],
    rows: Array.isArray(o.rows)
      ? o.rows.map((row) =>
          Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : [],
        )
      : [],
    notes: Array.isArray(o.notes) ? o.notes.map((n) => String(n)) : [],
  };
}

export function sizeGuideHasContent(guide: SizeGuideData): boolean {
  return (
    guide.enabled &&
    (guide.rows.length > 0 || Boolean(guide.image_key) || Boolean(guide.intro.trim()))
  );
}
