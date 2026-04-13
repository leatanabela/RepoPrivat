import { create } from 'zustand';

interface NotificationItem {
  id: string;
  message: string;
  type: string;
  created_at: string;
}

interface NotificationState {
  notifications: NotificationItem[];
  readIds: Set<string>;
  dismissedIds: Set<string>;
  setNotifications: (items: NotificationItem[]) => void;
  markAsRead: (id: string) => void;
  dismissNotification: (id: string) => void;
  dismissAll: () => void;
  unreadCount: () => number;
  isRead: (id: string) => boolean;
  visibleNotifications: () => NotificationItem[];
}

function getStoredSet(key: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function persistSet(key: string, ids: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify([...ids]));
  } catch { /* ignore */ }
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  readIds: getStoredSet('notif_read_ids'),
  dismissedIds: getStoredSet('notif_dismissed_ids'),

  setNotifications: (items) => {
    set({ notifications: items });
  },

  markAsRead: (id) => {
    const updated = new Set(get().readIds);
    updated.add(id);
    persistSet('notif_read_ids', updated);
    set({ readIds: updated });
  },

  dismissNotification: (id) => {
    const updated = new Set(get().dismissedIds);
    updated.add(id);
    persistSet('notif_dismissed_ids', updated);
    set({ dismissedIds: updated });
  },

  dismissAll: () => {
    const allIds = new Set(get().notifications.map((n) => n.id));
    const updated = new Set([...get().dismissedIds, ...allIds]);
    persistSet('notif_dismissed_ids', updated);
    set({ dismissedIds: updated });
  },

  unreadCount: () => {
    const { notifications, readIds, dismissedIds } = get();
    return notifications.filter((n) => !readIds.has(n.id) && !dismissedIds.has(n.id)).length;
  },

  isRead: (id) => get().readIds.has(id),

  visibleNotifications: () => {
    const { notifications, dismissedIds } = get();
    return notifications.filter((n) => !dismissedIds.has(n.id));
  },
}));
