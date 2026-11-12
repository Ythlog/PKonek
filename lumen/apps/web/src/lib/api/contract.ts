import type {
  ActivityLog,
  AuditLog,
  Category,
  CategoryCreate,
  CategoryUpdate,
  CitizenRegisterRequest,
  Complaint,
  ComplaintCreate,
  ComplaintFilters,
  ComplaintStaff,
  ComplaintUpdate,
  ComplaintUpdateCreate,
  DuplicateCheckRequest,
  DuplicateCheckResponse,
  LogParams,
  MediaType,
  MediaUpload,
  Page,
  StatusUpdate,
  SupportCreate,
  TimelineItem,
  TokenResponse,
  User,
  UserCreate,
  UserListParams,
  UserUpdate,
} from "./types";

/**
 * One interface, two implementations: the real backend (http.ts) and the demo mock (mock/).
 * Screens only ever talk to this, so switching NEXT_PUBLIC_USE_MOCKS changes nothing else.
 */
export interface PKonekApi {
  auth: {
    login(email: string, password: string): Promise<TokenResponse>;
    me(): Promise<User>;
    logout(): Promise<void>;
    /** POST /auth/register, then signs in so the caller gets a token. */
    registerCitizen(input: CitizenRegisterRequest): Promise<TokenResponse>;
  };
  categories: {
    list(options?: { includeInactive?: boolean }): Promise<Category[]>;
    create(input: CategoryCreate): Promise<Category>;
    update(id: number, input: CategoryUpdate): Promise<Category>;
  };
  complaints: {
    checkDuplicates(input: DuplicateCheckRequest): Promise<DuplicateCheckResponse>;
    create(input: ComplaintCreate): Promise<Complaint | ComplaintStaff>;
    list(filters?: ComplaintFilters): Promise<Page<ComplaintStaff>>;
    get(id: number): Promise<Complaint | ComplaintStaff>;
    support(id: number, input: SupportCreate): Promise<Complaint | ComplaintStaff>;
    updateStatus(id: number, input: StatusUpdate): Promise<ComplaintStaff>;
    /** Newest first. Staff see internal notes; everyone else only public items. */
    timeline(id: number): Promise<TimelineItem[]>;
    /** Official update on a complaint. Staff only. */
    postUpdate(id: number, input: ComplaintUpdateCreate): Promise<ComplaintUpdate>;
  };
  users: {
    list(params?: UserListParams): Promise<Page<User>>;
    get(id: number): Promise<User>;
    create(input: UserCreate): Promise<User>;
    update(id: number, input: UserUpdate): Promise<User>;
  };
  logs: {
    activity(params?: LogParams): Promise<Page<ActivityLog>>;
    audit(params?: LogParams): Promise<Page<AuditLog>>;
  };
  media: {
    /** media_backend POST /complaints/{id}/media. Citizens: "initial" on their own complaint. Staff: "progress" or "other". */
    upload(complaintId: number, file: File, mediaType?: MediaType): Promise<MediaUpload>;
  };
}

export type ApiDeps = {
  /** Current bearer token, if signed in. */
  getToken: () => string | null;
  /** Called when a signed-in request gets 401, so the app can sign the user out. */
  onUnauthorized?: () => void;
};
