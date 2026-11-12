"use client";

import { useEffect, useRef, useState } from "react";

export const LOGO_SRC = "/brand/pkonek-logo.png";

type LogoProps = {
  /**
   * "plain": the logo alone. Only use it on brand-700 surfaces, because the logo is cream.
   * "badge": the logo inside a brand-700 rounded badge, for light headers.
   */
  variant?: "plain" | "badge";
  size?: "sm" | "md" | "lg";
  className?: string;
};

const heights = { sm: "h-7", md: "h-9", lg: "h-14" } as const;
const wordmarkSizes = { sm: "text-lg", md: "text-xl", lg: "text-3xl" } as const;

export function Logo({ variant = "plain", size = "md", className = "" }: LogoProps) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // The image can fail before React hydrates, so onError alone would miss it.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  const content = failed ? (
    <span className={`font-extrabold tracking-heading text-cream ${wordmarkSizes[size]}`}>PKonek</span>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element -- tiny static asset with a client-side fallback
    <img
      ref={imgRef}
      src={LOGO_SRC}
      alt="PKonek"
      className={`${heights[size]} w-auto select-none`}
      onError={() => setFailed(true)}
      draggable={false}
    />
  );

  if (variant === "badge") {
    return (
      <span className={`inline-flex items-center rounded-control bg-brand-700 px-3 py-1.5 ${className}`}>
        {content}
      </span>
    );
  }
  return <span className={`inline-flex items-center ${className}`}>{content}</span>;
}
