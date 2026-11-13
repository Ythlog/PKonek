import { USE_MOCKS } from "@/lib/env";
import type { ApiDeps, PKonekApi } from "./contract";
import { createHttpApi } from "./http";
import { createMockApi } from "./mock";
import { getToken, notifyUnauthorized } from "./session";

const deps: ApiDeps = { getToken, onUnauthorized: notifyUnauthorized };

/** The single API used by every screen. NEXT_PUBLIC_USE_MOCKS picks the implementation. */
export const api: PKonekApi = USE_MOCKS ? createMockApi({ deps }) : createHttpApi(deps);

export const authService = api.auth;
export const categoryService = api.categories;
export const complaintService = api.complaints;
export const userService = api.users;
export const logService = api.logs;
export const mediaService = api.media;
export const mapService = api.map;
export const publicReportService = api.publicReport;
export const notificationService = api.notifications;

export { USE_MOCKS };
export type { PKonekApi } from "./contract";
export * from "./errors";
export * from "./types";
