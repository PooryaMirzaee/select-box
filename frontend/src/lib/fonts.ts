import localFont from "next/font/local";

/** متن بدنه — IRANSansX با اعداد فارسی */
export const fontSans = localFont({
  src: [
    { path: "../../public/fonts/IRANSansXFaNum-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/IRANSansXFaNum-Medium.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/IRANSansXFaNum-DemiBold.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/IRANSansXFaNum-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-iran",
  display: "swap",
  preload: true,
});

/** تیترها — Capsule Black (چپسول) */
export const fontDisplay = localFont({
  src: [{ path: "../../public/fonts/capsule-black.ttf", weight: "400 900", style: "normal" }],
  variable: "--font-capsule",
  display: "swap",
  preload: true,
});
