/** Shared auth helpers for forms and profile display. */

/** Safe post-auth redirect target from ?returnUrl= (defaults to /profile). */
export function resolveReturnUrl(raw: string | null | undefined): string {
  if (!raw) {
    return '/profile';
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(raw.trim());
  } catch {
    return '/profile';
  }

  // Relative in-app path only: single leading slash, no scheme, no protocol-relative, no backslash.
  if (
    decoded.startsWith('/') &&
    !decoded.startsWith('//') &&
    !decoded.includes('\\') &&
    !decoded.includes('://') &&
    !/[\r\n\0]/.test(decoded)
  ) {
    return decoded;
  }

  return '/profile';
}

/** Query params to preserve returnUrl when switching between auth pages. */
export function returnUrlQueryParams(
  raw: string | null | undefined,
): Record<string, string> | null {
  const target = resolveReturnUrl(raw);
  return target === '/profile' ? null : { returnUrl: target };
}

export function initialsOf(firstName: string, lastName: string): string {
  const first = firstName.trim().charAt(0);
  const last = lastName.trim().charAt(0);
  return `${first}${last}`.toUpperCase() || '?';
}

export function memberSinceYear(createdAt: string): number {
  const date = new Date(createdAt);
  return Number.isNaN(date.getTime()) ? new Date().getFullYear() : date.getFullYear();
}

export function formatUaDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatItemCount(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return `${count} товар`;
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} товари`;
  }
  return `${count} товарів`;
}

export function formatMoney(amount: number): string {
  return `${new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 }).format(amount)} ₴`;
}

export function normalizePhone(value: string): string {
  return value.replace(/[\s()-]/g, '');
}

/** Optional phone: empty OK; otherwise must be +380XXXXXXXXX. */
export function isValidUaPhone(value: string): boolean {
  const normalized = normalizePhone(value);
  if (!normalized) {
    return true;
  }
  return /^\+380\d{9}$/.test(normalized);
}

/** Required UA mobile for checkout: +380XXXXXXXXX after normalizing spaces/parens. */
export function isRequiredUaPhone(value: string): boolean {
  return /^\+380\d{9}$/.test(normalizePhone(value));
}

export type OrderBadgeTone = 'fresh' | 'marigold' | 'ink' | 'chili';

export function orderStatusLabel(status: string | number): string {
  const key = normalizeStatus(status);
  switch (key) {
    case 'Pending':
    case '0':
      return 'Очікує підтвердження';
    case 'Confirmed':
    case '1':
      return 'В обробці';
    case 'Shipped':
    case '2':
      return 'Відправлено';
    case 'Delivered':
    case '3':
      return 'Доставлено';
    case 'Cancelled':
    case '4':
      return 'Скасовано';
    default:
      return String(status);
  }
}

export function orderStatusTone(status: string | number): OrderBadgeTone {
  const key = normalizeStatus(status);
  switch (key) {
    case 'Delivered':
    case '3':
      return 'fresh';
    case 'Confirmed':
    case '1':
    case 'Shipped':
    case '2':
      return 'marigold';
    case 'Cancelled':
    case '4':
      return 'chili';
    default:
      return 'ink';
  }
}

function normalizeStatus(status: string | number): string {
  return String(status);
}

export const AUTH_FIELD_CLASSES =
  'w-full rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-white px-3.5 py-3 text-[var(--espresso-800)] outline-none placeholder:text-[var(--kraft-500)] focus-visible:border-[var(--marigold-400)]';

export const AUTH_LABEL_CLASSES =
  'mb-1.5 block text-sm font-semibold text-[var(--espresso-800)]';

export const AUTH_ERROR_CLASSES = 'mt-1 text-sm text-[var(--chili-700)]';

export const AUTH_CARD_CLASSES =
  'w-full max-w-[480px] rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-6 py-9 shadow-[var(--shadow-lg)] sm:px-12 sm:py-11';

export const AUTH_PRIMARY_BTN =
  'inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--marigold-400)] px-5 text-base font-extrabold text-[var(--espresso-900)] transition hover:bg-[var(--marigold-500)] disabled:cursor-not-allowed disabled:opacity-60';

export const AUTH_LINK_CLASSES =
  'font-semibold text-[var(--cinnamon-700)] hover:text-[var(--espresso-800)] hover:underline';
