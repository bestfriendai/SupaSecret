import * as FileSystem from "expo-file-system/legacy";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../lib/supabase";

const BUCKET = "confessions";

/**
 * Represents the result of a successful video upload to Supabase Storage
 */
export interface UploadResult {
  /** The storage path of the uploaded file */
  path: string;
  /** A short-lived signed URL for accessing the uploaded file */
  signedUrl: string;
  /** The filename generated for the upload */
  filename: string;
  /** The user ID who owns the file */
  userId: string;
}

/**
 * Configuration options for video upload
 */
export interface UploadOptions {
  /** Optional callback to track upload progress (0-100) */
  onProgress?: (progressPercent: number) => void;
  /** Optional content type override */
  contentType?: string;
  /** Whether to allow upserting existing files */
  allowUpsert?: boolean;
  /** Custom expiration time for signed URL in seconds (default: 3600) */
  signedUrlExpiresIn?: number;
}

/**
 * Represents an error that can occur during upload operations
 */
export interface UploadError {
  /** The error message */
  message: string;
  /** HTTP status code if applicable */
  status?: number;
  /** The original error object */
  originalError?: unknown;
}

/**
 * Represents the result of a signed URL creation
 */
export interface SignedUrlResult {
  /** The signed URL for accessing the file */
  signedUrl: string;
  /** The path in storage */
  path: string;
  /** The expiration timestamp */
  expiresAt: Date;
}

// String type compatibility for legacy code
export type SignedUrlString = string;

/**
 * Legacy function that returns just the signed URL string
 * @deprecated Use ensureSignedVideoUrl which returns detailed SignedUrlResult
 */
export async function getSignedVideoUrl(pathOrUrl?: string, expiresInSeconds = 3600): Promise<SignedUrlString> {
  const result = await ensureSignedVideoUrl(pathOrUrl, expiresInSeconds);
  return result.signedUrl;
}

export const isHttpUrl = (value?: string): boolean => !!value && /^https?:\/\//i.test(value);
export const isLocalUri = (value?: string): boolean => !!value && /^file:\/\//i.test(value);

/**
 * Upload a local video file to Supabase Storage using the REST endpoint.
 * Returns storage path and a short‑lived signed URL.
 */
export async function uploadVideoToSupabase(
  localFileUri: string,
  userId: string,
  options?: UploadOptions,
): Promise<UploadResult> {
  try {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_VIBECODE_SUPABASE_URL;
    if (!supabaseUrl) {
      console.error("❌ Missing Supabase URL in environment variables");
      throw new Error("Missing Supabase URL");
    }

    if (__DEV__) {
      console.log(`📤 Starting video upload for user ${userId}`);
      console.log(`📁 Local file URI: ${localFileUri}`);
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error("❌ Session error:", sessionError);
      throw sessionError;
    }
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) {
      console.error("❌ No access token available");
      throw new Error("Not authenticated");
    }

    const { onProgress, contentType = "video/mp4", allowUpsert = false, signedUrlExpiresIn = 3600 } = options || {};

    const filename = `${uuidv4()}.mp4`;
    const objectPath = `confessions/${userId}/${filename}`;
    // Encode path components separately to preserve slashes for nested paths
    const encodedPath = objectPath
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/");
    const url = `${supabaseUrl}/storage/v1/object/${BUCKET}/${encodedPath}`;

    if (__DEV__) {
      console.log(`📤 Upload URL: ${url}`);
      console.log(`📁 Storage path: ${objectPath}`);
    }

    const uploadOptions: any = {
      httpMethod: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": contentType,
        "x-upsert": allowUpsert.toString(),
        "cache-control": "public, max-age=31536000, immutable",
      },
    };

    let result: any;
    if (onProgress) {
      const task = FileSystem.createUploadTask(url, localFileUri, uploadOptions, (progress) => {
        if (progress.totalBytesExpectedToSend) {
          const pct = (progress.totalBytesSent / progress.totalBytesExpectedToSend) * 100;
          onProgress(Math.max(0, Math.min(100, pct)));
        }
      });
      result = await task.uploadAsync();
    } else {
      result = await FileSystem.uploadAsync(url, localFileUri, uploadOptions);
    }

    if (!result) {
      console.error("❌ Upload failed: no result returned");
      throw new Error("Upload failed: no result");
    }

    if (__DEV__) {
      console.log(`📤 Upload response status: ${result.status}`);
    }

    if (result.status !== 200 && result.status !== 201) {
      console.error(`❌ Upload failed with status ${result.status}:`, result.body);
      throw new Error(`Upload failed: HTTP ${result.status} ${result.body ?? ""}`);
    }

    if (__DEV__) {
      console.log(`✅ Video uploaded successfully to: ${objectPath}`);
      console.log(`🔗 Creating signed URL...`);
    }

    const { data: signed, error: signedError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(objectPath, signedUrlExpiresIn);

    if (signedError) {
      console.error("❌ Failed to create signed URL:", signedError);
      // Don't throw here, we can still return the path
    }

    if (__DEV__) {
      console.log(`✅ Upload complete! Path: ${objectPath}`);
    }

    return {
      path: objectPath,
      signedUrl: signed?.signedUrl || "",
      filename,
      userId,
    };
  } catch (error) {
    console.error("❌ Video upload error:", error);
    throw error;
  }
}

/**
 * Resolve a play‑ready URL from a storage path or passthrough if already an http(s) URL.
 * Returns a detailed result with expiration information.
 */
export async function ensureSignedVideoUrl(pathOrUrl?: string, expiresInSeconds = 3600): Promise<SignedUrlResult> {
  if (!pathOrUrl) {
    return { signedUrl: "", path: "", expiresAt: new Date() };
  }
  if (isHttpUrl(pathOrUrl)) {
    return {
      signedUrl: pathOrUrl,
      path: pathOrUrl,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
    };
  }

  try {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(pathOrUrl, expiresInSeconds);

    if (error) {
      if (__DEV__) {
        // Only log as warning for "Object not found" errors since these are expected for orphaned DB entries
        if (error.message?.includes("Object not found")) {
          console.warn(`⚠️ Video file not found in storage: ${pathOrUrl}`);
        } else {
          console.error("Failed to create signed URL:", error);
        }
      }
      // Return empty string as fallback - calling code should handle this gracefully
      return { signedUrl: "", path: pathOrUrl, expiresAt: new Date() };
    }

    return {
      signedUrl: data?.signedUrl || "",
      path: pathOrUrl,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
    };
  } catch (error) {
    if (__DEV__) {
      // More specific error logging
      if (error instanceof Error && error.message?.includes("Object not found")) {
        console.warn(`⚠️ Video file not found in storage: ${pathOrUrl}`);
      } else {
        console.error("Error creating signed URL:", error);
      }
    }
    // Return empty string as fallback
    return { signedUrl: "", path: pathOrUrl, expiresAt: new Date() };
  }
}
