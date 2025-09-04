import { useRef, useEffect, useMemo } from "react";
import { useVideoPlayer } from "expo-video";

interface VideoItem {
  id: string;
  videoUri?: string;
  transcription?: string;
}

interface VideoPlayerManager {
  getPlayer: (index: number) => any;
  playVideo: (index: number) => void;
  pauseVideo: (index: number) => void;
  pauseAll: () => void;
  muteAll: () => void;
  unmuteAll: () => void;
  cleanup: () => void;
}

export const useVideoPlayers = (videos: VideoItem[]): VideoPlayerManager => {
  const playersRef = useRef<Map<number, any>>(new Map());
  const currentPlayingRef = useRef<number>(-1);

  // Create stable video source
  const videoSource = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

  // Create video players using individual hooks (following Rules of Hooks)
  const player0 = useVideoPlayer(videos.length > 0 ? videoSource : null, (player) => {
    player.loop = true;
    player.muted = false;
  });

  const player1 = useVideoPlayer(videos.length > 1 ? videoSource : null, (player) => {
    player.loop = true;
    player.muted = false;
  });

  const player2 = useVideoPlayer(videos.length > 2 ? videoSource : null, (player) => {
    player.loop = true;
    player.muted = false;
  });

  const player3 = useVideoPlayer(videos.length > 3 ? videoSource : null, (player) => {
    player.loop = true;
    player.muted = false;
  });

  const player4 = useVideoPlayer(videos.length > 4 ? videoSource : null, (player) => {
    player.loop = true;
    player.muted = false;
  });

  const player5 = useVideoPlayer(videos.length > 5 ? videoSource : null, (player) => {
    player.loop = true;
    player.muted = false;
  });

  const player6 = useVideoPlayer(videos.length > 6 ? videoSource : null, (player) => {
    player.loop = true;
    player.muted = false;
  });

  const player7 = useVideoPlayer(videos.length > 7 ? videoSource : null, (player) => {
    player.loop = true;
    player.muted = false;
  });

  // Store players in a stable array
  const players = useMemo(() => [
    player0, player1, player2, player3, 
    player4, player5, player6, player7
  ], [player0, player1, player2, player3, player4, player5, player6, player7]);

  // Initialize players map
  useEffect(() => {
    playersRef.current.clear();
    players.forEach((player, index) => {
      if (player && index < videos.length) {
        playersRef.current.set(index, player);
      }
    });
  }, [players, videos.length]);

  const getPlayer = (index: number) => {
    return playersRef.current.get(index) || null;
  };

  const playVideo = (index: number) => {
    const player = playersRef.current.get(index);
    if (player) {
      // Pause currently playing video
      if (currentPlayingRef.current !== -1 && currentPlayingRef.current !== index) {
        const currentPlayer = playersRef.current.get(currentPlayingRef.current);
        currentPlayer?.pause();
      }
      
      player.play();
      currentPlayingRef.current = index;
    }
  };

  const pauseVideo = (index: number) => {
    const player = playersRef.current.get(index);
    if (player) {
      player.pause();
      if (currentPlayingRef.current === index) {
        currentPlayingRef.current = -1;
      }
    }
  };

  const pauseAll = () => {
    playersRef.current.forEach((player) => {
      player?.pause();
    });
    currentPlayingRef.current = -1;
  };

  const muteAll = () => {
    playersRef.current.forEach((player) => {
      if (player) {
        player.muted = true;
      }
    });
  };

  const unmuteAll = () => {
    playersRef.current.forEach((player) => {
      if (player) {
        player.muted = false;
      }
    });
  };

  const cleanup = () => {
    pauseAll();
    playersRef.current.clear();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  return {
    getPlayer,
    playVideo,
    pauseVideo,
    pauseAll,
    muteAll,
    unmuteAll,
    cleanup,
  };
};