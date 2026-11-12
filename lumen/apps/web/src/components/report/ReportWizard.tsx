"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Send } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { complaintService, mediaService } from "@/lib/api";
import { isApiError } from "@/lib/api/errors";
import type { Complaint, DuplicateCandidate, Pin } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useCategories } from "@/lib/queries";
import {
  EMPTY_DRAFT,
  REPORT_STEPS,
  detailsSchema,
  firstIncompleteStep,
  isInsidePasig,
  nearestBarangay,
  stepForField,
  type ReportDraft,
  type ReportStepId,
} from "@/lib/report";
import { fieldErrors } from "@/lib/auth/schemas";
import { DuplicatePanel } from "./DuplicatePanel";
import { ReportSuccess, type ReportOutcome } from "./ReportSuccess";
import { CategoryStep, DetailsStep, LocationStep, PhotoStep, ReviewStep } from "./steps";
import { StepIndicator } from "./StepIndicator";

const OUTSIDE_PASIG = "That spot is outside Pasig City. Move the pin inside the city.";

/** Rounded so tiny drags don't trigger a new duplicate check. */
const pinKey = (pin: Pin | null) => (pin ? `${pin.latitude.toFixed(5)},${pin.longitude.toFixed(5)}` : null);

function currentPosition(): Promise<Pin> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("Your browser can't share your location. Place the pin on the map instead."));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      (e) =>
        reject(
          new Error(
            e.code === e.PERMISSION_DENIED
              ? "Location access is blocked. Allow it in your browser, or place the pin on the map."
              : "We couldn't get your location. Place the pin on the map instead.",
          ),
        ),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  });
}

export function ReportWizard() {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const categories = useCategories();

  const [step, setStep] = useState<ReportStepId>("category");
  const [draft, setDraft] = useState<ReportDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [focusKey, setFocusKey] = useState(0);
  const [blockingDuplicates, setBlockingDuplicates] = useState<DuplicateCandidate[] | null>(null);
  const [supportingId, setSupportingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<ReportOutcome | null>(null);
  const [barangayChosen, setBarangayChosen] = useState(false);

  const stepIndex = REPORT_STEPS.findIndex((s) => s.id === step);
  const category = categories.data?.find((c) => c.id === draft.categoryId);
  const pinInside = draft.pin ? isInsidePasig(draft.pin) : false;

  const duplicates = useQuery({
    queryKey: ["duplicate-check", draft.categoryId, pinKey(draft.pin)],
    queryFn: () => complaintService.checkDuplicates({ category_id: draft.categoryId!, ...draft.pin! }),
    enabled: Boolean(draft.categoryId && draft.pin && pinInside),
    staleTime: 60_000,
  });
  const candidates = blockingDuplicates ?? (duplicates.data?.is_duplicate ? duplicates.data.candidates : []);
  const radiusM = duplicates.data?.radius_m ?? 50;

  function update(patch: Partial<ReportDraft>) {
    setDraft((d) => ({ ...d, ...patch }));
    setFormError(null);
    if (Object.keys(errors).length) setErrors({});
  }

  function setPin(pin: Pin, options: { focus?: boolean } = {}) {
    setBlockingDuplicates(null);
    // Keep suggesting the nearest barangay until the resident picks one themselves.
    setDraft((d) => ({ ...d, pin, barangay: !barangayChosen && isInsidePasig(pin) ? nearestBarangay(pin) : d.barangay }));
    setErrors(isInsidePasig(pin) ? {} : { latitude: OUTSIDE_PASIG });
    if (options.focus) setFocusKey((k) => k + 1);
  }

  function goTo(next: ReportStepId) {
    setFormError(null);
    setStep(next);
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  }

  function validateStep(id: ReportStepId): boolean {
    if (id === "category" && !draft.categoryId) {
      setErrors({ category_id: "Choose a category to continue." });
      return false;
    }
    if (id === "location") {
      if (!draft.pin) return setErrors({ latitude: "Place a pin on the map to continue." }), false;
      if (!pinInside) return setErrors({ latitude: OUTSIDE_PASIG }), false;
      if (candidates.length) {
        setFormError("A matching report is already open here. Add your Me Too, or choose a different category.");
        return false;
      }
    }
    if (id === "details") {
      const found = fieldErrors(detailsSchema, draft);
      setErrors(found);
      if (Object.keys(found).length) return false;
    }
    return true;
  }

  function next() {
    if (!validateStep(step)) return;
    goTo(REPORT_STEPS[stepIndex + 1].id);
  }

  async function support(candidate: DuplicateCandidate) {
    if (!draft.pin) return;
    setSupportingId(candidate.id);
    try {
      const updated = await complaintService.support(candidate.id, { ...draft.pin, reporter_contact: user?.email ?? null });
      await queryClient.invalidateQueries({ queryKey: ["complaints"] });
      setOutcome({ kind: "supported", complaint: updated });
    } catch (error) {
      toast.show({ tone: "danger", title: "Couldn't add your Me Too", description: isApiError(error) ? error.message : undefined });
    } finally {
      setSupportingId(null);
    }
  }

  async function submit() {
    const incomplete = firstIncompleteStep(draft);
    if (incomplete) {
      validateStep(incomplete);
      return goTo(incomplete);
    }
    const parsed = detailsSchema.parse(draft);
    setSubmitting(true);
    setFormError(null);
    let created: Complaint;
    try {
      created = await complaintService.create({
        category_id: draft.categoryId!,
        title: parsed.title,
        description: parsed.description,
        latitude: draft.pin!.latitude,
        longitude: draft.pin!.longitude,
        barangay: draft.barangay || null,
        address_text: parsed.address || null,
      });
    } catch (error) {
      setSubmitting(false);
      if (isApiError(error) && error.kind === "duplicate" && error.duplicate) {
        setBlockingDuplicates(error.duplicate.candidates);
        return goTo("location");
      }
      if (isApiError(error) && Object.keys(error.fieldErrors).length) {
        setErrors(error.fieldErrors);
        return goTo(stepForField(Object.keys(error.fieldErrors)[0]));
      }
      if (isApiError(error) && error.kind === "validation") {
        // Plain 422s are about the pin or the category.
        if (/categor/i.test(error.message)) {
          setErrors({ category_id: error.message });
          return goTo("category");
        }
        setErrors({ latitude: error.message });
        return goTo("location");
      }
      setFormError(isApiError(error) ? error.message : "Something went wrong. Please try again.");
      return;
    }

    let photoFailed: string | null = null;
    if (draft.photo) {
      try {
        await mediaService.upload(created.id, draft.photo, "initial");
      } catch (error) {
        photoFailed = isApiError(error) ? error.message : "The photo couldn't be uploaded.";
      }
    }
    await queryClient.invalidateQueries({ queryKey: ["complaints"] });
    setSubmitting(false);
    setOutcome({ kind: "created", complaint: created, photoFailed });
  }

  function reset() {
    setDraft(EMPTY_DRAFT);
    setErrors({});
    setFormError(null);
    setBlockingDuplicates(null);
    setOutcome(null);
    setBarangayChosen(false);
    setStep("category");
  }

  if (outcome) return <ReportSuccess outcome={outcome} onReportAnother={reset} />;

  const reachable = REPORT_STEPS.slice(0, stepIndex).map((s) => s.id);
  const duplicatePanel =
    candidates.length > 0 ? (
      <DuplicatePanel
        candidates={candidates}
        radiusM={radiusM}
        onSupport={support}
        supportingId={supportingId}
        blocking={Boolean(blockingDuplicates)}
        onChangeCategory={() => {
          setBlockingDuplicates(null);
          goTo("category");
        }}
      />
    ) : null;

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <StepIndicator current={step} reachable={reachable} onSelect={goTo} />

      <Card padding="none" className="overflow-hidden">
        <form
          noValidate
          aria-labelledby={`step-${step}`}
          onSubmit={(e) => {
            e.preventDefault();
            if (step === "review") submit();
            else next();
          }}
        >
          <div className="p-5 sm:p-8">
            {step === "category" && (
              <CategoryStep
                categories={categories.data ?? []}
                loading={categories.isPending}
                value={draft.categoryId}
                error={errors.category_id}
                onChange={(id) => {
                  setBlockingDuplicates(null);
                  update({ categoryId: id });
                }}
              />
            )}
            {step === "location" && (
              <LocationStep
                draft={draft}
                onPin={setPin}
                onChange={(patch) => {
                  if ("barangay" in patch) setBarangayChosen(true);
                  update(patch);
                }}
                pinError={errors.latitude ?? errors.longitude}
                focusKey={focusKey}
                checking={duplicates.isFetching}
                onLocate={async () => {
                  const pin = await currentPosition();
                  if (!isInsidePasig(pin)) throw new Error("You seem to be outside Pasig City. Place the pin on the map instead.");
                  setPin(pin, { focus: true });
                }}
              >
                {duplicatePanel}
              </LocationStep>
            )}
            {step === "details" && <DetailsStep draft={draft} onChange={update} errors={errors} />}
            {step === "photo" && <PhotoStep photo={draft.photo} onChange={(photo) => update({ photo })} />}
            {step === "review" && (
              <ReviewStep draft={draft} categoryName={category?.name ?? "Not chosen"} onEdit={goTo}>
                {formError && <Alert tone="danger" title="We couldn't send your report">{formError}</Alert>}
              </ReviewStep>
            )}
            {step !== "review" && formError && <Alert className="mt-5" tone="warning" title={formError} />}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-border bg-page/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            {stepIndex > 0 ? (
              <Button variant="ghost" leadingIcon={<ArrowLeft aria-hidden size={18} strokeWidth={1.75} />} onClick={() => goTo(REPORT_STEPS[stepIndex - 1].id)}>
                Back
              </Button>
            ) : (
              <span className="hidden sm:block" />
            )}
            {step === "review" ? (
              <Button type="submit" size="lg" loading={submitting} leadingIcon={<Send aria-hidden size={18} strokeWidth={1.75} />}>
                {submitting ? "Sending your report" : "Send report"}
              </Button>
            ) : (
              <Button type="submit" size="lg" trailingIcon={<ArrowRight aria-hidden size={18} strokeWidth={1.75} />}>
                {step === "photo" && !draft.photo ? "Skip photo" : "Continue"}
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
