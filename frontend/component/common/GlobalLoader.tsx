'use client';

import { useEffect, useState } from 'react';
import { loaderBus } from '@/lib/loader';

export default function GlobalLoader() {
  const [activeRequests, setActiveRequests] = useState(0);

  useEffect(() => {
    return loaderBus.subscribe(setActiveRequests);
  }, []);

  if (activeRequests <= 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[1100] bg-slate-900/25 backdrop-blur-[1px] flex items-center justify-center">
      <div className="w-14 h-14 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
    </div>
  );
}
