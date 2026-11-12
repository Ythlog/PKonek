/** First focusable element on every page; jumps keyboard users past the navigation. */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only rounded-control bg-brand-700 px-4 py-3 font-semibold text-white shadow-popover focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
    >
      Skip to main content
    </a>
  );
}
