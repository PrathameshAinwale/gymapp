import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const ToastStateContext = createContext([]);
const ToastDispatchContext = createContext({
  addToast: () => {},
  removeToast: () => {}
});

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 7);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  const dispatchValue = useMemo(() => ({
    addToast,
    removeToast
  }), [addToast, removeToast]);

  return (
    <ToastDispatchContext.Provider value={dispatchValue}>
      <ToastStateContext.Provider value={toasts}>
        {children}
      </ToastStateContext.Provider>
    </ToastDispatchContext.Provider>
  );
};

export const useToasts = () => useContext(ToastStateContext);
export const useToastActions = () => useContext(ToastDispatchContext);

export const useToast = () => {
  const toasts = useToasts();
  const actions = useToastActions();
  return { toasts, ...actions };
};
