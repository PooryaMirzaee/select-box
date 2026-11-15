const BLOCKED = [
  /@import\b/gi,
  /@charset\b/gi,
  /expression\s*\(/gi,
  /javascript\s*:/gi,
  /behavior\s*:/gi,
  /-moz-binding\s*:/gi,
  /url\s*\(\s*['"]?\s*javascript:/gi,
  /<\/?\s*script/gi,
  /<\/?\s*style/gi,
  /<\/?\s*iframe/gi,
  /<\/?\s*link/gi,
  /<\/?\s*meta/gi,
  /<\/?\s*object/gi,
  /<\/?\s*embed/gi,
];

/** حذف الگوهای خطرناک از CSS خام ادمین */
export function sanitizeCss(raw: string | undefined | null): string {
  if (!raw || typeof raw !== "string") return "";
  let out = raw.slice(0, 50_000);
  for (const re of BLOCKED) {
    out = out.replace(re, "/* blocked */");
  }
  // strip HTML tags if pasted
  out = out.replace(/<[^>]+>/g, "");
  return out.trim();
}

/** محدود کردن CSS به یک سلکتور scope (بلوک یا صفحه) */
export function scopeCss(scopeSelector: string, raw: string): string {
  const cleaned = sanitizeCss(raw);
  if (!cleaned) return "";

  // اگر کاربر قبلاً سلکتور نوشته، قوانین را داخل scope می‌پیچیم
  // ساده‌سازی: کل محتوا را در یک بلوک scoped قرار می‌دهیم
  const body = cleaned
    .split("}")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      if (chunk.includes("{")) {
        const [sel, ...rest] = chunk.split("{");
        const decls = rest.join("{").trim();
        const selectors = sel
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => {
            if (s.startsWith("@")) return s; // media/keyframes handled loosely
            if (s.includes(scopeSelector)) return s;
            return `${scopeSelector} ${s}`;
          })
          .join(", ");
        return `${selectors} { ${decls} }`;
      }
      // bare declarations
      return `${scopeSelector} { ${chunk} }`;
    })
    .join("\n");

  return body;
}

export function pageScopeId(slug: string): string {
  return `puck-page-${slug.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}
