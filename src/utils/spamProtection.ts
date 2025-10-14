import AsyncStorage from "@react-native-async-storage/async-storage";

// Spam detection patterns
const SPAM_PATTERNS = {
  // URL patterns (more comprehensive)
  urls: [
    /https?:\/\/[^\s]+/gi,
    /www\.[^\s]+/gi,
    /[a-zA-Z0-9-]+\.(com|net|org|io|co|app|me|tv|ly|cc|tk|ml|ga|cf)[^\s]*/gi,
    /[a-zA-Z0-9-]+\.([a-z]{2,4})\/[^\s]*/gi,
    // Obfuscated URLs
    /[a-zA-Z0-9-]+\s*\.\s*(com|net|org|io|co|app|me|tv|ly|cc|tk|ml|ga|cf)/gi,
    /[a-zA-Z0-9-]+\s*dot\s*(com|net|org|io|co|app|me|tv|ly|cc|tk|ml|ga|cf)/gi,
    /[a-zA-Z0-9-]+\s*\[\.\]\s*(com|net|org|io|co|app|me|tv|ly|cc|tk|ml|ga|cf)/gi,
  ],

  // Social media handles and promotion
  social: [
    /@[a-zA-Z0-9_]+/g, // @username
    /follow\s+me/gi,
    /check\s+out\s+my/gi,
    /subscribe\s+to/gi,
    /like\s+and\s+subscribe/gi,
    /dm\s+me/gi,
    /message\s+me/gi,
    /add\s+me\s+on/gi,
    /find\s+me\s+on/gi,
  ],

  // Promotional/spam keywords
  promotional: [
    /free\s+money/gi,
    /make\s+money/gi,
    /earn\s+\$\d+/gi,
    /click\s+here/gi,
    /limited\s+time/gi,
    /act\s+now/gi,
    /special\s+offer/gi,
    /guaranteed/gi,
    /100%\s+free/gi,
    /no\s+cost/gi,
    /risk\s+free/gi,
    /work\s+from\s+home/gi,
    /get\s+rich/gi,
    /lose\s+weight\s+fast/gi,
    /miracle\s+cure/gi,
    /viagra/gi,
    /casino/gi,
    /lottery/gi,
    /winner/gi,
    /congratulations.*won/gi,
  ],

  // Repetitive patterns
  repetitive: [
    /(.)\1{4,}/g, // Same character repeated 5+ times
    /(\w+\s+)\1{3,}/gi, // Same word repeated 4+ times
    /([!?.]){4,}/g, // Excessive punctuation
  ],

  // Contact information
  contact: [
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // Phone numbers
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses
    /whatsapp/gi,
    /telegram/gi,
    /discord/gi,
    /snapchat/gi,
    /kik/gi,
  ],
};

// Suspicious word combinations
const SUSPICIOUS_COMBINATIONS = [
  ["free", "money"],
  ["click", "link"],
  ["visit", "website"],
  ["check", "profile"],
  ["follow", "back"],
  ["dm", "details"],
  ["message", "info"],
  ["add", "snap"],
  ["find", "instagram"],
  ["subscribe", "channel"],
];

// Rate limiting for comments/replies
interface CommentAttempt {
  timestamp: number;
  content: string;
  userId: string;
}

interface RateLimitConfig {
  maxComments: number;
  windowMs: number;
  duplicateThreshold: number; // How similar content needs to be to be considered duplicate
}

const COMMENT_RATE_LIMITS: RateLimitConfig = {
  maxComments: 10, // Max 10 comments per window
  windowMs: 5 * 60 * 1000, // 5 minutes
  duplicateThreshold: 0.8, // 80% similarity threshold
};

const STORAGE_KEY = "comment-rate-limit-attempts";

class SpamProtectionService {
  private commentAttempts: CommentAttempt[] = [];

  constructor() {
    this.loadAttempts();
  }

  private async loadAttempts(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.commentAttempts = JSON.parse(stored);
      }
    } catch (error) {
      console.warn("Failed to load comment attempts:", error);
      this.commentAttempts = [];
    }
  }

  private async saveAttempts(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.commentAttempts));
    } catch (error) {
      console.warn("Failed to save comment attempts:", error);
    }
  }

  private cleanOldAttempts(): void {
    const now = Date.now();
    this.commentAttempts = this.commentAttempts.filter(
      (attempt) => now - attempt.timestamp < COMMENT_RATE_LIMITS.windowMs,
    );
  }

  // Calculate similarity between two strings using Levenshtein distance
  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;

    const matrix = Array(s2.length + 1)
      .fill(null)
      .map(() => Array(s1.length + 1).fill(null));

    for (let i = 0; i <= s1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= s2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= s2.length; j++) {
      for (let i = 1; i <= s1.length; i++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + cost);
      }
    }

    const maxLength = Math.max(s1.length, s2.length);
    return 1 - matrix[s2.length][s1.length] / maxLength;
  }

  // Check for duplicate or similar content
  private checkForDuplicates(content: string, userId: string): boolean {
    const userAttempts = this.commentAttempts.filter((attempt) => attempt.userId === userId);

    return userAttempts.some((attempt) => {
      const similarity = this.calculateSimilarity(content, attempt.content);
      return similarity >= COMMENT_RATE_LIMITS.duplicateThreshold;
    });
  }

  // Detect spam patterns in content
  public detectSpam(content: string): {
    isSpam: boolean;
    reasons: string[];
    confidence: number;
  } {
    const reasons: string[] = [];
    let spamScore = 0;
    const maxScore = 100;

    // Check URLs
    let urlCount = 0;
    SPAM_PATTERNS.urls.forEach((pattern) => {
      const matches = content.match(pattern);
      if (matches) {
        urlCount += matches.length;
      }
    });

    if (urlCount > 0) {
      reasons.push(`Contains ${urlCount} URL(s)`);
      spamScore += urlCount * 30; // Heavy penalty for URLs
    }

    // Check social media promotion
    SPAM_PATTERNS.social.forEach((pattern) => {
      if (pattern.test(content)) {
        reasons.push("Contains social media promotion");
        spamScore += 25;
      }
    });

    // Check promotional keywords
    let promoCount = 0;
    SPAM_PATTERNS.promotional.forEach((pattern) => {
      if (pattern.test(content)) {
        promoCount++;
      }
    });

    if (promoCount > 0) {
      reasons.push(`Contains ${promoCount} promotional keyword(s)`);
      spamScore += promoCount * 15;
    }

    // Check repetitive patterns
    SPAM_PATTERNS.repetitive.forEach((pattern) => {
      if (pattern.test(content)) {
        reasons.push("Contains repetitive patterns");
        spamScore += 20;
      }
    });

    // Check contact information
    SPAM_PATTERNS.contact.forEach((pattern) => {
      if (pattern.test(content)) {
        reasons.push("Contains contact information");
        spamScore += 25;
      }
    });

    // Check suspicious word combinations
    const words = content.toLowerCase().split(/\s+/);
    SUSPICIOUS_COMBINATIONS.forEach(([word1, word2]) => {
      if (words.includes(word1) && words.includes(word2)) {
        reasons.push(`Contains suspicious combination: "${word1} ${word2}"`);
        spamScore += 15;
      }
    });

    // Check for excessive caps
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.5 && content.length > 10) {
      reasons.push("Excessive use of capital letters");
      spamScore += 10;
    }

    // Check for excessive punctuation
    const punctRatio = (content.match(/[!?.,;:]/g) || []).length / content.length;
    if (punctRatio > 0.3) {
      reasons.push("Excessive punctuation");
      spamScore += 10;
    }

    const confidence = Math.min(spamScore, maxScore) / maxScore;
    const isSpam = confidence > 0.4; // 40% confidence threshold

    return {
      isSpam,
      reasons,
      confidence,
    };
  }

  // Check rate limiting for comments
  public async checkCommentRateLimit(
    userId: string,
    content: string,
  ): Promise<{
    allowed: boolean;
    reason?: string;
    remainingTime?: number;
  }> {
    await this.loadAttempts();
    this.cleanOldAttempts();

    const now = Date.now();
    const userAttempts = this.commentAttempts.filter(
      (attempt) => attempt.userId === userId && now - attempt.timestamp < COMMENT_RATE_LIMITS.windowMs,
    );

    // Check rate limit
    if (userAttempts.length >= COMMENT_RATE_LIMITS.maxComments) {
      const oldestAttempt = Math.min(...userAttempts.map((a) => a.timestamp));
      const remainingTime = COMMENT_RATE_LIMITS.windowMs - (now - oldestAttempt);

      return {
        allowed: false,
        reason: `Too many comments. Please wait ${Math.ceil(remainingTime / 60000)} minutes.`,
        remainingTime,
      };
    }

    // Check for duplicates
    if (this.checkForDuplicates(content, userId)) {
      return {
        allowed: false,
        reason: "You've already posted similar content recently.",
      };
    }

    return { allowed: true };
  }

  // Record a comment attempt
  public async recordCommentAttempt(userId: string, content: string): Promise<void> {
    this.commentAttempts.push({
      timestamp: Date.now(),
      content: content.trim(),
      userId,
    });

    this.cleanOldAttempts();
    await this.saveAttempts();
  }

  // Clean and sanitize content
  public sanitizeContent(content: string): string {
    let sanitized = content.trim();

    // Remove excessive whitespace
    sanitized = sanitized.replace(/\s+/g, " ");

    // Remove excessive punctuation
    sanitized = sanitized.replace(/([!?.]){4,}/g, "$1$1$1");

    // Remove excessive repetition
    sanitized = sanitized.replace(/(.)\1{4,}/g, "$1$1$1");

    // Remove potential XSS
    sanitized = sanitized.replace(/<[^>]*>/g, "");
    sanitized = sanitized.replace(/javascript:/gi, "");
    sanitized = sanitized.replace(/data:/gi, "");

    return sanitized;
  }

  // Get remaining time for rate limit
  public getRemainingTime(userId: string): number {
    this.cleanOldAttempts();
    const userAttempts = this.commentAttempts.filter((attempt) => attempt.userId === userId);

    if (userAttempts.length === 0) return 0;

    const oldestAttempt = Math.min(...userAttempts.map((a) => a.timestamp));
    const timePassed = Date.now() - oldestAttempt;
    return Math.max(0, COMMENT_RATE_LIMITS.windowMs - timePassed);
  }

  // Get current attempt count
  public getAttemptCount(userId: string): number {
    this.cleanOldAttempts();
    return this.commentAttempts.filter(
      (attempt) => attempt.userId === userId && Date.now() - attempt.timestamp < COMMENT_RATE_LIMITS.windowMs,
    ).length;
  }
}

export const spamProtection = new SpamProtectionService();
export default spamProtection;
