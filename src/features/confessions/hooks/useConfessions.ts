import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { confessionService } from "../services/confessionService";
import type { Confession, CreateConfessionInput, VideoAnalytics, UserPreferences } from "../types/confession.types";
import { supabase } from "../../../lib/supabase";

// Query keys
export const confessionKeys = {
  all: ["confessions"] as const,
  lists: () => [...confessionKeys.all, "list"] as const,
  list: (filters?: any) => [...confessionKeys.lists(), filters] as const,
  details: () => [...confessionKeys.all, "detail"] as const,
  detail: (id: string) => [...confessionKeys.details(), id] as const,
  userConfessions: (userId: string) => [...confessionKeys.all, "user", userId] as const,
  userPreferences: (userId: string) => ["userPreferences", userId] as const,
};

/**
 * Hook to fetch confessions with infinite scroll
 */
export function useInfiniteConfessions(limit: number = 20) {
  return useInfiniteQuery({
    queryKey: confessionKeys.list({ limit }),
    queryFn: async ({ pageParam }: { pageParam?: number }) => {
      const offset = pageParam ? new Date(pageParam) : undefined;
      const confessions = await confessionService.fetchConfessions(limit, offset);
      return {
        confessions,
        nextCursor: confessions.length === limit ? confessions[confessions.length - 1]?.timestamp : null,
      };
    },
    getNextPageParam: (lastPage: { confessions: Confession[]; nextCursor: number | null }) => lastPage.nextCursor,
    initialPageParam: undefined as number | undefined,
  });
}

/**
 * Hook to fetch a single confession
 */
export function useConfession(id: string) {
  return useQuery({
    queryKey: confessionKeys.detail(id),
    queryFn: () => confessionService.fetchConfessionById(id),
    enabled: !!id,
  });
}

/**
 * Hook to fetch user's own confessions
 */
export function useUserConfessions(userId?: string) {
  return useQuery({
    queryKey: confessionKeys.userConfessions(userId || ""),
    queryFn: () => confessionService.fetchUserConfessions(userId!),
    enabled: !!userId,
  });
}

/**
 * Hook to create a confession
 */
export function useCreateConfession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      input,
      options,
    }: {
      input: CreateConfessionInput;
      options?: { onUploadProgress?: (percent: number) => void };
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      return confessionService.createConfession(user.id, input, options);
    },
    onSuccess: (newConfession: Confession) => {
      // Invalidate and refetch confessions list
      queryClient.invalidateQueries({ queryKey: confessionKeys.lists() });

      // Optimistically add to cache
      queryClient.setQueryData<{ pages: { confessions: Confession[] }[] }>(
        confessionKeys.list({ limit: 20 }),
        (old: { pages: { confessions: Confession[] }[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page: { confessions: Confession[] }, index: number) =>
              index === 0 ? { ...page, confessions: [newConfession, ...page.confessions] } : page,
            ),
          };
        },
      );
    },
  });
}

/**
 * Hook to delete a confession
 */
export function useDeleteConfession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (confessionId: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      await confessionService.deleteConfession(confessionId, user.id);
    },
    onSuccess: (_: void, confessionId: string) => {
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: confessionKeys.lists() });

      // Remove from cache
      queryClient.setQueryData<{ pages: { confessions: Confession[] }[] }>(
        confessionKeys.list({ limit: 20 }),
        (old: { pages: { confessions: Confession[] }[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page: { confessions: Confession[] }) => ({
              ...page,
              confessions: page.confessions.filter((c: Confession) => c.id !== confessionId),
            })),
          };
        },
      );
    },
  });
}

/**
 * Hook to toggle like on a confession
 */
export function useToggleLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (confessionId: string) => {
      return confessionService.toggleLike(confessionId);
    },
    onMutate: async (confessionId: string) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: confessionKeys.lists() });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(confessionKeys.list({ limit: 20 }));

      // Optimistically update
      queryClient.setQueryData<{ pages: { confessions: Confession[] }[] }>(
        confessionKeys.list({ limit: 20 }),
        (old: { pages: { confessions: Confession[] }[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page: { confessions: Confession[] }) => ({
              ...page,
              confessions: page.confessions.map((c: Confession) =>
                c.id === confessionId
                  ? {
                      ...c,
                      isLiked: !c.isLiked,
                      likes: c.likes + (c.isLiked ? -1 : 1),
                    }
                  : c,
              ),
            })),
          };
        },
      );

      return { previousData };
    },
    onError: (_err: Error, _confessionId: string, context: { previousData: unknown } | undefined) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(confessionKeys.list({ limit: 20 }), context.previousData);
      }
    },
    onSuccess: (data: { likes: number }, confessionId: string) => {
      // Update with server data
      queryClient.setQueryData<{ pages: { confessions: Confession[] }[] }>(
        confessionKeys.list({ limit: 20 }),
        (old: { pages: { confessions: Confession[] }[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page: { confessions: Confession[] }) => ({
              ...page,
              confessions: page.confessions.map((c: Confession) =>
                c.id === confessionId ? { ...c, likes: data.likes } : c,
              ),
            })),
          };
        },
      );
    },
  });
}

/**
 * Hook to update video analytics
 */
export function useUpdateVideoAnalytics() {
  return useMutation({
    mutationFn: async ({ confessionId, analytics }: { confessionId: string; analytics: Partial<VideoAnalytics> }) => {
      await confessionService.updateVideoAnalytics(confessionId, analytics);
    },
  });
}

/**
 * Hook to fetch user preferences
 */
export function useUserPreferences(userId?: string) {
  return useQuery({
    queryKey: confessionKeys.userPreferences(userId || ""),
    queryFn: () => confessionService.fetchUserPreferences(userId!),
    enabled: !!userId,
  });
}

/**
 * Hook to update user preferences
 */
export function useUpdateUserPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preferences: Partial<UserPreferences>) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      await confessionService.updateUserPreferences(user.id, preferences);
    },
    onSuccess: async (_: void, preferences: Partial<UserPreferences>) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        queryClient.invalidateQueries({
          queryKey: confessionKeys.userPreferences(user.id),
        });
      }
    },
  });
}
