"use client";

import { createContext, useContext, useId, type AriaAttributes, type ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import { titleCaseChildren } from "@/lib/text";

type FieldContextValue = {
  id: string;
  describedBy?: string;
  invalid: boolean;
  required: boolean;
};

const FieldContext = createContext<FieldContextValue | null>(null);

/** Used by Input, Textarea and Select to pick up the id and ARIA links from <Field>. */
export function useFieldControl(
  props: Pick<AriaAttributes, "aria-describedby" | "aria-invalid"> & { id?: string; required?: boolean },
) {
  const field = useContext(FieldContext);
  const describedBy = [field?.describedBy, props["aria-describedby"]].filter(Boolean).join(" ") || undefined;
  const invalid = field?.invalid || props["aria-invalid"] === true || props["aria-invalid"] === "true";
  return {
    id: props.id ?? field?.id,
    "aria-describedby": describedBy,
    "aria-invalid": invalid || undefined,
    required: props.required ?? field?.required,
    invalid,
  };
}

/** Shared control styles: 44px tall, visible border, brand focus ring, red border on error. */
export const controlClasses =
  "block w-full min-h-touch rounded-control border bg-surface px-3.5 text-base text-ink placeholder:text-muted/80 " +
  "transition-[border-color,box-shadow] duration-150 ease-standard " +
  "focus-visible:border-brand-600 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-600/20 " +
  "disabled:cursor-not-allowed disabled:bg-page disabled:text-muted";

export function controlBorder(invalid: boolean) {
  return invalid
    ? "border-danger focus-visible:border-danger focus-visible:ring-danger/20"
    : "border-border hover:border-muted/50";
}

type FieldProps = {
  label: ReactNode;
  helper?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  /** Shown next to the label, e.g. "Optional" or a link. */
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function Field({ label, helper, error, required = false, hint, className, children }: FieldProps) {
  const id = useId();
  const helperId = helper ? `${id}-helper` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helperId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <FieldContext.Provider value={{ id, describedBy, invalid: Boolean(error), required }}>
      <div className={cn("flex flex-col gap-1.5", className)}>
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={id} className="text-sm font-semibold text-ink">
            {titleCaseChildren(label)}
            {required && (
              <span aria-hidden className="ml-0.5 text-danger">
                *
              </span>
            )}
          </label>
          {hint && <span className="text-sm text-muted">{hint}</span>}
        </div>
        {children}
        {helper && (
          <p id={helperId} className="text-sm text-muted">
            {helper}
          </p>
        )}
        {error && (
          <p id={errorId} className="flex items-start gap-1.5 text-sm font-medium text-danger">
            <CircleAlert aria-hidden size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}
