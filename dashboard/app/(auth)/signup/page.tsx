'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <div className="auth-card">
        <div className="auth-logo">NYX</div>
        <div className="auth-success">
          <div className="auth-success-icon">✓</div>
          <div className="auth-success-title">Credentials Issued</div>
          <div className="auth-success-text">
            Confirmation sent to <strong>{email}</strong>. Verify your address to activate system access.
          </div>
          <Link href="/login" className="auth-submit" style={{ textDecoration: 'none', textAlign: 'center', display: 'block' }}>
            Return to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="auth-logo">NYX</div>
      <div className="auth-tagline">Create Operator Account</div>

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-field">
          <label className="auth-label" htmlFor="fullName">Full Name</label>
          <input
            id="fullName"
            type="text"
            className="auth-input"
            placeholder="Your name"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            autoComplete="name"
          />
        </div>

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
            placeholder="Min. 8 characters"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
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
            'Initialize Account'
          )}
        </button>
      </form>

      <div className="auth-footer">
        <span>Already have access?</span>
        <Link href="/login" className="auth-link">Sign in</Link>
      </div>
    </div>
  );
}
