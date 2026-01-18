import * as React from 'react';
import { Toast, ToastType } from '@/shared/components/ui/toast';

interface ToastContextValue {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const showToast = React.useCallback(
    (message: string, type: ToastType = 'info', title?: string, duration = 5000) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const newToast: Toast = {
        id,
        type,
        title,
        message,
        duration,
      };

      setToasts((prev) => [...prev, newToast]);
    },
    []
  );

  const showSuccess = React.useCallback(
    (message: string, title?: string) => {
      showToast(message, 'success', title);
    },
    [showToast]
  );

  const showError = React.useCallback(
    (message: string, title?: string) => {
      showToast(message, 'error', title);
    },
    [showToast]
  );

  const showWarning = React.useCallback(
    (message: string, title?: string) => {
      showToast(message, 'warning', title);
    },
    [showToast]
  );

  const showInfo = React.useCallback(
    (message: string, title?: string) => {
      showToast(message, 'info', title);
    },
    [showToast]
  );

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const value = React.useMemo(
    () => ({
      toasts,
      showToast,
      showSuccess,
      showError,
      showWarning,
      showInfo,
      removeToast,
    }),
    [toasts, showToast, showSuccess, showError, showWarning, showInfo, removeToast]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};

export const useToast = (): ToastContextValue => {
  const context = React.useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
