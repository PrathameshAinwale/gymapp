/**
 * React Hook for Notifications
 * Subscribes component to notificationStore via useSyncExternalStore.
 * Zero-polling, event-driven updates.
 */

import { useSyncExternalStore, useCallback, useEffect } from 'react';
import { notificationStore } from './notificationStore.js';

export function useNotifications() {
  const subscribe = useCallback((listener) => {
    return notificationStore.subscribe(listener);
  }, []);

  const getSnapshot = useCallback(() => {
    return notificationStore.getState();
  }, []);

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const markAsRead = useCallback((itemOrReferenceId, itemType, itemId) => {
    return notificationStore.markAsRead(itemOrReferenceId, itemType, itemId);
  }, []);

  const markAllRead = useCallback(() => {
    return notificationStore.markAllAsRead();
  }, []);

  const fetchMore = useCallback(() => {
    return notificationStore.fetchMore();
  }, []);

  const refresh = useCallback((options) => {
    return notificationStore.refresh(options);
  }, []);

  const deleteNotification = useCallback((id) => {
    return notificationStore.deleteNotification(id);
  }, []);

  const initOnce = useCallback(() => {
    return notificationStore.initOnce();
  }, []);

  return {
    ...state,
    markAsRead,
    markAllRead,
    fetchMore,
    refresh,
    deleteNotification,
    initOnce,
  };
}

export default useNotifications;
