import React from "react";
import { View } from "react-native";
import Animated, { SharedValue } from "react-native-reanimated";
import { useProgressDotAnimation } from "../hooks/useOnboardingAnimation";

interface ProgressIndicatorProps {
  totalSlides: number;
  scrollX: SharedValue<number>;
  screenWidth: number;
  currentIndex?: number;
  accessibilityLabel?: string;
}

function ProgressDot({
  index,
  scrollX,
  _screenWidth,
}: {
  index: number;
  scrollX: SharedValue<number>;
  _screenWidth: number;
}) {
  const { dotStyle } = useProgressDotAnimation(index, scrollX);

  return (
    <Animated.View
      style={[
        {
          height: 8,
          borderRadius: 4,
          backgroundColor: "#1D9BF0",
        },
        dotStyle,
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel={`Progress indicator ${index + 1}`}
    />
  );
}

export default function ProgressIndicator({
  totalSlides,
  scrollX,
  screenWidth,
  currentIndex = 0,
  accessibilityLabel = "Onboarding progress",
}: ProgressIndicatorProps) {
  const progress = Math.round(((currentIndex + 1) / totalSlides) * 100);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
      }}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{
        min: 0,
        max: 100,
        now: progress,
        text: `${progress}% complete`,
      }}
    >
      {Array.from({ length: totalSlides }).map((_, index) => (
        <View key={index} style={{ marginLeft: index > 0 ? 8 : 0 }}>
          <ProgressDot index={index} scrollX={scrollX} _screenWidth={screenWidth} />
        </View>
      ))}
    </View>
  );
}
