'use client';

import Link from 'next/link';

import { useAuth } from '@/context/AuthContext';

export default function AdminNavLink() {
  const { role } = useAuth();

  if (role !== 'SUPER_ADMIN') {
    return null;
  }

  return (
    <Link
      href="/admin/approvals"
      className="inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
    >
      Admin Approvals
    </Link>
  );
}
