type Listener = (activeRequests: number) => void;

let activeRequests = 0;
const listeners = new Set<Listener>();

const publish = () => {
  for (const listener of listeners) {
    listener(activeRequests);
  }
};

export const loaderBus = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  start() {
    activeRequests += 1;
    publish();
  },
  stop() {
    activeRequests = Math.max(0, activeRequests - 1);
    publish();
  },
};
