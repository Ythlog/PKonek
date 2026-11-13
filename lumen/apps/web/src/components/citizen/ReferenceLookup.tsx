"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { complaintService } from "@/lib/api";
import { isApiError } from "@/lib/api/errors";
import { idFromReference, normalizeReference } from "@/lib/tracking";

/** Find any report by its reference number, e.g. one a neighbor shared. */
export function ReferenceLookup() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const reference = normalizeReference(value);
    const id = idFromReference(reference);
    if (!id) return setError("Enter a reference like PSG-2026-000123.");
    setLoading(true);
    setError(null);
    try {
      const complaint = await complaintService.get(id);
      if (complaint.reference_no !== reference) throw new Error("mismatch");
      router.push(`/app/reports/${complaint.id}`);
    } catch (e) {
      setError(isApiError(e) && e.kind !== "not_found" ? e.message : `We couldn't find ${reference}. Check the number and try again.`);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate role="search" aria-label="Find a report by reference number" className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <Field label="Reference number" error={error ?? undefined} className="flex-1">
        <Input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          placeholder="PSG-2026-000123"
          autoCapitalize="characters"
          spellCheck={false}
          className="font-mono"
          leadingIcon={<Search size={18} strokeWidth={1.75} />}
        />
      </Field>
      <Button type="submit" variant="secondary" loading={loading} className="sm:mt-7">
        Find report
      </Button>
    </form>
  );
}
