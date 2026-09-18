'use client'
import { useState, useEffect } from 'react'
import withAuth from '@/components/withAuth'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'

function EditMemberPage({ member: adminMember }) {
  const { memberId } = useParams()
  const router = useRouter()
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { loadMember() }, [memberId])

  async function loadMember() {
    setLoading(true)
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', memberId)
      .single()
    if (error || !data) {
      setError('Member not found.')
      setLoading(false)
      return
    }
    setForm({
      full_name: data.full_name || '',
      email: data.email || '',
      phone: data.phone || '',
      grad_year: data.grad_year || '',
      bio: data.bio || '',
      role: data.role || 'member',
      status: data.status || 'active',
      show_phone: data.show_phone ?? true,
      opt_in_member_emails: data.opt_in_member_emails ?? true,
    })
    setLoading(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setError('')

    const { error } = await supabase
      .from('members')
      .update({
        full_name: form.full_name,
        phone: form.phone || null,
        grad_year: form.grad_year ? parseInt(form.grad_year) : null,
        bio: form.bio || null,
        role: form.role,
        status: form.status,
        show_phone: form.show_phone,
        opt_in_member_emails: form.opt_in_member_emails,
      })
      .eq('id', memberId)

    if (error) {
      setError('Failed to save: ' + error.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm(`Permanently delete ${form.full_name}? This cannot be undone.`)) return
    if (memberId === adminMember.id) {
      setError('You cannot delete your own account.')
      return
    }
    setDeleting(true)
    await supabase.from('members').delete().eq('id', memberId)
    router.push('/admin/members')
  }

  if (loading) return <p style={{ fontFamily: 'Inter, sans-serif', color: 'var(--ks-text-muted)' }}>Loading…</p>
  if (!form) return <p style={{ fontFamily: 'Inter, sans-serif', color: 'var(--ks-text-muted)' }}>{error}</p>

  const isOwnAccount = memberId === adminMember.id

  return (
    <div style={{ maxWidth: '580px' }}>
      {/* Back */}
      <Link href="/admin/members" style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
        color: 'var(--ks-text-muted)', fontFamily: 'Inter, sans-serif', fontSize: '0.85rem',
        textDecoration: 'none', marginBottom: '1.5rem'
      }}>
        <ArrowLeft size={14} /> Back to Members
      </Link>

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.25rem' }}>Edit Member</h1>
        <p style={{ color: 'var(--ks-text-muted)', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem' }}>
          {form.email}
        </p>
      </div>

      {error && <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
      {saved && <div className="alert-success" style={{ marginBottom: '1rem' }}>Changes saved successfully.</div>}

      <div className="card">
        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gap: '1.25rem' }}>

            {/* Basic info */}
            <div>
              <label className="field-label">Full Name</label>
              <input className="field-input" value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                required />
            </div>

            <div>
              <label className="field-label">Email address</label>
              <input className="field-input" value={form.email} disabled
                style={{ background: '#F8F8F8', color: 'var(--ks-text-muted)' }} />
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: 'var(--ks-text-muted)', marginTop: '0.3rem' }}>
                Email cannot be changed here.
              </p>
            </div>

            <div>
              <label className="field-label">Mobile Number</label>
              <input className="field-input" type="tel" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="(337) 000-0000" />
            </div>

            <div>
              <label className="field-label">Year Went Active</label>
              <input className="field-input" type="number" value={form.grad_year}
                onChange={e => setForm(f => ({ ...f, grad_year: e.target.value }))}
                placeholder="e.g. 1965" min="1900" max={new Date().getFullYear()} />
            </div>

            <div>
              <label className="field-label">Bio / About</label>
              <textarea className="field-input" value={form.bio} rows={3}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                placeholder="Brief bio or notes about this member"
                style={{ resize: 'vertical' }} />
            </div>

            {/* Role & Status */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="field-label">Role</label>
                <select className="field-input" value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  disabled={isOwnAccount}>
                  <option value="member">Member</option>
                  <option value="admin">Administrator</option>
                </select>
                {isOwnAccount && (
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: 'var(--ks-text-muted)', marginTop: '0.3rem' }}>
                    You cannot change your own role.
                  </p>
                )}
              </div>
              <div>
                <label className="field-label">Status</label>
                <select className="field-input" value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  disabled={isOwnAccount}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Preferences */}
            <div style={{ padding: '1rem', background: 'var(--ks-fog)', borderRadius: '5px', border: '1px solid var(--ks-border)' }}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', fontWeight: 600,
                color: 'var(--ks-slate)', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                PREFERENCES
              </div>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <label style={{ display: 'flex', gap: '0.75rem', cursor: 'pointer', alignItems: 'flex-start' }}>
                  <input type="checkbox" checked={form.show_phone}
                    onChange={e => setForm(f => ({ ...f, show_phone: e.target.checked }))}
                    style={{ accentColor: 'var(--ks-crimson)', width: '16px', height: '16px', marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: 500 }}>
                      Show phone in member directory
                    </div>
                  </div>
                </label>
                <label style={{ display: 'flex', gap: '0.75rem', cursor: 'pointer', alignItems: 'flex-start' }}>
                  <input type="checkbox" checked={form.opt_in_member_emails}
                    onChange={e => setForm(f => ({ ...f, opt_in_member_emails: e.target.checked }))}
                    style={{ accentColor: 'var(--ks-crimson)', width: '16px', height: '16px', marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: 500 }}>
                      Receives emails from other members
                    </div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.775rem', color: 'var(--ks-text-muted)', marginTop: '0.15rem' }}>
                      Administrator emails are always delivered regardless of this setting.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn-primary" type="submit" disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Save size={15} />
                {saving ? 'Saving…' : 'Save changes'}
              </button>

              {!isOwnAccount && (
                <button type="button" onClick={handleDelete} disabled={deleting}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.6rem 1rem', border: '1.5px solid #FCA5A5',
                    borderRadius: '4px', background: 'white', cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: '#991B1B'
                  }}>
                  <Trash2 size={14} />
                  {deleting ? 'Deleting…' : 'Delete member'}
                </button>
              )}
            </div>

          </div>
        </form>
      </div>
    </div>
  )
}

export default withAuth(EditMemberPage, { adminOnly: true })
