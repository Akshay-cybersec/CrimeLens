'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { toastBus, type ToastPayload } from '@/lib/toast';

const toneClass = (type: ToastPayload['type']) => {
  if (type === 'error') return 'border-red-200 bg-red-50 text-red-800';
  if (type === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  return 'border-blue-200 bg-blue-50 text-blue-800';
};

const toneIcon = (type: ToastPayload['type']) => {
  if (type === 'error') return <TriangleAlert className="w-4 h-4" />;
  if (type === 'success') return <CheckCircle2 className="w-4 h-4" />;
  return <Info className="w-4 h-4" />;
};

export default function ToastViewport() {
  const [toasts, setToasts] = useState<ToastPayload[]>([]);

  useEffect(() => {
    return toastBus.subscribe((payload) => {
      setToasts((prev) => [...prev, payload]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== payload.id));
      }, payload.durationMs ?? 3000);
    });
  }, []);

  const dismiss = (id: string) => setToasts((prev) => prev.filter((item) => item.id !== id));

  return (
    <div className="fixed bottom-4 right-4 z-[1000] space-y-2 w-[320px] max-w-[calc(100vw-2rem)] pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto border rounded-lg shadow-sm px-3 py-2 text-sm flex items-start gap-2 ${toneClass(toast.type)}`}
        >
          <div className="mt-0.5">{toneIcon(toast.type)}</div>
          <p className="flex-1 leading-5">{toast.message}</p>
          <button onClick={() => dismiss(toast.id)} className="opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
