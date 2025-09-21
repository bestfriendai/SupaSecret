import {
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  withRepeat,
  Easing,
  cancelAnimation,
  runOnJS,
  SharedValue,
  AnimatedStyle,
  WithTimingConfig,
  WithSpringConfig,
} from "react-native-reanimated";
import { AccessibilityInfo } from "react-native";
import * as Haptics from "expo-haptics";

export type TransitionPreset =
  | "fade"
  | "slide"
  | "scale"
  | "fadeSlide"
  | "bounce"
  | "smooth"
  | "error"
  | "success"
  | "loading";

export type TransitionScenario =
  | "initialLoad"
  | "refresh"
  | "loadMore"
  | "errorRecovery"
  | "contentReady"
  | "networkReconnect";

interface TransitionConfig {
  duration?: number;
  delay?: number;
  easing?: typeof Easing.linear;
  springConfig?: WithSpringConfig;
  reducedMotion?: boolean;
}

interface StaggerConfig {
  itemCount: number;
  baseDelay?: number;
  staggerDelay?: number;
  reverse?: boolean;
}

interface AnimationPerformance {
  startTime: number;
  endTime?: number;
  frameCount: number;
  averageFPS?: number;
}

export class LoadingTransitions {
  private static performanceMetrics: Map<string, AnimationPerformance> = new Map();
  private static activeAnimations: Set<string> = new Set();
  private static reducedMotionEnabled: boolean = false;

  static {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      this.reducedMotionEnabled = enabled || false;
    });

    AccessibilityInfo.addEventListener("reduceMotionChanged", (enabled) => {
      this.reducedMotionEnabled = enabled;
    });
  }

  static getPresetConfig(preset: TransitionPreset): Required<TransitionConfig> {
    const configs: Record<TransitionPreset, Required<TransitionConfig>> = {
      fade: {
        duration: 300,
        delay: 0,
        easing: Easing.out(Easing.quad),
        springConfig: { damping: 15, stiffness: 100 },
        reducedMotion: false,
      },
      slide: {
        duration: 400,
        delay: 0,
        easing: Easing.out(Easing.cubic),
        springConfig: { damping: 20, stiffness: 90 },
        reducedMotion: false,
      },
      scale: {
        duration: 350,
        delay: 0,
        easing: Easing.out(Easing.back(1.2)),
        springConfig: { damping: 12, stiffness: 180 },
        reducedMotion: false,
      },
      fadeSlide: {
        duration: 450,
        delay: 0,
        easing: Easing.out(Easing.cubic),
        springConfig: { damping: 18, stiffness: 100 },
        reducedMotion: false,
      },
      bounce: {
        duration: 500,
        delay: 0,
        easing: Easing.bounce,
        springConfig: { damping: 8, stiffness: 200, overshootClamping: false },
        reducedMotion: false,
      },
      smooth: {
        duration: 600,
        delay: 0,
        easing: Easing.inOut(Easing.ease),
        springConfig: { damping: 25, stiffness: 80 },
        reducedMotion: false,
      },
      error: {
        duration: 300,
        delay: 0,
        easing: Easing.out(Easing.exp),
        springConfig: { damping: 10, stiffness: 150 },
        reducedMotion: false,
      },
      success: {
        duration: 400,
        delay: 0,
        easing: Easing.out(Easing.elastic(1.2)),
        springConfig: { damping: 15, stiffness: 120 },
        reducedMotion: false,
      },
      loading: {
        duration: 1000,
        delay: 0,
        easing: Easing.linear,
        springConfig: { damping: 20, stiffness: 100 },
        reducedMotion: false,
      },
    };

    const config = configs[preset];

    if (this.reducedMotionEnabled) {
      config.duration = Math.min(config.duration, 200);
      config.easing = Easing.linear;
    }

    return config;
  }

  static getScenarioConfig(scenario: TransitionScenario): TransitionConfig {
    const configs: Record<TransitionScenario, TransitionConfig> = {
      initialLoad: {
        duration: 500,
        delay: 100,
        easing: Easing.out(Easing.cubic),
      },
      refresh: {
        duration: 400,
        delay: 0,
        easing: Easing.out(Easing.quad),
      },
      loadMore: {
        duration: 300,
        delay: 50,
        easing: Easing.out(Easing.ease),
      },
      errorRecovery: {
        duration: 350,
        delay: 200,
        easing: Easing.out(Easing.exp),
      },
      contentReady: {
        duration: 450,
        delay: 0,
        easing: Easing.out(Easing.cubic),
      },
      networkReconnect: {
        duration: 600,
        delay: 100,
        easing: Easing.inOut(Easing.ease),
      },
    };

    return configs[scenario];
  }

  static fadeIn(value: SharedValue<number>, config?: TransitionConfig, onComplete?: () => void): void {
    const { duration, delay, easing } = {
      ...this.getPresetConfig("fade"),
      ...config,
    };

    const animationId = `fade-${Date.now()}`;
    this.startPerformanceTracking(animationId);

    value.value = withDelay(
      delay,
      withTiming(1, { duration, easing }, (finished) => {
        if (finished) {
          this.endPerformanceTracking(animationId);
          if (onComplete) runOnJS(onComplete)();
        }
      }),
    );
  }

  static fadeOut(value: SharedValue<number>, config?: TransitionConfig, onComplete?: () => void): void {
    const { duration, delay, easing } = {
      ...this.getPresetConfig("fade"),
      ...config,
    };

    value.value = withDelay(
      delay,
      withTiming(0, { duration, easing }, (finished) => {
        if (finished && onComplete) runOnJS(onComplete)();
      }),
    );
  }

  static slideIn(
    value: SharedValue<number>,
    from: number = 100,
    config?: TransitionConfig,
    onComplete?: () => void,
  ): void {
    const { duration, delay, easing } = {
      ...this.getPresetConfig("slide"),
      ...config,
    };

    value.value = from;
    value.value = withDelay(
      delay,
      withTiming(0, { duration, easing }, (finished) => {
        if (finished && onComplete) runOnJS(onComplete)();
      }),
    );
  }

  static scaleIn(value: SharedValue<number>, config?: TransitionConfig, onComplete?: () => void): void {
    const { duration, delay, springConfig } = {
      ...this.getPresetConfig("scale"),
      ...config,
    };

    value.value = 0.8;
    value.value = withDelay(
      delay,
      withSpring(1, springConfig, (finished) => {
        if (finished && onComplete) runOnJS(onComplete)();
      }),
    );
  }

  static createStaggeredAnimation(
    values: SharedValue<number>[],
    targetValue: number,
    config: StaggerConfig & TransitionConfig,
  ): void {
    const {
      itemCount,
      baseDelay = 0,
      staggerDelay = 50,
      reverse = false,
      duration = 400,
      easing = Easing.out(Easing.cubic),
    } = config;

    const items = reverse ? values.slice().reverse() : values;

    items.forEach((value, index) => {
      const delay = baseDelay + index * staggerDelay;
      value.value = withDelay(delay, withTiming(targetValue, { duration, easing }));
    });
  }

  static createSequentialAnimation(value: SharedValue<number>, sequence: number[], config?: TransitionConfig): void {
    const { duration = 300, easing = Easing.linear } = config || {};

    const animations = sequence.map((target) => withTiming(target, { duration: duration / sequence.length, easing }));

    value.value = withSequence(...animations);
  }

  static createLoadingPulse(value: SharedValue<number>, config?: TransitionConfig): () => void {
    const { duration = 1000 } = config || {};

    value.value = withRepeat(
      withSequence(withTiming(0.6, { duration: duration / 2 }), withTiming(0.3, { duration: duration / 2 })),
      -1,
      false,
    );

    return () => cancelAnimation(value);
  }

  static createShimmerEffect(
    translateX: SharedValue<number>,
    screenWidth: number,
    config?: TransitionConfig,
  ): () => void {
    const { duration = 1500 } = config || {};

    translateX.value = withRepeat(
      withTiming(screenWidth * 2, {
        duration,
        easing: Easing.linear,
      }),
      -1,
      false,
    );

    return () => cancelAnimation(translateX);
  }

  static createErrorShake(value: SharedValue<number>, config?: TransitionConfig, onComplete?: () => void): void {
    const amplitude = 10;

    value.value = withSequence(
      withTiming(-amplitude, { duration: 50 }),
      withTiming(amplitude, { duration: 100 }),
      withTiming(-amplitude, { duration: 100 }),
      withTiming(amplitude, { duration: 100 }),
      withTiming(0, { duration: 50 }, (finished) => {
        if (finished && onComplete) {
          runOnJS(onComplete)();
          runOnJS(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium))();
        }
      }),
    );
  }

  static createSuccessBounce(value: SharedValue<number>, config?: TransitionConfig, onComplete?: () => void): void {
    const { springConfig } = {
      ...this.getPresetConfig("success"),
      ...config,
    };

    value.value = 0.8;
    value.value = withSpring(1, springConfig, (finished) => {
      if (finished && onComplete) {
        runOnJS(onComplete)();
        runOnJS(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light))();
      }
    });
  }

  static cleanupAnimation(value: SharedValue<any>): void {
    cancelAnimation(value);
  }

  static cleanupAllAnimations(): void {
    this.activeAnimations.clear();
    this.performanceMetrics.clear();
  }

  private static startPerformanceTracking(id: string): void {
    if (__DEV__) {
      this.activeAnimations.add(id);
      this.performanceMetrics.set(id, {
        startTime: Date.now(),
        frameCount: 0,
      });
    }
  }

  private static endPerformanceTracking(id: string): void {
    if (__DEV__) {
      this.activeAnimations.delete(id);
      const metrics = this.performanceMetrics.get(id);
      if (metrics) {
        metrics.endTime = Date.now();
        const duration = metrics.endTime - metrics.startTime;
        metrics.averageFPS = (metrics.frameCount / duration) * 1000;

        if (metrics.averageFPS < 50) {
          console.warn(`[LoadingTransitions] Low FPS detected: ${metrics.averageFPS.toFixed(2)} for animation ${id}`);
        }
      }
    }
  }

  static getPerformanceMetrics(): Map<string, AnimationPerformance> {
    return new Map(this.performanceMetrics);
  }

  static createOptimizedWorklet(animationFn: () => void): void {
    "worklet";
    animationFn();
  }

  static shouldUseReducedMotion(): boolean {
    return this.reducedMotionEnabled;
  }

  static async triggerHapticForTransition(type: TransitionPreset): Promise<void> {
    const hapticMap: Partial<Record<TransitionPreset, Haptics.ImpactFeedbackStyle>> = {
      error: Haptics.ImpactFeedbackStyle.Medium,
      success: Haptics.ImpactFeedbackStyle.Light,
      bounce: Haptics.ImpactFeedbackStyle.Light,
    };

    const hapticStyle = hapticMap[type];
    if (hapticStyle) {
      await Haptics.impactAsync(hapticStyle);
    }
  }
}

export function withSmartEasing(value: number, config: WithTimingConfig & { smart?: boolean }): number {
  "worklet";

  if (config.smart && LoadingTransitions.shouldUseReducedMotion()) {
    return withTiming(value, {
      ...config,
      duration: Math.min(config.duration || 300, 200),
      easing: Easing.linear,
    });
  }

  return withTiming(value, config);
}

export function createAnimatedStyleForTransition(
  preset: TransitionPreset,
  value: SharedValue<number>,
): AnimatedStyle<any> {
  "worklet";

  const styles: Record<TransitionPreset, AnimatedStyle<any>> = {
    fade: { opacity: value.value },
    slide: { transform: [{ translateY: value.value }] },
    scale: { transform: [{ scale: value.value }] },
    fadeSlide: {
      opacity: value.value,
      transform: [{ translateY: (1 - value.value) * 20 }],
    },
    bounce: {
      transform: [{ scale: value.value }],
    },
    smooth: {
      opacity: value.value,
    },
    error: {
      transform: [{ translateX: value.value }],
    },
    success: {
      transform: [{ scale: value.value }],
    },
    loading: {
      opacity: value.value,
    },
  };

  return styles[preset] || styles.fade;
}
