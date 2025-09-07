export interface Notification {
  id: string;
  user_id: string;
  type: "like" | "reply";
  entity_id: string;
  entity_type: "confession" | "reply";
  actor_user_id?: string | null;
  message: string;
  read_at?: string | null;
  created_at: string;
}

export interface NotificationPreferences {
  user_id: string;
  likes_enabled: boolean;
  replies_enabled: boolean;
  push_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  created_at: string;
  updated_at: string;
}

export interface GroupedNotification {
  id: string;
  type: "like" | "reply";
  entity_id: string;
  entity_type: "confession" | "reply";
  message: string;
  count: number;
  latest_created_at: string;
  is_read: boolean;
  notifications: Notification[];
}

export interface NotificationState {
  notifications: Notification[];
  groupedNotifications: GroupedNotification[];
  preferences: NotificationPreferences | null;
  unreadCount: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadNotifications: () => Promise<void>;
  loadPreferences: () => Promise<void>;
  updatePreferences: (preferences: Partial<NotificationPreferences>) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  getUnreadCount: () => Promise<number>;
  clearError: () => void;
  cleanup: () => void;
}
