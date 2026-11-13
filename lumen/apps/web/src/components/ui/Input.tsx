"use client";

import type { InputHTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "@/lib/cn";
import { controlBorder, controlClasses, useFieldControl } from "./Field";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  ref?: Ref<HTMLInputElement>;
  /** Decorative icon inside the left edge. */
  leadingIcon?: ReactNode;
  /** Interactive slot inside the right edge, e.g. a show-password button. */
  trailing?: ReactNode;
};

export function Input({ leadingIcon, trailing, className, ...props }: InputProps) {
  const { invalid, ...control } = useFieldControl(props);
  return (
    <div className="relative">
      {leadingIcon && (
        <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted">
          {leadingIcon}
        </span>
      )}
      <input
        {...props}
        {...control}
        className={cn(controlClasses, controlBorder(invalid), leadingIcon && "pl-10", trailing && "pr-12", className)}
      />
      {trailing && <span className="absolute inset-y-0 right-1 flex items-center">{trailing}</span>}
    </div>
  );
}
