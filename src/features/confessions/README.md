# Confessions Feature

This directory contains all confession-related functionality following a clean architecture pattern.

## Structure

```
confessions/
├── components/          # UI Components
│   ├── ConfessionCard.tsx       # Individual confession card
│   ├── ConfessionList.tsx       # FlashList with infinite scroll
│   ├── ConfessionForm.tsx       # Form for creating confessions
│   └── ConfessionSkeleton.tsx   # Loading skeleton
├── hooks/              # React Query hooks
│   └── useConfessions.ts        # All confession-related hooks
├── services/           # Business logic and data access
│   ├── confessionRepository.ts  # Database operations
│   └── confessionService.ts     # Business logic layer
├── types/              # TypeScript types
│   └── confession.types.ts      # All confession types
└── index.ts            # Public API exports

## Usage

### Fetching Confessions with Infinite Scroll

```tsx
import { useInfiniteConfessions, ConfessionList } from '@/features/confessions';

function HomeScreen() {
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteConfessions(20);

  const confessions = data?.pages.flatMap(page => page.confessions) || [];

  return (
    <ConfessionList
      confessions={confessions}
      isLoading={isLoading}
      isLoadingMore={isFetchingNextPage}
      hasMore={hasNextPage}
      onLoadMore={fetchNextPage}
      onRefresh={refetch}
    />
  );
}
```

### Creating a Confession

```tsx
import { useCreateConfession, ConfessionForm } from '@/features/confessions';

function CreateScreen() {
  const { mutateAsync: createConfession } = useCreateConfession();

  const handleSubmit = async (content: string) => {
    await createConfession({
      input: {
        type: 'text',
        content,
        isAnonymous: true,
      },
    });
  };

  return <ConfessionForm onSubmitText={handleSubmit} />;
}
```

### Liking a Confession

```tsx
import { useToggleLike } from '@/features/confessions';

function ConfessionItem() {
  const { mutate: toggleLike } = useToggleLike();

  return (
    <button onClick={() => toggleLike(confessionId)}>
      Like
    </button>
  );
}
```

## Features

### Implemented ✅

- **Infinite Scroll**: FlashList with React Query infinite queries
- **Optimistic Updates**: Likes update immediately with rollback on error
- **Real-time Updates**: Supabase subscriptions for new confessions
- **Loading States**: Skeleton loaders for better UX
- **Pull to Refresh**: Standard mobile refresh pattern
- **Type Safety**: Full TypeScript coverage
- **Clean Architecture**: Separation of concerns (UI → Hooks → Service → Repository)

### Components

#### ConfessionCard
Displays a single confession with:
- Anonymous user avatar
- Timestamp and type badge
- Content/transcription
- Action buttons (like, comment, report, bookmark)
- Video indicator for video confessions

#### ConfessionList
FlashList-based list with:
- Infinite scroll pagination
- Pull to refresh
- Loading skeletons
- Empty state
- Footer loading indicator

#### ConfessionForm
Form for creating confessions:
- Text input with character counter (10-280 chars)
- Real-time validation
- Video record option
- Anonymous indicator
- Privacy notice

### Hooks

All hooks use React Query for:
- Automatic caching
- Background refetching
- Optimistic updates
- Error handling
- Loading states

**Available Hooks:**
- `useInfiniteConfessions` - Paginated confession list
- `useConfession` - Single confession by ID
- `useUserConfessions` - User's own confessions
- `useCreateConfession` - Create new confession
- `useDeleteConfession` - Delete confession
- `useToggleLike` - Like/unlike with optimistic updates
- `useUpdateVideoAnalytics` - Track video viewing
- `useUserPreferences` - User preferences
- `useUpdateUserPreferences` - Update preferences

### Services

#### confessionRepository
Direct Supabase operations:
- `fetchConfessions()` - Get public confessions
- `fetchUserConfessions()` - Get user's confessions
- `createConfession()` - Insert new confession
- `deleteConfession()` - Delete confession
- `toggleLike()` - RPC for like toggle
- `updateVideoAnalytics()` - Update video stats
- `subscribeToConfessions()` - Real-time subscription

#### confessionService
Business logic layer:
- Data normalization (snake_case → camelCase)
- Validation
- Error handling
- Field mapping
- Video URL handling

## Database Schema

### Tables Used

**confessions**
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key)
- `type` (text | video)
- `content` (text)
- `video_uri` (text, nullable)
- `transcription` (text, nullable)
- `is_anonymous` (boolean)
- `likes` (integer)
- `views` (integer)
- `created_at` (timestamp)

**public_confessions** (view)
- Same as confessions but publicly accessible

**video_analytics**
- `confession_id` (uuid)
- `watch_time` (integer)
- `completion_rate` (float)
- `last_watched` (timestamp)
- `interactions` (integer)

**user_preferences**
- `user_id` (uuid)
- `autoplay` (boolean)
- `sound_enabled` (boolean)
- `quality_preference` (text)
- `data_usage_mode` (text)
- `captions_default` (boolean)
- `haptics_enabled` (boolean)
- `reduced_motion` (boolean)
- `playback_speed` (float)

### RPC Functions

**toggle_confession_like(confession_uuid)**
- Atomically toggles like status
- Returns updated like count
- Handles user authentication internally

## Architecture Benefits

1. **Testability**: Each layer can be tested independently
2. **Reusability**: Components and hooks are composable
3. **Maintainability**: Clear separation of concerns
4. **Type Safety**: Full TypeScript coverage prevents runtime errors
5. **Performance**: React Query handles caching and optimization
6. **Scalability**: Easy to add new features without modifying existing code

## Future Enhancements

- [ ] Add comment system
- [ ] Video processing integration
- [ ] Share functionality
- [ ] Advanced filtering and search
- [ ] Saved confessions sync
- [ ] Offline support with queue
- [ ] Analytics dashboard
- [ ] Moderation tools
