import { useSimpleVideoPlayer } from "./useSimpleVideoPlayer";
import type { VideoPlayer } from "expo-video";

interface VideoItem {
  id: string;
  videoUri?: string;
  transcription?: string;
}

interface VideoPlayerManager {
  getPlayer: (index: number) => VideoPlayer | null;
  playVideo: (index: number) => void;
  pauseVideo: (index: number) => void;
  pauseAll: () => void;
  muteAll: () => void;
  unmuteAll: () => void;
  updateMuteState: (forceUnmuted?: boolean) => void;
  cleanup: () => void;
  stopAll: () => void;
}

export const useVideoPlayers = (videos: VideoItem[]): VideoPlayerManager => {
  const simpleManager = useSimpleVideoPlayer(videos);

  return {
    getPlayer: simpleManager.getPlayer,
    playVideo: simpleManager.playVideo,
    pauseVideo: simpleManager.pauseVideo,
    pauseAll: simpleManager.pauseAll,
    muteAll: simpleManager.muteAll,
    unmuteAll: simpleManager.unmuteAll,
    updateMuteState: simpleManager.updateMuteState,
    cleanup: simpleManager.cleanup,
    stopAll: simpleManager.stopAll,
  };
};

export type { VideoPlayerManager };
