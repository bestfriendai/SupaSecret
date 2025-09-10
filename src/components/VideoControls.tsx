import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from "react-native-reanimated";
import { useConfessionStore } from "../state/confessionStore";
import { usePreferenceAwareHaptics } from "../utils/haptics";
import { getButtonA11yProps, getSwitchA11yProps } from "../utils/accessibility";

interface VideoControlsProps {
  isVisible: boolean;
  onSpeedChange: (speed: number) => void;
  onCaptionsToggle: (enabled: boolean) => void;
  captionsEnabled: boolean;
  hasTranscription: boolean;
}

const SPEED_OPTIONS = [0.75, 1.0, 1.25];

export default function VideoControls({
  isVisible,
  onSpeedChange,
  onCaptionsToggle,
  captionsEnabled,
  hasTranscription,
}: VideoControlsProps) {
  const { userPreferences, updateUserPreferences } = useConfessionStore();
  const { impactAsync } = usePreferenceAwareHaptics();
  const [showSpeedOptions, setShowSpeedOptions] = useState(false);

  const controlsOpacity = useSharedValue(0);
  const speedOptionsScale = useSharedValue(0);

  React.useEffect(() => {
    controlsOpacity.value = withTiming(isVisible ? 1 : 0, { duration: 200 });
  }, [isVisible]);

  React.useEffect(() => {
    speedOptionsScale.value = withSpring(showSpeedOptions ? 1 : 0, {
      damping: 15,
      stiffness: 150,
    });
  }, [showSpeedOptions]);

  const controlsStyle = useAnimatedStyle(
    () => ({
      opacity: controlsOpacity.value,
    }),
    [],
  );

  const speedOptionsStyle = useAnimatedStyle(
    () => ({
      transform: [{ scale: speedOptionsScale.value }],
      opacity: speedOptionsScale.value,
    }),
    [],
  );

  const handleSpeedChange = async (speed: number) => {
    try {
      await updateUserPreferences({ playbackSpeed: speed });
      onSpeedChange(speed);
      setShowSpeedOptions(false);
      impactAsync();
    } catch (error) {
      console.warn("Failed to update playback speed:", error);
    }
  };

  const handleCaptionsToggle = async () => {
    const newValue = !captionsEnabled;
    try {
      await updateUserPreferences({ captionsDefault: newValue });
      onCaptionsToggle(newValue);
      impactAsync();
    } catch (error) {
      console.warn("Failed to update captions preference:", error);
    }
  };

  const formatSpeed = (speed: number) => {
    return speed === 1.0 ? "1×" : `${speed}×`;
  };

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: 60,
          right: 20,
          alignItems: "flex-end",
          zIndex: 30,
        },
        controlsStyle,
      ]}
    >
      {/* Speed Options Popup */}
      {showSpeedOptions && (
        <Animated.View
          style={[
            {
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              borderRadius: 12,
              padding: 8,
              marginBottom: 8,
              minWidth: 80,
            },
            speedOptionsStyle,
          ]}
        >
          {SPEED_OPTIONS.map((speed) => (
            <Pressable
              key={speed}
              onPress={() => handleSpeedChange(speed)}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 8,
                backgroundColor: userPreferences.playbackSpeed === speed ? "rgba(59, 130, 246, 0.3)" : "transparent",
              }}
            >
              <Text
                className={`text-center font-medium ${
                  userPreferences.playbackSpeed === speed ? "text-blue-400" : "text-white"
                }`}
              >
                {formatSpeed(speed)}
              </Text>
            </Pressable>
          ))}
        </Animated.View>
      )}

      {/* Control Buttons */}
      <View className="space-y-3">
        {/* Speed Control */}
        <Pressable
          onPress={() => setShowSpeedOptions(!showSpeedOptions)}
          className="w-12 h-12 bg-black/70 rounded-full items-center justify-center"
          {...getButtonA11yProps(
            `Playback speed ${formatSpeed(userPreferences.playbackSpeed)}`,
            "Double tap to change playback speed",
          )}
        >
          <Text className="text-white text-12 font-bold">{formatSpeed(userPreferences.playback_speed)}</Text>
        </Pressable>

        {/* Captions Control */}
        {hasTranscription && (
          <Pressable
            onPress={handleCaptionsToggle}
            className={`w-12 h-12 rounded-full items-center justify-center ${
              captionsEnabled ? "bg-blue-600" : "bg-black/70"
            }`}
            {...getSwitchA11yProps("Captions", captionsEnabled)}
          >
            <Ionicons name="text" size={20} color={captionsEnabled ? "#FFFFFF" : "#8B98A5"} />
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}
