'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      console.log('Login result:', { data, error })
      if (error) {
        setError(error.message)
        setLoading(false)
      } else if (data?.session) {
        router.push('/dashboard')
      } else {
        setError('Login failed — no session returned. Check console for details.')
        setLoading(false)
      }
    } catch (err) {
      console.error('Login exception:', err)
      setError('Connection error: ' + err.message + '. Make sure your Supabase URL and key are correct in .env.local')
      setLoading(false)
    }
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
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
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
          <h1 style={{ color: 'white', fontSize: '1.5rem', marginBottom: '0.25rem' }}>
            Kappa Sigma Alumni
          </h1>
          <p style={{ color: '#94A3B8', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem' }}>
            University of Louisiana at Lafayette
          </p>
        </div>

        <div className="card" style={{ borderColor: 'rgba(201,168,76,0.3)' }}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.2rem' }}>Sign in to your account</h2>

          {error && (
            <div className="alert-error" style={{ marginBottom: '1rem', wordBreak: 'break-word' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1rem' }}>
              <label className="field-label">Email address</label>
              <input
                className="field-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="field-label">Password</label>
              <input
                className="field-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            <button
              className="btn-primary"
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '0.75rem' }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
            <Link
              href="/forgot-password"
              style={{ color: 'var(--ks-crimson)', fontFamily: 'Inter, sans-serif', fontSize: '0.85rem' }}
            >
              Forgot your password?
            </Link>
          </div>
        </div>

        <p style={{
          textAlign: 'center', marginTop: '1.5rem',
          color: '#64748B', fontFamily: 'Inter, sans-serif', fontSize: '0.8rem'
        }}>
          Not yet a member? Contact an administrator to receive an invitation.
        </p>
      </div>
    </div>
  )
}
