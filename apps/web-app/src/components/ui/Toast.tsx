/**
 * Toast Component
 * 
 * Temporary notification messages with auto-dismiss.
 * Includes context provider for global toast management.
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { Icons } from './Icon';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant, duration?: number) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

const variantStyles: Record<ToastVariant, { bg: string; icon: React.ComponentType<any> }> = {
  success: {
    bg: 'bg-success-600 dark:bg-success-700',
    icon: Icons.Check,
  },
  error: {
    bg: 'bg-error-600 dark:bg-error-700',
    icon: Icons.X,
  },
  warning: {
    bg: 'bg-warning-600 dark:bg-warning-700',
    icon: Icons.Warning,
  },
  info: {
    bg: 'bg-info-600 dark:bg-info-700',
    icon: Icons.Info,
  },
};

interface ToastItemProps {
  toast: Toast;
  onClose: () => void;
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const { bg, icon: IconComponent } = variantStyles[toast.variant];

  return (
    <motion.div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white min-w-[300px] max-w-md',
        bg
      )}
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      layout
    >
      <IconComponent size="md" aria-hidden="true" />
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={onClose}
        className="p-1 hover:bg-white/20 rounded transition-colors touch-target"
        aria-label="Close notification"
      >
        <Icons.X size="sm" />
      </button>
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info', duration = 3000) => {
      const id = Math.random().toString(36).substring(7);
      const toast: Toast = { id, message, variant, duration };

      setToasts((prev) => [...prev, toast]);

      // Auto-dismiss
      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }
    },
    []
  );

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  if (typeof window === 'undefined') {
    return <ToastContext.Provider value={{ showToast, hideToast }}>{children}</ToastContext.Provider>;
  }

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {createPortal(
        <div className="fixed bottom-4 right-4 z-toast flex flex-col gap-2" role="region" aria-label="Notifications">
          <AnimatePresence>
            {toasts.map((toast) => (
              <ToastItem key={toast.id} toast={toast} onClose={() => hideToast(toast.id)} />
            ))}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}
