// Shared period helpers. The app's "today" is May 2026.
export const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};
export const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const CURRENT_MONTH = 4; // May 2026
export const YEAR = 2026;

export function monthOf(date: string): number {
  const tok = String(date ?? "").trim().split(/\s+/)[0];
  return MONTHS[tok] ?? CURRENT_MONTH;
}
