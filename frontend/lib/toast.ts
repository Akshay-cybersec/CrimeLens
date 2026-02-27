export type ToastType = 'error' | 'success' | 'info';

export type ToastPayload = {
  id: string;
  message: string;
  type: ToastType;
  durationMs?: number;
};

type Listener = (payload: ToastPayload) => void;

const listeners = new Set<Listener>();

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const toastBus = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  publish(payload: Omit<ToastPayload, 'id'>) {
    const event: ToastPayload = { id: uid(), ...payload };
    for (const listener of listeners) {
      listener(event);
    }
  },
};

export const toastError = (message: string, durationMs = 3500) =>
  toastBus.publish({ type: 'error', message, durationMs });

export const toastSuccess = (message: string, durationMs = 2500) =>
  toastBus.publish({ type: 'success', message, durationMs });

export const toastInfo = (message: string, durationMs = 2500) =>
  toastBus.publish({ type: 'info', message, durationMs });
