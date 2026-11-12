import type { DuplicateCandidate } from "./types";

export type ApiErrorKind =
  | "network"
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "duplicate"
  | "validation"
  | "rate_limited"
  | "not_implemented"
  | "server";

export type DuplicateDetail = {
  message: string;
  radius_m: number;
  window_days: number;
  candidates: DuplicateCandidate[];
};

/** Every API failure, from the real backend or the mock, is one of these. */
export class ApiError extends Error {
  readonly status: number;
  readonly kind: ApiErrorKind;
  /** Field name -> message, from FastAPI 422 validation errors. */
  readonly fieldErrors: Record<string, string>;
  /** Set when a new complaint matches an open one nearby (409). */
  readonly duplicate?: DuplicateDetail;
  readonly detail: unknown;

  constructor(init: {
    status: number;
    kind: ApiErrorKind;
    message: string;
    fieldErrors?: Record<string, string>;
    duplicate?: DuplicateDetail;
    detail?: unknown;
  }) {
    super(init.message);
    this.name = "ApiError";
    this.status = init.status;
    this.kind = init.kind;
    this.fieldErrors = init.fieldErrors ?? {};
    this.duplicate = init.duplicate;
    this.detail = init.detail;
  }
}

export const MESSAGES = {
  network: "We can't reach PKonek right now. Check your connection and try again.",
  badRequest: "Something about this request isn't right. Please review it and try again.",
  login: "Incorrect email or password.",
  session: "Your session has ended. Please sign in again.",
  forbidden: "You don't have permission to do that.",
  notFound: "We couldn't find that. It may have been removed.",
  duplicate: "A similar report already exists nearby.",
  conflict: "That conflicts with existing data.",
  validation: "Please check the highlighted fields.",
  rateLimited: "Too many attempts. Please wait a minute and try again.",
  notImplemented: "This feature isn't available yet.",
  server: "Something went wrong on our side. Please try again in a moment.",
} as const;

type PydanticError = { loc?: Array<string | number>; msg?: string };

function isDuplicateDetail(detail: unknown): detail is DuplicateDetail {
  return typeof detail === "object" && detail !== null && Array.isArray((detail as DuplicateDetail).candidates);
}

function fieldErrorsFrom(detail: unknown): Record<string, string> {
  if (!Array.isArray(detail)) return {};
  const errors: Record<string, string> = {};
  for (const item of detail as PydanticError[]) {
    // FastAPI prefixes the location with where it came from: ["body", "title"].
    const raw = item.loc ?? [];
    const loc = ["body", "query", "path"].includes(String(raw[0])) ? raw.slice(1) : raw;
    const field = loc.length ? String(loc[loc.length - 1]) : "_";
    if (!errors[field] && item.msg) errors[field] = item.msg.replace(/^Value error, /, "");
  }
  return errors;
}

/** Map a FastAPI error response ({ detail }) to an ApiError with a message people can act on. */
export function apiErrorFromResponse(
  status: number,
  data: unknown,
  context: { endpoint?: "login" } = {},
): ApiError {
  const detail = (data as { detail?: unknown } | null)?.detail;
  const sentence = typeof detail === "string" && detail.trim() ? detail : undefined;
  const base = { status, detail };

  switch (true) {
    case status === 400:
      return new ApiError({ ...base, kind: "bad_request", message: sentence ?? MESSAGES.badRequest });
    case status === 401:
      return new ApiError({
        ...base,
        kind: "unauthorized",
        message: context.endpoint === "login" ? MESSAGES.login : MESSAGES.session,
      });
    case status === 403:
      return new ApiError({ ...base, kind: "forbidden", message: MESSAGES.forbidden });
    case status === 404:
      return new ApiError({ ...base, kind: "not_found", message: MESSAGES.notFound });
    case status === 409 && isDuplicateDetail(detail):
      return new ApiError({ ...base, kind: "duplicate", message: MESSAGES.duplicate, duplicate: detail as DuplicateDetail });
    case status === 409:
      return new ApiError({ ...base, kind: "conflict", message: sentence ?? MESSAGES.conflict });
    case status === 422: {
      const fieldErrors = fieldErrorsFrom(detail);
      return new ApiError({
        ...base,
        kind: "validation",
        fieldErrors,
        message: sentence ?? MESSAGES.validation,
      });
    }
    case status === 429:
      return new ApiError({ ...base, kind: "rate_limited", message: MESSAGES.rateLimited });
    case status === 501:
      return new ApiError({ ...base, kind: "not_implemented", message: sentence ?? MESSAGES.notImplemented });
    case status === 503 && Boolean(sentence):
      return new ApiError({ ...base, kind: "server", message: sentence! });
    default:
      return new ApiError({ ...base, kind: status >= 500 ? "server" : "bad_request", message: status >= 500 ? MESSAGES.server : MESSAGES.badRequest });
  }
}

export function networkError(cause?: unknown): ApiError {
  return new ApiError({ status: 0, kind: "network", message: MESSAGES.network, detail: cause });
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Message for any thrown value, for toasts and alerts. */
export function errorMessage(error: unknown): string {
  if (isApiError(error)) return error.message;
  return MESSAGES.server;
}
