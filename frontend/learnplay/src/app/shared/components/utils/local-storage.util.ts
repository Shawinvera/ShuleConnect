/**
 * SSR-safe localStorage utility.
 * Use these functions instead of calling localStorage directly
 * to prevent "localStorage is not defined" errors in SSR/Node.js.
 */

export function localGet(key: string): string | null {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(key);
  }
  return null;
}

export function localSet(key: string, value: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, value);
  }
}

export function localRemove(key: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(key);
  }
}

export function localClear(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.clear();
  }
}