import { useState, useCallback, useEffect } from "react";
import { Alert } from "react-native";
import spamProtection from "../utils/spamProtection";
import { useAuthStore } from "../state/authStore";

interface SpamCheckResult {
  isAllowed: boolean;
  isSpam: boolean;
  reasons: string[];
  confidence: number;
  rateLimitInfo?: {
    remainingTime: number;
    attemptCount: number;
  };
}

interface UseSpamProtectionOptions {
  showAlerts?: boolean;
  autoSanitize?: boolean;
  onSpamDetected?: (result: SpamCheckResult) => void;
  onRateLimited?: (remainingTime: number) => void;
}

export const useSpamProtection = (options: UseSpamProtectionOptions = {}) => {
  const { showAlerts = true, autoSanitize = true, onSpamDetected, onRateLimited } = options;
  const { user } = useAuthStore();
  const [isChecking, setIsChecking] = useState(false);

  // Check if content is spam and rate limited
  const checkContent = useCallback(
    async (content: string): Promise<SpamCheckResult> => {
      if (!user?.id) {
        return {
          isAllowed: false,
          isSpam: false,
          reasons: ["User not authenticated"],
          confidence: 0,
        };
      }

      setIsChecking(true);

      try {
        // Check spam patterns
        const spamResult = spamProtection.detectSpam(content);

        // Check rate limiting
        const rateLimitResult = await spamProtection.checkCommentRateLimit(user.id, content);

        const result: SpamCheckResult = {
          isAllowed: rateLimitResult.allowed && !spamResult.isSpam,
          isSpam: spamResult.isSpam,
          reasons: [...spamResult.reasons, ...(rateLimitResult.reason ? [rateLimitResult.reason] : [])],
          confidence: spamResult.confidence,
          rateLimitInfo: {
            remainingTime: rateLimitResult.remainingTime || 0,
            attemptCount: spamProtection.getAttemptCount(user.id),
          },
        };

        // Handle spam detection
        if (spamResult.isSpam) {
          onSpamDetected?.(result);

          if (showAlerts) {
            Alert.alert(
              "Content Not Allowed",
              `Your message appears to contain spam or inappropriate content:\n\n${spamResult.reasons.join("\n")}\n\nPlease revise your message and try again.`,
              [{ text: "OK" }],
            );
          }
        }

        // Handle rate limiting
        if (!rateLimitResult.allowed && rateLimitResult.remainingTime) {
          onRateLimited?.(rateLimitResult.remainingTime);

          if (showAlerts) {
            const minutes = Math.ceil(rateLimitResult.remainingTime / 60000);
            Alert.alert(
              "Slow Down",
              `You're commenting too frequently. Please wait ${minutes} minute${minutes > 1 ? "s" : ""} before commenting again.`,
              [{ text: "OK" }],
            );
          }
        }

        return result;
      } finally {
        setIsChecking(false);
      }
    },
    [user?.id, showAlerts, onSpamDetected, onRateLimited],
  );

  // Sanitize content
  const sanitizeContent = useCallback(
    (content: string): string => {
      if (!autoSanitize) return content;
      return spamProtection.sanitizeContent(content);
    },
    [autoSanitize],
  );

  // Record successful comment attempt
  const recordAttempt = useCallback(
    async (content: string): Promise<void> => {
      if (user?.id) {
        await spamProtection.recordCommentAttempt(user.id, content);
      }
    },
    [user?.id],
  );

  // Get current rate limit status
  const getRateLimitStatus = useCallback(() => {
    if (!user?.id) return { attemptCount: 0, remainingTime: 0 };

    return {
      attemptCount: spamProtection.getAttemptCount(user.id),
      remainingTime: spamProtection.getRemainingTime(user.id),
    };
  }, [user?.id]);

  // Check if user is currently rate limited
  const isRateLimited = useCallback(() => {
    const status = getRateLimitStatus();
    return status.remainingTime > 0;
  }, [getRateLimitStatus]);

  // Validate and process content before submission
  const validateAndProcess = useCallback(
    async (
      content: string,
    ): Promise<{
      isValid: boolean;
      processedContent: string;
      error?: string;
    }> => {
      // Basic validation
      if (!content.trim()) {
        return {
          isValid: false,
          processedContent: "",
          error: "Please enter a comment",
        };
      }

      if (content.length > 500) {
        return {
          isValid: false,
          processedContent: content,
          error: "Comment is too long (max 500 characters)",
        };
      }

      // Sanitize content
      const sanitized = sanitizeContent(content);

      // Check for spam and rate limits
      const spamCheck = await checkContent(sanitized);

      if (!spamCheck.isAllowed) {
        return {
          isValid: false,
          processedContent: sanitized,
          error: spamCheck.reasons[0] || "Content not allowed",
        };
      }

      return {
        isValid: true,
        processedContent: sanitized,
      };
    },
    [checkContent, sanitizeContent],
  );

  return {
    checkContent,
    sanitizeContent,
    recordAttempt,
    getRateLimitStatus,
    isRateLimited,
    validateAndProcess,
    isChecking,
  };
};

export default useSpamProtection;
