import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ConfessionState, Confession, UserPreferences, VideoAnalytics } from "../types/confession";
import { supabase } from "../lib/supabase";

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
    (set, get) => ({
      confessions: [],
      videoAnalytics: {},
      userPreferences: {
        autoplay: true,
        soundEnabled: true,
        qualityPreference: "auto",
        dataUsageMode: "unlimited",
      },
      isLoading: false,
      error: null,

      loadConfessions: async () => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('confessions')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) throw error;

          const confessions: Confession[] = data.map(item => ({
            id: item.id,
            type: item.type as 'text' | 'video',
            content: item.content,
            videoUri: item.video_uri || undefined,
            transcription: item.transcription || undefined,
            timestamp: new Date(item.created_at).getTime(),
            isAnonymous: item.is_anonymous,
            likes: item.likes,
            isLiked: false, // TODO: Track user likes separately
          }));

          set({ confessions, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load confessions',
            isLoading: false
          });
        }
      },

      addConfession: async (confession) => {
        set({ isLoading: true, error: null });
        try {
          const { data: { user } } = await supabase.auth.getUser();

          const { data, error } = await supabase
            .from('confessions')
            .insert({
              user_id: user?.id,
              type: confession.type,
              content: confession.content,
              video_uri: confession.videoUri,
              transcription: confession.transcription,
              is_anonymous: confession.isAnonymous,
            })
            .select()
            .single();

          if (error) throw error;

          const newConfession: Confession = {
            id: data.id,
            type: data.type as 'text' | 'video',
            content: data.content,
            videoUri: data.video_uri || undefined,
            transcription: data.transcription || undefined,
            timestamp: new Date(data.created_at).getTime(),
            isAnonymous: data.is_anonymous,
            likes: data.likes,
            isLiked: false,
          };

          set((state) => ({
            confessions: [newConfession, ...state.confessions],
            isLoading: false,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to add confession',
            isLoading: false
          });
          throw error;
        }
      },

      deleteConfession: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const { error } = await supabase
            .from('confessions')
            .delete()
            .eq('id', id);

          if (error) throw error;

          set((state) => ({
            confessions: state.confessions.filter((c) => c.id !== id),
            isLoading: false,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to delete confession',
            isLoading: false
          });
          throw error;
        }
      },

      clearAllConfessions: async () => {
        set({ isLoading: true, error: null });
        try {
          const { data: { user } } = await supabase.auth.getUser();

          const { error } = await supabase
            .from('confessions')
            .delete()
            .eq('user_id', user?.id);

          if (error) throw error;

          set({ confessions: [], isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to clear confessions',
            isLoading: false
          });
          throw error;
        }
      },
      toggleLike: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const state = get();
          const confession = state.confessions.find(c => c.id === id);
          if (!confession) throw new Error('Confession not found');

          const newLikes = confession.isLiked ? confession.likes - 1 : confession.likes + 1;

          const { error } = await supabase
            .from('confessions')
            .update({ likes: newLikes })
            .eq('id', id);

          if (error) throw error;

          set((state) => ({
            confessions: state.confessions.map((confession) =>
              confession.id === id
                ? {
                    ...confession,
                    isLiked: !confession.isLiked,
                    likes: newLikes,
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
            isLoading: false,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to toggle like',
            isLoading: false
          });
          throw error;
        }
      },

      updateLikes: async (id, likes) => {
        set({ isLoading: true, error: null });
        try {
          const { error } = await supabase
            .from('confessions')
            .update({ likes })
            .eq('id', id);

          if (error) throw error;

          set((state) => ({
            confessions: state.confessions.map((confession) =>
              confession.id === id ? { ...confession, likes } : confession
            ),
            isLoading: false,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update likes',
            isLoading: false
          });
          throw error;
        }
      },
      updateVideoAnalytics: async (id, analytics) => {
        set({ isLoading: true, error: null });
        try {
          const { error } = await supabase
            .from('video_analytics')
            .upsert({
              confession_id: id,
              watch_time: analytics.watchTime,
              completion_rate: analytics.completionRate,
              last_watched: analytics.lastWatched ? new Date(analytics.lastWatched).toISOString() : new Date().toISOString(),
              interactions: analytics.interactions,
            });

          if (error) throw error;

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
            isLoading: false,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update video analytics',
            isLoading: false
          });
          throw error;
        }
      },

      loadUserPreferences: async () => {
        set({ isLoading: true, error: null });
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data, error } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned

          if (data) {
            const preferences: UserPreferences = {
              autoplay: data.autoplay,
              soundEnabled: data.sound_enabled,
              qualityPreference: data.quality_preference as "auto" | "high" | "medium" | "low",
              dataUsageMode: data.data_usage_mode as "unlimited" | "wifi-only" | "minimal",
            };
            set({ userPreferences: preferences, isLoading: false });
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load user preferences',
            isLoading: false
          });
        }
      },

      updateUserPreferences: async (preferences) => {
        set({ isLoading: true, error: null });
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');

          const { error } = await supabase
            .from('user_preferences')
            .upsert({
              user_id: user.id,
              autoplay: preferences.autoplay,
              sound_enabled: preferences.soundEnabled,
              quality_preference: preferences.qualityPreference,
              data_usage_mode: preferences.dataUsageMode,
            });

          if (error) throw error;

          set((state) => ({
            userPreferences: {
              ...state.userPreferences,
              ...preferences,
            },
            isLoading: false,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update user preferences',
            isLoading: false
          });
          throw error;
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: "confession-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Set up real-time subscriptions for confessions
supabase
  .channel('confessions')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'confessions' },
    (payload) => {
      const { loadConfessions } = useConfessionStore.getState();
      loadConfessions(); // Reload confessions when new ones are added
    }
  )
  .on('postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'confessions' },
    (payload) => {
      const { confessions } = useConfessionStore.getState();
      const updatedConfession = payload.new;

      useConfessionStore.setState({
        confessions: confessions.map(confession =>
          confession.id === updatedConfession.id
            ? {
                ...confession,
                likes: updatedConfession.likes,
              }
            : confession
        ),
      });
    }
  )
  .subscribe();