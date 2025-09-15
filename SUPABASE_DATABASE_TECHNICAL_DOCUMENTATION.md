# Supabase Database Technical Documentation - Toxic Confessions App

## Overview

This document provides comprehensive technical documentation for the Supabase database configuration and schema used in the Toxic Confessions React Native application. The database is hosted on Supabase Cloud with project ID `xhtqobjcbjgzxkgfyvdj` in the `us-east-1` region.

## Database Configuration

### Project Details
- **Project ID**: `xhtqobjcbjgzxkgfyvdj`
- **Project Name**: Confessions
- **Region**: us-east-1
- **Database Version**: PostgreSQL 17.4.1.069
- **Status**: ✅ ACTIVE_HEALTHY

### Environment Variables
```env
EXPO_PUBLIC_VIBECODE_SUPABASE_URL=https://xhtqobjcbjgzxkgfyvdj.supabase.co
EXPO_PUBLIC_VIBECODE_SUPABASE_ANON_KEY=[REDACTED]
EXPO_PUBLIC_VIBECODE_PROJECT_ID=xhtqobjcbjgzxkgfyvdj
```

## Database Schema Analysis

### Core Tables

#### 1. `confessions` (Primary Content Table)
**Purpose**: Stores user confessions (text and video content)

**Columns**:
- `id` (string, PK) - UUID primary key
- `content` (string, required) - Text content of confession
- `created_at` (string, auto) - Timestamp of creation
- `updated_at` (string, nullable) - Last modification timestamp
- `user_id` (string, nullable) - FK to auth.users, nullable for anonymous posts
- `is_anonymous` (boolean, default: false) - Whether confession is anonymous
- `likes` (number, default: 0) - Like count
- `type` (string, required) - Content type ('text' or 'video')
- `transcription` (string, nullable) - AI-generated transcription for videos
- `video_uri` (string, nullable) - Storage path for video files
- `video_url` (string, nullable) - Deprecated, use signed URLs instead
- `video_duration` (number, nullable) - Video length in seconds
- `video_file_size` (number, nullable) - File size in bytes
- `video_processing_status` (string, nullable) - Processing state
- `video_quality` (string, nullable) - Video quality setting
- `video_thumbnail_url` (string, nullable) - Thumbnail image URL

**Relationships**: None (standalone table)

#### 2. `user_profiles` (User Management)
**Purpose**: Extended user profile information

**Columns**:
- `id` (string, PK) - UUID, references auth.users(id)
- `username` (string, nullable) - Display name
- `is_onboarded` (boolean, default: false) - Onboarding completion status
- `created_at` (string, auto) - Account creation timestamp
- `last_login_at` (string, auto) - Last login timestamp

**Relationships**: 
- One-to-one with `auth.users` via `user_profiles_id_fkey`

#### 3. `user_likes` (Engagement Tracking)
**Purpose**: Tracks user likes on confessions and replies

**Columns**:
- `id` (string, PK) - UUID primary key
- `user_id` (string, required) - User who liked
- `confession_id` (string, nullable) - Liked confession ID
- `reply_id` (string, nullable) - Liked reply ID
- `created_at` (string, auto) - Like timestamp

**Relationships**:
- `user_likes_confession_id_fkey` → `confessions(id)`
- `user_likes_reply_id_fkey` → `replies(id)`

**Constraints**: Either `confession_id` OR `reply_id` must be set (not both)

#### 4. `replies` (Comment System)
**Purpose**: User replies to confessions

**Columns**:
- `id` (string, PK) - UUID primary key
- `confession_id` (string, required) - Parent confession
- `content` (string, required) - Reply text content
- `user_id` (string, nullable) - Author (nullable for anonymous)
- `is_anonymous` (boolean, default: false) - Anonymous reply flag
- `likes` (number, default: 0) - Reply like count
- `created_at` (string, auto) - Creation timestamp
- `updated_at` (string, nullable) - Last modification

**Relationships**:
- `replies_confession_id_fkey` → `confessions(id)`

#### 5. `notifications` (User Notifications)
**Purpose**: In-app notification system

**Columns**:
- `id` (string, PK) - UUID primary key
- `user_id` (string, required) - Notification recipient
- `type` (string, required) - Notification type
- `message` (string, required) - Notification text
- `entity_type` (string, required) - Related entity type
- `entity_id` (string, required) - Related entity ID
- `actor_user_id` (string, nullable) - User who triggered notification
- `read_at` (string, nullable) - Read timestamp
- `created_at` (string, auto) - Creation timestamp

**Relationships**: None (references handled by entity_id)

#### 6. `reports` (Content Moderation)
**Purpose**: User-reported content for moderation

**Columns**:
- `id` (string, PK) - UUID primary key
- `reporter_user_id` (string, required) - User who reported
- `confession_id` (string, nullable) - Reported confession
- `reply_id` (string, nullable) - Reported reply
- `reason` (string, required) - Report reason
- `additional_details` (string, nullable) - Extra context
- `status` (string, nullable) - Review status
- `reviewed_by` (string, nullable) - Moderator ID
- `reviewed_at` (string, nullable) - Review timestamp
- `created_at` (string, auto) - Report timestamp

**Relationships**:
- `reports_confession_id_fkey` → `confessions(id)`
- `reports_reply_id_fkey` → `replies(id)`

### Supporting Tables

#### 7. `user_memberships` (Premium Features)
**Purpose**: User subscription and tier management

**Columns**:
- `id` (string, PK) - UUID primary key
- `user_id` (string, required) - Subscriber
- `tier` (string, required) - Membership tier ('free', 'plus')
- `plan_id` (string, nullable) - External plan identifier
- `subscription_id` (string, nullable) - External subscription ID
- `expires_at` (string, nullable) - Subscription expiry
- `auto_renew` (boolean, nullable) - Auto-renewal setting
- `created_at` (string, auto) - Subscription start
- `updated_at` (string, nullable) - Last modification

#### 8. `user_preferences` (App Settings)
**Purpose**: User app preferences and settings

**Columns**:
- `user_id` (string, PK) - User identifier
- `autoplay` (boolean, nullable) - Video autoplay setting
- `sound_enabled` (boolean, nullable) - Audio playback setting
- `haptics_enabled` (boolean, nullable) - Haptic feedback setting
- `quality_preference` (string, nullable) - Video quality preference
- `data_usage_mode` (string, nullable) - Data saving mode
- `captions_default` (boolean, nullable) - Default captions setting
- `reduced_motion` (boolean, nullable) - Accessibility setting
- `created_at` (string, auto) - Creation timestamp
- `updated_at` (string, nullable) - Last update

#### 9. `notification_preferences` (Notification Settings)
**Purpose**: User notification preferences

**Columns**:
- `user_id` (string, PK) - User identifier
- `push_enabled` (boolean, nullable) - Push notifications enabled
- `likes_enabled` (boolean, nullable) - Like notifications enabled
- `replies_enabled` (boolean, nullable) - Reply notifications enabled
- `quiet_hours_start` (string, nullable) - Do not disturb start time
- `quiet_hours_end` (string, nullable) - Do not disturb end time
- `created_at` (string, auto) - Creation timestamp
- `updated_at` (string, nullable) - Last update

#### 10. `push_tokens` (Push Notification Tokens)
**Purpose**: Device push notification tokens

**Columns**:
- `id` (string, PK) - UUID primary key
- `user_id` (string, required) - Token owner
- `token` (string, required) - Push notification token
- `platform` (string, required) - Device platform ('ios', 'android')
- `created_at` (string, auto) - Token registration time
- `updated_at` (string, nullable) - Last token update

#### 11. `video_analytics` (Video Metrics)
**Purpose**: Video engagement analytics

**Columns**:
- `confession_id` (string, PK) - Video confession ID
- `watch_time` (number, nullable) - Total watch time in seconds
- `completion_rate` (number, nullable) - Completion percentage
- `interactions` (number, nullable) - Interaction count
- `last_watched` (string, nullable) - Last view timestamp
- `updated_at` (string, nullable) - Last analytics update

**Relationships**:
- `video_analytics_confession_id_fkey` → `confessions(id)` (one-to-one)

### Database Views

#### `public_confessions` (Public Data View)
**Purpose**: Filtered view of confessions for public access

**Columns**:
- `id` (string) - Confession ID
- `content` (string) - Text content
- `created_at` (string) - Creation timestamp
- `is_anonymous` (boolean) - Anonymous flag
- `likes` (number) - Like count
- `transcription` (string) - Video transcription
- `type` (string) - Content type
- `video_uri` (string) - Video storage path

**Usage**: Provides public read access to confession data while hiding sensitive fields

## Database Functions (Stored Procedures)

### Core Functions

#### 1. `toggle_confession_like(confession_uuid: string)`
**Purpose**: Toggle user like on a confession
**Returns**: `{ likes_count: number }[]`
**Authentication**: Required (uses `auth.uid()`)
**Logic**: Inserts/deletes like record and returns updated count

#### 2. `get_trending_hashtags(hours_back?: number, limit_count?: number)`
**Purpose**: Get trending hashtags from recent confessions
**Returns**: `{ hashtag: string, count: number, percentage: number }[]`
**Default Parameters**: `hours_back=24, limit_count=10`
**Logic**: Extracts hashtags from confession content and ranks by frequency

#### 3. `extract_hashtags(text_content: string)`
**Purpose**: Extract hashtags from text content
**Returns**: `string[]`
**Logic**: Uses regex to find #hashtag patterns in text

#### 4. `get_trending_secrets(hours_back?: number, limit_count?: number)`
**Purpose**: Get trending confessions based on engagement
**Returns**: Confession objects with `engagement_score`
**Logic**: Uses `calculate_engagement_score()` to rank confessions

#### 5. `search_confessions_by_hashtag(search_hashtag: string)`
**Purpose**: Search confessions containing specific hashtag
**Returns**: Array of matching confession objects
**Logic**: Full-text search on confession content

### User Management Functions

#### 6. `get_user_tier(target_user_id: string)`
**Purpose**: Get user's membership tier
**Returns**: `string` ('free' | 'plus')
**Logic**: Queries `user_memberships` table

#### 7. `has_active_membership(target_user_id: string, required_tier?: string)`
**Purpose**: Check if user has active membership
**Returns**: `boolean`
**Logic**: Validates membership expiry and tier

#### 8. `get_unread_notification_count(target_user_id: string)`
**Purpose**: Count unread notifications for user
**Returns**: `number`
**Logic**: Counts notifications where `read_at` is null

### Reporting Functions

#### 9. `get_confession_report_count(confession_uuid: string)`
**Purpose**: Get report count for a confession
**Returns**: `number`
**Logic**: Counts reports for specific confession

#### 10. `get_reply_report_count(reply_uuid: string)`
**Purpose**: Get report count for a reply
**Returns**: `number`
**Logic**: Counts reports for specific reply

### Helper Functions

#### 11. `calculate_engagement_score(likes_count: integer, created_at_param: timestamp)`
**Purpose**: Calculate engagement score for trending algorithm
**Returns**: `numeric`
**Logic**: `likes * (1.0 / (1.0 + hours_since_creation))`

## Authentication & Security Setup

### Row Level Security (RLS) Policies
**Status**: ✅ Enabled with 58 active policies across all tables

### Key Security Features:
- **User Isolation**: Users can only access their own data
- **Authenticated Access**: Most operations require authentication
- **Public Read Access**: Confessions and replies are publicly readable
- **Owner-Only Modifications**: Users can only modify their own content
- **Service Role Access**: Admin operations properly restricted

### Critical RLS Policies:
- `confessions`: Users can only delete/update their own confessions
- `user_profiles`: Users can only access their own profile
- `notifications`: Users can only see their own notifications
- `reports`: Users can only see reports they created
- `user_likes`: Users can only manage their own likes

### Authentication Configuration:
- **Flow Type**: PKCE (Proof Key for Code Exchange) for enhanced security
- **Session Management**: Auto-refresh enabled with persistent sessions
- **Storage**: Expo SecureStore for token storage on mobile
- **JWT Expiry**: 3600 seconds (1 hour)
- **Refresh Token Rotation**: Enabled
- **Signup**: Enabled
- **Anonymous Sign-ins**: Disabled
- **Minimum Password Length**: 6 characters

## Storage Configuration

### Storage Buckets

#### 1. `confessions` Bucket
- **Access**: Private
- **File Size Limit**: 100MB
- **Allowed MIME Types**: 
  - `video/mp4`
  - `video/quicktime` 
  - `video/x-msvideo`
- **Purpose**: Video confession storage

#### 2. `images` Bucket  
- **Access**: Private
- **File Size Limit**: 10MB
- **Allowed MIME Types**:
  - `image/png`
  - `image/jpeg`
  - `image/webp`
- **Purpose**: Image uploads and thumbnails

### Storage Security:
- All buckets are private (require authentication)
- RLS policies control access to storage objects
- Signed URLs used for temporary access (default 1 hour expiry)
- Storage paths follow pattern: `confessions/{user_id}/{filename}`

## Real-time Configuration

### Real-time Subscriptions:
- **Status**: ✅ Enabled and operational
- **Events Per Second**: 10 (configured limit)
- **Channels**: Support for table-level subscriptions
- **Authentication**: Required for private data subscriptions

### Subscription Patterns:
```typescript
// Example: Subscribe to new confessions
supabase
  .channel('confessions')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'confessions' },
    (payload) => console.log('New confession:', payload)
  )
  .subscribe()
```

## Edge Functions

### `process-video` Function
**Purpose**: Video processing pipeline for confessions
**Status**: ✅ Deployed and operational
**Runtime**: Deno 1.x

**Features**:
- Face blur processing
- Voice modification (deep/light effects)
- Transcription generation
- Thumbnail creation
- Quality optimization

**Request Format**:
```typescript
{
  videoPath: string,        // Storage path (preferred)
  videoUrl?: string,        // Deprecated
  uploadId?: string,        // Legacy support
  options: {
    enableFaceBlur?: boolean,
    enableVoiceChange?: boolean,
    enableTranscription?: boolean,
    quality?: "low" | "medium" | "high",
    voiceEffect?: "deep" | "light"
  }
}
```

**Response Format**:
```typescript
{
  success: boolean,
  storagePath: string | null,
  thumbnailUrl: string | null,
  transcription: string,
  duration: number,
  faceBlurApplied: boolean,
  voiceChangeApplied: boolean,
  message: string
}
```

## Code Integration Analysis

### Environment Variable Handling:
The application uses a robust fallback system for environment variables:

```typescript
// Primary variables (current)
EXPO_PUBLIC_VIBECODE_SUPABASE_URL
EXPO_PUBLIC_VIBECODE_SUPABASE_ANON_KEY

// Fallback variables (legacy)
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
```

### Database Client Configuration:
```typescript
export const supabase = createClient<Database>(clientUrl, clientKey, {
  auth: {
    storage: supabaseStorage,      // Expo SecureStore
    autoRefreshToken: true,
    persistSession: true,
    flowType: "pkce",             // Enhanced security
    debug: __DEV__,
    storageKey: "supabase-auth-token",
  },
  db: { schema: "public" },
  realtime: { params: { eventsPerSecond: 10 } },
});
```

### Type Safety:
The application uses comprehensive TypeScript types generated from the database schema:
- `Database` interface with full table definitions
- `Tables<>` utility types for type-safe queries
- `Row`, `Insert`, `Update` types for each table
- Function parameter and return types

## Implementation Recommendations

### 1. Querying Best Practices

#### Confessions Query:
```typescript
// ✅ Correct: Use public view for read access
const { data } = await supabase
  .from('public_confessions')
  .select('*')
  .order('created_at', { ascending: false });

// ✅ Correct: Use signed URLs for videos
const signedUrl = await ensureSignedVideoUrl(confession.video_uri);
```

#### User Likes:
```typescript
// ✅ Correct: Use RPC function for atomic operations
const { data } = await supabase.rpc('toggle_confession_like', {
  confession_uuid: confessionId
});
```

### 2. Video Upload Pipeline:
```typescript
// ✅ Correct: Upload to storage first, get path
const uploadResult = await uploadVideoToSupabase(localUri, userId);

// ✅ Then save to database with storage path
const { data } = await supabase.from('confessions').insert({
  content: transcription,
  type: 'video',
  video_uri: uploadResult.path,  // Storage path, not URL
  user_id: userId
});
```

### 3. Authentication Handling:
```typescript
// ✅ Check authentication before sensitive operations
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  throw new Error('Authentication required');
}

// ✅ Use auth.uid() in RLS policies and functions
```

### 4. Error Handling:
```typescript
// ✅ Handle storage errors gracefully
const signedUrlResult = await ensureSignedVideoUrl(videoPath);
if (!signedUrlResult.signedUrl) {
  console.warn('Video file not found, showing placeholder');
  return null; // Graceful degradation
}
```

## Migration Status & Notes

### Recent Migrations:
- ✅ **Storage Migration**: 3 legacy video files migrated from `videos/` to `confessions/` bucket
- ✅ **Database Paths**: Updated video_uri paths to use `confessions/` prefix
- ✅ **Function Updates**: All database functions updated and verified
- ✅ **Type Generation**: Fresh TypeScript types generated from live schema

### Current State:
- **Database**: Fully operational with 20 confession records
- **Storage**: `confessions` and `images` buckets configured
- **Functions**: All 11 custom functions working correctly
- **RLS**: 58 security policies active and enforced
- **Real-time**: Subscriptions working with 10 events/second limit

### Known Issues:
- ⚠️ **Legacy URLs**: Some old video URLs may still exist in database (gracefully handled)
- ⚠️ **Migration Cleanup**: Storage object copying may be needed for legacy files

## Performance Considerations

### Database Optimization:
- **Indexes**: Proper indexing on frequently queried columns
- **RLS Performance**: Policies optimized for query performance
- **Connection Pooling**: Configured for production load
- **Query Limits**: Max 1000 rows per query (configurable)

### Storage Optimization:
- **Signed URL Caching**: 1-hour expiry reduces API calls
- **File Size Limits**: 100MB for videos, 10MB for images
- **MIME Type Restrictions**: Prevents invalid file uploads
- **Path Structure**: Organized by user for efficient access

### Real-time Optimization:
- **Event Rate Limiting**: 10 events/second prevents overload
- **Selective Subscriptions**: Only subscribe to needed channels
- **Connection Management**: Auto-reconnection on network issues

## Security Audit Summary

### ✅ Security Strengths:
- Comprehensive RLS policies (58 active)
- PKCE authentication flow
- Private storage buckets with signed URLs
- Input validation in database functions
- Proper user isolation and access controls
- Secure token storage (Expo SecureStore)

### ⚠️ Security Considerations:
- API keys in environment variables (client-side accessible)
- Consider backend proxy for sensitive API operations
- Monitor usage of third-party API keys
- Regular security policy reviews recommended

### 🔒 Compliance Features:
- User data isolation (GDPR compliance ready)
- Anonymous posting support
- Content reporting and moderation system
- Audit trails via timestamps
- Secure authentication with session management

---

**Document Version**: 1.0  
**Last Updated**: December 2024  
**Database Schema Version**: Current (PostgreSQL 17.4.1.069)  
**Supabase Project**: xhtqobjcbjgzxkgfyvdj (us-east-1)
