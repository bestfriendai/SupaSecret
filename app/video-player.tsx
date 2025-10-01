import React from "react";
import { useLocalSearchParams } from "expo-router";
import VideoPlayerScreen from "../src/screens/VideoPlayerScreen";

export default function VideoPlayer() {
  const params = useLocalSearchParams();
  const confessionId = typeof params.confessionId === 'string' ? params.confessionId : params.confessionId?.[0];

  return <VideoPlayerScreen route={{ params: { confessionId } }} />;
}
