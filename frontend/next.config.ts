import type { NextConfig } from "next";

const siteUrl = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const apiUrl = (process.env.API_URL ?? "http://localhost:8000").replace(/\/$/, "");
const publicApiUrl = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "") || siteUrl;

function cspOrigins(...urls: string[]) {
  return [...new Set(urls.filter(Boolean))].join(" ");
}

const connectSrc = cspOrigins(
  "'self'",
  siteUrl,
  publicApiUrl,
  apiUrl,
  `ws://${new URL(siteUrl).host}`,
  `wss://${new URL(siteUrl).host}`,
  "https://www.google-analytics.com",
  "https://www.googletagmanager.com",
  "https://region1.google-analytics.com",
);

const imgSrc = cspOrigins(
  "'self'",
  "data:",
  "blob:",
  siteUrl,
  publicApiUrl,
  apiUrl,
  "https://www.google-analytics.com",
);

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline'",
      `img-src ${imgSrc}`,
      "font-src 'self' data:",
      `connect-src ${connectSrc}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

function mediaRemotePattern(origin: string) {
  try {
    const u = new URL(origin);
    return {
      protocol: u.protocol.replace(":", "") as "http" | "https",
      hostname: u.hostname,
      ...(u.port ? { port: u.port } : {}),
      pathname: "/api/v1/media/**",
    };
  } catch {
    return null;
  }
}

const remotePatterns = [siteUrl, publicApiUrl, apiUrl]
  .map(mediaRemotePattern)
  .filter((p): p is NonNullable<typeof p> => p !== null);

/** پیکربندی Next.js */
const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  images: {
    remotePatterns,
  },
  devIndicators: {
    appIsrStatus: false,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/media/:path*",
        destination: `${apiUrl}/api/v1/media/:path*`,
      },
      {
        source: "/torob_api/:path*",
        destination: `${apiUrl}/torob_api/:path*`,
      },
    ];
  },
};

export default nextConfig;
