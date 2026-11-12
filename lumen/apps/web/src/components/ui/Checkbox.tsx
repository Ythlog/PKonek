"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from "react";
import { cn } from "@/lib/cn";

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  ref?: Ref<HTMLInputElement>;
  label: ReactNode;
  description?: ReactNode;
};

export function Checkbox({ label, description, className, id, ...props }: CheckboxProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const descId = description ? `${inputId}-desc` : undefined;
  return (
    <div className={cn("flex items-start gap-3", className)}>
      {/* 44px hit area around a 20px box */}
      <span className="-m-3 flex size-touch shrink-0 items-center justify-center">
        <input
          {...props}
          id={inputId}
          type="checkbox"
          aria-describedby={descId}
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
      </span>
    </div>
  );
}
