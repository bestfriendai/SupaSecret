import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ConfessionState, Confession } from "../types/confession";
import { v4 as uuidv4 } from "uuid";

const sampleConfessions: Confession[] = [
  {
    id: "sample-1",
    type: "text",
    content: "I've been pretending to be happy at work for months, but I'm actually really struggling with anxiety and feel like I'm failing at everything. I put on a smile every day but inside I'm falling apart.",
    isAnonymous: true,
    timestamp: Date.now() - 3600000, // 1 hour ago
  },
  {
    id: "sample-2", 
    type: "video",
    content: "Video confession with face blur and voice change applied",
    videoUri: "sample-video-uri",
    transcription: "I secretly judge people based on their social media posts, even though I know it's wrong and I hate that I do it. I see someone's vacation photos and immediately think they're showing off, or I see their achievements and feel bitter instead of happy for them.",
    isAnonymous: true,
    timestamp: Date.now() - 7200000, // 2 hours ago
  },
  {
    id: "sample-3",
    type: "text", 
    content: "I've been lying to my family about my financial situation. I'm actually in debt and too embarrassed to ask for help. Every time they ask how I'm doing, I just say everything's fine.",
    isAnonymous: true,
    timestamp: Date.now() - 10800000, // 3 hours ago
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