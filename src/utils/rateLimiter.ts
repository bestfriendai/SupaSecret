import AsyncStorage from "@react-native-async-storage/async-storage";

export type RateLimitAction = "signIn" | "signUp" | "passwordReset";

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number; // time window in milliseconds
}

interface AttemptRecord {
  timestamp: number;
  action: RateLimitAction;
}

// Rate limit configurations
const RATE_LIMITS: Record<RateLimitAction, RateLimitConfig> = {
  signIn: {
    maxAttempts: 5,
    windowMs: 60 * 1000, // 1 minute
  },
  signUp: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  passwordReset: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
};

const STORAGE_KEY = "auth-rate-limit-attempts";

class RateLimiter {
  private attempts: AttemptRecord[] = [];

  constructor() {
    this.loadAttempts();
  }

  private async loadAttempts(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.attempts = JSON.parse(stored);
      }
    } catch (error) {
      console.warn("Failed to load rate limit attempts:", error);
      this.attempts = [];
    }
  }

  private async saveAttempts(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.attempts));
    } catch (error) {
      console.warn("Failed to save rate limit attempts:", error);
    }
  }

  private cleanOldAttempts(): void {
    const now = Date.now();
    this.attempts = this.attempts.filter((attempt) => {
      const config = RATE_LIMITS[attempt.action];
      return now - attempt.timestamp < config.windowMs;
    });
  }

  public async checkRateLimit(action: RateLimitAction): Promise<boolean> {
    await this.loadAttempts();
    this.cleanOldAttempts();

    const config = RATE_LIMITS[action];
    const recentAttempts = this.attempts.filter(
      (attempt) => attempt.action === action && Date.now() - attempt.timestamp < config.windowMs,
    );

    return recentAttempts.length < config.maxAttempts;
  }

  public async recordAttempt(action: RateLimitAction): Promise<void> {
    this.attempts.push({
      timestamp: Date.now(),
      action,
    });
    this.cleanOldAttempts();
    await this.saveAttempts();
  }

  public getRemainingTime(action: RateLimitAction): number {
    const config = RATE_LIMITS[action];
    const recentAttempts = this.attempts.filter(
      (attempt) => attempt.action === action && Date.now() - attempt.timestamp < config.windowMs,
    );

    if (recentAttempts.length === 0) return 0;

    const oldestAttempt = Math.min(...recentAttempts.map((a) => a.timestamp));
    const timePassed = Date.now() - oldestAttempt;
    return Math.max(0, config.windowMs - timePassed);
  }

  public getAttemptsCount(action: RateLimitAction): number {
    this.cleanOldAttempts();
    return this.attempts.filter(
      (attempt) => attempt.action === action && Date.now() - attempt.timestamp < RATE_LIMITS[action].windowMs,
    ).length;
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

export { rateLimiter };
export type { RateLimitConfig, AttemptRecord };
