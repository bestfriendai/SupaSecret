/**
 * TypeScript types for performance monitoring and optimization
 */

// ============================================
// Performance Metrics
// ============================================

export interface PerformanceMetrics {
  timestamp: number;
  duration: number;
  operation: string;
  category: PerformanceCategory;
  metadata?: Record<string, any>;
}

export type PerformanceCategory =
  | "render"
  | "api"
  | "cache"
  | "video"
  | "navigation"
  | "storage"
  | "computation"
  | "network";

// ============================================
// Render Performance
// ============================================

export interface RenderStats {
  componentName: string;
  renderCount: number;
  averageRenderTime: number;
  lastRenderTime: number;
  totalRenderTime: number;
  slowRenders: number; // Renders over threshold
  rerenderReasons?: string[];
}

export interface ComponentPerformance {
  mounted: number;
  unmounted: number;
  updated: number;
  renderTime: number[];
  memoryUsage?: number;
}

// ============================================
// Cache Performance
// ============================================

export interface CachePerformance {
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
  size: number;
  maxSize: number;
  memoryUsage: number;
  compressions: number;
  avgAccessTime: number;
  lastCleanup: number;
  entries: number;
  storageEfficiency: number;
}

export interface CacheStats {
  type: "memory" | "disk" | "hybrid";
  performance: CachePerformance;
  partitions?: Map<string, CachePerformance>;
}

// ============================================
// Video Playback Metrics
// ============================================

export interface VideoPlaybackMetrics {
  videoId: string;
  loadTime: number;
  bufferTime: number;
  playTime: number;
  pauseCount: number;
  seekCount: number;
  bufferEvents: number;
  quality: string;
  bitrate?: number;
  droppedFrames?: number;
  decodedFrames?: number;
  errorCount: number;
  lastError?: string;
}

export interface VideoSessionMetrics {
  sessionId: string;
  startTime: number;
  endTime?: number;
  videosPlayed: number;
  totalPlayTime: number;
  totalBufferTime: number;
  averageLoadTime: number;
  qualityChanges: number;
  errors: number;
}

// ============================================
// Memory Management
// ============================================

export interface MemoryMetrics {
  used: number;
  available: number;
  total: number;
  pressure: MemoryPressure;
  largestAllocation?: number;
  allocations?: number;
  deallocations?: number;
}

export enum MemoryPressure {
  NORMAL = "normal",
  MODERATE = "moderate",
  CRITICAL = "critical",
}

// ============================================
// Network Performance
// ============================================

export interface NetworkMetrics {
  latency: number;
  bandwidth: number;
  requestCount: number;
  failedRequests: number;
  averageResponseTime: number;
  totalDataTransferred: number;
  connectionType?: "wifi" | "cellular" | "none";
  effectiveType?: "2g" | "3g" | "4g" | "5g";
}

export interface APIPerformance {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  size: number;
  cached: boolean;
  retries: number;
  timestamp: number;
}

// ============================================
// Scroll Performance
// ============================================

export interface ScrollPerformance {
  componentName: string;
  scrollEvents: number;
  averageVelocity: number;
  maxVelocity: number;
  jankFrames: number;
  smoothness: number; // 0-1 score
  overshoots: number;
}

// ============================================
// Performance Thresholds
// ============================================

export interface PerformanceThresholds {
  renderTime: number; // ms
  apiResponseTime: number; // ms
  cacheAccessTime: number; // ms
  videoLoadTime: number; // ms
  memoryUsage: number; // MB
  frameRate: number; // fps
  scrollVelocity: number; // pixels/ms
}

export const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  renderTime: 16, // 60fps
  apiResponseTime: 1000,
  cacheAccessTime: 10,
  videoLoadTime: 3000,
  memoryUsage: 100,
  frameRate: 60,
  scrollVelocity: 2,
};

// ============================================
// Performance Monitoring
// ============================================

export interface PerformanceMonitor {
  start(operation: string, category: PerformanceCategory): void;
  end(operation: string, metadata?: Record<string, any>): void;
  measure(operation: string, category: PerformanceCategory, fn: () => void): void;
  measureAsync<T>(operation: string, category: PerformanceCategory, fn: () => Promise<T>): Promise<T>;
  getMetrics(): PerformanceMetrics[];
  getStats(): PerformanceStats;
  reset(): void;
}

export interface PerformanceStats {
  totalOperations: number;
  averageDuration: number;
  slowOperations: number;
  byCategory: Record<PerformanceCategory, CategoryStats>;
  memoryMetrics?: MemoryMetrics;
  networkMetrics?: NetworkMetrics;
}

export interface CategoryStats {
  count: number;
  totalDuration: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
}

// ============================================
// Performance Optimization
// ============================================

export interface OptimizationStrategy {
  name: string;
  category: PerformanceCategory;
  condition: (metrics: PerformanceMetrics) => boolean;
  action: () => void | Promise<void>;
  priority: number;
}

export interface OptimizationResult {
  strategy: string;
  success: boolean;
  improvement?: number;
  error?: string;
  timestamp: number;
}

// ============================================
// Performance Budgets
// ============================================

export interface PerformanceBudget {
  category: PerformanceCategory;
  metric: string;
  budget: number;
  unit: "ms" | "MB" | "count" | "percent";
  severity: "warning" | "error";
}

export interface BudgetViolation {
  budget: PerformanceBudget;
  actual: number;
  timestamp: number;
  context?: string;
}

// ============================================
// Type Guards
// ============================================

export function isPerformanceMetrics(value: unknown): value is PerformanceMetrics {
  if (!value || typeof value !== "object") return false;
  const v = value as any;
  return typeof v.timestamp === "number" && typeof v.duration === "number" && typeof v.operation === "string";
}

export function isMemoryPressure(value: unknown): value is MemoryPressure {
  return typeof value === "string" && Object.values(MemoryPressure).includes(value as MemoryPressure);
}

// ============================================
// Utility Types
// ============================================

export type PerformanceCallback = (metrics: PerformanceMetrics) => void;
export type PerformanceFilter = (metrics: PerformanceMetrics) => boolean;
export type PerformanceAggregator = (metrics: PerformanceMetrics[]) => number;
