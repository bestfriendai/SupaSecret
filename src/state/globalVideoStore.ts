import { create } from 'zustand';

interface VideoPlayerRef {
  id: string;
  player: any;
  isPlaying: boolean;
}

interface GlobalVideoState {
  videoPlayers: Map<string, VideoPlayerRef>;
  currentTab: string;
  
  // Actions
  registerVideoPlayer: (id: string, player: any) => void;
  unregisterVideoPlayer: (id: string) => void;
  pauseAllVideos: () => void;
  resumeVideosForTab: (tabName: string) => void;
  setCurrentTab: (tabName: string) => void;
  updatePlayerState: (id: string, isPlaying: boolean) => void;
}

export const useGlobalVideoStore = create<GlobalVideoState>((set, get) => ({
  videoPlayers: new Map(),
  currentTab: 'Home',

  registerVideoPlayer: (id: string, player: any) => {
    const { videoPlayers } = get();
    const newPlayers = new Map(videoPlayers);
    newPlayers.set(id, { id, player, isPlaying: false });
    set({ videoPlayers: newPlayers });
    console.log(`🎥 Registered video player: ${id}`);
  },

  unregisterVideoPlayer: (id: string) => {
    const { videoPlayers } = get();
    const newPlayers = new Map(videoPlayers);
    newPlayers.delete(id);
    set({ videoPlayers: newPlayers });
    console.log(`🎥 Unregistered video player: ${id}`);
  },

  pauseAllVideos: () => {
    const { videoPlayers } = get();
    console.log(`🎥 Pausing all videos (${videoPlayers.size} players)`);
    
    videoPlayers.forEach((playerRef, id) => {
      try {
        if (playerRef.player && typeof playerRef.player.pause === 'function') {
          playerRef.player.pause();
          playerRef.player.muted = true;
          console.log(`🎥 Paused video: ${id}`);
        }
      } catch (error) {
        console.warn(`🎥 Failed to pause video ${id}:`, error);
      }
    });
  },

  resumeVideosForTab: (tabName: string) => {
    const { videoPlayers, currentTab } = get();
    
    if (tabName === 'Videos' && currentTab === 'Videos') {
      console.log(`🎥 Resuming videos for Videos tab`);
      
      videoPlayers.forEach((playerRef, id) => {
        try {
          if (playerRef.player && typeof playerRef.player.play === 'function') {
            playerRef.player.muted = false;
            // Only resume if it was playing before
            if (playerRef.isPlaying) {
              playerRef.player.play();
              console.log(`🎥 Resumed video: ${id}`);
            }
          }
        } catch (error) {
          console.warn(`🎥 Failed to resume video ${id}:`, error);
        }
      });
    }
  },

  setCurrentTab: (tabName: string) => {
    const { currentTab } = get();
    
    if (currentTab !== tabName) {
      console.log(`🎥 Tab changed from ${currentTab} to ${tabName}`);
      
      if (tabName !== 'Videos') {
        // Leaving Videos tab - pause all videos
        get().pauseAllVideos();
      } else {
        // Entering Videos tab - resume videos
        setTimeout(() => {
          get().resumeVideosForTab(tabName);
        }, 100);
      }
      
      set({ currentTab: tabName });
    }
  },

  updatePlayerState: (id: string, isPlaying: boolean) => {
    const { videoPlayers } = get();
    const playerRef = videoPlayers.get(id);
    
    if (playerRef) {
      const newPlayers = new Map(videoPlayers);
      newPlayers.set(id, { ...playerRef, isPlaying });
      set({ videoPlayers: newPlayers });
    }
  },
}));
