import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, Text, Pressable, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  action?: { label: string; onPress: () => void };
  persistent?: boolean;
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  hideToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
  hideToast: () => {},
  clearAllToasts: () => {},
});

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const { width: screenWidth } = Dimensions.get('window');

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const [slideAnim] = useState(new Animated.Value(screenWidth));
  const [opacityAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    // Slide in animation
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss if not persistent
    if (!toast.persistent) {
      const timer = setTimeout(() => {
        dismissToast();
      }, toast.duration || 4000);

      return () => clearTimeout(timer);
    }
  }, []);

  const dismissToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: screenWidth,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss(toast.id);
    });
  }, [toast.id, onDismiss]);

  const getToastStyles = () => {
    switch (toast.type) {
      case 'success':
        return {
          backgroundColor: '#10B981',
          borderColor: '#059669',
          iconName: 'checkmark-circle' as const,
        };
      case 'error':
        return {
          backgroundColor: '#EF4444',
          borderColor: '#DC2626',
          iconName: 'alert-circle' as const,
        };
      case 'warning':
        return {
          backgroundColor: '#F59E0B',
          borderColor: '#D97706',
          iconName: 'warning' as const,
        };
      case 'info':
        return {
          backgroundColor: '#3B82F6',
          borderColor: '#2563EB',
          iconName: 'information-circle' as const,
        };
      default:
        return {
          backgroundColor: '#6B7280',
          borderColor: '#4B5563',
          iconName: 'information-circle' as const,
        };
    }
  };

  const styles = getToastStyles();

  return (
    <Animated.View
      style={{
        transform: [{ translateX: slideAnim }],
        opacity: opacityAnim,
        marginBottom: 8,
      }}
    >
      <BlurView intensity={20} tint="dark" style={{ borderRadius: 12 }}>
        <View
          style={{
            backgroundColor: `${styles.backgroundColor}20`,
            borderWidth: 1,
            borderColor: styles.borderColor,
            borderRadius: 12,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: 60,
          }}
        >
          <Ionicons
            name={styles.iconName}
            size={24}
            color={styles.backgroundColor}
            style={{ marginRight: 12 }}
          />
          
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 15,
                fontWeight: '500',
                lineHeight: 20,
              }}
              numberOfLines={3}
            >
              {toast.message}
            </Text>
            
            {toast.action && (
              <Pressable
                onPress={toast.action.onPress}
                style={{
                  marginTop: 8,
                  alignSelf: 'flex-start',
                }}
              >
                <Text
                  style={{
                    color: styles.backgroundColor,
                    fontSize: 14,
                    fontWeight: '600',
                    textDecorationLine: 'underline',
                  }}
                >
                  {toast.action.label}
                </Text>
              </Pressable>
            )}
          </View>

          <Pressable
            onPress={dismissToast}
            style={{
              padding: 4,
              marginLeft: 8,
            }}
            accessibilityRole="button"
            accessibilityLabel="Dismiss notification"
          >
            <Ionicons name="close" size={20} color="#9CA3AF" />
          </Pressable>
        </View>
      </BlurView>
    </Animated.View>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <SafeAreaView
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        pointerEvents: 'box-none',
      }}
    >
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 8,
        }}
      >
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={onDismiss}
          />
        ))}
      </View>
    </SafeAreaView>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newToast: Toast = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast, clearAllToasts }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={hideToast} />
    </ToastContext.Provider>
  );
};

// Convenience hooks for different toast types
export const useToastHelpers = () => {
  const { showToast } = useToast();

  return {
    showSuccess: (message: string, action?: Toast['action']) =>
      showToast({ type: 'success', message, action }),
    
    showError: (message: string, action?: Toast['action']) =>
      showToast({ type: 'error', message, action }),
    
    showWarning: (message: string, action?: Toast['action']) =>
      showToast({ type: 'warning', message, action }),
    
    showInfo: (message: string, action?: Toast['action']) =>
      showToast({ type: 'info', message, action }),
  };
};
