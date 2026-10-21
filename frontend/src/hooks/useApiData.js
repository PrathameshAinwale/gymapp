import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { isIntentionalAbort } from '../services/api';

/**
 * useApiData: Universal page/screen data loading hook
 *
 * @param {Function} fetcherFn - async function to execute. Receives ({ signal })
 * @param {Array} deps - dependency array triggering auto-refetch
 * @param {Object} options - configuration options:
 *   - initialData: initial data value (default null)
 *   - enabled: whether the hook should automatically fetch on mount/deps change (default true)
 *   - showDelayMs: debounce delay before showing loader (default 180ms)
 *   - minDisplayMs: minimum duration loader remains visible once displayed (default 300ms)
 *   - onError: callback on error
 *   - onSuccess: callback on success
 *   - transform: transform function for returned payload
 *   - isEmpty: custom predicate function (data) => boolean
 */
export function useApiData(fetcherFn, deps = [], options = {}) {
  const {
    initialData = null,
    enabled = true,
    showDelayMs = 180,
    minDisplayMs = 300,
    onError,
    onSuccess,
    transform,
    isEmpty: customIsEmpty
  } = options;

  const [data, setData] = useState(initialData);
  // Full-page / initial loading state (only for the very first load before data arrives)
  const [loading, setLoading] = useState(enabled && initialData === null);
  // Re-fetch loading state (keeps current data visible while refreshing in background)
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const hasLoadedRef = useRef(initialData !== null);
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);

  // Timers to guarantee 150-200ms debounce and 300ms min display duration
  const showTimerRef = useRef(null);
  const minTimerRef = useRef(null);
  const loaderShownAtRef = useRef(0);
  const isLoaderShowingRef = useRef(false);

  // Keep latest callbacks in ref to avoid stale closures in effects
  const fetcherRef = useRef(fetcherFn);
  fetcherRef.current = fetcherFn;
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const transformRef = useRef(transform);
  transformRef.current = transform;

  const clearTimers = useCallback(() => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (minTimerRef.current) {
      clearTimeout(minTimerRef.current);
      minTimerRef.current = null;
    }
  }, []);

  const execute = useCallback(async (isManualRetry = false) => {
    if (!isMountedRef.current) return;

    // Abort any existing in-flight request for this hook instance
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch {}
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    clearTimers();
    setError(null);

    const isInitialLoad = !hasLoadedRef.current;
    isLoaderShowingRef.current = false;
    loaderShownAtRef.current = 0;

    // Schedule loader display after showDelayMs (150-200ms) to avoid flicker on cached / fast responses
    showTimerRef.current = setTimeout(() => {
      if (!isMountedRef.current || controller.signal.aborted) return;
      isLoaderShowingRef.current = true;
      loaderShownAtRef.current = Date.now();
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
    }, showDelayMs);

    let caughtError = null;
    let result = null;

    try {
      if (typeof fetcherRef.current === 'function') {
        result = await fetcherRef.current({ signal: controller.signal });
      }
    } catch (err) {
      // Ignore AbortError / intentional aborts completely
      if (isIntentionalAbort(err) || err.name === 'AbortError' || controller.signal.aborted) {
        return;
      }
      caughtError = err;
    } finally {
      // Clear the show timer if the request resolved faster than showDelayMs
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }

      // If aborted, do nothing further
      if (controller.signal.aborted || !isMountedRef.current) {
        return;
      }

      const hideLoaders = () => {
        if (!isMountedRef.current) return;
        setLoading(false);
        setIsRefreshing(false);
        isLoaderShowingRef.current = false;

        if (caughtError) {
          // Format friendly error message
          let friendlyMessage = caughtError.message || 'An unexpected error occurred while loading data.';
          const status = caughtError.status || caughtError.response?.status;
          if (status === 503) {
            friendlyMessage = 'Server is currently undergoing maintenance (503). Please try again shortly.';
          } else if (status === 500) {
            friendlyMessage = 'The server encountered an error processing your request. Please try again.';
          } else if (caughtError.name === 'TimeoutError' || caughtError.isTimeout) {
            friendlyMessage = 'Connection timed out. Server is taking longer than usual to respond.';
          } else if (caughtError.name === 'NetworkError' || friendlyMessage.includes('Failed to fetch')) {
            friendlyMessage = 'Unable to connect to the backend server. Please check your network connection.';
          }

          const formattedError = {
            ...caughtError,
            message: friendlyMessage,
            originalError: caughtError,
            status
          };

          setError(formattedError);
          onErrorRef.current?.(formattedError);
        } else {
          const finalData = transformRef.current ? transformRef.current(result) : result;
          setData(finalData);
          hasLoadedRef.current = true;
          onSuccessRef.current?.(finalData);
        }
      };

      // Ensure minimum display duration (300ms) if the loader was rendered
      if (isLoaderShowingRef.current && loaderShownAtRef.current > 0) {
        const elapsed = Date.now() - loaderShownAtRef.current;
        const remaining = Math.max(0, minDisplayMs - elapsed);
        minTimerRef.current = setTimeout(hideLoaders, remaining);
      } else {
        hideLoaders();
      }
    }
  }, [showDelayMs, minDisplayMs, clearTimers]);

  useEffect(() => {
    isMountedRef.current = true;
    if (enabled) {
      execute();
    }
    return () => {
      isMountedRef.current = false;
      clearTimers();
      if (abortControllerRef.current) {
        try {
          abortControllerRef.current.abort();
        } catch {}
      }
    };
  }, [enabled, execute, ...deps]);

  // Determine whether current data is considered empty
  const isEmpty = useMemo(() => {
    if (typeof customIsEmpty === 'function') {
      return customIsEmpty(data);
    }
    if (data === null || data === undefined) return true;
    if (Array.isArray(data)) return data.length === 0;
    if (typeof data === 'object') {
      if (data.records && Array.isArray(data.records)) return data.records.length === 0;
      if (data.data && Array.isArray(data.data)) return data.data.length === 0;
      return Object.keys(data).length === 0;
    }
    return false;
  }, [data, customIsEmpty]);

  return {
    data,
    loading,
    error,
    isRefreshing,
    isEmpty,
    retry: () => execute(true),
    reload: () => execute(true),
    setData
  };
}

export default useApiData;
