"use client";

import { useState, type KeyboardEvent } from "react";
import { Eye, EyeOff, Lock, TriangleAlert } from "lucide-react";
import { Input, type InputProps } from "@/components/ui/Input";

/** Password field with a show/hide toggle and a Caps Lock warning. Use inside <Field>. */
export function PasswordInput({ onKeyUp, onKeyDown, onBlur, ...props }: Omit<InputProps, "type" | "trailing">) {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  function checkCaps(event: KeyboardEvent<HTMLInputElement>) {
    if (typeof event.getModifierState === "function") setCapsLock(event.getModifierState("CapsLock"));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        leadingIcon={<Lock size={18} strokeWidth={1.75} />}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        onKeyDown={(e) => {
          checkCaps(e);
          onKeyDown?.(e);
        }}
        onKeyUp={(e) => {
          checkCaps(e);
          onKeyUp?.(e);
        }}
        onBlur={(e) => {
          setCapsLock(false);
          onBlur?.(e);
        }}
        trailing={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            className="flex size-10 items-center justify-center rounded-control text-muted transition-colors hover:bg-page hover:text-ink"
          >
            {visible ? <EyeOff aria-hidden size={18} strokeWidth={1.75} /> : <Eye aria-hidden size={18} strokeWidth={1.75} />}
          </button>
        }
      />
      <p aria-live="polite" className="min-h-0 text-sm font-medium text-warning empty:hidden">
        {capsLock && (
          <span className="flex items-center gap-1.5">
            <TriangleAlert aria-hidden size={16} strokeWidth={1.75} />
            Caps Lock is on
          </span>
        )}
      </p>
    </div>
  );
}
