// Lightweight store testing helpers for unit/integration tests

export type MockStore<T> = {
  getState: () => T;
  setState: (partial: Partial<T>) => void;
  reset: () => void;
};

// Store testing setup (placeholder)
export const setupStoreTests = (): void => {
  // Intentionally minimal; integrate with test runner as needed
};

// Create a mock store with simple get/set
export const createMockStore = <T>(initialState: T): MockStore<T> => {
  let state: T = { ...initialState };
  return {
    getState: () => state,
    setState: (partial: Partial<T>) => {
      state = { ...state, ...partial } as T;
    },
    reset: () => {
      state = { ...initialState };
    },
  };
};

// Async operation testing helper
export const testAsyncStoreOperation = async (operation: () => Promise<void>): Promise<void> => {
  await operation();
};

// State assertion helper (no-op placeholder that can be replaced with a real expect in tests)
export const expectStoreState = <T>(store: { getState: () => T }, expectedState: Partial<T>): void => {
  const current = store.getState();
  for (const key of Object.keys(expectedState) as (keyof T)[]) {
    if ((current as any)[key] !== (expectedState as any)[key]) {
      // eslint-disable-next-line no-throw-literal
      throw `State mismatch for key ${String(key)}`;
    }
  }
};

// Basic benchmark helper
export interface PerformanceResult {
  duration: number;
}

export const benchmarkStoreOperation = (operation: () => void): PerformanceResult => {
  const start = Date.now();
  operation();
  return { duration: Date.now() - start };
};
