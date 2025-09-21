import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { Confession } from "../types/confession";

interface VideoDebugInfoProps {
  videoConfessions: Confession[];
  currentIndex: number;
  isLoadingVideos: boolean;
  videoPlayer: any;
}

export const VideoDebugInfo: React.FC<VideoDebugInfoProps> = ({
  videoConfessions,
  currentIndex,
  isLoadingVideos,
  videoPlayer,
}) => {
  const currentVideo =
    currentIndex >= 0 && currentIndex < videoConfessions.length ? videoConfessions[currentIndex] : null;

  if (!__DEV__) {
    return null;
  }

  return (
    <View style={styles.debugContainer}>
      <Text style={styles.debugText}>Debug Info:</Text>
      <Text style={styles.debugText}>Loading: {isLoadingVideos ? "Yes" : "No"}</Text>
      <Text style={styles.debugText}>Videos Count: {videoConfessions.length}</Text>
      <Text style={styles.debugText}>Current Index: {currentIndex}</Text>
      <Text style={styles.debugText}>Video Player: {videoPlayer ? "Available" : "Null"}</Text>
      {currentVideo && (
        <>
          <Text style={styles.debugText}>Current Video:</Text>
          <Text style={styles.debugText}> ID: {currentVideo.id}</Text>
          <Text style={styles.debugText}> URI: {currentVideo.videoUri || "N/A"}</Text>
          <Text style={styles.debugText}>{`  Content: ${currentVideo.content?.substring(0, 50) || "N/A"}...`}</Text>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  debugContainer: {
    position: "absolute",
    top: 50,
    left: 10,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    padding: 10,
    borderRadius: 5,
    zIndex: 1000,
  },
  debugText: {
    color: "white",
    fontSize: 12,
    fontFamily: "monospace",
  },
});
