'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--ks-navy)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem'
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '72px', height: '72px',
            background: 'var(--ks-crimson)',
            borderRadius: '50%',
            margin: '0 auto 1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '3px solid var(--ks-gold)'
          }}>
            <span style={{ color: 'var(--ks-gold)', fontSize: '1.8rem', fontWeight: 700 }}>ΚΣ</span>
          </div>
          <h1 style={{ color: 'white', fontSize: '1.4rem' }}>Reset Password</h1>
        </div>

        <div className="card">
          {sent ? (
            <div>
              <div className="alert-success" style={{ marginBottom: '1rem' }}>
                Check your email — a password reset link has been sent to <strong>{email}</strong>.
              </div>
              <Link href="/login" className="btn-primary" style={{ display: 'block', textAlign: 'center' }}>
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <h2 style={{ marginBottom: '0.75rem', fontSize: '1.1rem' }}>Forgot your password?</h2>
              <p style={{ color: 'var(--ks-text-muted)', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Enter your email and we'll send you a reset link.
              </p>
              {error && <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label className="field-label">Email address</label>
                  <input
                    className="field-input"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                  />
                </div>
                <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <Link href="/login" style={{ color: 'var(--ks-crimson)', fontFamily: 'Inter, sans-serif', fontSize: '0.85rem' }}>
                  Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
