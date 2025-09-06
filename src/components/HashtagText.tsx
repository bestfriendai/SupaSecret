import React from "react";
import { Text, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { useTrendingStore } from "../state/trendingStore";
import { extractHashtags } from "../utils/trending";
import { usePreferenceAwareHaptics } from "../utils/haptics";

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
  style 
}: HashtagTextProps) {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
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
          console.error('Error searching hashtag:', error);
        }
      }
    }, 100);
  };

  const renderTextWithHashtags = () => {
    // Extract all hashtags from the text
    const hashtags = extractHashtags(text);
    
    if (hashtags.length === 0) {
      // No hashtags, return plain text
      return text;
    }

    // Split text by hashtags and create clickable elements
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    
    // Create a regex to find hashtag positions
    const hashtagRegex = /#[\w\u00c0-\u024f\u1e00-\u1eff]+/gi;
    let match;
    
    while ((match = hashtagRegex.exec(text)) !== null) {
      const hashtag = match[0];
      const startIndex = match.index;
      
      // Add text before hashtag
      if (startIndex > lastIndex) {
        parts.push(text.substring(lastIndex, startIndex));
      }
      
      // Add clickable hashtag
      parts.push(
        <Pressable
          key={`hashtag-${startIndex}`}
          onPress={() => handleHashtagPress(hashtag)}
          style={{ flexDirection: 'row' }}
        >
          <Text className="text-blue-400 font-medium">
            {hashtag}
          </Text>
        </Pressable>
      );
      
      lastIndex = startIndex + hashtag.length;
    }
    
    // Add remaining text after last hashtag
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return parts;
  };

  return (
    <Text 
      className={className}
      numberOfLines={numberOfLines}
      style={style}
    >
      {renderTextWithHashtags()}
    </Text>
  );
}
