'use client';

import { AuthProvider } from '@/context/AuthContext';
import ToastViewport from '@/component/common/ToastViewport';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <ToastViewport />
    </AuthProvider>
  );
}
