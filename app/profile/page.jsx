'use client'
import { useState } from 'react'
import withAuth from '@/components/withAuth'
import { supabase } from '@/lib/supabase'
import { User, Lock, Bell } from 'lucide-react'

function ProfilePage({ member }) {
  const [tab, setTab] = useState('profile')
  const [form, setForm] = useState({
    full_name: member?.full_name || '',
    phone: member?.phone || '',
    grad_year: member?.grad_year || '',
    bio: member?.bio || '',
    show_phone: member?.show_phone ?? true,
    opt_in_member_emails: member?.opt_in_member_emails ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Password change
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState('')

  async function handleSaveProfile(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)
    const { error } = await supabase
      .from('members')
      .update({
        full_name: form.full_name,
        phone: form.phone,
        grad_year: form.grad_year,
        bio: form.bio,
        show_phone: form.show_phone,
        opt_in_member_emails: form.opt_in_member_emails,
      })
      .eq('id', member.id)
    if (error) setError(error.message)
    else setSaved(true)
    setSaving(false)
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    if (pwForm.newPw !== pwForm.confirm) {
      setPwMsg('error:Passwords do not match.')
      return
    }
    setPwSaving(true)
    setPwMsg('')
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPw })
    if (error) setPwMsg('error:' + error.message)
    else {
      setPwMsg('success:Password updated successfully.')
      setPwForm({ current: '', newPw: '', confirm: '' })
    }
    setPwSaving(false)
  }

  const TabBtn = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => setTab(id)}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.4rem',
        padding: '0.6rem 1rem', border: 'none', cursor: 'pointer',
        fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: 500,
        borderBottom: tab === id ? '2px solid var(--ks-crimson)' : '2px solid transparent',
        color: tab === id ? 'var(--ks-crimson)' : 'var(--ks-text-muted)',
        background: 'none',
      }}
    >
      <Icon size={15} /> {label}
    </button>
  )

  return (
    <div style={{ maxWidth: '600px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.25rem' }}>My Profile</h1>
        <p style={{ color: 'var(--ks-text-muted)', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem' }}>
          Manage your information and preferences.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--ks-border)', marginBottom: '1.5rem' }}>
        <TabBtn id="profile" label="Profile" icon={User} />
        <TabBtn id="password" label="Change Password" icon={Lock} />
        <TabBtn id="prefs" label="Preferences" icon={Bell} />
      </div>

      {/* Profile Tab */}
      {tab === 'profile' && (
        <div className="card">
          {error && <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
          {saved && <div className="alert-success" style={{ marginBottom: '1rem' }}>Profile saved successfully.</div>}
          <form onSubmit={handleSaveProfile}>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label className="field-label">Full Name</label>
                <input className="field-input" value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required />
              </div>
              <div>
                <label className="field-label">Email address</label>
                <input className="field-input" value={member?.email || ''} disabled
                  style={{ background: '#F8F8F8', color: 'var(--ks-text-muted)' }} />
                <p style={{ fontSize: '0.75rem', color: 'var(--ks-text-muted)', fontFamily: 'Inter, sans-serif', marginTop: '0.3rem' }}>
                  Email cannot be changed here. Contact an administrator.
                </p>
              </div>
              <div>
                <label className="field-label">Mobile Number (stored for directory)</label>
                <input className="field-input" type="tel" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="(555) 000-0000" />
              </div>
              <div>
                <label className="field-label">Graduation Year</label>
                <input className="field-input" type="number" value={form.grad_year}
                  onChange={e => setForm(f => ({ ...f, grad_year: e.target.value }))}
                  placeholder="e.g. 1995" min="1900" max={new Date().getFullYear()} />
              </div>
              <div>
                <label className="field-label">About me (optional)</label>
                <textarea className="field-input" value={form.bio} rows={3}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  placeholder="Share a bit about yourself…"
                  style={{ resize: 'vertical' }} />
              </div>
              <button className="btn-primary" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save profile'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Password Tab */}
      {tab === 'password' && (
        <div className="card">
          {pwMsg.startsWith('error:') && <div className="alert-error" style={{ marginBottom: '1rem' }}>{pwMsg.slice(6)}</div>}
          {pwMsg.startsWith('success:') && <div className="alert-success" style={{ marginBottom: '1rem' }}>{pwMsg.slice(8)}</div>}
          <form onSubmit={handleChangePassword}>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label className="field-label">New password</label>
                <input className="field-input" type="password" value={pwForm.newPw}
                  onChange={e => setPwForm(f => ({ ...f, newPw: e.target.value }))}
                  required minLength={8} placeholder="Min. 8 characters" />
              </div>
              <div>
                <label className="field-label">Confirm new password</label>
                <input className="field-input" type="password" value={pwForm.confirm}
                  onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                  required placeholder="Same as above" />
              </div>
              <button className="btn-primary" type="submit" disabled={pwSaving}>
                {pwSaving ? 'Saving…' : 'Update password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Preferences Tab */}
      {tab === 'prefs' && (
        <div className="card">
          {saved && <div className="alert-success" style={{ marginBottom: '1rem' }}>Preferences saved.</div>}
          <form onSubmit={handleSaveProfile}>
            <div style={{ display: 'grid', gap: '1.25rem' }}>

              <PrefToggle
                label="Show my phone number in the member directory"
                hint="Only other members can see it — never publicly visible."
                checked={form.show_phone}
                onChange={v => setForm(f => ({ ...f, show_phone: v }))}
              />

              <PrefToggle
                label="Receive emails from other members"
                hint="You can turn this off to only receive emails from administrators. You cannot opt out of administrator emails."
                checked={form.opt_in_member_emails}
                onChange={v => setForm(f => ({ ...f, opt_in_member_emails: v }))}
              />

              <div className="alert-info">
                <strong>Note:</strong> Administrator emails are always delivered and cannot be opted out of as long as you are an active member.
              </div>

              <button className="btn-primary" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save preferences'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function PrefToggle({ label, hint, checked, onChange }) {
  return (
    <label style={{ display: 'flex', gap: '0.75rem', cursor: 'pointer', alignItems: 'flex-start' }}>
      <div style={{ position: 'relative', flexShrink: 0, marginTop: '2px' }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          style={{ width: '36px', height: '20px', cursor: 'pointer', accentColor: 'var(--ks-crimson)' }}
        />
      </div>
      <div>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: 500, color: 'var(--ks-text)' }}>
          {label}
        </div>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.775rem', color: 'var(--ks-text-muted)', marginTop: '0.2rem' }}>
          {hint}
        </div>
      </div>
    </label>
  )
}

export default withAuth(ProfilePage)
