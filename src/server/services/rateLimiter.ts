/**
 * In-memory Token Bucket / Sliding Window Rate Limiter
 * Provides robust protection against Cloudflare R2 presigned URL exhaustion and spam.
 */

interface RateLimitRecord {
  timestamps: number[];
}

class SlidingWindowRateLimiter {
  private records = new Map<string, RateLimitRecord>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly windowMs: number = 60 * 1000, // 1 minute window
    private readonly maxRequests: number = 10 // Max 10 uploads per window
  ) {
    // Periodic garbage collection every 2 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 2 * 60 * 1000);

    // Unref so it doesn't prevent Node process from gracefully exiting
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  public check(identifier: string): {
    allowed: boolean;
    remaining: number;
    resetMs: number;
  } {
    const now = Date.now();
    const record = this.records.get(identifier) || { timestamps: [] };

    // Filter out timestamps outside the sliding window
    const validTimestamps = record.timestamps.filter(
      (ts) => now - ts < this.windowMs
    );

    if (validTimestamps.length >= this.maxRequests) {
      const oldest = validTimestamps[0];
      const resetMs = oldest ? this.windowMs - (now - oldest) : this.windowMs;
      return {
        allowed: false,
        remaining: 0,
        resetMs: Math.max(0, resetMs),
      };
    }

    validTimestamps.push(now);
    this.records.set(identifier, { timestamps: validTimestamps });

    return {
      allowed: true,
      remaining: this.maxRequests - validTimestamps.length,
      resetMs: this.windowMs,
    };
  }

  public reset(identifier: string): void {
    this.records.delete(identifier);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [id, record] of this.records.entries()) {
      const active = record.timestamps.filter((ts) => now - ts < this.windowMs);
      if (active.length === 0) {
        this.records.delete(id);
      } else {
        this.records.set(id, { timestamps: active });
      }
    }
  }
}

// Global upload rate limiter: 10 uploads per 60 seconds per user
export const uploadRateLimiter = new SlidingWindowRateLimiter(60 * 1000, 10);
