'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/workflows');
      router.refresh();
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-logo">NYX</div>
      <div className="auth-tagline">Autonomous AI Operating System</div>

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-field">
          <label className="auth-label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="auth-input"
            placeholder="operator@domain.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            className="auth-input"
            placeholder="••••••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        {error && (
          <div className="auth-error">{error}</div>
        )}

        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? (
            <span className="auth-submit-loading">
              <span className="auth-dot" />
              <span className="auth-dot" />
              <span className="auth-dot" />
            </span>
          ) : (
            'Access System'
          )}
        </button>
      </form>

      <div className="auth-footer">
        <span>No access?</span>
        <Link href="/signup" className="auth-link">Request credentials</Link>
      </div>
    </div>
  );
}
