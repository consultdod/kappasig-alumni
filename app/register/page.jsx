'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    full_name: '', phone: '', grad_year: '', password: '', confirm: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    // Supabase handles the invite token from the URL hash automatically
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setSessionReady(true)
      }
    })
  }, [])

  async function handleRegister(e) {
    e.preventDefault()
    if (form.password !== form.confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    setError('')

    // Update password (user is already signed in via invite link)
    const { error: pwErr } = await supabase.auth.updateUser({
      password: form.password
    })
    if (pwErr) { setError(pwErr.message); setLoading(false); return }

    // Get session to get user id
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setError('Session not found. Please use your invite link again.'); setLoading(false); return }

    // Create member profile
    const { error: profileErr } = await supabase
      .from('members')
      .insert({
        id: session.user.id,
        email: session.user.email,
        full_name: form.full_name,
        phone: form.phone,
        grad_year: form.grad_year || null,
        role: 'member',
        status: 'active',
        opt_in_member_emails: true,
        show_phone: true,
      })

    if (profileErr) { setError(profileErr.message); setLoading(false); return }

    router.push('/dashboard')
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--ks-navy)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem'
    }}>
      <div style={{ width: '100%', maxWidth: '460px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '72px', height: '72px', background: 'var(--ks-crimson)',
            borderRadius: '50%', margin: '0 auto 1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '3px solid var(--ks-gold)'
          }}>
            <span style={{ color: 'var(--ks-gold)', fontSize: '1.8rem', fontWeight: 700 }}>ΚΣ</span>
          </div>
          <h1 style={{ color: 'white', fontSize: '1.5rem', marginBottom: '0.25rem' }}>
            Create Your Account
          </h1>
          <p style={{ color: '#94A3B8', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem' }}>
            Kappa Sigma Alumni · University of Louisiana at Lafayette
          </p>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: '1.25rem', fontSize: '1.1rem' }}>Complete your registration</h2>

          {!sessionReady && (
            <div className="alert-info" style={{ marginBottom: '1rem' }}>
              Processing your invite link… if this message persists, please click the link in your invitation email again.
            </div>
          )}
          {error && <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

          <form onSubmit={handleRegister}>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label className="field-label">Full name</label>
                <input className="field-input" value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  required placeholder="John Smith" />
              </div>
              <div>
                <label className="field-label">Mobile number (optional)</label>
                <input className="field-input" type="tel" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="(337) 000-0000" />
              </div>
              <div>
                <label className="field-label">Graduation year (optional)</label>
                <input className="field-input" type="number" value={form.grad_year}
                  onChange={e => setForm(f => ({ ...f, grad_year: e.target.value }))}
                  placeholder="e.g. 1998" min="1900" max={new Date().getFullYear()} />
              </div>
              <div>
                <label className="field-label">Password</label>
                <input className="field-input" type="password" value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required minLength={8} placeholder="Min. 8 characters" />
              </div>
              <div>
                <label className="field-label">Confirm password</label>
                <input className="field-input" type="password" value={form.confirm}
                  onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                  required placeholder="Same as above" />
              </div>
              <button className="btn-primary" type="submit" disabled={loading}
                style={{ width: '100%', padding: '0.75rem' }}>
                {loading ? 'Creating account…' : 'Create account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
