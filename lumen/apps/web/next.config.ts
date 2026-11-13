import type { NextConfig } from "next";

function target(value: string | undefined, fallback: string): string {
  return (value || fallback).replace(/\/+$/, "");
}

const nextConfig: NextConfig = {
  // Permit the current LAN address used to open the dev site on another device.
  allowedDevOrigins: ["10.217.246.33"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    // The repo root has its own package-lock.json; keep Turbopack scoped to this app.
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // The backends have no CORS middleware, so the browser calls same-origin paths
  // and Next.js forwards them: /api -> accounts_complaints, /media -> media_backend,
  // /chatbot -> chatbot_backend.
  async rewrites() {
    const api = target(process.env.API_PROXY_TARGET, "http://127.0.0.1:8001");
    const media = target(process.env.MEDIA_PROXY_TARGET, "http://127.0.0.1:8002");
    const chatbot = target(process.env.CHATBOT_PROXY_TARGET, "http://127.0.0.1:8003");
    return [
      { source: "/api/:path*", destination: `${api}/:path*` },
      { source: "/media/:path*", destination: `${media}/:path*` },
      { source: "/chatbot/:path*", destination: `${chatbot}/:path*` },
    ];
  },
};

export default nextConfig;
