const store = new Map<string, number>();

const WINDOW_MS = 5000;

export function checkRateLimit(ip: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const last = store.get(ip);

  if (last !== undefined && now - last < WINDOW_MS) {
    return { allowed: false, retryAfterMs: WINDOW_MS - (now - last) };
  }

  store.set(ip, now);
  return { allowed: true, retryAfterMs: 0 };
}

export function clearRateLimit(ip: string): void {
  store.delete(ip);
}
