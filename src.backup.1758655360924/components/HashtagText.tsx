import React from "react";
import { Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import type { TabParamList } from "../navigation/AppNavigator";
import { useTrendingStore } from "../state/trendingStore";
import { extractHashtags } from "../utils/trending";
import { usePreferenceAwareHaptics } from "../utils/haptics";
import { sanitizeText } from "../utils/consolidatedUtils";

interface HashtagTextProps {
  text: string;
  className?: string;
  numberOfLines?: number;
  style?: any;
}

export default function HashtagText({
  text,
  className = "text-white text-15 leading-5",
  numberOfLines,
  style,
}: HashtagTextProps) {
  const navigation = useNavigation<NavigationProp<TabParamList>>();
  const { searchByHashtag } = useTrendingStore();
  const { impactAsync } = usePreferenceAwareHaptics();

  const handleHashtagPress = async (hashtag: string) => {
    impactAsync();

    // Navigate to trending screen
    navigation.navigate("Trending");

    // Trigger search after navigation with a small delay
    setTimeout(async () => {
      try {
        await searchByHashtag(hashtag);
      } catch (error) {
        if (__DEV__) {
          console.error("Error searching hashtag:", error);
        }
      }
    }, 100);
  };

  const renderTextWithHashtags = () => {
    // SDK 53: Sanitize text content to prevent XSS - handle null/undefined
    if (!text || typeof text !== "string") {
      return "";
    }

    const sanitizedText = sanitizeText(text);

    // Extract all hashtags from the sanitized text
    const hashtags = extractHashtags(sanitizedText);

    if (hashtags.length === 0) {
      // No hashtags, return plain text
      return sanitizedText;
    }

    // Split text by hashtags and create clickable elements
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // Create a regex to find hashtag positions
    const hashtagRegex = /#[\w\u00c0-\u024f\u1e00-\u1eff]+/gi;
    let match;

    while ((match = hashtagRegex.exec(sanitizedText)) !== null) {
      const hashtag = match[0];
      const startIndex = match.index;

      // Add text before hashtag
      if (startIndex > lastIndex) {
        parts.push(sanitizedText.substring(lastIndex, startIndex));
      }

      // Add clickable hashtag
      parts.push(
        <Text
          key={`hashtag-${startIndex}`}
          onPress={() => handleHashtagPress(hashtag)}
          className="text-blue-400 font-medium"
        >
          {hashtag}
        </Text>,
      );

      lastIndex = startIndex + hashtag.length;
    }

    // Add remaining text after last hashtag
    if (lastIndex < sanitizedText.length) {
      parts.push(sanitizedText.substring(lastIndex));
    }

    return parts;
  };

  return (
    <Text className={className} numberOfLines={numberOfLines} style={style}>
      {renderTextWithHashtags()}
    </Text>
  );
}
