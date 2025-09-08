# Avatar Service Documentation

## Overview

The Avatar Service provides a complete solution for avatar upload, processing, and management with Supabase Storage integration. It includes image compression, validation, progress tracking, and proper cleanup of old avatars.

## Features

- **Image Processing**: Automatic resizing, cropping to square aspect ratio, and compression
- **Progress Tracking**: Real-time upload progress feedback
- **Validation**: File size and format validation
- **Security**: User-specific storage paths and permissions
- **Cleanup**: Automatic deletion of old avatars when updating
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Retry Logic**: Built-in retry mechanism for network failures

## Setup

### 1. Supabase Storage Setup

Run the SQL script to set up the avatar storage bucket:

```sql
-- Run src/scripts/setupAvatarBucket.sql in your Supabase SQL Editor
```

This will create:
- `avatars` storage bucket with 5MB file size limit
- Row Level Security (RLS) policies
- `profiles` table with avatar_url column
- Helper functions for avatar management

### 2. Required Dependencies

```bash
npm install expo-image-manipulator expo-file-system
```

### 3. Environment Variables

Ensure your Supabase environment variables are set:

```env
EXPO_PUBLIC_VIBECODE_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_VIBECODE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Usage

### Basic Avatar Upload

```typescript
import { AvatarService } from '../services/AvatarService';

const uploadAvatar = async (imageUri: string, userId: string) => {
  try {
    const result = await AvatarService.uploadAvatar(imageUri, userId, {
      onProgress: (progress) => {
        console.log(`Upload progress: ${progress}%`);
      },
    });
    
    console.log('Avatar uploaded:', result.url);
    return result.url;
  } catch (error) {
    console.error('Upload failed:', error.message);
  }
};
```

### Complete Avatar Update

```typescript
import { AvatarService } from '../services/AvatarService';

const updateUserAvatar = async (imageUri: string, userId: string, currentAvatarUrl?: string) => {
  try {
    const newAvatarUrl = await AvatarService.updateAvatar(
      imageUri,
      userId,
      currentAvatarUrl,
      {
        onProgress: (progress) => setUploadProgress(progress),
        quality: 0.8,
        maxSize: 1024,
      }
    );
    
    // Update your user state/store
    updateUser({ avatar_url: newAvatarUrl });
    
    return newAvatarUrl;
  } catch (error) {
    console.error('Avatar update failed:', error.message);
    throw error;
  }
};
```

### Image Validation

```typescript
import { validateImage } from '../services/AvatarService';

const handleImageSelection = async (imageUri: string) => {
  const validation = await validateImage(imageUri);
  
  if (!validation.valid) {
    Alert.alert('Invalid Image', validation.error);
    return;
  }
  
  // Proceed with upload
  await uploadAvatar(imageUri, userId);
};
```

## Integration with ProfileScreen

The ProfileScreen has been updated to use the Avatar Service:

```typescript
import { AvatarService, validateImage } from '../services/AvatarService';
import { useMediaPermissions } from '../hooks/useMediaPermissions';

export default function ProfileScreen() {
  const { requestMediaLibraryPermission } = useMediaPermissions();
  const [isAvatarLoading, setIsAvatarLoading] = useState(false);
  const [avatarUploadProgress, setAvatarUploadProgress] = useState(0);

  const handleAvatarPress = async () => {
    // Request permission
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) return;

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
      exif: false,
    });

    if (!result.canceled && result.assets[0]) {
      await updateAvatarImage(result.assets[0].uri);
    }
  };

  const updateAvatarImage = async (imageUri: string) => {
    try {
      setIsAvatarLoading(true);
      
      // Validate image
      const validation = await validateImage(imageUri);
      if (!validation.valid) {
        showError(validation.error);
        return;
      }

      // Upload with progress
      const newAvatarUrl = await AvatarService.updateAvatar(
        imageUri,
        user.id,
        user.avatar_url,
        {
          onProgress: setAvatarUploadProgress,
        }
      );

      // Update user profile
      await updateUser({ avatar_url: newAvatarUrl });
      showSuccess('Avatar updated successfully!');
    } catch (error) {
      showError(error.message);
    } finally {
      setIsAvatarLoading(false);
      setAvatarUploadProgress(0);
    }
  };
}
```

## Configuration

### Default Settings

```typescript
const AVATAR_BUCKET = 'avatars';
const MAX_AVATAR_SIZE = 1024; // 1024x1024 pixels
const AVATAR_QUALITY = 0.8;
const MAX_FILE_SIZE_MB = 5;
```

### Customization

You can customize the avatar processing by passing options:

```typescript
const options = {
  onProgress: (progress) => console.log(`${progress}%`),
  quality: 0.9,        // Image compression quality (0-1)
  maxSize: 512,        // Maximum dimension in pixels
};

await AvatarService.uploadAvatar(imageUri, userId, options);
```

## Storage Structure

Avatars are stored in the following structure:

```
avatars/
├── user_id_1/
│   ├── user_id_1_timestamp1.jpg
│   └── user_id_1_timestamp2.jpg
├── user_id_2/
│   └── user_id_2_timestamp1.jpg
└── ...
```

## Security

- **User Isolation**: Each user can only access their own avatar folder
- **File Type Validation**: Only JPEG, PNG, and WebP images are allowed
- **Size Limits**: 5MB maximum file size
- **RLS Policies**: Row Level Security ensures users can only manage their own avatars
- **Public Access**: Avatars are publicly readable for display purposes

## Error Handling

The service provides detailed error messages for common issues:

- File not found
- File too large
- Invalid image format
- Network errors
- Permission errors
- Upload failures

## Performance Considerations

- **Image Compression**: Automatic compression reduces file sizes
- **Retry Logic**: Built-in retry for network failures
- **Progress Tracking**: Real-time feedback for better UX
- **Cleanup**: Old avatars are automatically deleted to save storage

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure RLS policies are set up correctly
2. **File Too Large**: Check file size limits in bucket configuration
3. **Invalid Format**: Verify image format is supported
4. **Network Errors**: Check internet connection and Supabase URL

### Debug Mode

Enable debug logging:

```typescript
// In development
if (__DEV__) {
  console.log('Avatar upload debug info:', {
    userId,
    imageUri,
    fileSize,
    dimensions,
  });
}
```

## Maintenance

### Cleanup Old Avatars

Run the cleanup function periodically:

```sql
SELECT public.cleanup_old_avatars();
```

This removes avatars older than 30 days that are no longer referenced in user profiles.

## Testing

Test the avatar upload functionality:

1. Select an image from the photo library
2. Verify image processing and compression
3. Check upload progress feedback
4. Confirm avatar appears in profile
5. Test error scenarios (large files, invalid formats)
6. Verify old avatar cleanup

## Migration

If migrating from an existing avatar system:

1. Run the setup SQL script
2. Update your ProfileScreen to use AvatarService
3. Migrate existing avatar URLs to new storage structure
4. Test thoroughly before deploying to production
