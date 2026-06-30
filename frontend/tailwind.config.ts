import type { Config } from "tailwindcss";

/** مسیرهای اسکن کلاس‌های Tailwind — فقط src تا حجم ساخت کم بماند */
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
