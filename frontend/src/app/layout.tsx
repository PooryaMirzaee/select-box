import type { Metadata, Viewport } from "next";

import { ThemeProvider } from "@/components/ThemeProvider";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { GoogleAnalytics } from "@/components/seo/GoogleAnalytics";
import { fetchShopSettings } from "@/lib/api";
import { rootMetadataFromSettings } from "@/lib/seo-metadata";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2ece4" },
    { media: "(prefers-color-scheme: dark)", color: "#121118" },
  ],
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchShopSettings().catch(() => null);
  return rootMetadataFromSettings(settings);
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await fetchShopSettings().catch(() => null);

  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased" suppressHydrationWarning>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("coralay_theme");if(t==="dark")document.documentElement.classList.add("dark")}catch(e){}`,
          }}
        />
        <ThemeProvider>
          <AnalyticsProvider>
            <GoogleAnalytics gaId={settings?.google_analytics_id} />
            {children}
          </AnalyticsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
