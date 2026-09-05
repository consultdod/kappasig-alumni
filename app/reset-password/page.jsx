'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleReset(e) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--ks-navy)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
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
          <h1 style={{ color: 'white', fontSize: '1.4rem' }}>Set New Password</h1>
        </div>
        <div className="card">
          {error && <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
          <form onSubmit={handleReset}>
            <div style={{ marginBottom: '1rem' }}>
              <label className="field-label">New password</label>
              <input className="field-input" type="password" value={password}
                onChange={e => setPassword(e.target.value)} required minLength={8} placeholder="Min. 8 characters" />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="field-label">Confirm password</label>
              <input className="field-input" type="password" value={confirm}
                onChange={e => setConfirm(e.target.value)} required placeholder="Same as above" />
            </div>
            <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Saving…' : 'Save new password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
