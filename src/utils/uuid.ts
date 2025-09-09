/**
 * UUID validation and utility functions
 * Helps handle the mix of sample data (string IDs) and real database data (UUIDs)
 */
import { v4 as uuidv4 } from "uuid";

// UUID v4 regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Check if a string is a valid UUID format
 */
export const isValidUUID = (id: string): boolean => {
  return UUID_REGEX.test(id);
};

/**
 * Check if an ID is sample data (starts with "sample-")
 */
export const isSampleData = (id: string): boolean => {
  return id.startsWith("sample-");
};

/**
 * Check if an ID should be used for database operations
 * Returns true for valid UUIDs, false for sample data
 */
export const isValidForDatabase = (id: string): boolean => {
  return isValidUUID(id) && !isSampleData(id);
};

/**
 * Generate a new UUID v4 using cryptographically secure random values
 */
export const generateUUID = (): string => {
  return uuidv4();
};

/**
 * Filter an array of IDs to only include valid database IDs
 */
export const filterValidDatabaseIds = (ids: string[]): string[] => {
  return ids.filter(isValidForDatabase);
};

/**
 * Separate sample data from real database IDs
 */
export const separateIds = (ids: string[]): { sampleIds: string[]; databaseIds: string[] } => {
  const sampleIds: string[] = [];
  const databaseIds: string[] = [];

  ids.forEach((id) => {
    if (isSampleData(id)) {
      sampleIds.push(id);
    } else if (isValidUUID(id)) {
      databaseIds.push(id);
    }
  });

  return { sampleIds, databaseIds };
};

/**
 * Log information about ID types (for debugging)
 */
export const debugIds = (ids: string[], context: string = "") => {
  if (!__DEV__) return;

  const { sampleIds, databaseIds } = separateIds(ids);
  const invalidIds = ids.filter((id) => !isValidUUID(id) && !isSampleData(id));

  console.log(`🔍 ID Debug ${context}:`, {
    total: ids.length,
    sample: sampleIds.length,
    database: databaseIds.length,
    invalid: invalidIds.length,
    sampleIds: sampleIds.slice(0, 3), // Show first 3
    databaseIds: databaseIds.slice(0, 3), // Show first 3
    invalidIds,
  });
};
