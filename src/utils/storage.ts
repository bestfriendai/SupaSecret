import * as FileSystem from "expo-file-system/legacy";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../lib/supabase";

const BUCKET = "confessions";

export interface UploadResult {
  path: string;
  signedUrl: string;
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
  onProgress?: (progressPercent: number) => void,
): Promise<UploadResult> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_VIBECODE_SUPABASE_URL;
  if (!supabaseUrl) throw new Error("Missing Supabase URL");

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const accessToken = sessionData?.session?.access_token;
  if (!accessToken) throw new Error("Not authenticated");

  const filename = `${uuidv4()}.mp4`;
  const objectPath = `confessions/${userId}/${filename}`;
  // Encode path components separately to preserve slashes for nested paths
  const encodedPath = objectPath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  const url = `${supabaseUrl}/storage/v1/object/${BUCKET}/${encodedPath}`;

  const uploadOptions: FileSystem.FileSystemUploadOptions = {
    httpMethod: "POST",
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "video/mp4",
      "x-upsert": "false",
      "cache-control": "public, max-age=31536000, immutable",
    },
  };

  let result: FileSystem.FileSystemUploadResult | null | undefined;
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
    throw new Error("Upload failed: no result");
  }

  if (result.status !== 200 && result.status !== 201) {
    throw new Error(`Upload failed: HTTP ${result.status} ${result.body ?? ""}`);
  }

  const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(objectPath, 60 * 60);

  return {
    path: objectPath,
    signedUrl: signed?.signedUrl || "",
  };
}

/**
 * Resolve a play‑ready URL from a storage path or passthrough if already an http(s) URL.
 */
export async function ensureSignedVideoUrl(pathOrUrl?: string, expiresInSeconds = 3600): Promise<string> {
  if (!pathOrUrl) return "";
  if (isHttpUrl(pathOrUrl)) return pathOrUrl;

  try {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(pathOrUrl, expiresInSeconds);

    if (error) {
      if (__DEV__) {
        console.error("Failed to create signed URL:", error);
      }
      // Return empty string as fallback - calling code should handle this gracefully
      return "";
    }

    return data?.signedUrl || "";
  } catch (error) {
    if (__DEV__) {
      console.error("Error creating signed URL:", error);
    }
    // Return empty string as fallback
    return "";
  }
}
