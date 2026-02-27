// app/dashboard/page.tsx
import ForensicsDashboard from '@/component/dashboard/ForensicsDashboard';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function DashboardRoute() {
  return (
    <ProtectedRoute>
      <ForensicsDashboard />
    </ProtectedRoute>
  );
}
