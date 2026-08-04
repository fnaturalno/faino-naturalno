/** Shared auth helpers for forms and profile display. */

/** Safe post-auth redirect target from ?returnUrl= (defaults to /profile). */
export function resolveReturnUrl(raw: string | null | undefined): string {
  if (!raw) {
    return '/ua/profile';
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(raw.trim());
  } catch {
    return '/ua/profile';
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

  return '/ua/profile';
}

/** Query params to preserve returnUrl when switching between auth pages. */
export function returnUrlQueryParams(
  raw: string | null | undefined,
): Record<string, string> | null {
  const target = resolveReturnUrl(raw);
  return /\/(ua|uk|en)\/profile\/?$/.test(target) || target === '/profile' ? null : { returnUrl: target };
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
  })
    .format(date)
    .replace(/\s*р\.?$/u, '');
}

/** Prefer LocaleService.pluralForm + Transloco `plural.products.*` at call sites. */
export function formatItemCount(count: number, labels?: { one: string; few: string; many: string }): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  let form: 'one' | 'few' | 'many' = 'many';
  if (!(mod100 > 10 && mod100 < 20)) {
    if (mod10 === 1) form = 'one';
    else if (mod10 >= 2 && mod10 <= 4) form = 'few';
  }
  if (labels) {
    return labels[form].replace('{{count}}', String(count));
  }
  // Legacy UK fallback when callers omit labels
  if (form === 'one') return `${count} товар`;
  if (form === 'few') return `${count} товари`;
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

/** Maps API status to Transloco key segment under `orderStatus.*`. */
export function orderStatusI18nKey(status: string | number): string {
  const key = normalizeStatus(status);
  switch (key) {
    case 'Pending':
    case '0':
      return 'Pending';
    case 'Confirmed':
    case '1':
      return 'Confirmed';
    case 'Shipped':
    case '2':
      return 'Shipped';
    case 'Delivered':
    case '3':
      return 'Delivered';
    case 'Cancelled':
    case '4':
      return 'Cancelled';
    default:
      return key;
  }
}

export function orderStatusLabel(status: string | number, translate?: (key: string) => string): string {
  const segment = orderStatusI18nKey(status);
  if (translate && ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'].includes(segment)) {
    return translate(`orderStatus.${segment}`);
  }
  // Legacy UK fallback
  switch (segment) {
    case 'Pending':
      return 'Очікує підтвердження';
    case 'Confirmed':
      return 'В обробці';
    case 'Shipped':
      return 'Відправлено';
    case 'Delivered':
      return 'Доставлено';
    case 'Cancelled':
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

export const AUTH_SECONDARY_BTN =
  'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-white px-5 text-base font-extrabold text-[var(--espresso-900)] transition hover:bg-[var(--kraft-100)] disabled:cursor-not-allowed disabled:opacity-60';

export const AUTH_LINK_CLASSES =
  'font-semibold text-[var(--cinnamon-700)] hover:text-[var(--espresso-800)] hover:underline';

/** Client-only password strength (matches design/auth.dc.html). */
export interface PasswordStrength {
  width: string;
  color: string;
  label: string;
}

export function passwordStrength(value: string, labels?: { weak: string; medium: string; strong: string }): PasswordStrength {
  if (!value) {
    return { width: '0%', color: 'var(--kraft-400)', label: '' };
  }

  let score = 0;
  if (value.length >= 8) score++;
  if (/[A-ZА-ЯЇІЄҐ]/.test(value)) score++;
  if (/[0-9]/.test(value)) score++;
  if (/[^A-Za-zА-Яа-яЇїІіЄєҐґ0-9]/.test(value)) score++;

  const weak = labels?.weak ?? 'Слабкий';
  const medium = labels?.medium ?? 'Середній';
  const strong = labels?.strong ?? 'Надійний';

  if (score <= 1) {
    return { width: '33%', color: 'var(--chili-500)', label: weak };
  }
  if (score <= 3) {
    return { width: '66%', color: 'var(--marigold-600)', label: medium };
  }
  return { width: '100%', color: 'var(--garden-700)', label: strong };
}
