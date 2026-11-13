"use client";

import type { Ref, SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { controlBorder, controlClasses, useFieldControl } from "./Field";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  ref?: Ref<HTMLSelectElement>;
  /** Adds an empty first option. */
  placeholder?: string;
};

// Native <select> on purpose: it is keyboard and screen-reader friendly and uses the phone's picker.
export function Select({ placeholder, className, children, ...props }: SelectProps) {
  const { invalid, ...control } = useFieldControl(props);
  const defaultValue = props.value === undefined && props.defaultValue === undefined && placeholder ? "" : props.defaultValue;
  return (
    <div className="relative">
      <select
        {...props}
        {...control}
        defaultValue={defaultValue}
        className={cn(controlClasses, controlBorder(invalid), "cursor-pointer appearance-none pr-10", className)}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {children}
      </select>
      <ChevronDown
        aria-hidden
        size={18}
        strokeWidth={1.75}
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted"
      />
    </div>
  );
}
