import type { NextConfig } from "next";

function target(value: string | undefined, fallback: string): string {
  return (value || fallback).replace(/\/+$/, "");
}

const nextConfig: NextConfig = {
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
  // and Next.js forwards them: /api -> accounts_complaints, /media -> media_backend.
  async rewrites() {
    const api = target(process.env.API_PROXY_TARGET, "http://127.0.0.1:8001");
    const media = target(process.env.MEDIA_PROXY_TARGET, "http://127.0.0.1:8002");
    return [
      { source: "/api/:path*", destination: `${api}/:path*` },
      { source: "/media/:path*", destination: `${media}/:path*` },
    ];
  },
};

export default nextConfig;
