import type { ApiDeps, PKonekApi } from "../contract";
import { apiErrorFromResponse } from "../errors";
import {
  ALLOWED_TRANSITIONS,
  DUPLICATE_RULES,
  PASIG_BOUNDS,
  type AuditLog,
  type Complaint,
  type ComplaintFilters,
  type ComplaintStaff,
  type ComplaintStatus,
  type Page,
  type Role,
  type User,
} from "../types";
import { localStoragePersistence, type MockPersistence } from "./persistence";
import { createSeed, type MockDb, type MockUser } from "./seed";

/**
 * In-browser stand-in for the backend. It follows the same rules, messages and status
 * codes as accounts_complaints (duplicate radius, Pasig bounds, allowed transitions,
 * admin-only routes, rate limits), so screens behave the same against either one.
 */

type MockOptions = {
  deps: ApiDeps;
  persistence?: MockPersistence;
  /** Simulated network latency. Use 0 in tests. */
  delayMs?: number;
  now?: () => number;
  /** JWT_EXPIRE_MINUTES * 60 in the backend. */
  tokenTtlSeconds?: number;
};

const EARTH_RADIUS_M = 6_370_986;
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const STAFF: Role[] = ["official", "pasig_admin"];
const ACTIVE: ComplaintStatus[] = ["open", "in_progress"];

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dp = toRad(lat2 - lat1);
  const dl = toRad(lng2 - lng1);
  const a = Math.sin(dp / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dl / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

function fail(status: number, detail: unknown, endpoint?: "login"): never {
  throw apiErrorFromResponse(status, { detail }, { endpoint });
}

/** Pydantic-style 422 for one or more fields. */
function invalid(errors: Record<string, string>): never {
  fail(
    422,
    Object.entries(errors).map(([field, msg]) => ({ loc: ["body", field], msg, type: "value_error" })),
  );
}

function checkLength(errors: Record<string, string>, field: string, value: unknown, min: number, max: number) {
  const text = typeof value === "string" ? value : "";
  if (text.trim().length < min) errors[field] = `String should have at least ${min} characters`;
  else if (text.length > max) errors[field] = `String should have at most ${max} characters`;
}

function page<T>(items: T[], pageNo = 1, pageSize = 20): Page<T> {
  if (pageSize < 1 || pageSize > 100) invalid({ page_size: "Input should be less than or equal to 100" });
  const start = (pageNo - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length, page: pageNo, page_size: pageSize };
}

/** UserOut: never includes the password. */
function publicUser(u: MockUser): User {
  return {
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    role: u.role,
    barangay: u.barangay,
    is_active: u.is_active,
    last_login_at: u.last_login_at,
    created_at: u.created_at,
  };
}

/** ComplaintOut: what non-staff see, without reporter details. */
function publicComplaint(c: ComplaintStaff): Complaint {
  return {
    id: c.id,
    reference_no: c.reference_no,
    category_id: c.category_id,
    title: c.title,
    description: c.description,
    status: c.status,
    latitude: c.latitude,
    longitude: c.longitude,
    address_text: c.address_text,
    barangay: c.barangay,
    photo_url: c.photo_url,
    report_count: c.report_count,
    created_at: c.created_at,
    updated_at: c.updated_at,
    resolved_at: c.resolved_at,
  };
}

function dateKey(value: string) {
  return value.slice(0, 10);
}

class RateLimiter {
  private hits = new Map<string, number[]>();
  constructor(private now: () => number) {}
  hit(scope: string, limit: number) {
    const t = this.now();
    const list = (this.hits.get(scope) ?? []).filter((h) => t - h < 60_000);
    if (list.length >= limit) fail(429, "Too many requests, please try again in a minute");
    list.push(t);
    this.hits.set(scope, list);
  }
}

export function createMockApi({
  deps,
  persistence = localStoragePersistence(),
  delayMs = 250,
  now = () => Date.now(),
  tokenTtlSeconds = 3600,
}: MockOptions): PKonekApi {
  let db: MockDb | null = null;
  const limiter = new RateLimiter(now);

  function load(): MockDb {
    if (!db) {
      db = persistence.load() ?? createSeed(now());
      persistence.save(db);
    }
    return db;
  }
  function commit() {
    if (db) persistence.save(db);
  }
  const stamp = () => new Date(now()).toISOString().slice(0, 19);
  const nextId = (rows: Array<{ id: number }>) => rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;

  /** Simulated latency, and every handler runs async so errors surface as rejections. */
  async function run<T>(fn: () => T): Promise<T> {
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
    return structuredClone(fn());
  }

  function issueToken(user: MockUser) {
    const expires = now() + tokenTtlSeconds * 1000;
    return {
      access_token: `mock.${user.id}.${expires}`,
      token_type: "bearer" as const,
      expires_in: tokenTtlSeconds,
      role: user.role,
    };
  }

  function optionalUser(): MockUser | null {
    const token = deps.getToken();
    if (!token) return null;
    const [prefix, id, exp] = token.split(".");
    const user = load().users.find((u) => u.id === Number(id));
    if (prefix !== "mock" || !user || !user.is_active || Number(exp) <= now()) {
      deps.onUnauthorized?.();
      fail(401, "Invalid or expired token");
    }
    return user;
  }
  function requireUser(): MockUser {
    const user = optionalUser();
    if (!user) fail(401, "Not authenticated");
    return user;
  }
  function requireRole(...roles: Role[]): MockUser {
    const user = requireUser();
    if (!roles.includes(user.role)) fail(403, "Insufficient role");
    return user;
  }
  const isStaff = (u: MockUser | null) => Boolean(u && STAFF.includes(u.role));

  function logActivity(action: string, user: Pick<User, "id" | "email"> | null, email: string | null, details: Record<string, unknown> | null = null) {
    const d = load();
    d.activity.push({ id: nextId(d.activity), user_id: user?.id ?? null, email: user?.email ?? email, action, ip_address: "127.0.0.1", user_agent: "Demo browser", details, created_at: stamp() });
  }
  function logAudit(entry: Omit<AuditLog, "id" | "created_at" | "ip_address">) {
    const d = load();
    d.audit.push({ ...entry, id: nextId(d.audit), ip_address: "127.0.0.1", created_at: stamp() });
  }

  function validatePin(lat: unknown, lng: unknown) {
    if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      fail(422, "A location pin (latitude and longitude) is required.");
    }
    if (lat < PASIG_BOUNDS.minLat || lat > PASIG_BOUNDS.maxLat || lng < PASIG_BOUNDS.minLng || lng > PASIG_BOUNDS.maxLng) {
      fail(422, "The pinned location is outside Pasig City. Please move the pin.");
    }
    return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
  }

  function activeCategory(id: number) {
    const category = load().categories.find((c) => c.id === id);
    if (!category || !category.is_active) fail(422, "Unknown or inactive category.");
    return category;
  }

  function findDuplicates(categoryId: number, lat: number, lng: number) {
    const cutoff = now() - DUPLICATE_RULES.windowDays * 86_400_000;
    return load()
      .complaints.filter((c) => c.category_id === categoryId && ACTIVE.includes(c.status) && Date.parse(`${c.created_at}Z`) >= cutoff)
      .map((c) => ({ c, distance: haversineM(lat, lng, c.latitude, c.longitude) }))
      .filter(({ distance }) => distance <= DUPLICATE_RULES.radiusM)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5)
      .map(({ c, distance }) => ({
        id: c.id,
        reference_no: c.reference_no,
        title: c.title,
        status: c.status,
        report_count: c.report_count,
        distance_m: Math.round(distance * 10) / 10,
        created_at: c.created_at,
      }));
  }

  function getComplaintRow(id: number) {
    const complaint = load().complaints.find((c) => c.id === id);
    if (!complaint) fail(404, "Complaint not found.");
    return complaint;
  }
  const out = (c: ComplaintStaff, viewer: MockUser | null) => (isStaff(viewer) ? c : publicComplaint(c));

  function filterComplaints(f: ComplaintFilters, viewer: MockUser) {
    const bbox = [f.min_lat, f.min_lng, f.max_lat, f.max_lng];
    if (bbox.some((v) => v !== undefined) && bbox.some((v) => v === undefined)) fail(400, "Provide all of min_lat, min_lng, max_lat, max_lng.");
    const near = [f.near_lat, f.near_lng, f.radius_m];
    if (near.some((v) => v !== undefined) && near.some((v) => v === undefined)) fail(400, "Provide all of near_lat, near_lng, radius_m.");
    if (f.date_from && f.date_to && f.date_from > f.date_to) fail(400, "date_from must be on or before date_to.");
    if (f.q !== undefined && f.q.trim().length < 2) invalid({ q: "String should have at least 2 characters" });

    const words = f.q?.toLowerCase().split(/\s+/).filter(Boolean) ?? [];
    let rows = load().complaints.filter((c) => {
      if (f.category_id?.length && !f.category_id.includes(c.category_id)) return false;
      if (f.status?.length && !f.status.includes(c.status)) return false;
      if (f.barangay && c.barangay !== f.barangay) return false;
      if (f.date_from && dateKey(c.created_at) < f.date_from) return false;
      if (f.date_to && dateKey(c.created_at) > f.date_to) return false;
      if (words.length) {
        const text = `${c.title} ${c.description}`.toLowerCase();
        if (!words.some((w) => text.includes(w))) return false;
      }
      if (f.min_lat !== undefined && !(c.latitude >= f.min_lat && c.latitude <= f.max_lat! && c.longitude >= f.min_lng! && c.longitude <= f.max_lng!)) return false;
      if (f.near_lat !== undefined && haversineM(f.near_lat, f.near_lng!, c.latitude, c.longitude) > f.radius_m!) return false;
      if (f.mine && c.created_by_user_id !== viewer.id) return false;
      return true;
    });
    const sort = f.sort ?? "created_at";
    const dir = f.order === "asc" ? 1 : -1;
    rows = rows.sort((a, b) => {
      const av = a[sort];
      const bv = b[sort];
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return cmp !== 0 ? cmp * dir : b.id - a.id;
    });
    return rows;
  }

  return {
    auth: {
      login: (email, password) =>
        run(() => {
          limiter.hit("login", 10);
          const normalized = email.trim().toLowerCase();
          const user = load().users.find((u) => u.email === normalized);
          if (!user || user.password !== password || !user.is_active) {
            logActivity("login_failed", user ?? null, normalized, { reason: !user ? "unknown_email" : !user.is_active ? "inactive_account" : "wrong_password" });
            commit();
            fail(401, "Invalid email or password", "login");
          }
          user.last_login_at = stamp();
          logActivity("login_success", user, user.email);
          commit();
          return issueToken(user);
        }),
      me: () => run(() => publicUser(requireUser())),
      logout: () =>
        run(() => {
          const user = requireUser();
          logActivity("logout", user, user.email);
          commit();
        }),
      registerCitizen: (input) =>
        run(() => {
          limiter.hit("register", 10);
          const errors: Record<string, string> = {};
          checkLength(errors, "full_name", input.full_name, 1, 150);
          if (!EMAIL_PATTERN.test(input.email?.trim() ?? "")) errors.email = "Enter a valid email address.";
          if ((input.password ?? "").length < 8) errors.password = "Use at least 8 characters.";
          else if (new TextEncoder().encode(input.password).length > 72) errors.password = "Password must be at most 72 bytes.";
          if (Object.keys(errors).length) invalid(errors);
          const d = load();
          const email = input.email.trim().toLowerCase();
          if (d.users.some((u) => u.email === email)) fail(409, "Email already registered");
          const user: MockUser = {
            id: nextId(d.users),
            email,
            full_name: input.full_name.trim(),
            role: "citizen",
            barangay: input.barangay ?? null,
            is_active: true,
            last_login_at: stamp(),
            created_at: stamp(),
            password: input.password,
            contact_number: input.contact_number ?? null,
          };
          d.users.push(user);
          logActivity("account_created", user, email, { role: "citizen", self_registered: true });
          commit();
          return issueToken(user);
        }),
    },

    categories: {
      list: (options) =>
        run(() => {
          const viewer = optionalUser();
          return load()
            .categories.filter((c) => c.is_active || (options?.includeInactive && viewer))
            .sort((a, b) => a.name.localeCompare(b.name));
        }),
      create: (input) =>
        run(() => {
          const admin = requireRole("pasig_admin");
          const errors: Record<string, string> = {};
          if (!/^[a-z0-9_]{2,50}$/.test(input.code ?? "")) errors.code = "Use 2-50 lowercase letters, numbers or underscores.";
          checkLength(errors, "name", input.name, 1, 100);
          if (Object.keys(errors).length) invalid(errors);
          const d = load();
          if (d.categories.some((c) => c.code === input.code)) fail(409, "Category code already exists");
          const category = { id: nextId(d.categories), code: input.code, name: input.name.trim(), description: input.description ?? null, is_active: true };
          d.categories.push(category);
          logAudit({ actor_user_id: admin.id, entity_type: "category", entity_id: category.id, action: "create", before_data: null, after_data: { ...category } });
          commit();
          return category;
        }),
      update: (id, input) =>
        run(() => {
          const admin = requireRole("pasig_admin");
          const category = load().categories.find((c) => c.id === id);
          if (!category) fail(404, "Category not found");
          const before = { ...category };
          Object.assign(category, input);
          logAudit({ actor_user_id: admin.id, entity_type: "category", entity_id: id, action: "update", before_data: before, after_data: { ...category } });
          commit();
          return category;
        }),
    },

    complaints: {
      checkDuplicates: (input) =>
        run(() => {
          limiter.hit("dup_check", 30);
          const { lat, lng } = validatePin(input.latitude, input.longitude);
          activeCategory(input.category_id);
          const candidates = findDuplicates(input.category_id, lat, lng);
          return { is_duplicate: candidates.length > 0, radius_m: DUPLICATE_RULES.radiusM, window_days: DUPLICATE_RULES.windowDays, candidates };
        }),
      create: (input) =>
        run(() => {
          limiter.hit("create_complaint", 10);
          const viewer = optionalUser();
          // Same order as the backend: request validation, pin, citizen login, category, duplicates.
          const errors: Record<string, string> = {};
          checkLength(errors, "title", input.title, 3, 150);
          checkLength(errors, "description", input.description, 5, 5000);
          if (!(input.category_id > 0)) errors.category_id = "Choose a category.";
          if (Object.keys(errors).length) invalid(errors);
          const { lat, lng } = validatePin(input.latitude, input.longitude);
          if (!viewer || viewer.role !== "citizen") fail(401, "Citizen login is required to submit a complaint");
          activeCategory(input.category_id);
          const candidates = findDuplicates(input.category_id, lat, lng);
          if (candidates.length) {
            fail(409, {
              message: "A similar report already exists near this location. Support the existing report instead of filing a new one.",
              radius_m: DUPLICATE_RULES.radiusM,
              window_days: DUPLICATE_RULES.windowDays,
              candidates,
            });
          }
          const d = load();
          const id = nextId(d.complaints);
          const complaint: ComplaintStaff = {
            id,
            reference_no: `PSG-${new Date(now()).getFullYear()}-${String(id).padStart(6, "0")}`,
            category_id: input.category_id,
            title: input.title.trim(),
            description: input.description.trim(),
            status: "open",
            latitude: lat,
            longitude: lng,
            address_text: input.address_text ?? null,
            barangay: input.barangay ?? null,
            photo_url: input.photo_url ?? null,
            report_count: 1,
            created_at: stamp(),
            updated_at: stamp(),
            resolved_at: null,
            reporter_name: input.reporter_name ?? (viewer?.role === "citizen" ? viewer.full_name : null),
            reporter_contact: input.reporter_contact ?? (viewer?.role === "citizen" ? viewer.email : null),
            created_by_user_id: viewer?.id ?? null,
          };
          d.complaints.push(complaint);
          logAudit({ actor_user_id: viewer?.id ?? null, entity_type: "complaint", entity_id: id, action: "create", before_data: null, after_data: { status: "open", title: complaint.title } });
          commit();
          return out(complaint, viewer);
        }),
      list: (filters = {}) =>
        run(() => {
          const viewer = requireUser();
          // TODO(backend): citizens need their own list, e.g. GET /complaints?mine=true for the citizen role.
          if (!isStaff(viewer) && !(viewer.role === "citizen" && filters.mine)) fail(403, "Insufficient role");
          const rows = filterComplaints(filters, viewer);
          const result = page(rows, filters.page, filters.page_size);
          return isStaff(viewer) ? result : { ...result, items: result.items.map((c) => publicComplaint(c) as ComplaintStaff) };
        }),
      get: (id) =>
        run(() => {
          const viewer = optionalUser();
          return out(getComplaintRow(id), viewer);
        }),
      support: (id, input) =>
        run(() => {
          limiter.hit("support", 10);
          const viewer = optionalUser();
          const { lat, lng } = validatePin(input.latitude, input.longitude);
          const complaint = getComplaintRow(id);
          if (!ACTIVE.includes(complaint.status)) fail(409, "This complaint is already closed. File a new report instead.");
          const distance = haversineM(lat, lng, complaint.latitude, complaint.longitude);
          if (distance > DUPLICATE_RULES.radiusM) {
            fail(422, `Your pin is ${Math.round(distance)} m away; supports must be within ${DUPLICATE_RULES.radiusM} m.`);
          }
          const contact = input.reporter_contact ?? (viewer?.role === "citizen" ? viewer.email : null);
          const d = load();
          if (contact && (complaint.reporter_contact === contact || d.supports.some((s) => s.complaint_id === id && s.reporter_contact === contact))) {
            fail(409, "You have already reported or supported this complaint.");
          }
          d.supports.push({ id: nextId(d.supports), complaint_id: id, reporter_contact: contact, note: input.note ?? null, latitude: lat, longitude: lng, created_at: stamp() });
          const before = complaint.report_count;
          complaint.report_count += 1;
          complaint.updated_at = stamp();
          logAudit({ actor_user_id: viewer?.id ?? null, entity_type: "complaint", entity_id: id, action: "support", before_data: { report_count: before }, after_data: { report_count: complaint.report_count, distance_m: Math.round(distance * 10) / 10 } });
          commit();
          return out(complaint, viewer);
        }),
      updateStatus: (id, input) =>
        run(() => {
          const actor = requireRole("official", "pasig_admin");
          const complaint = getComplaintRow(id);
          const current = complaint.status;
          if (!ALLOWED_TRANSITIONS[current].includes(input.status)) {
            fail(400, `Cannot change status from '${current}' to '${input.status}'.`);
          }
          complaint.status = input.status;
          complaint.updated_at = stamp();
          if (input.status === "resolved") complaint.resolved_at = stamp();
          logAudit({ actor_user_id: actor.id, entity_type: "complaint", entity_id: id, action: "status_change", before_data: { status: current }, after_data: { status: input.status, resolved_at: complaint.resolved_at, note: input.note ?? null } });
          commit();
          return complaint;
        }),
    },

    users: {
      list: (params = {}) =>
        run(() => {
          requireRole("pasig_admin");
          const q = params.q?.toLowerCase();
          // The backend users table only holds staff accounts.
          const rows = load()
            .users.filter((u) => STAFF.includes(u.role))
            .filter((u) => (params.role ? u.role === params.role : true))
            .filter((u) => (params.is_active !== undefined ? u.is_active === params.is_active : true))
            .filter((u) => (q ? u.full_name.toLowerCase().includes(q) || u.email.includes(q) : true))
            .sort((a, b) => a.id - b.id)
            .map(publicUser);
          return page(rows, params.page, params.page_size);
        }),
      get: (id) =>
        run(() => {
          requireRole("pasig_admin");
          const user = load().users.find((u) => u.id === id && STAFF.includes(u.role));
          if (!user) fail(404, "User not found");
          return publicUser(user);
        }),
      create: (input) =>
        run(() => {
          const admin = requireRole("pasig_admin");
          const errors: Record<string, string> = {};
          if (!EMAIL_PATTERN.test(input.email?.trim() ?? "")) errors.email = "String should match pattern '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'";
          if ((input.password ?? "").length < 8) errors.password = "String should have at least 8 characters";
          checkLength(errors, "full_name", input.full_name, 1, 150);
          if (Object.keys(errors).length) invalid(errors);
          const d = load();
          const email = input.email.trim().toLowerCase();
          if (d.users.some((u) => u.email === email)) fail(409, "Email already registered");
          const user: MockUser = {
            id: nextId(d.users),
            email,
            full_name: input.full_name.trim(),
            role: input.role ?? "official",
            barangay: input.barangay ?? null,
            is_active: true,
            last_login_at: null,
            created_at: stamp(),
            password: input.password,
            contact_number: null,
          };
          d.users.push(user);
          logAudit({ actor_user_id: admin.id, entity_type: "user", entity_id: user.id, action: "create", before_data: null, after_data: publicUser(user) });
          logActivity("account_created", user, email, { by_user_id: admin.id, role: user.role });
          commit();
          return publicUser(user);
        }),
      update: (id, input) =>
        run(() => {
          const admin = requireRole("pasig_admin");
          const user = load().users.find((u) => u.id === id && STAFF.includes(u.role));
          if (!user) fail(404, "User not found");
          const changes = Object.fromEntries(Object.entries(input).filter(([k, v]) => v !== undefined && (v !== null || k === "barangay")));
          if (user.id === admin.id && (changes.is_active === false || (changes.role ?? "pasig_admin") !== "pasig_admin")) {
            fail(400, "You cannot demote or deactivate yourself");
          }
          if (typeof changes.password === "string" && changes.password.length < 8) invalid({ password: "String should have at least 8 characters" });
          const before = publicUser(user);
          const { password, ...rest } = changes as Partial<MockUser>;
          Object.assign(user, rest);
          if (password) user.password = password;
          if (user.role !== before.role) logActivity("role_changed", user, user.email, { from: before.role, to: user.role, by_user_id: admin.id });
          if (user.is_active !== before.is_active) logActivity(user.is_active ? "reactivated" : "deactivated", user, user.email, { by_user_id: admin.id });
          if (password) logActivity("password_changed", user, user.email, { by_user_id: admin.id });
          logAudit({ actor_user_id: admin.id, entity_type: "user", entity_id: id, action: "update", before_data: before, after_data: { ...publicUser(user), ...(password ? { password: "changed" } : {}) } });
          commit();
          return publicUser(user);
        }),
    },

    logs: {
      activity: (params = {}) =>
        run(() => {
          requireRole("pasig_admin");
          const rows = load()
            .activity.filter((l) => (params.user_id ? l.user_id === params.user_id : true))
            .filter((l) => (params.email ? l.email === params.email : true))
            .filter((l) => (params.action ? l.action === params.action : true))
            .filter((l) => (params.date_from ? dateKey(l.created_at) >= params.date_from : true))
            .filter((l) => (params.date_to ? dateKey(l.created_at) <= params.date_to : true))
            .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
          return page(rows, params.page, params.page_size);
        }),
      audit: (params = {}) =>
        run(() => {
          requireRole("pasig_admin");
          const rows = load()
            .audit.filter((l) => (params.actor_user_id ? l.actor_user_id === params.actor_user_id : true))
            .filter((l) => (params.entity_type ? l.entity_type === params.entity_type : true))
            .filter((l) => (params.entity_id ? l.entity_id === params.entity_id : true))
            .filter((l) => (params.action ? l.action === params.action : true))
            .filter((l) => (params.date_from ? dateKey(l.created_at) >= params.date_from : true))
            .filter((l) => (params.date_to ? dateKey(l.created_at) <= params.date_to : true))
            .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
          return page(rows, params.page, params.page_size);
        }),
    },

    media: {
      upload: async (complaintId, file, mediaType = "initial") => {
        const url = await readAsDataUrl(file);
        return run(() => {
          const actor = requireUser();
          if (!["initial", "progress", "other"].includes(mediaType)) fail(422, "Unsupported media_type");
          const complaint = getComplaintRow(complaintId);
          if (actor.role === "citizen") {
            if (mediaType !== "initial") fail(403, "Citizens may upload complaint evidence only");
            if (complaint.created_by_user_id !== actor.id) fail(403, "You can upload only to your own complaint");
          } else if (mediaType === "initial") {
            fail(403, "Staff uploads must be progress media");
          }
          if (file.size === 0) fail(400, "The uploaded file is empty");
          if (file.size > 10 * 1024 * 1024) fail(413, "Maximum image size is 10 MB");
          if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) fail(415, "Only JPEG, PNG, and WebP images are accepted");
          if (mediaType === "initial" && !complaint.photo_url) {
            complaint.photo_url = url;
            commit();
          }
          return { id: complaintId * 100 + 1, complaintId, mediaType, url, mimeType: file.type, fileSizeBytes: file.size, uploadedAt: stamp() };
        });
      },
    },
  };
}

/** Small photos are kept as data URLs so they survive a reload; large ones use a temporary object URL. */
async function readAsDataUrl(file: File): Promise<string> {
  if (file.size > 1.5 * 1024 * 1024 || typeof FileReader === "undefined") {
    return typeof URL.createObjectURL === "function" ? URL.createObjectURL(file) : "";
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}
