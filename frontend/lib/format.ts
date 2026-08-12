/**
 * Formatting utilities for the InsurFlow insurance app.
 */

/** Locale used for all number formatting */
const LOCALE = 'fr-MA';

/**
 * Format a moisDem value (ISO date string or "MM/YYYY" partial) to a human-readable
 * month label such as "Jan 2025".
 *
 * Supports:
 *   - Full ISO  "2025-01-15"  → "Jan 2025"
 *   - Year-month "2025-01"   → "Jan 2025"
 *   - Already formatted      → returned as-is
 */
export function formatMoisDem(value?: string | null): string {
  if (!value) return '—';
  try {
    // Normalize: if only "YYYY-MM" append a day so Date can parse it
    const normalized = /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : value;
    const date = new Date(normalized);
    if (isNaN(date.getTime())) return value;
    return date.toLocaleDateString(LOCALE, { month: 'short', year: 'numeric' });
  } catch {
    return value;
  }
}

/**
 * Format a date string to "DD/MM/YYYY".
 */
export function formatDate(value?: string | null): string {
  if (!value) return '—';
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return date.toLocaleDateString(LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return value;
  }
}

/**
 * Format a number as Moroccan Dirham with thousands separator.
 * e.g. 12345.67 → "12 345,67 DH"
 */
export function formatAmount(value: number): string {
  return `${value.toLocaleString(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`;
}

/**
 * Format a month key "YYYY-MM" to abbreviated label "Jan 25".
 */
export function formatMonthLabel(yyyyMM: string): string {
  try {
    const date = new Date(`${yyyyMM}-01`);
    if (isNaN(date.getTime())) return yyyyMM;
    return date.toLocaleDateString(LOCALE, { month: 'short', year: '2-digit' });
  } catch {
    return yyyyMM;
  }
}
