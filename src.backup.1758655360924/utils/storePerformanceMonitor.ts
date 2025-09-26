// Lightweight store performance monitoring utilities

export interface OperationMetric {
  store: string;
  operation: string;
  duration: number; // ms
  timestamp: number;
}

export interface MemoryMetric {
  store: string;
  usage: number; // arbitrary units provided by caller
  timestamp: number;
}

export interface PerformanceReport {
  operations: OperationMetric[];
  memory: MemoryMetric[];
}

export interface OptimizationSuggestion {
  store: string;
  suggestion: string;
  reason?: string;
}

const ops: OperationMetric[] = [];
const mem: MemoryMetric[] = [];
let monitoringSetup = false;

export const setupPerformanceMonitoring = (): void => {
  monitoringSetup = true;
};

export const trackStoreOperation = (storeName: string, operation: string, duration: number): void => {
  if (!monitoringSetup) return;
  ops.push({ store: storeName, operation, duration, timestamp: Date.now() });
  if (__DEV__ && duration > 200) {
    // surface slow ops in dev
    console.warn(`[perf] ${storeName}.${operation} took ${duration.toFixed(1)}ms`);
  }
};

export const trackMemoryUsage = (storeName: string, usage: number): void => {
  if (!monitoringSetup) return;
  mem.push({ store: storeName, usage, timestamp: Date.now() });
};

export const generatePerformanceReport = (): PerformanceReport => ({
  operations: [...ops],
  memory: [...mem],
});

export const getOptimizationSuggestions = (): OptimizationSuggestion[] => {
  const suggestions: OptimizationSuggestion[] = [];
  const byStore: Record<string, OperationMetric[]> = {};
  ops.forEach((m) => {
    byStore[m.store] = byStore[m.store] || [];
    byStore[m.store].push(m);
  });

  Object.entries(byStore).forEach(([store, metrics]) => {
    const slow = metrics.filter((m) => m.duration > 250);
    if (slow.length >= 3) {
      suggestions.push({
        store,
        suggestion: "Consider memoization, batching updates, or pagination.",
        reason: `${slow.length} slow operations detected (>250ms)`,
      });
    }
  });

  return suggestions;
};
