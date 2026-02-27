'use client';

import { AuthProvider } from '@/context/AuthContext';
import ToastViewport from '@/component/common/ToastViewport';
import GlobalLoader from '@/component/common/GlobalLoader';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <GlobalLoader />
      <ToastViewport />
    </AuthProvider>
  );
}
