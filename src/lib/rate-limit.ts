import "server-only";

/**
 * Rate limiter simplu, in-memory, cu fereastră fixă.
 *
 * Potrivit pentru un deployment single-process (un singur proces Node sub pm2,
 * necesar oricum pentru sticky sessions Socket.io). Dacă în viitor se scalează
 * pe mai multe procese, acest store trebuie mutat în Redis.
 */
type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

// Curățare periodică a intrărilor expirate pentru a evita creșterea memoriei.
const CLEANUP_INTERVAL_MS = 60_000;
let cleanupTimer: ReturnType<typeof setInterval> | undefined;
function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of store) {
      if (bucket.resetAt <= now) store.delete(key);
    }
  }, CLEANUP_INTERVAL_MS);
  // Nu ține procesul viu doar pentru cleanup.
  cleanupTimer.unref?.();
}

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetAt: number;
};

/**
 * Consumă o unitate din bucket-ul `key`. Permite `limit` cereri per `windowMs`.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  ensureCleanup();
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    const bucket: Bucket = { count: 1, resetAt: now + windowMs };
    store.set(key, bucket);
    return { success: true, remaining: limit - 1, resetAt: bucket.resetAt };
  }

  if (existing.count >= limit) {
    return { success: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return {
    success: true,
    remaining: limit - existing.count,
    resetAt: existing.resetAt,
  };
}

/** Extrage un identificator de client din header-ele unei cereri (în spatele nginx). */
export function clientKeyFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    // Primul IP din listă este clientul original.
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return headers.get("x-real-ip") ?? "unknown";
}
