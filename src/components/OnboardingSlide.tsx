import { View, Text, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { SharedValue } from "react-native-reanimated";
import { OnboardingSlide as OnboardingSlideType } from "../types/auth";
import { useSlideAnimation } from "../hooks/useOnboardingAnimation";

const { width: screenWidth } = Dimensions.get("window");

interface OnboardingSlideProps {
  slide: OnboardingSlideType;
  index: number;
  scrollX: SharedValue<number>;
  config?: {
    iconSize: number;
    iconContainerSize: number;
    titleFontSize: number;
    subtitleFontSize: number;
    descriptionFontSize: number;
    slideSpacing: number;
  };
}

export default function OnboardingSlide({ slide, index, scrollX, config }: OnboardingSlideProps) {
  // Use config values or defaults
  const {
    iconSize = 48,
    iconContainerSize = 120,
    titleFontSize = 28,
    subtitleFontSize = 18,
    descriptionFontSize = 16,
    slideSpacing = 20,
  } = config || {};

  // Use modern animation hooks
  const { slideStyle, iconStyle } = useSlideAnimation(index, scrollX);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 32,
        width: screenWidth,
      }}
      accessibilityRole="none"
      accessibilityLabel={`Slide ${index + 1} of 4: ${slide.title}`}
    >
      <Animated.View style={[slideStyle, { alignItems: "center" }]}>
        {/* Icon */}
        <Animated.View
          style={[
            iconStyle,
            {
              width: iconContainerSize,
              height: iconContainerSize,
              borderRadius: iconContainerSize / 2,
              backgroundColor: slide.color,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: slideSpacing * 2,
              shadowColor: slide.color,
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 10,
            },
          ]}
          accessibilityRole="image"
          accessibilityLabel={`${slide.title} icon`}
        >
          <Ionicons name={slide.icon as any} size={iconSize} color="#FFFFFF" />
        </Animated.View>

        {/* Content */}
        <View style={{ alignItems: "center", maxWidth: 384 }}>
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: titleFontSize,
              fontWeight: "bold",
              textAlign: "center",
              marginBottom: 16,
              lineHeight: titleFontSize * 1.2,
            }}
            accessibilityRole="header"
          >
            {slide.title}
          </Text>
          <Text
            style={{
              color: slide.color,
              fontSize: subtitleFontSize,
              fontWeight: "600",
              textAlign: "center",
              marginBottom: slideSpacing,
            }}
            accessibilityRole="text"
          >
            {slide.subtitle}
          </Text>
          <Text
            style={{
              color: "#9CA3AF",
              fontSize: descriptionFontSize,
              textAlign: "center",
              lineHeight: descriptionFontSize * 1.4,
              paddingHorizontal: 16,
            }}
            accessibilityRole="text"
          >
            {slide.description}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}
