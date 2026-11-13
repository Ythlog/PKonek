import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import axios, { AxiosError } from "axios";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "./errors";
import { createHttpApi, createHttpClient } from "./http";

type Reply = { status: number; data?: unknown } | "network";

/** Fake axios adapter: records requests and replies without a network. */
function fakeAdapter(reply: Reply) {
  const calls: InternalAxiosRequestConfig[] = [];
  const adapter: AxiosAdapter = async (config) => {
    calls.push(config);
    if (reply === "network") throw new AxiosError("Network Error", "ERR_NETWORK", config);
    const response: AxiosResponse = { data: reply.data, status: reply.status, statusText: "", headers: {}, config };
    if (reply.status >= 400) throw new AxiosError("fail", "ERR_BAD_RESPONSE", config, null, response);
    return response;
  };
  return { adapter, calls };
}

function setup(reply: Reply, token: string | null = "tok-123") {
  const onUnauthorized = vi.fn();
  const deps = { getToken: () => token, onUnauthorized };
  const api = createHttpClient(deps, "/api");
  const { adapter, calls } = fakeAdapter(reply);
  api.defaults.adapter = adapter;
  return { client: createHttpApi(deps, { api, media: api }), calls, onUnauthorized };
}

describe("HTTP API client", () => {
  it("sends the bearer token and returns the JSON body", async () => {
    const { client, calls } = setup({ status: 200, data: { id: 1, role: "official" } });
    await expect(client.auth.me()).resolves.toEqual({ id: 1, role: "official" });
    expect(calls[0].url).toBe("/auth/me");
    expect(calls[0].baseURL).toBe("/api");
    expect(calls[0].headers.Authorization).toBe("Bearer tok-123");
  });

  it("sends no Authorization header when signed out", async () => {
    const { client, calls } = setup({ status: 200, data: [] }, null);
    await client.categories.list();
    expect(calls[0].headers.Authorization).toBeUndefined();
  });

  it("serializes list filters the way FastAPI reads them and drops empty values", async () => {
    const { client, calls } = setup({ status: 200, data: { items: [], total: 0, page: 1, page_size: 20 } });
    await client.complaints.list({ status: ["open", "in_progress"], q: "", barangay: undefined, page: 2 });
    expect(calls[0].params).toEqual({ status: ["open", "in_progress"], page: 2 });
    expect(axios.getUri(calls[0])).toBe("/api/complaints?status=open&status=in_progress&page=2");
  });

  it("turns a failed login into a friendly ApiError without signing out", async () => {
    const { client, onUnauthorized } = setup({ status: 401, data: { detail: "Invalid email or password" } }, null);
    const error = await client.auth.login("a@b.ph", "nope").catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe("Incorrect email or password.");
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("signs the user out when a signed-in request gets 401", async () => {
    const { client, onUnauthorized } = setup({ status: 401, data: { detail: "Invalid or expired token" } });
    await expect(client.complaints.list()).rejects.toMatchObject({ kind: "unauthorized" });
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it("maps a 409 duplicate with its candidates", async () => {
    const detail = { message: "dup", radius_m: 50, window_days: 7, candidates: [{ id: 9 }] };
    const { client } = setup({ status: 409, data: { detail } });
    await expect(
      client.complaints.create({ category_id: 1, title: "abc", description: "abcde", latitude: 14.57, longitude: 121.06 }),
    ).rejects.toMatchObject({ kind: "duplicate", duplicate: detail });
  });

  it("reports network failures", async () => {
    const { client } = setup("network");
    await expect(client.categories.list()).rejects.toMatchObject({ kind: "network", status: 0 });
  });

  it("uploads media as multipart form data", async () => {
    const { client, calls } = setup({ status: 201, data: { id: 1 } });
    await client.media.upload(7, new File(["x"], "a.png", { type: "image/png" }), "progress");
    expect(calls[0].url).toBe("/complaints/7/media");
    const form = calls[0].data as FormData;
    expect(form.get("media_type")).toBe("progress");
    expect((form.get("file") as File).name).toBe("a.png");
  });

  it("registers a citizen and then signs in, sending only the backend fields", async () => {
    const { client, calls } = setup({ status: 200, data: { access_token: "t", role: "citizen" } }, null);
    await expect(
      client.auth.registerCitizen({ full_name: "A", email: "a@b.ph", password: "12345678", barangay: "Ugong", contact_number: "0917" }),
    ).resolves.toMatchObject({ role: "citizen" });
    expect(calls.map((c) => c.url)).toEqual(["/auth/register", "/auth/login"]);
    expect(JSON.parse(calls[0].data)).toEqual({ email: "a@b.ph", password: "12345678", full_name: "A" });
  });
});
