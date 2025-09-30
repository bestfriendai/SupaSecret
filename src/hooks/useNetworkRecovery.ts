import { useEffect, useState, useCallback } from "react";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { useToast } from "../contexts/ToastContext";
import { errorReporting } from "../services/ErrorReportingService";

interface NetworkRecoveryOptions {
  autoRetry?: boolean;
  retryDelay?: number;
  maxRetries?: number;
  onReconnect?: () => void;
  onDisconnect?: () => void;
}

export function useNetworkRecovery(options: NetworkRecoveryOptions = {}) {
  const { autoRetry = true, retryDelay = 3000, maxRetries = 3, onReconnect, onDisconnect } = options;

  const [isConnected, setIsConnected] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [networkState, setNetworkState] = useState<NetInfoState | null>(null);

  const { showToast } = useToast();

  // Helper functions for different toast types
  const showInfo = useCallback((message: string) => {
    showToast({ type: 'info', message });
  }, [showToast]);

  const showError = useCallback((message: string) => {
    showToast({ type: 'error', message });
  }, [showToast]);

  const showSuccess = useCallback((message: string) => {
    showToast({ type: 'success', message });
  }, [showToast]);

  // Check network connectivity
  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    try {
      const state = await NetInfo.fetch();
      const connected = !!(state.isConnected && state.isInternetReachable);
      setNetworkState(state);
      return connected;
    } catch (error) {
      errorReporting.reportError(error, {
        action: "network_check",
        severity: "medium",
        tags: ["network", "connectivity"],
      });
      return false;
    }
  }, []);

  // Handle reconnection
  const handleReconnect = useCallback(() => {
    setIsConnected(true);
    setIsRetrying(false);
    setRetryCount(0);

    showSuccess("Connection restored");

    onReconnect?.();
  }, [showSuccess, onReconnect]);

  // Handle disconnection
  const handleDisconnect = useCallback(() => {
    setIsConnected(false);
    showError("Connection lost. Working offline.");

    onDisconnect?.();
  }, [showError, onDisconnect]);

  // Retry connection
  const retryConnection = useCallback(async (): Promise<boolean> => {
    if (!autoRetry || retryCount >= maxRetries) return false;

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    showInfo(`Retrying connection (${retryCount + 1}/${maxRetries})...`);

    await new Promise(resolve => setTimeout(resolve, retryDelay));

    const connected = await checkConnectivity();

    if (connected) {
      handleReconnect();
      return true;
    } else if (retryCount < maxRetries - 1) {
      // Schedule next retry
      setTimeout(() => retryConnection(), retryDelay);
    } else {
      setIsRetrying(false);
      showError("Unable to restore connection. Please check your network settings.");
    }

    return false;
  }, [autoRetry, retryCount, maxRetries, retryDelay, checkConnectivity, handleReconnect, showInfo, showError]);

  // Manual retry function
  const manualRetry = useCallback(async () => {
    setRetryCount(0);
    const connected = await checkConnectivity();
    if (connected) {
      handleReconnect();
    } else {
      await retryConnection();
    }
  }, [checkConnectivity, handleReconnect, retryConnection]);

  // Initialize network monitoring
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initializeNetworkMonitoring = async () => {
      try {
        // Get initial state
        const initialState = await NetInfo.fetch();
        const initiallyConnected = !!(initialState.isConnected && initialState.isInternetReachable);
        setIsConnected(initiallyConnected);
        setNetworkState(initialState);

        // Subscribe to network changes
        unsubscribe = NetInfo.addEventListener(state => {
          const wasConnected = isConnected;
          const nowConnected = !!(state.isConnected && state.isInternetReachable);

          setNetworkState(state);

          if (wasConnected && !nowConnected) {
            handleDisconnect();
            if (autoRetry) {
              retryConnection();
            }
          } else if (!wasConnected && nowConnected) {
            handleReconnect();
          }

          setIsConnected(nowConnected);
        });
      } catch (error) {
        errorReporting.reportError(error, {
          action: "network_monitoring_init",
          severity: "high",
          tags: ["network", "initialization"],
        });
      }
    };

    initializeNetworkMonitoring();

    return () => {
      unsubscribe?.();
    };
  }, [isConnected, handleDisconnect, handleReconnect, retryConnection, autoRetry]);

  return {
    isConnected,
    isRetrying,
    retryCount,
    networkState,
    manualRetry,
    checkConnectivity,
  };
}
