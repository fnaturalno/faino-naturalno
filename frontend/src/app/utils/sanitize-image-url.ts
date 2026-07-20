/**
 * Allow only relative paths or http(s) URLs — blocks javascript:/data: schemes in <img src>.
 * Uploaded media under /uploads/ is served by the API.
 */
import { environment } from '../../environments/environment';

export function sanitizeImageUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    if (trimmed.startsWith('/uploads/')) {
      return `${environment.apiBaseUrl}${trimmed}`;
    }
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? trimmed : null;
  } catch {
    return null;
  }
}
