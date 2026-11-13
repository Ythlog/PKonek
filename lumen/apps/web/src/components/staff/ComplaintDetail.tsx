"use client";

import { useRef, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, ExternalLink, HandHeart, Mail, MapPin, Send, UserRound } from "lucide-react";
import { CategoryIcon } from "@/components/complaints/CategoryIcon";
import { Timeline } from "@/components/complaints/Timeline";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge, statusLabel } from "@/components/ui/StatusBadge";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { complaintService, mediaService } from "@/lib/api";
import { errorMessage, isApiError } from "@/lib/api/errors";
import { ALLOWED_TRANSITIONS, type Category, type ComplaintStaff, type ComplaintStatus } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { queryKeys, useComplaint, useTimeline } from "@/lib/queries";
import { photoProblem } from "@/lib/report";
import { titleCase } from "@/lib/text";

const UPDATE_MAX = 2000;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3">
      <h3 className="text-sm font-semibold uppercase tracking-eyebrow text-muted">{titleCase(title)}</h3>
      {children}
    </section>
  );
}

/** Contents of the staff complaint drawer: details, status change, updates, photos and history. */
export function ComplaintDetail({ id, categories }: { id: number; categories: Map<number, Category> }) {
  const complaint = useComplaint(id);
  const timeline = useTimeline(id);

  if (complaint.isPending) {
    return (
      <div aria-busy="true" className="grid gap-4">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (complaint.isError) {
    return <Alert tone="danger" title="We couldn't load this complaint">{errorMessage(complaint.error)}</Alert>;
  }

  const c = complaint.data as ComplaintStaff;
  const category = categories.get(c.category_id);
  const mapUrl = `https://www.openstreetmap.org/?mlat=${c.latitude}&mlon=${c.longitude}#map=18/${c.latitude}/${c.longitude}`;

  return (
    <div className="grid gap-8">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={c.status} />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-sm font-semibold text-brand-700">
            <CategoryIcon code={category?.code} size={14} />
            {category?.name ?? "Unknown category"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-2.5 py-1 text-sm font-semibold text-ink tabular">
            <HandHeart aria-hidden size={14} strokeWidth={1.75} />
            {c.report_count} {c.report_count === 1 ? "report" : "reports"}
          </span>
        </div>
        <p className="text-lg font-bold leading-snug tracking-heading text-brand-700">{c.title}</p>
        <p className="whitespace-pre-line text-ink">{c.description}</p>
        {c.photo_url && (
          // eslint-disable-next-line @next/next/no-img-element -- evidence served by the API
          <img src={c.photo_url} alt={`Photo for ${c.reference_no}`} className="max-h-72 w-full rounded-card border border-border bg-cream object-contain" />
        )}
      </div>

      <dl className="grid gap-3 rounded-card border border-border bg-page p-4 text-sm sm:grid-cols-2">
        <div className="flex items-start gap-2">
          <MapPin aria-hidden size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-brand-600" />
          <div>
            <dt className="sr-only">Location</dt>
            <dd className="text-ink">{c.address_text ?? (c.barangay ? `Barangay ${c.barangay}` : "No address given")}</dd>
            <dd>
              <a href={mapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:text-brand-700">
                Open in Map <ExternalLink aria-hidden size={12} />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </dd>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <UserRound aria-hidden size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-brand-600" />
          <div>
            <dt className="sr-only">Reporter</dt>
            <dd className="text-ink">{c.reporter_name ?? "Anonymous"}</dd>
            {c.reporter_contact && (
              <dd className="flex items-center gap-1 text-muted">
                <Mail aria-hidden size={12} /> {c.reporter_contact}
              </dd>
            )}
          </div>
        </div>
        <div className="sm:col-span-2">
          <dt className="inline text-muted">Reported </dt>
          <dd className="inline text-ink">{formatDateTime(c.created_at)}</dd>
          {c.resolved_at && (
            <>
              <dt className="inline text-muted"> · Resolved </dt>
              <dd className="inline text-ink">{formatDateTime(c.resolved_at)}</dd>
            </>
          )}
        </div>
      </dl>

      <StatusForm complaint={c} />
      <UpdateForm complaintId={c.id} />
      <ProgressPhoto complaintId={c.id} />

      <Section title="History">
        {timeline.isPending && <Skeleton className="h-32 w-full" />}
        {timeline.isError && <Alert tone="warning" title="History is unavailable">{errorMessage(timeline.error)}</Alert>}
        {timeline.data && <Timeline items={timeline.data} />}
      </Section>
    </div>
  );
}

function useRefresh(id: number) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.complaint(id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline(id) }),
      queryClient.invalidateQueries({ queryKey: ["complaints"] }),
    ]);
}

function StatusForm({ complaint }: { complaint: ComplaintStaff }) {
  const toast = useToast();
  const refresh = useRefresh(complaint.id);
  const options = ALLOWED_TRANSITIONS[complaint.status];
  const [to, setTo] = useState<ComplaintStatus | "">(options[0] ?? "");
  const [note, setNote] = useState("");
  const mutation = useMutation({
    mutationFn: () => complaintService.updateStatus(complaint.id, { status: to as ComplaintStatus, note: note.trim() || null }),
    onSuccess: async (updated) => {
      await refresh();
      setNote("");
      setTo(ALLOWED_TRANSITIONS[updated.status][0] ?? "");
      toast.show({ tone: "success", title: `Status changed to ${statusLabel(updated.status)}`, description: complaint.reference_no });
    },
  });

  if (options.length === 0) {
    return (
      <Section title="Status">
        <p className="rounded-control bg-page p-3 text-sm text-muted">
          This complaint is <span className="font-semibold text-ink">{statusLabel(complaint.status).toLowerCase()}</span>. Closed complaints can&rsquo;t change status.
        </p>
      </Section>
    );
  }

  return (
    <Section title="Change status">
      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (to) mutation.mutate();
        }}
      >
        <Field label="New status" required>
          <Select value={to} onChange={(e) => setTo(e.target.value as ComplaintStatus)}>
            {options.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Note for the record" hint="Optional" helper="Saved in the audit log with the change.">
          <Textarea rows={2} maxLength={500} showCount value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        {to === "rejected" && <Alert tone="warning" title="Rejecting closes this complaint for good">Residents can&rsquo;t add Me Too to a closed complaint.</Alert>}
        {mutation.isError && <Alert tone="danger" title="Status not changed">{errorMessage(mutation.error)}</Alert>}
        <Button type="submit" loading={mutation.isPending} variant={to === "rejected" ? "danger" : "primary"}>
          {to ? `Mark as ${statusLabel(to).toLowerCase()}` : "Change status"}
        </Button>
      </form>
    </Section>
  );
}

function UpdateForm({ complaintId }: { complaintId: number }) {
  const toast = useToast();
  const refresh = useRefresh(complaintId);
  const [body, setBody] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => complaintService.postUpdate(complaintId, { body: body.trim(), is_public: isPublic }),
    onSuccess: async () => {
      await refresh();
      setBody("");
      toast.show({ tone: "success", title: isPublic ? "Update posted for residents" : "Internal note saved" });
    },
    onError: (e) => setError(isApiError(e) ? e.fieldErrors.body ?? e.message : errorMessage(e)),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!body.trim()) return setError("Write the update first.");
    mutation.mutate();
  }

  return (
    <Section title="Post an update">
      <form className="grid gap-3" onSubmit={submit}>
        <Field label="Update" error={error ?? undefined} helper={isPublic ? "Residents who reported or supported this will see it." : "Only staff will see this note."}>
          <Textarea
            rows={3}
            maxLength={UPDATE_MAX}
            showCount
            value={body}
            placeholder="e.g. A crew is scheduled for Wednesday morning."
            onChange={(e) => {
              setBody(e.target.value);
              setError(null);
            }}
          />
        </Field>
        <Checkbox label="Visible to residents" description="Uncheck to save an internal note." checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
        <Button type="submit" variant="secondary" loading={mutation.isPending} leadingIcon={<Send aria-hidden size={16} strokeWidth={1.75} />}>
          {isPublic ? "Post update" : "Save note"}
        </Button>
      </form>
    </Section>
  );
}

function ProgressPhoto({ complaintId }: { complaintId: number }) {
  const toast = useToast();
  const refresh = useRefresh(complaintId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (file: File) => mediaService.upload(complaintId, file, "progress"),
    onSuccess: async () => {
      await refresh();
      toast.show({ tone: "success", title: "Progress photo added" });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  return (
    <Section title="Progress photo">
      <input
        ref={inputRef}
        id={`progress-photo-${complaintId}`}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const problem = photoProblem(file);
          setError(problem);
          if (!problem) mutation.mutate(file);
        }}
      />
      {error && <Alert tone="danger" title={error} onDismiss={() => setError(null)} />}
      <Button variant="secondary" loading={mutation.isPending} leadingIcon={<Camera aria-hidden size={16} strokeWidth={1.75} />} onClick={() => inputRef.current?.click()}>
        Upload a progress photo
      </Button>
      <label htmlFor={`progress-photo-${complaintId}`} className="sr-only">
        Choose a progress photo
      </label>
    </Section>
  );
}
