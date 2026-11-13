import { afterEach, describe, expect, it } from "vitest";
import nextConfig from "../next.config";

type Rewrite = { source: string; destination: string };

async function rewrites(): Promise<Rewrite[]> {
  if (!nextConfig.rewrites) throw new Error("rewrites not configured");
  return (await nextConfig.rewrites()) as Rewrite[];
}

describe("API proxy rewrites", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it("proxies /api and /media to the local backends by default", async () => {
    delete process.env.API_PROXY_TARGET;
    delete process.env.MEDIA_PROXY_TARGET;
    expect(await rewrites()).toEqual([
      { source: "/api/:path*", destination: "http://127.0.0.1:8001/:path*" },
      { source: "/media/:path*", destination: "http://127.0.0.1:8002/:path*" },
    ]);
  });

  it("reads the targets from env and strips a trailing slash", async () => {
    process.env.API_PROXY_TARGET = "http://10.0.0.5:9001/";
    process.env.MEDIA_PROXY_TARGET = "http://10.0.0.5:9002";
    const [api, media] = await rewrites();
    expect(api.destination).toBe("http://10.0.0.5:9001/:path*");
    expect(media.destination).toBe("http://10.0.0.5:9002/:path*");
  });
});
