"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Action buttons, right-aligned on desktop and stacked on mobile. */
  footer?: ReactNode;
};

/**
 * Native <dialog> opened with showModal(): the browser traps focus, makes the page
 * behind it inert, and returns focus to the trigger when it closes.
 */
function useModalDialog(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    if (!dialog.open) dialog.showModal();
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
      if (dialog.open) dialog.close();
    };
  }, [open]);
  return ref;
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className="-mr-2 -mt-1 flex size-touch shrink-0 items-center justify-center rounded-control text-muted transition-colors hover:bg-page hover:text-ink"
    >
      <X aria-hidden size={20} strokeWidth={1.75} />
    </button>
  );
}

function DialogHeader({ titleId, descId, title, description, onClose }: {
  titleId: string;
  descId?: string;
  title: ReactNode;
  description?: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start gap-4 border-b border-border px-6 py-4">
      <div className="min-w-0 flex-1">
        <h2 id={titleId} className="text-xl">
          {title}
        </h2>
        {description && (
          <p id={descId} className="mt-1 text-sm text-muted">
            {description}
          </p>
        )}
      </div>
      <CloseButton onClose={onClose} />
    </div>
  );
}

function DialogFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-2 border-t border-border px-6 py-4 sm:flex-row sm:justify-end">{children}</div>
  );
}

const modalSizes = { sm: "sm:max-w-md", md: "sm:max-w-lg", lg: "sm:max-w-2xl" } as const;

export function Modal({ open, onClose, title, description, children, footer, size = "md" }: DialogProps & {
  size?: keyof typeof modalSizes;
}) {
  const ref = useModalDialog(open);
  const titleId = useId();
  const descId = useId();
  if (!open) return null;
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 m-0 flex size-full max-h-none max-w-none items-end justify-center bg-transparent p-0 backdrop:bg-ink/45 backdrop:animate-fade-in sm:items-center sm:p-6"
    >
      <div
        className={cn(
          "flex max-h-[92dvh] w-full animate-pop-in flex-col overflow-hidden rounded-t-panel bg-surface shadow-popover sm:rounded-panel",
          modalSizes[size],
        )}
      >
        <DialogHeader titleId={titleId} descId={descId} title={title} description={description} onClose={onClose} />
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </div>
    </dialog>
  );
}

const drawerSides = {
  right: { dialog: "justify-end", panel: "h-full w-full max-w-md animate-slide-in-right sm:rounded-l-panel" },
  left: { dialog: "justify-start", panel: "h-full w-full max-w-xs animate-slide-in-left rounded-r-panel" },
  bottom: { dialog: "items-end", panel: "max-h-[85dvh] w-full animate-slide-in-up rounded-t-panel" },
} as const;

export function Drawer({ open, onClose, title, description, children, footer, side = "right" }: DialogProps & {
  side?: keyof typeof drawerSides;
}) {
  const ref = useModalDialog(open);
  const titleId = useId();
  const descId = useId();
  if (!open) return null;
  const styles = drawerSides[side];
  return (
    <dialog
      ref={ref}
      data-side={side}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className={cn(
        "fixed inset-0 m-0 flex size-full max-h-none max-w-none bg-transparent p-0 backdrop:bg-ink/45 backdrop:animate-fade-in",
        styles.dialog,
      )}
    >
      <div className={cn("flex flex-col overflow-hidden bg-surface shadow-popover", styles.panel)}>
        <DialogHeader titleId={titleId} descId={descId} title={title} description={description} onClose={onClose} />
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </div>
    </dialog>
  );
}
