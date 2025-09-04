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
  },
  {
    id: "sample-2", 
    type: "video",
    content: "Video confession with face blur and voice change applied",
    videoUri: "sample-video-uri",
    transcription: "I judge people on social media way too much. Someone posts vacation pics and I immediately think they're showing off. I hate that I'm like this but I can't stop.",
    isAnonymous: true,
    timestamp: Date.now() - 7200000, // 2 hours ago
  },
  {
    id: "sample-3",
    type: "text", 
    content: "I've been lying to my family about money. I'm actually in debt but too embarrassed to ask for help. When they ask how I'm doing, I just say everything's fine.",
    isAnonymous: true,
    timestamp: Date.now() - 10800000, // 3 hours ago
  },
  {
    id: "sample-4",
    type: "text",
    content: "Sometimes I feel like I'm not good enough for my partner. They deserve someone better and I'm just waiting for them to realize it.",
    isAnonymous: true,
    timestamp: Date.now() - 14400000, // 4 hours ago
  },
  {
    id: "sample-5",
    type: "video",
    content: "Video confession with face blur and voice change applied", 
    videoUri: "sample-video-uri-2",
    transcription: "I've been avoiding my best friend because I'm jealous of their success. They got promoted and I can barely handle my current job. I feel terrible about it.",
    isAnonymous: true,
    timestamp: Date.now() - 18000000, // 5 hours ago
  },
];

export const useConfessionStore = create<ConfessionState>()(
  persist(
    (set) => ({
      confessions: sampleConfessions,
      addConfession: (confession) => {
        const newConfession: Confession = {
          ...confession,
          id: uuidv4(),
          timestamp: Date.now(),
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
    }),
    {
      name: "confession-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);