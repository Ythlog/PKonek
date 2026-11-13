import { describe, expect, it } from "vitest";
import { basemapFor } from "./config";

describe("basemapFor", () => {
  it("uses CARTO Voyager with the key and CARTO attribution", () => {
    const map = basemapFor(" abc123 ");
    expect(map.provider).toBe("carto");
    expect(map.url).toBe("https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=abc123");
    expect(map.attribution).toMatch(/OpenStreetMap.*CARTO/);
    expect(map.maxNativeZoom).toBe(18);
  });

  it("escapes the key in the URL", () => {
    expect(basemapFor("a b&c").url).toMatch(/\?key=a%20b%26c$/);
  });

  it("falls back to OpenStreetMap tiles without a key, never a watermarked map", () => {
    for (const key of [undefined, "", "   "]) {
      const map = basemapFor(key);
      expect(map.provider).toBe("osm");
      expect(map.url).toBe("https://tile.openstreetmap.org/{z}/{x}/{y}.png");
      expect(map.attribution).toMatch(/OpenStreetMap/);
      expect(map.url).not.toMatch(/cartocdn/);
    }
  });
});
