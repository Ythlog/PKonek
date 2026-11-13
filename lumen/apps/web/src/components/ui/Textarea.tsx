"use client";

import { useState, type ChangeEvent, type Ref, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { controlBorder, controlClasses, useFieldControl } from "./Field";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  ref?: Ref<HTMLTextAreaElement>;
  /** Show "used / maxLength" under the field. Requires maxLength. */
  showCount?: boolean;
};

export function Textarea({ showCount = false, className, onChange, rows = 4, ...props }: TextareaProps) {
  const { invalid, ...control } = useFieldControl(props);
  const initial = String(props.value ?? props.defaultValue ?? "").length;
  const [uncontrolledLength, setLength] = useState(initial);
  const length = props.value !== undefined ? String(props.value).length : uncontrolledLength;
  const max = props.maxLength;

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setLength(event.target.value.length);
    onChange?.(event);
  }

  return (
    <div className="flex flex-col gap-1">
      <textarea
        {...props}
        {...control}
        rows={rows}
        onChange={handleChange}
        className={cn(controlClasses, controlBorder(invalid), "resize-y py-2.5 leading-relaxed", className)}
      />
      {showCount && max !== undefined && (
        <p
          aria-hidden
          className={cn("self-end text-xs tabular", length >= max ? "font-semibold text-danger" : "text-muted")}
        >
          {length} / {max}
        </p>
      )}
    </div>
  );
}
