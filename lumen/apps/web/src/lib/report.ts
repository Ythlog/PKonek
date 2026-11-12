import { z } from "zod";
import { PASIG_BOUNDS, PHOTO_RULES, type Pin } from "@/lib/api/types";
import { PASIG_BARANGAYS } from "@/lib/pasig";

export const REPORT_STEPS = [
  { id: "category", label: "Category" },
  { id: "location", label: "Location" },
  { id: "details", label: "Details" },
  { id: "photo", label: "Photo" },
  { id: "review", label: "Review" },
] as const;

export type ReportStepId = (typeof REPORT_STEPS)[number]["id"];

export type ReportDraft = {
  categoryId: number | null;
  pin: Pin | null;
  barangay: string;
  address: string;
  title: string;
  description: string;
  photo: File | null;
};

export const EMPTY_DRAFT: ReportDraft = {
  categoryId: null,
  pin: null,
  barangay: "",
  address: "",
  title: "",
  description: "",
  photo: null,
};

/** Same limits as ComplaintCreate in the backend. */
export const TITLE_MAX = 150;
export const DESCRIPTION_MAX = 5000;

export const detailsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, { error: "Give it a short title of at least 3 characters." })
    .max(TITLE_MAX, { error: `Keep the title to ${TITLE_MAX} characters.` }),
  description: z
    .string()
    .trim()
    .min(5, { error: "Describe the problem in at least 5 characters." })
    .max(DESCRIPTION_MAX, { error: `Keep the description to ${DESCRIPTION_MAX} characters.` }),
  address: z.string().trim().max(255, { error: "Keep the landmark to 255 characters." }),
});

export function isInsidePasig({ latitude, longitude }: Pin): boolean {
  return (
    latitude >= PASIG_BOUNDS.minLat &&
    latitude <= PASIG_BOUNDS.maxLat &&
    longitude >= PASIG_BOUNDS.minLng &&
    longitude <= PASIG_BOUNDS.maxLng
  );
}

/** Closest barangay center to a pin. A suggestion only; residents can change it. */
export function nearestBarangay({ latitude, longitude }: Pin): string {
  const cos = Math.cos((latitude * Math.PI) / 180);
  let best: string = PASIG_BARANGAYS[0].name;
  let bestD = Infinity;
  for (const b of PASIG_BARANGAYS) {
    const d = ((b.lat - latitude) ** 2 + ((b.lng - longitude) * cos) ** 2);
    if (d < bestD) {
      bestD = d;
      best = b.name;
    }
  }
  return best;
}

/** Returns an error message, or null when the file can be uploaded. */
export function photoProblem(file: Pick<File, "type" | "size">): string | null {
  if (!(PHOTO_RULES.types as readonly string[]).includes(file.type)) return "Use a JPG, PNG or WebP photo.";
  if (file.size === 0) return "That file is empty. Try another photo.";
  if (file.size > PHOTO_RULES.maxBytes) return "That photo is over 10 MB. Try a smaller one.";
  return null;
}

/** First step that still needs input, so the wizard never lets people skip ahead. */
export function firstIncompleteStep(draft: ReportDraft): ReportStepId | null {
  if (!draft.categoryId) return "category";
  if (!draft.pin || !isInsidePasig(draft.pin)) return "location";
  if (!detailsSchema.safeParse(draft).success) return "details";
  return null;
}

/** Which step a backend field error belongs to. */
export function stepForField(field: string): ReportStepId {
  if (field === "category_id") return "category";
  if (["latitude", "longitude", "barangay"].includes(field)) return "location";
  if (["title", "description", "address_text"].includes(field)) return "details";
  return "review";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
