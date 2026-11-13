"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  ref?: Ref<HTMLInputElement>;
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
};

export function Checkbox({ label, description, error, className, id, ...props }: CheckboxProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const descId = description ? `${inputId}-desc` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  return (
    <div className={cn("flex items-start gap-3", className)}>
      {/* 44px hit area around a 20px box */}
      <span className="-m-3 flex size-touch shrink-0 items-center justify-center">
        <input
          {...props}
          id={inputId}
          type="checkbox"
          aria-describedby={[descId, errorId].filter(Boolean).join(" ") || undefined}
          aria-invalid={error ? true : props["aria-invalid"]}
          className="size-5 cursor-pointer rounded-chip accent-brand-600"
        />
      </span>
      <span className="flex flex-col">
        <label htmlFor={inputId} className="cursor-pointer text-base font-medium text-ink">
          {label}
        </label>
        {description && (
          <span id={descId} className="text-sm text-muted">
            {description}
          </span>
        )}
        {error && (
          <span id={errorId} className="mt-1 flex items-start gap-1.5 text-sm font-medium text-danger">
            <CircleAlert aria-hidden size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
            {error}
          </span>
        )}
      </span>
    </div>
  );
}
