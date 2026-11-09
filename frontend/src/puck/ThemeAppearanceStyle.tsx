import { appearanceToCss, sanitizeAppearance, type ThemeAppearance } from "./appearance";

/** تزریق توکن‌های ظاهری ادمین روی کل فروشگاه */
export function ThemeAppearanceStyle({ appearance }: { appearance: ThemeAppearance | null }) {
  if (!appearance) return null;
  const safe = sanitizeAppearance(appearance);
  return (
    <style
      id="theme-appearance"
      dangerouslySetInnerHTML={{ __html: appearanceToCss(safe) }}
    />
  );
}
