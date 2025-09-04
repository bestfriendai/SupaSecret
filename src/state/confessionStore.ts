import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ConfessionState, Confession } from "../types/confession";
import { v4 as uuidv4 } from "uuid";

const sampleConfessions: Confession[] = [
  {
    id: "sample-1",
    type: "text",
    content: "I've been pretending to be happy at work for months, but I'm actually struggling with anxiety. Every meeting feels like I'm drowning and everyone can see right through me.",
    isAnonymous: true,
    timestamp: Date.now() - 3600000, // 1 hour ago
    likes: 42,
    isLiked: false,
  },
  {
    id: "sample-2", 
    type: "video",
    content: "Video confession with face blur and voice change applied",
    videoUri: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    transcription: "I judge people on social media way too much. Someone posts vacation pics and I immediately think they're showing off. I hate that I'm like this but I can't stop.",
    isAnonymous: true,
    timestamp: Date.now() - 7200000, // 2 hours ago
    likes: 128,
    isLiked: true,
  },
  {
    id: "sample-3",
    type: "text", 
    content: "I've been lying to my family about money. I'm actually in debt but too embarrassed to ask for help. When they ask how I'm doing, I just say everything's fine.",
    isAnonymous: true,
    timestamp: Date.now() - 10800000, // 3 hours ago
    likes: 67,
    isLiked: false,
  },
  {
    id: "sample-4",
    type: "text",
    content: "Sometimes I feel like I'm not good enough for my partner. They deserve someone better and I'm just waiting for them to realize it.",
    isAnonymous: true,
    timestamp: Date.now() - 14400000, // 4 hours ago
    likes: 89,
    isLiked: false,
  },
  {
    id: "sample-5",
    type: "video",
    content: "Video confession with face blur and voice change applied", 
    videoUri: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    transcription: "I've been avoiding my best friend because I'm jealous of their success. They got promoted and I can barely handle my current job. I feel terrible about it.",
    isAnonymous: true,
    timestamp: Date.now() - 18000000, // 5 hours ago
    likes: 156,
    isLiked: false,
  },
  {
    id: "sample-6",
    type: "video",
    content: "Video confession with face blur and voice change applied", 
    videoUri: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    transcription: "I still sleep with a stuffed animal and I'm 28 years old. I'm too embarrassed to tell anyone, even my partner doesn't know.",
    isAnonymous: true,
    timestamp: Date.now() - 21600000, // 6 hours ago
    likes: 203,
    isLiked: true,
  },
  {
    id: "sample-7",
    type: "video",
    content: "Video confession with face blur and voice change applied", 
    videoUri: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    transcription: "I pretend to be busy at work but I actually finish my tasks in 2 hours and spend the rest of the day browsing the internet. I feel guilty but also trapped.",
    isAnonymous: true,
    timestamp: Date.now() - 25200000, // 7 hours ago
    likes: 94,
    isLiked: false,
  },
  {
    id: "sample-8",
    type: "video",
    content: "Video confession with face blur and voice change applied", 
    videoUri: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    transcription: "I've been eating my roommate's food and replacing it before they notice. I know it's wrong but I'm too broke to buy groceries and too proud to ask for help.",
    isAnonymous: true,
    timestamp: Date.now() - 28800000, // 8 hours ago
    likes: 76,
    isLiked: false,
  },
];

export const useConfessionStore = create<ConfessionState>()(
  persist(
    (set) => ({
      confessions: sampleConfessions,
      videoAnalytics: {},
      userPreferences: {
        autoplay: true,
        soundEnabled: true,
        qualityPreference: "auto",
        dataUsageMode: "unlimited",
      },
      addConfession: (confession) => {
        const newConfession: Confession = {
          ...confession,
          id: uuidv4(),
          timestamp: Date.now(),
          likes: 0,
          isLiked: false,
        };
        set((state) => ({
          confessions: [newConfession, ...state.confessions],
        }));
      },
      deleteConfession: (id) => {
        set((state) => ({
          confessions: state.confessions.filter((c) => c.id !== id),
        }));
      },
      clearAllConfessions: () => {
        set({ confessions: [] });
      },
      toggleLike: (id) => {
        set((state) => ({
          confessions: state.confessions.map((confession) =>
            confession.id === id
              ? {
                  ...confession,
                  isLiked: !confession.isLiked,
                  likes: (confession.likes || 0) + (confession.isLiked ? -1 : 1),
                }
              : confession
          ),
          videoAnalytics: {
            ...state.videoAnalytics,
            [id]: {
              ...state.videoAnalytics[id],
              interactions: (state.videoAnalytics[id]?.interactions || 0) + 1,
            },
          },
        }));
      },
      updateLikes: (id, likes) => {
        set((state) => ({
          confessions: state.confessions.map((confession) =>
            confession.id === id ? { ...confession, likes } : confession
          ),
        }));
      },
      updateVideoAnalytics: (id, analytics) => {
        set((state) => ({
          videoAnalytics: {
            ...state.videoAnalytics,
            [id]: {
              ...{
                watchTime: 0,
                completionRate: 0,
                lastWatched: Date.now(),
                interactions: 0,
              },
              ...state.videoAnalytics[id],
              ...analytics,
            },
          },
        }));
      },
      updateUserPreferences: (preferences) => {
        set((state) => ({
          userPreferences: {
            ...state.userPreferences,
            ...preferences,
          },
        }));
      },
    }),
    {
      name: "confession-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);