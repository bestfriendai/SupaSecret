import { useEffect } from "react";
import { Alert } from "react-native";
import { useConfessionStore } from "../state/confessionStore";

/**
 * Hook to monitor data integrity and detect duplicate keys/IDs
 * Helps prevent FlatList key uniqueness issues
 */
export const useDataIntegrityMonitor = () => {
  const confessions = useConfessionStore((state) => state.confessions);

  useEffect(() => {
    if (confessions.length === 0) return;

    // Check for duplicate IDs
    const ids = confessions.map((c) => c.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);

    if (duplicates.length > 0) {
      const uniqueDuplicates = [...new Set(duplicates)];

      if (__DEV__) {
        console.error("Data Integrity Issue: Duplicate confession IDs found:", uniqueDuplicates);
        console.table(
          confessions
            .filter((c) => uniqueDuplicates.includes(c.id))
            .map((c) => ({ id: c.id, type: c.type, timestamp: c.timestamp })),
        );
      } else {
        // In production, show user-friendly alert
        Alert.alert(
          "Data Issue Detected",
          `Duplicate content detected. The app may not display correctly. Please restart the app.`,
          [
            { text: "OK", style: "default" },
            {
              text: "Report Issue",
              style: "destructive",
              onPress: () => {
                // Could integrate with crash reporting service here
                console.error("User reported data integrity issue:", uniqueDuplicates);
              },
            },
          ],
        );
      }
    }

    // Check for missing IDs
    const missingIds = confessions.filter((c) => !c.id || c.id === "");
    if (missingIds.length > 0) {
      if (__DEV__) {
        console.error("Data Integrity Issue: Confessions missing IDs:", missingIds.length);
        console.table(
          missingIds.map((c, index) => ({
            index,
            type: c.type,
            hasContent: !!c.content,
            timestamp: c.timestamp,
          })),
        );
      }
    }

    // Check for video confessions without proper type
    const videoConfessions = confessions.filter((c) => c.type === "video");
    const invalidVideos = videoConfessions.filter((c) => !c.videoUri && !c.content);

    if (invalidVideos.length > 0 && __DEV__) {
      console.warn("Data Integrity Warning: Video confessions without videoUri or content:", invalidVideos.length);
    }

    // Log summary in dev mode
    if (__DEV__) {
      console.log("Data Integrity Check:", {
        totalConfessions: confessions.length,
        videoConfessions: videoConfessions.length,
        duplicateIds: duplicates.length,
        missingIds: missingIds.length,
        invalidVideos: invalidVideos.length,
      });
    }
  }, [confessions]);

  return {
    totalConfessions: confessions.length,
    videoConfessions: confessions.filter((c) => c.type === "video").length,
  };
};

/**
 * Utility function to validate a single confession object
 */
export const validateConfession = (confession: any, index?: number): boolean => {
  if (!confession) {
    if (__DEV__) console.warn(`Invalid confession at index ${index}: null/undefined`);
    return false;
  }

  if (!confession.id) {
    if (__DEV__) console.warn(`Invalid confession at index ${index}: missing ID`, confession);
    return false;
  }

  if (!confession.type || !["text", "video"].includes(confession.type)) {
    if (__DEV__) console.warn(`Invalid confession at index ${index}: invalid type`, confession.type);
    return false;
  }

  if (confession.type === "video" && !confession.videoUri && !confession.content) {
    if (__DEV__) console.warn(`Invalid video confession at index ${index}: missing videoUri and content`);
    return false;
  }

  return true;
};

/**
 * Utility function to clean and deduplicate confession array
 */
export const cleanConfessions = (confessions: any[]): any[] => {
  // Filter out invalid confessions
  const validConfessions = confessions.filter((c, index) => validateConfession(c, index));

  // Deduplicate by ID
  const uniqueConfessions = Array.from(new Map(validConfessions.map((item) => [item.id, item])).values());

  if (__DEV__ && confessions.length !== uniqueConfessions.length) {
    console.log(`Cleaned confessions: ${confessions.length} → ${uniqueConfessions.length}`);
  }

  return uniqueConfessions;
};
