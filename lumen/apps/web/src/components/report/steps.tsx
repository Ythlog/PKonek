"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Camera, ImagePlus, LocateFixed, MapPin, MousePointerClick, Pencil, Trash2 } from "lucide-react";
import { categoryIcon } from "@/components/complaints/categoryIcons";
import { PinMap } from "@/components/map/PinMap";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import type { Category, Pin } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { BARANGAY_NAMES } from "@/lib/pasig";
import { DESCRIPTION_MAX, TITLE_MAX, formatFileSize, photoProblem, type ReportDraft, type ReportStepId } from "@/lib/report";

export function StepHeading({ id, title, description }: { id: string; title: string; description: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  // Move focus to the new step so keyboard and screen reader users know where they are.
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <div>
      <h2 ref={ref} id={id} tabIndex={-1} className="text-xl outline-none sm:text-2xl">
        {title}
      </h2>
      <p className="mt-1 text-muted">{description}</p>
    </div>
  );
}

// ---------- 1. Category ----------
export function CategoryStep({
  categories,
  loading,
  value,
  onChange,
  error,
}: {
  categories: Category[];
  loading: boolean;
  value: number | null;
  onChange: (id: number) => void;
  error?: string;
}) {
  return (
    <div className="grid gap-5">
      <StepHeading id="step-category" title="What kind of problem is it?" description="Pick the closest match. It sends your report to the right team." />
      {error && <Alert tone="danger" title={error} />}
      {loading ? (
        <div aria-busy="true" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-card" />
          ))}
        </div>
      ) : (
        <fieldset>
          <legend className="sr-only">Category</legend>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => {
              const Icon = categoryIcon(c.code);
              const checked = value === c.id;
              return (
                <label
                  key={c.id}
                  className={cn(
                    "relative flex min-h-20 cursor-pointer items-start gap-3 rounded-card border bg-surface p-4 transition-[border-color,box-shadow] duration-150",
                    "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-600",
                    checked ? "border-brand-600 shadow-card-hover ring-1 ring-brand-600" : "border-border shadow-card hover:border-brand-600/40",
                  )}
                >
                  <input type="radio" name="category" value={c.id} checked={checked} onChange={() => onChange(c.id)} className="sr-only" />
                  <span
                    aria-hidden
                    className={cn("flex size-10 shrink-0 items-center justify-center rounded-control transition-colors", checked ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-600")}
                  >
                    <Icon size={20} strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink">{c.name}</span>
                    {c.description && <span className="mt-0.5 block text-sm text-muted">{c.description}</span>}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}
    </div>
  );
}

// ---------- 2. Location ----------
type LocateState = { kind: "idle" } | { kind: "locating" } | { kind: "error"; message: string };

export function LocationStep({
  draft,
  onPin,
  onChange,
  pinError,
  focusKey,
  onLocate,
  checking,
  children,
}: {
  draft: ReportDraft;
  onPin: (pin: Pin, options?: { focus?: boolean }) => void;
  onChange: (patch: Partial<ReportDraft>) => void;
  pinError?: string;
  focusKey: number;
  onLocate: () => Promise<void>;
  checking: boolean;
  /** Duplicate panel. */
  children?: ReactNode;
}) {
  const centerPin = useRef<(() => Pin) | null>(null);
  const [locate, setLocate] = useState<LocateState>({ kind: "idle" });

  async function useMyLocation() {
    setLocate({ kind: "locating" });
    try {
      await onLocate();
      setLocate({ kind: "idle" });
    } catch (error) {
      setLocate({ kind: "error", message: error instanceof Error ? error.message : "We couldn't get your location." });
    }
  }

  return (
    <div className="grid gap-5">
      <StepHeading id="step-location" title="Where is it?" description="Tap the map to drop a pin, then drag it to the exact spot." />

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" loading={locate.kind === "locating"} leadingIcon={<LocateFixed aria-hidden size={16} strokeWidth={1.75} />} onClick={useMyLocation}>
          Use my location
        </Button>
        <Button
          variant="ghost"
          size="sm"
          leadingIcon={<MousePointerClick aria-hidden size={16} strokeWidth={1.75} />}
          onClick={() => centerPin.current && onPin(centerPin.current())}
        >
          Pin the map center
        </Button>
      </div>
      {locate.kind === "error" && <Alert tone="warning" title={locate.message} onDismiss={() => setLocate({ kind: "idle" })} />}

      <div
        className={cn(
          "relative h-80 overflow-hidden rounded-card border bg-cream sm:h-96",
          pinError ? "border-danger" : "border-border",
        )}
      >
        <PinMap
          value={draft.pin}
          onChange={(pin) => onPin(pin)}
          focusKey={focusKey}
          registerCenterPin={(fn) => {
            centerPin.current = fn;
          }}
          label="Map of Pasig City. Click to place your pin."
        />
        {!draft.pin && (
          <p className="pointer-events-none absolute inset-x-3 bottom-3 z-500 mx-auto w-fit rounded-full bg-ink/80 px-4 py-2 text-sm font-medium text-white shadow-popover">
            Tap the map where the problem is
          </p>
        )}
      </div>

      <div aria-live="polite" className="text-sm">
        {pinError ? (
          <p className="font-medium text-danger">{pinError}</p>
        ) : draft.pin ? (
          <p className="flex flex-wrap items-center gap-x-2 text-muted">
            <MapPin aria-hidden size={16} strokeWidth={1.75} className="text-brand-600" />
            <span className="font-semibold text-ink">Pin placed</span>
            <span className="font-mono text-xs tabular">
              {draft.pin.latitude.toFixed(5)}, {draft.pin.longitude.toFixed(5)}
            </span>
            {checking && <span>· Checking for similar reports…</span>}
          </p>
        ) : null}
      </div>

      {children}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Barangay" helper="We suggested one from your pin. Change it if it's wrong.">
          <Select value={draft.barangay} onChange={(e) => onChange({ barangay: e.target.value })} name="barangay">
            <option value="">Select a barangay</option>
            {BARANGAY_NAMES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Street or landmark" hint="Optional" helper="Helps the crew find it faster.">
          <Input
            name="address"
            value={draft.address}
            maxLength={255}
            placeholder="e.g. Corner of Brixton St, near the bakery"
            onChange={(e) => onChange({ address: e.target.value })}
          />
        </Field>
      </div>
    </div>
  );
}

// ---------- 3. Details ----------
export function DetailsStep({
  draft,
  onChange,
  errors,
}: {
  draft: ReportDraft;
  onChange: (patch: Partial<ReportDraft>) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="grid gap-5">
      <StepHeading id="step-details" title="Describe the problem" description="Say what you see, how long it's been there, and who it affects." />
      <Field label="Short title" required error={errors.title} helper="Like a headline: what and where.">
        <Input
          name="title"
          value={draft.title}
          maxLength={TITLE_MAX}
          placeholder="Clogged drain floods the corner of Brixton St"
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </Field>
      <Field label="What's happening?" required error={errors.description} helper="Include when it started and if anyone is at risk.">
        <Textarea
          name="description"
          rows={6}
          value={draft.description}
          maxLength={DESCRIPTION_MAX}
          showCount
          placeholder="The drain has been full of plastic for a week. After 20 minutes of rain, water reaches the sidewalk and people walk on the road."
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </Field>
    </div>
  );
}

// ---------- 4. Photo ----------
export function PhotoStep({ photo, onChange }: { photo: File | null; onChange: (file: File | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const preview = usePreviewUrl(photo);

  function pick(file: File | undefined) {
    if (!file) return;
    const problem = photoProblem(file);
    setError(problem);
    if (!problem) onChange(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="grid gap-5">
      <StepHeading id="step-photo" title="Add a photo" description="Optional, but a clear photo helps officials act faster. JPG, PNG or WebP up to 10 MB." />
      {error && <Alert tone="danger" title={error} onDismiss={() => setError(null)} />}

      <input
        ref={inputRef}
        id="report-photo"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="sr-only"
        onChange={(e) => pick(e.target.files?.[0])}
      />

      {photo ? (
        <div className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- local preview of a file the user picked
            <img src={preview} alt="Preview of your photo" className="max-h-96 w-full bg-cream object-contain" />
          ) : (
            <div className="flex h-48 items-center justify-center bg-cream text-muted">
              <Camera aria-hidden size={32} strokeWidth={1.5} />
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{photo.name}</p>
              <p className="text-sm text-muted tabular">{formatFileSize(photo.size)}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
                Replace
              </Button>
              <Button variant="ghost" size="sm" leadingIcon={<Trash2 aria-hidden size={16} strokeWidth={1.75} />} onClick={() => onChange(null)}>
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <label
          htmlFor="report-photo"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pick(e.dataTransfer.files?.[0]);
          }}
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed border-border bg-surface px-6 py-12 text-center transition-colors hover:border-brand-600/50 hover:bg-brand-50"
        >
          <span aria-hidden className="flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <ImagePlus size={26} strokeWidth={1.75} />
          </span>
          <span className="font-semibold text-ink">Take or choose a photo</span>
          <span className="text-sm text-muted">On a computer, you can also drop it here.</span>
        </label>
      )}
    </div>
  );
}

function usePreviewUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file || typeof URL.createObjectURL !== "function") return;
    const next = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- object URL must be created and revoked with the file
    setUrl(next);
    return () => {
      URL.revokeObjectURL(next);
      setUrl(null);
    };
  }, [file]);
  return url;
}

// ---------- 5. Review ----------
export function ReviewStep({
  draft,
  categoryName,
  onEdit,
  children,
}: {
  draft: ReportDraft;
  categoryName: string;
  onEdit: (step: ReportStepId) => void;
  children?: ReactNode;
}) {
  const preview = usePreviewUrl(draft.photo);
  const rows: Array<{ step: ReportStepId; label: string; value: ReactNode }> = [
    { step: "category", label: "Category", value: categoryName },
    {
      step: "location",
      label: "Location",
      value: (
        <>
          {draft.barangay ? `Barangay ${draft.barangay}` : "Barangay not set"}
          {draft.address && <span className="block text-muted">{draft.address}</span>}
        </>
      ),
    },
    {
      step: "details",
      label: "Description",
      value: (
        <>
          <span className="block font-semibold">{draft.title}</span>
          <span className="mt-1 block whitespace-pre-line text-muted">{draft.description}</span>
        </>
      ),
    },
    {
      step: "photo",
      label: "Photo",
      value: draft.photo ? (
        <span className="flex items-center gap-3">
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element -- local preview
            <img src={preview} alt="" className="size-14 rounded-chip object-cover" />
          )}
          {draft.photo.name}
        </span>
      ) : (
        <span className="text-muted">No photo</span>
      ),
    },
  ];

  return (
    <div className="grid gap-5">
      <StepHeading id="step-review" title="Check and send" description="Your name and contact are only shared with officials. The report itself is public." />
      {children}
      <dl className="divide-y divide-border rounded-card border border-border bg-surface">
        {rows.map((row) => (
          <div key={row.step} className="flex items-start gap-4 p-4">
            <dt className="w-28 shrink-0 text-sm font-semibold text-muted">{row.label}</dt>
            <dd className="min-w-0 flex-1 text-ink">{row.value}</dd>
            <dd className="shrink-0">
              <button
                type="button"
                onClick={() => onEdit(row.step)}
                aria-label={`Edit ${row.label.toLowerCase()}`}
                className="flex min-h-touch items-center gap-1.5 rounded-control px-2 text-sm font-semibold text-brand-600 hover:bg-brand-50"
              >
                <Pencil aria-hidden size={14} strokeWidth={1.75} />
                Edit
              </button>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
