import { testReportsTable } from "./runReportsMigration";

/**
 * Non-destructive, client-safe check of the reports system.
 * We do NOT run migrations from the client for security reasons.
 * Returns true if the reports table is accessible; otherwise false.
 */
export async function testReportSystem(): Promise<boolean> {
  try {
    const ok = await testReportsTable();
    return !!ok;
  } catch (e) {
    if (__DEV__) {
      console.warn("[testReportSystem] check failed:", e);
    }
    return false;
  }
}

