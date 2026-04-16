'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
}

interface ToastInput {
  title: string;
  description?: string;
  type?: ToastType;
}

interface ToastContextValue {
  toast: (input: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(({ title, description, type = 'info' }: ToastInput) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, title, description, type }]);

    window.setTimeout(() => {
      dismiss(id);
    }, 4500);
  }, [dismiss]);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-3">
        {toasts.map((item) => (
          <div
            key={item.id}
            className={cn(
              'pointer-events-auto rounded-xl border px-4 py-3 shadow-xl backdrop-blur-sm',
              item.type === 'success' && 'border-green-700/40 bg-green-950/90 text-green-100',
              item.type === 'error' && 'border-red-700/40 bg-red-950/90 text-red-100',
              item.type === 'info' && 'border-amber-700/40 bg-stone-900/95 text-amber-100'
            )}
          >
            <div className="flex items-start gap-3">
              {item.type === 'success' && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />}
              {item.type === 'error' && <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />}
              {item.type === 'info' && <Info className="mt-0.5 h-5 w-5 shrink-0" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{item.title}</p>
                {item.description && <p className="mt-1 text-sm opacity-90">{item.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="rounded p-1 text-current/70 transition hover:bg-white/10 hover:text-current"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
