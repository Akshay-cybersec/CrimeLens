'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { authService } from '@/services/authService';
import { toastError, toastSuccess } from '@/lib/toast';

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await authService.signup(email.trim(), password, fullName.trim());
      setMessage(res.message);
      toastSuccess(res.message);
      setTimeout(() => {
        router.push('/login');
      }, 1200);
    } catch {
      toastError('Signup failed. Email may already be registered.');
      setMessage('Signup failed. Email may already be registered.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="mb-6 text-2xl font-semibold">Sign Up</h1>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
        {message && <p className="text-sm text-slate-700">{message}</p>}
        <div>
          <label className="mb-1 block text-sm">Full Name</label>
          <input
            className="w-full rounded border px-3 py-2"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            minLength={2}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm">Email</label>
          <input
            className="w-full rounded border px-3 py-2"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm">Password</label>
          <input
            className="w-full rounded border px-3 py-2"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
        >
          {loading ? 'Submitting...' : 'Submit for Approval'}
        </button>
        <p className="text-sm text-slate-600">
          Already registered?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            Login
          </Link>
        </p>
      </form>
    </main>
  );
}
