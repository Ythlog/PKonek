import { beforeEach, describe, expect, it } from "vitest";
import type { PKonekApi } from "../contract";
import { ApiError } from "../errors";
import { BARANGAY_NAMES } from "@/lib/pasig";
import { createMockApi } from "./index";
import { memoryPersistence } from "./persistence";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, createSeed } from "./seed";

const NOW = Date.parse("2026-11-13T04:00:00Z");

let token: string | null;
let api: PKonekApi;
let clock: number;

beforeEach(() => {
  token = null;
  clock = NOW;
  api = createMockApi({
    deps: { getToken: () => token },
    persistence: memoryPersistence(),
    delayMs: 0,
    now: () => clock,
  });
});

async function signIn(email: string) {
  const res = await api.auth.login(email, DEMO_PASSWORD);
  token = res.access_token;
  return res;
}

async function rejection(promise: Promise<unknown>): Promise<ApiError> {
  const error = await promise.then(
    () => {
      throw new Error("expected the call to fail");
    },
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ApiError);
  return error as ApiError;
}

const kapitolyoDrain = () => createSeed(NOW).complaints[0];

describe("seed data", () => {
  it("has about 30 complaints in Pasig using all 9 backend categories", () => {
    const seed = createSeed(NOW);
    expect(seed.complaints.length).toBeGreaterThanOrEqual(28);
    expect(seed.categories.map((c) => c.code)).toEqual([
      "roads", "flooding_drainage", "garbage", "streetlights", "illegal_parking", "noise", "water_supply", "stray_animals", "others",
    ]);
    expect(new Set(seed.complaints.map((c) => c.category_id)).size).toBe(9);
    for (const c of seed.complaints) {
      expect(c.latitude).toBeGreaterThanOrEqual(14.53);
      expect(c.latitude).toBeLessThanOrEqual(14.62);
      expect(c.longitude).toBeGreaterThanOrEqual(121.05);
      expect(c.longitude).toBeLessThanOrEqual(121.11);
      expect(BARANGAY_NAMES).toContain(c.barangay);
      expect(c.reference_no).toMatch(/^PSG-\d{4}-\d{6}$/);
    }
  });
});

describe("auth", () => {
  it.each(DEMO_ACCOUNTS.map((a) => [a.email, a.role]))("signs in %s as %s", async (email, role) => {
    const res = await signIn(email);
    expect(res.role).toBe(role);
    expect(res.token_type).toBe("bearer");
    expect(res.expires_in).toBe(3600);
    await expect(api.auth.me()).resolves.toMatchObject({ email, role });
  });

  it("rejects a wrong password with the login message", async () => {
    const err = await rejection(api.auth.login("official@pkonek.demo", "wrong"));
    expect(err.status).toBe(401);
    expect(err.message).toBe("Incorrect email or password.");
  });

  it("rate-limits logins at 10 per minute", async () => {
    for (let i = 0; i < 10; i++) await api.auth.login("x@pkonek.demo", "bad").catch(() => {});
    const err = await rejection(api.auth.login("official@pkonek.demo", DEMO_PASSWORD));
    expect(err.status).toBe(429);
    clock += 61_000;
    await expect(api.auth.login("official@pkonek.demo", DEMO_PASSWORD)).resolves.toBeTruthy();
  });

  it("expires tokens after expires_in", async () => {
    await signIn("official@pkonek.demo");
    clock += 3601_000;
    expect((await rejection(api.auth.me())).status).toBe(401);
  });

  it("registers a citizen, then refuses the same email", async () => {
    const res = await api.auth.registerCitizen({ full_name: "Maria Clara", email: "Maria@Example.com", password: "longenough", barangay: "Ugong" });
    expect(res.role).toBe("citizen");
    token = res.access_token;
    await expect(api.auth.me()).resolves.toMatchObject({ email: "maria@example.com", barangay: "Ugong" });
    const err = await rejection(api.auth.registerCitizen({ full_name: "M", email: "maria@example.com", password: "longenough" }));
    expect(err.status).toBe(409);
  });

  it("validates registration fields", async () => {
    const err = await rejection(api.auth.registerCitizen({ full_name: "", email: "nope", password: "short" }));
    expect(err.status).toBe(422);
    expect(Object.keys(err.fieldErrors).sort()).toEqual(["email", "full_name", "password"]);
  });
});

describe("complaints", () => {
  const near = (dLat = 0) => ({ latitude: kapitolyoDrain().latitude + dLat, longitude: kapitolyoDrain().longitude });

  it("finds the open drain report next to a new flooding pin", async () => {
    const res = await api.complaints.checkDuplicates({ category_id: 2, ...near(0.0001) });
    expect(res.is_duplicate).toBe(true);
    expect(res.candidates[0]).toMatchObject({ id: 1, reference_no: kapitolyoDrain().reference_no });
    expect(res.candidates[0].distance_m).toBeLessThan(50);
  });

  it("returns 409 with candidates when filing a duplicate", async () => {
    await signIn("citizen@pkonek.demo");
    const err = await rejection(api.complaints.create({ category_id: 2, title: "Flooding here", description: "Water everywhere", ...near(0.0001) }));
    expect(err.kind).toBe("duplicate");
    expect(err.duplicate?.candidates[0].id).toBe(1);
  });

  it("rejects a pin outside Pasig with the backend message", async () => {
    const err = await rejection(api.complaints.create({ category_id: 1, title: "Pothole", description: "Deep pothole", latitude: 14.65, longitude: 121.03 }));
    expect(err.status).toBe(422);
    expect(err.message).toBe("The pinned location is outside Pasig City. Please move the pin.");
  });

  it("returns field errors for short text", async () => {
    const err = await rejection(api.complaints.create({ category_id: 1, title: "x", description: "y", ...near() }));
    expect(err.fieldErrors).toMatchObject({ title: expect.stringMatching(/at least 3/), description: expect.stringMatching(/at least 5/) });
  });

  it("requires a citizen login to file a complaint, like the backend", async () => {
    const input = { category_id: 1, title: "Pothole on Julia Vargas", description: "Deep pothole in the middle lane", latitude: 14.5865, longitude: 121.0615 };
    expect((await rejection(api.complaints.create(input))).message).toMatch(/session has ended|sign in/i);
    await signIn("official@pkonek.demo");
    expect((await rejection(api.complaints.create(input))).status).toBe(401);
    await signIn("citizen@pkonek.demo");
    const created = await api.complaints.create(input);
    expect(created).toMatchObject({ status: "open", report_count: 1, reference_no: "PSG-2026-000031" });
    expect(created).not.toHaveProperty("reporter_contact");
  });

  it("lets citizens upload evidence to their own complaints only", async () => {
    await signIn("citizen@pkonek.demo");
    const photo = new File([new Uint8Array(10)], "drain.jpg", { type: "image/jpeg" });
    await expect(api.media.upload(1, photo, "initial")).resolves.toMatchObject({ complaintId: 1, mediaType: "initial" });
    expect((await rejection(api.media.upload(5, photo, "initial"))).status).toBe(403);
    expect((await rejection(api.media.upload(1, photo, "progress"))).status).toBe(403);
    const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "big.jpg", { type: "image/jpeg" });
    expect((await rejection(api.media.upload(1, big, "initial"))).status).toBe(413);
  });

  it("links a citizen's report to their account and lists it under mine", async () => {
    await signIn("citizen@pkonek.demo");
    const created = await api.complaints.create({ category_id: 4, title: "Dark alley", description: "No lights at all", latitude: 14.6, longitude: 121.1 });
    const mine = await api.complaints.list({ mine: true, page_size: 100 });
    expect(mine.items.map((c) => c.id)).toContain(created.id);
    expect(mine.items.every((c) => !("reporter_contact" in c))).toBe(true);
    expect((await rejection(api.complaints.list())).status).toBe(403);
  });

  it("adds a Me Too support once per contact and only within 50 m", async () => {
    const before = kapitolyoDrain().report_count;
    const supported = await api.complaints.support(1, { ...near(0.0001), reporter_contact: "0999" });
    expect(supported.report_count).toBe(before + 1);
    expect((await rejection(api.complaints.support(1, { ...near(0.0001), reporter_contact: "0999" }))).status).toBe(409);
    const far = await rejection(api.complaints.support(1, { ...near(0.002) }));
    expect(far.status).toBe(422);
    expect(far.message).toMatch(/supports must be within 50 m/);
  });

  it("refuses support on a closed complaint", async () => {
    const resolved = createSeed(NOW).complaints.find((c) => c.status === "resolved")!;
    const err = await rejection(api.complaints.support(resolved.id, { latitude: resolved.latitude, longitude: resolved.longitude }));
    expect(err.message).toBe("This complaint is already closed. File a new report instead.");
  });

  it("requires staff to list, and filters by status, barangay and text", async () => {
    expect((await rejection(api.complaints.list())).status).toBe(401);
    await signIn("official@pkonek.demo");
    const all = await api.complaints.list({ page_size: 100 });
    expect(all.total).toBe(createSeed(NOW).complaints.length);
    expect(all.items[0]).toHaveProperty("reporter_contact");

    const open = await api.complaints.list({ status: ["open"], barangay: "Kapitolyo", page_size: 100 });
    expect(open.items.length).toBeGreaterThan(0);
    expect(open.items.every((c) => c.status === "open" && c.barangay === "Kapitolyo")).toBe(true);

    const text = await api.complaints.list({ q: "streetlight" });
    expect(text.items.length).toBeGreaterThan(0);

    const byCount = await api.complaints.list({ sort: "report_count", order: "desc", page_size: 3 });
    expect(byCount.items[0].report_count).toBeGreaterThanOrEqual(byCount.items[1].report_count);
    expect(byCount.page_size).toBe(3);
  });

  it("follows the allowed status transitions", async () => {
    await signIn("official@pkonek.demo");
    const resolved = await api.complaints.updateStatus(1, { status: "resolved", note: "Declogged" });
    expect(resolved.status).toBe("resolved");
    expect(resolved.resolved_at).not.toBeNull();
    const err = await rejection(api.complaints.updateStatus(1, { status: "open" }));
    expect(err.status).toBe(400);
    expect(err.message).toBe("Cannot change status from 'resolved' to 'open'.");
  });

  it("does not let citizens change status", async () => {
    await signIn("citizen@pkonek.demo");
    expect((await rejection(api.complaints.updateStatus(3, { status: "in_progress" }))).status).toBe(403);
  });

  it("persists changes in storage", async () => {
    const persistence = memoryPersistence();
    const first = createMockApi({ deps: { getToken: () => null }, persistence, delayMs: 0, now: () => clock });
    await first.complaints.support(1, { ...near(0.0001), reporter_contact: "a" });
    const second = createMockApi({ deps: { getToken: () => null }, persistence, delayMs: 0, now: () => clock });
    expect((await second.complaints.get(1)).report_count).toBe(kapitolyoDrain().report_count + 1);
  });
});

describe("admin routes", () => {
  it("are admin only", async () => {
    await signIn("official@pkonek.demo");
    expect((await rejection(api.users.list())).status).toBe(403);
    expect((await rejection(api.logs.audit())).status).toBe(403);
  });

  it("list staff accounts only and create new officials", async () => {
    await signIn("admin@pkonek.demo");
    const users = await api.users.list();
    expect(users.items.every((u) => u.role !== "citizen")).toBe(true);
    const created = await api.users.create({ email: "new@pasig.gov.ph", password: "password1", full_name: "New Official", barangay: "Ugong" });
    expect(created).toMatchObject({ role: "official", is_active: true });
    expect(created).not.toHaveProperty("password");
    expect((await rejection(api.users.create({ email: "new@pasig.gov.ph", password: "password1", full_name: "Dup" }))).message).toBe("Email already registered");
  });

  it("stop an admin from deactivating themselves", async () => {
    const { access_token } = await signIn("admin@pkonek.demo");
    const adminId = Number(access_token.split(".")[1]);
    const err = await rejection(api.users.update(adminId, { is_active: false }));
    expect(err.message).toBe("You cannot demote or deactivate yourself");
  });

  it("record logins and status changes in the logs", async () => {
    await signIn("admin@pkonek.demo");
    await api.complaints.updateStatus(3, { status: "in_progress" });
    const activity = await api.logs.activity({ action: "login_success" });
    expect(activity.items[0].email).toBe("admin@pkonek.demo");
    const audit = await api.logs.audit({ entity_type: "complaint", entity_id: 3 });
    expect(audit.items[0]).toMatchObject({ action: "status_change", after_data: { status: "in_progress" } });
  });

  it("manage categories and hide inactive ones from the public", async () => {
    await signIn("admin@pkonek.demo");
    await api.categories.update(6, { is_active: false });
    token = null;
    const publicList = await api.categories.list({ includeInactive: true });
    expect(publicList.map((c) => c.id)).not.toContain(6);
    expect(publicList[0].name <= publicList[1].name).toBe(true);
  });
});
