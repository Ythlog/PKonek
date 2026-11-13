/**
 * Mock mode is on unless NEXT_PUBLIC_USE_MOCKS is explicitly "false" or "0".
 * The backend has no citizen accounts or notification endpoints yet, so the demo
 * must keep working with no configuration.
 */
export function parseUseMocks(value: string | undefined): boolean {
  if (!value) return true;
  return !["false", "0"].includes(value.trim().toLowerCase());
}

export const USE_MOCKS = parseUseMocks(process.env.NEXT_PUBLIC_USE_MOCKS);
