import { isPlatformBrowser } from '@angular/common';
import { inject, InjectionToken, PLATFORM_ID } from '@angular/core';

/** Storage-like API safe for SSR (no-op / null on server). */
export interface BrowserStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const noopStorage: BrowserStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

function createBrowserLocalStorage(): BrowserStorage {
  try {
    const storage = globalThis.localStorage;
    if (!storage) {
      return noopStorage;
    }
    return {
      getItem(key: string): string | null {
        try {
          return storage.getItem(key);
        } catch {
          return null;
        }
      },
      setItem(key: string, value: string): void {
        try {
          storage.setItem(key, value);
        } catch {
          /* quota / private mode */
        }
      },
      removeItem(key: string): void {
        try {
          storage.removeItem(key);
        } catch {
          /* ignore */
        }
      },
    };
  } catch {
    return noopStorage;
  }
}

export const LOCAL_STORAGE = new InjectionToken<BrowserStorage>('LOCAL_STORAGE', {
  providedIn: 'root',
  factory: () => {
    const platformId = inject(PLATFORM_ID);
    return isPlatformBrowser(platformId) ? createBrowserLocalStorage() : noopStorage;
  },
});
