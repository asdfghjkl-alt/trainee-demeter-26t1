interface RateLimitData {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitData>();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100;

export function rateLimit(ip: string): {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();

  // Lazy cleanup to prevent memory leaks without dangling setIntervals
  if (store.size > 1000) {
    for (const [key, data] of store.entries()) {
      if (now > data.resetTime) {
        store.delete(key);
      }
    }
  }

  let data = store.get(ip);

  // If IP isn't tracked yet, or the window has expired, reset
  if (!data || now > data.resetTime) {
    data = { count: 0, resetTime: now + WINDOW_MS };
  }

  data.count++;
  store.set(ip, data);

  return {
    success: data.count <= MAX_REQUESTS,
    limit: MAX_REQUESTS,
    remaining: Math.max(0, MAX_REQUESTS - data.count),
    resetTime: data.resetTime,
  };
}
