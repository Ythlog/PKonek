import { describe, expect, it } from "vitest";
import {
  EMPTY_DRAFT,
  detailsSchema,
  firstIncompleteStep,
  formatFileSize,
  isInsidePasig,
  nearestBarangay,
  photoProblem,
  stepForField,
} from "./report";

const kapitolyo = { latitude: 14.5733, longitude: 121.0613 };

describe("pin helpers", () => {
  it("knows the Pasig bounds used by the backend", () => {
    expect(isInsidePasig(kapitolyo)).toBe(true);
    expect(isInsidePasig({ latitude: 14.65, longitude: 121.03 })).toBe(false);
  });

  it("suggests the nearest barangay", () => {
    expect(nearestBarangay(kapitolyo)).toBe("Kapitolyo");
    expect(nearestBarangay({ latitude: 14.611, longitude: 121.096 })).toBe("Dela Paz");
  });
});

describe("photoProblem", () => {
  it("accepts JPG, PNG and WebP up to 10 MB", () => {
    expect(photoProblem({ type: "image/jpeg", size: 2_000_000 })).toBeNull();
    expect(photoProblem({ type: "image/webp", size: 10 * 1024 * 1024 })).toBeNull();
  });

  it("explains what's wrong", () => {
    expect(photoProblem({ type: "image/gif", size: 10 })).toMatch(/JPG, PNG or WebP/);
    expect(photoProblem({ type: "image/png", size: 0 })).toMatch(/empty/);
    expect(photoProblem({ type: "image/png", size: 10 * 1024 * 1024 + 1 })).toMatch(/over 10 MB/);
  });
});

describe("wizard progress", () => {
  it("returns the first step that needs input", () => {
    expect(firstIncompleteStep(EMPTY_DRAFT)).toBe("category");
    expect(firstIncompleteStep({ ...EMPTY_DRAFT, categoryId: 2 })).toBe("location");
    expect(firstIncompleteStep({ ...EMPTY_DRAFT, categoryId: 2, pin: { latitude: 14.7, longitude: 121.06 } })).toBe("location");
    expect(firstIncompleteStep({ ...EMPTY_DRAFT, categoryId: 2, pin: kapitolyo, title: "ok" })).toBe("details");
    expect(firstIncompleteStep({ ...EMPTY_DRAFT, categoryId: 2, pin: kapitolyo, title: "Clogged drain", description: "Water everywhere" })).toBeNull();
  });

  it("maps backend field errors back to a step", () => {
    expect(stepForField("category_id")).toBe("category");
    expect(stepForField("latitude")).toBe("location");
    expect(stepForField("description")).toBe("details");
    expect(stepForField("photo_url")).toBe("review");
  });
});

describe("detailsSchema", () => {
  it("matches the backend length limits", () => {
    const r = detailsSchema.safeParse({ title: "ab", description: "abcd", address: "" });
    expect(r.success).toBe(false);
    expect(detailsSchema.safeParse({ title: "abc", description: "abcde", address: "" }).success).toBe(true);
    expect(detailsSchema.safeParse({ title: "x".repeat(151), description: "abcde", address: "" }).success).toBe(false);
  });
});

it("formats file sizes", () => {
  expect(formatFileSize(300)).toBe("1 KB");
  expect(formatFileSize(512_000)).toBe("500 KB");
  expect(formatFileSize(3.4 * 1024 * 1024)).toBe("3.4 MB");
});
