/**
 * Mirrors lumen/modules/accounts_complaints/accounts_complaints/schemas.py.
 * Field names stay snake_case to match the JSON exactly.
 */

export type StaffRole = "official" | "pasig_admin";
/** Backend roles (schemas.Role). */
export type Role = "citizen" | StaffRole;

export type ComplaintStatus = "open" | "in_progress" | "resolved" | "rejected";

export const COMPLAINT_STATUSES: ComplaintStatus[] = ["open", "in_progress", "resolved", "rejected"];

/** Same as ALLOWED_TRANSITIONS in services/complaints.py. */
export const ALLOWED_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  open: ["in_progress", "resolved", "rejected"],
  in_progress: ["resolved", "rejected"],
  resolved: [],
  rejected: [],
};

/** Pasig bounds from config.py (PASIG_MIN_LAT ...). */
export const PASIG_BOUNDS = { minLat: 14.53, maxLat: 14.62, minLng: 121.05, maxLng: 121.11 } as const;
/** DUP_RADIUS_M and DUP_WINDOW_DAYS defaults. */
export const DUPLICATE_RULES = { radiusM: 50, windowDays: 7 } as const;

export type Page<T> = { items: T[]; total: number; page: number; page_size: number };

// ---------- Auth / users ----------
export type LoginRequest = { email: string; password: string };

export type TokenResponse = {
  access_token: string;
  token_type: "bearer";
  /** Seconds. */
  expires_in: number;
  role: Role;
};

export type User = {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  barangay: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
};

/**
 * POST /auth/register takes email, password and full_name.
 * barangay and contact_number are kept by the demo mock only.
 */
export type CitizenRegisterRequest = {
  full_name: string;
  email: string;
  password: string;
  barangay?: string | null;
  contact_number?: string | null;
};

export type UserCreate = {
  email: string;
  password: string;
  full_name: string;
  role?: StaffRole;
  barangay?: string | null;
};

export type UserUpdate = Partial<{
  full_name: string;
  role: StaffRole;
  barangay: string | null;
  is_active: boolean;
  password: string;
}>;

export type UserListParams = Partial<{
  role: StaffRole;
  is_active: boolean;
  q: string;
  page: number;
  page_size: number;
}>;

// ---------- Logs ----------
export type ActivityLog = {
  id: number;
  user_id: number | null;
  email: string | null;
  action: string;
  ip_address: string | null;
  user_agent: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

export type AuditLog = {
  id: number;
  actor_user_id: number | null;
  entity_type: string;
  entity_id: number;
  action: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
};

export type LogParams = Partial<{
  user_id: number;
  actor_user_id: number;
  email: string;
  entity_type: string;
  entity_id: number;
  action: string;
  date_from: string;
  date_to: string;
  page: number;
  page_size: number;
}>;

// ---------- Categories ----------
export type Category = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
};

export type CategoryCreate = { code: string; name: string; description?: string | null };
export type CategoryUpdate = Partial<{ name: string; description: string | null; is_active: boolean }>;

// ---------- Complaints ----------
export type Pin = { latitude: number; longitude: number };

export type ComplaintCreate = Pin & {
  category_id: number;
  title: string;
  description: string;
  address_text?: string | null;
  barangay?: string | null;
  photo_url?: string | null;
  reporter_name?: string | null;
  reporter_contact?: string | null;
};

export type DuplicateCheckRequest = Pin & { category_id: number };

export type DuplicateCandidate = {
  id: number;
  reference_no: string;
  title: string;
  status: ComplaintStatus;
  report_count: number;
  distance_m: number;
  created_at: string;
};

export type DuplicateCheckResponse = {
  is_duplicate: boolean;
  radius_m: number;
  window_days: number;
  candidates: DuplicateCandidate[];
};

export type SupportCreate = Pin & { reporter_contact?: string | null; note?: string | null };

export type StatusUpdate = { status: ComplaintStatus; note?: string | null };

export type Complaint = {
  id: number;
  reference_no: string;
  category_id: number;
  title: string;
  description: string;
  status: ComplaintStatus;
  latitude: number;
  longitude: number;
  address_text: string | null;
  barangay: string | null;
  photo_url: string | null;
  report_count: number;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

/** Returned to officials and admins. */
export type ComplaintStaff = Complaint & {
  reporter_name: string | null;
  reporter_contact: string | null;
  created_by_user_id: number | null;
};

export type ComplaintSort = "created_at" | "report_count" | "updated_at";

export type ComplaintFilters = Partial<{
  category_id: number[];
  status: ComplaintStatus[];
  barangay: string;
  date_from: string;
  date_to: string;
  q: string;
  min_lat: number;
  min_lng: number;
  max_lat: number;
  max_lng: number;
  near_lat: number;
  near_lng: number;
  radius_m: number;
  mine: boolean;
  sort: ComplaintSort;
  order: "asc" | "desc";
  page: number;
  page_size: number;
}>;

// ---------- Official updates and timeline ----------
/**
 * Shaped like person4-resolution: POST /api/complaints/{id}/responses {body, is_public}
 * and GET /api/complaints/{id}/timeline [{type, timestamp, display_text}].
 */
export type ComplaintUpdateCreate = { body: string; is_public: boolean };

export type ComplaintUpdate = {
  id: number;
  complaint_id: number;
  author_id: number;
  author_name: string;
  body: string;
  is_public: boolean;
  created_at: string;
};

export type TimelineItemType = "created" | "status_change" | "support" | "response" | "media" | "resolved" | "verified" | "reopened";

export type TimelineItem = {
  type: TimelineItemType;
  timestamp: string;
  display_text: string;
  /** Extra detail: the official's note, the update text, or a photo URL. */
  detail?: string | null;
  status?: ComplaintStatus;
  actor_name?: string | null;
  is_public?: boolean;
  media_url?: string | null;
};

// ---------- Citizen verification ----------
/** Same shape as person4 VerificationCreate / VerificationResult. */
export type VerificationVerdict = "confirmed" | "rejected";
export type VerificationCreate = { verdict: VerificationVerdict; note?: string | null };
export type Verification = {
  id: number;
  complaint_id: number;
  citizen_id: number;
  verdict: VerificationVerdict;
  note: string | null;
  created_at: string;
};

// ---------- Notifications ----------
/** Same shape as person4 NotificationItem. */
export type NotificationType =
  | "STATUS_CHANGED"
  | "OFFICIAL_RESPONSE"
  | "VERIFICATION_REQUESTED"
  | "COMPLAINT_REOPENED"
  | "COMPLAINT_RESOLVED"
  | "NEW_COMPLAINT"
  | "SUPPORT_ADDED";

export type Notification = {
  id: number;
  user_id: number;
  complaint_id: number | null;
  notification_type: NotificationType;
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
};

// ---------- Public accountability ----------
/** Aggregates only; never reporter details. */
export type PublicGroupStat = { key: string; label: string; total: number; resolved: number; active: number; resolution_rate: number; median_resolution_hours: number | null };

export type PublicSummary = {
  generated_at: string;
  total: number;
  active: number;
  resolved: number;
  rejected: number;
  supports: number;
  resolution_rate: number;
  median_resolution_hours: number | null;
  by_barangay: PublicGroupStat[];
  by_category: PublicGroupStat[];
  recently_resolved: Array<{ id: number; reference_no: string; title: string; barangay: string | null; category_id: number; resolved_at: string; hours_to_resolve: number }>;
};

// ---------- Media (media_backend) ----------
/** Citizens upload "initial" evidence to their own complaint; staff upload "progress" or "other". */
export type MediaType = "initial" | "progress" | "other";

export const PHOTO_RULES = {
  maxBytes: 10 * 1024 * 1024,
  types: ["image/jpeg", "image/png", "image/webp"],
} as const;

export type MediaUpload = {
  id: number;
  complaintId: number;
  mediaType: MediaType;
  url: string;
  mimeType: string;
  fileSizeBytes: number;
  uploadedAt: string;
};
