'use client';

import { useCallback, useEffect, useState } from 'react';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/authService';
import type { PendingUser } from '@/types/api';

function AdminApprovalsView() {
  const { role } = useAuth();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const loadPendingUsers = useCallback(async () => {
    setLoading(true);
    try {
      const users = await authService.getPendingUsers();
      setPendingUsers(users);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role === 'SUPER_ADMIN') {
      void loadPendingUsers();
    } else {
      setLoading(false);
    }
  }, [loadPendingUsers, role]);

  const handleAction = async (userId: string, action: 'approve' | 'reject') => {
    if (action === 'approve') {
      await authService.approveUser(userId);
      setMessage('User approved successfully.');
    } else {
      await authService.rejectUser(userId);
      setMessage('User rejected successfully.');
    }
    await loadPendingUsers();
  };

  if (role !== 'SUPER_ADMIN') {
    return (
      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-2xl font-semibold">Admin Approval Panel</h1>
        <p className="mt-4 text-sm text-slate-600">Only SUPER_ADMIN can access this page.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Admin Approval Panel</h1>
      {message && <p className="mt-3 text-sm text-green-700">{message}</p>}

      {loading ? (
        <p className="mt-6 text-sm text-slate-600">Loading pending requests...</p>
      ) : pendingUsers.length === 0 ? (
        <p className="mt-6 text-sm text-slate-600">No pending requests.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Created Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingUsers.map((user) => (
                <tr key={user.user_id} className="border-t">
                  <td className="px-4 py-3">{user.full_name}</td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">{user.role}</td>
                  <td className="px-4 py-3">{new Date(user.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => void handleAction(user.user_id, 'approve')}
                        className="rounded bg-green-600 px-3 py-1 text-white"
                        type="button"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => void handleAction(user.user_id, 'reject')}
                        className="rounded bg-red-600 px-3 py-1 text-white"
                        type="button"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

export default function AdminApprovalsPage() {
  return (
    <ProtectedRoute>
      <AdminApprovalsView />
    </ProtectedRoute>
  );
}
