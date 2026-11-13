import axios, { AxiosError, type AxiosInstance } from "axios";
import type { ApiDeps, PKonekApi } from "./contract";
import { ApiError, apiErrorFromResponse, networkError } from "./errors";
import type { Complaint, ComplaintFilters, MediaType, Page, TimelineItem } from "./types";

/** Follows pagination (page_size 100, the backend maximum) up to `maxPages`. */
export async function allPages<T>(fetchPage: (page: number) => Promise<Page<T>>, maxPages = 20): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const result = await fetchPage(page);
    items.push(...result.items);
    if (items.length >= result.total || result.items.length === 0) break;
  }
  return items;
}

/** What can be known from the complaint row alone. Newest first. */
export function timelineFromComplaint(c: Complaint): TimelineItem[] {
  const items: TimelineItem[] = [{ type: "created", timestamp: c.created_at, display_text: "Report filed", status: "open" }];
  if (c.status !== "open" && c.updated_at !== c.created_at) {
    items.push({ type: "status_change", timestamp: c.resolved_at ?? c.updated_at, display_text: "Status changed", status: c.status });
  }
  return items.reverse();
}

/**
 * Axios client for the real backend. Requests go to same-origin /api and /media,
 * and next.config.ts forwards them to accounts_complaints and media_backend.
 */
export function createHttpClient(deps: ApiDeps, baseURL = "/api"): AxiosInstance {
  const client = axios.create({
    baseURL,
    timeout: 20_000,
    headers: { Accept: "application/json" },
    // FastAPI reads repeated keys for lists: ?status=open&status=in_progress
    paramsSerializer: { indexes: null },
  });

  client.interceptors.request.use((config) => {
    const token = deps.getToken();
    if (token) config.headers.set("Authorization", `Bearer ${token}`);
    return config;
  });

  client.interceptors.response.use(undefined, (error: unknown) => {
    if (!(error instanceof AxiosError)) return Promise.reject(error);
    if (!error.response) return Promise.reject(networkError(error));
    const isLogin = error.config?.url === "/auth/login";
    const sentToken = Boolean(error.config?.headers?.Authorization);
    if (error.response.status === 401 && sentToken && !isLogin) deps.onUnauthorized?.();
    return Promise.reject(apiErrorFromResponse(error.response.status, error.response.data, { endpoint: isLogin ? "login" : undefined }));
  });

  return client;
}

/** Drop undefined/empty values so they are not sent as "?q=". */
function clean<T extends object>(params: T | undefined): Partial<T> | undefined {
  if (!params) return undefined;
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)),
  ) as Partial<T>;
}

export function createHttpApi(
  deps: ApiDeps,
  clients: { api?: AxiosInstance; media?: AxiosInstance } = {},
): PKonekApi {
  const api = clients.api ?? createHttpClient(deps, "/api");
  const media = clients.media ?? createHttpClient(deps, "/media");

  return {
    auth: {
      login: async (email, password) => (await api.post("/auth/login", { email, password })).data,
      me: async () => (await api.get("/auth/me")).data,
      logout: async () => {
        await api.post("/auth/logout");
      },
      registerCitizen: async ({ email, password, full_name }) => {
        // The backend returns the new user, not a token, so sign in right after.
        await api.post("/auth/register", { email, password, full_name });
        return (await api.post("/auth/login", { email, password })).data;
      },
    },
    categories: {
      list: async (options) =>
        (await api.get("/categories", { params: clean({ include_inactive: options?.includeInactive }) })).data,
      create: async (input) => (await api.post("/categories", input)).data,
      update: async (id, input) => (await api.patch(`/categories/${id}`, input)).data,
    },
    complaints: {
      checkDuplicates: async (input) => (await api.post("/complaints/check-duplicates", input)).data,
      create: async (input) => (await api.post("/complaints", input)).data,
      list: async (filters?: ComplaintFilters) => (await api.get("/complaints", { params: clean(filters) })).data,
      get: async (id) => (await api.get(`/complaints/${id}`)).data,
      support: async (id, input) => (await api.post(`/complaints/${id}/support`, input)).data,
      updateStatus: async (id, input) => (await api.patch(`/complaints/${id}/status`, input)).data,
      // TODO(backend): person4's GET /api/complaints/{id}/timeline runs on db/schema.sql, which
      // doesn't match accounts_complaints. Until they share one schema, derive the basics here.
      timeline: async (id) => timelineFromComplaint((await api.get(`/complaints/${id}`)).data),
      postUpdate: async () => {
        // TODO(backend): POST /api/complaints/{id}/responses {body, is_public} once person4 shares the schema.
        throw new ApiError({ status: 501, kind: "not_implemented", message: "Official updates aren't connected to the server yet." });
      },
      verify: async () => {
        // TODO(backend): POST /api/complaints/{id}/verification {verdict, note} once person4 shares the schema.
        throw new ApiError({ status: 501, kind: "not_implemented", message: "Confirming fixes isn't connected to the server yet." });
      },
      myVerifications: async () => [],
    },
    map: {
      points: async (filters = {}) => {
        // GET /complaints is staff only. TODO(backend): a public, anonymized list for the community map.
        try {
          return await allPages((page) => api.get("/complaints", { params: clean({ ...filters, page, page_size: 100 }) }).then((r) => r.data));
        } catch (error) {
          if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
            throw new ApiError({ status: 501, kind: "not_implemented", message: "The community map needs a public complaints list on the server." });
          }
          throw error;
        }
      },
    },
    publicReport: {
      summary: async () => {
        // TODO(backend): person4 GET /api/public/accountability/departments once the schema is shared.
        throw new ApiError({ status: 501, kind: "not_implemented", message: "The public report isn't connected to the server yet." });
      },
    },
    notifications: {
      // TODO(backend): person4 /api/notifications runs on db/schema.sql and isn't reachable through /api yet.
      list: async (params) => ({ items: [], total: 0, page: params?.page ?? 1, page_size: params?.page_size ?? 20 }),
      unreadCount: async () => 0,
      markRead: async () => {},
      markAllRead: async () => {},
    },
    capabilities: { verification: false, notifications: false, publicData: false },
    users: {
      list: async (params) => (await api.get("/users", { params: clean(params) })).data,
      get: async (id) => (await api.get(`/users/${id}`)).data,
      create: async (input) => (await api.post("/users", input)).data,
      update: async (id, input) => (await api.patch(`/users/${id}`, input)).data,
    },
    logs: {
      activity: async (params) => (await api.get("/logs/activity", { params: clean(params) })).data,
      audit: async (params) => (await api.get("/logs/audit", { params: clean(params) })).data,
    },
    media: {
      upload: async (complaintId, file, mediaType: MediaType = "initial") => {
        const form = new FormData();
        form.append("file", file);
        form.append("media_type", mediaType);
        return (await media.post(`/complaints/${complaintId}/media`, form)).data;
      },
    },
  };
}
