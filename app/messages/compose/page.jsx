'use client'
import { useState } from 'react'
import withAuth from '@/components/withAuth'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Send, Info } from 'lucide-react'
import Link from 'next/link'

function ComposePage({ member }) {
  const router = useRouter()
  const isAdmin = member?.role === 'admin'

  const [form, setForm] = useState({
    subject: '',
    body: '',
    audience: 'all',
  })
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  async function handleSend(e) {
    e.preventDefault()
    setSending(true)
    setError('')

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: form.subject,
          body: form.body,
          audience: form.audience,
          senderId: member.id,
          isAdmin,
        }),
      })
      const data = await res.json()
      if (data.success) {
        router.push('/messages?sent=1')
      } else {
        setError(data.error || 'Failed to send message.')
      }
    } catch (err) {
      setError('Network error: ' + err.message)
    }
    setSending(false)
  }

  const audienceOptions = isAdmin
    ? [
        { value: 'all', label: 'All Members', desc: 'Sent to every active member. Cannot be opted out of.' },
        { value: 'members_only', label: 'Members (opted-in only)', desc: 'Only members who have not opted out of peer emails.' },
      ]
    : [
        { value: 'members_only', label: 'Members (opted-in only)', desc: 'Only members who have opted in to receiving emails from other members.' },
      ]

  // Non-admins can only send to opted-in members
  const effectiveAudience = isAdmin ? form.audience : 'members_only'

  return (
    <div style={{ maxWidth: '680px' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.25rem' }}>Compose Message</h1>
        <p style={{ color: 'var(--ks-text-muted)', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem' }}>
          {isAdmin
            ? 'As an administrator, your messages are delivered to all members.'
            : 'Your message will be sent to members who have opted in to peer emails.'}
        </p>
      </div>

      {/* Non-admin notice */}
      {!isAdmin && (
        <div className="alert-info" style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
          <Info size={16} style={{ flexShrink: 0, marginTop: '1px', color: 'var(--ks-crimson)' }} />
          <span>
            Your message will be sent to members who have opted in to receiving emails from fellow members.
            Members who have opted out will not receive it.
          </span>
        </div>
      )}

      <div className="card">
        {error && <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleSend}>
          <div style={{ display: 'grid', gap: '1.25rem' }}>

            {/* Audience — admins only */}
            {isAdmin && (
              <div>
                <label className="field-label">Send to</label>
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {audienceOptions.map(opt => (
                    <label key={opt.value} style={{
                      display: 'flex', gap: '0.75rem', cursor: 'pointer',
                      padding: '0.75rem 1rem',
                      border: `1.5px solid ${form.audience === opt.value ? 'var(--ks-crimson)' : 'var(--ks-border)'}`,
                      borderRadius: '5px',
                      background: form.audience === opt.value ? '#FFF5F5' : 'white',
                      transition: 'all 0.15s',
                    }}>
                      <input
                        type="radio"
                        name="audience"
                        value={opt.value}
                        checked={form.audience === opt.value}
                        onChange={e => setForm(f => ({ ...f, audience: e.target.value }))}
                        style={{ accentColor: 'var(--ks-crimson)', marginTop: '2px', flexShrink: 0 }}
                      />
                      <div>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: 600, color: 'var(--ks-text)' }}>
                          {opt.label}
                        </div>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.775rem', color: 'var(--ks-text-muted)', marginTop: '0.15rem' }}>
                          {opt.desc}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Subject */}
            <div>
              <label className="field-label">Subject</label>
              <input
                className="field-input"
                value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                required
                placeholder="e.g. Chapter Lunch — October 15th"
              />
            </div>

            {/* Body */}
            <div>
              <label className="field-label">Message</label>
              <textarea
                className="field-input"
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                required
                rows={10}
                placeholder="Write your message here…"
                style={{ resize: 'vertical', lineHeight: 1.7 }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button
                className="btn-primary"
                type="submit"
                disabled={sending}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Send size={15} />
                {sending ? 'Sending…' : 'Send message'}
              </button>
              <Link href="/messages" className="btn-secondary" style={{ textDecoration: 'none' }}>
                Cancel
              </Link>
            </div>

          </div>
        </form>
      </div>

      {/* Sender info */}
      <div style={{
        marginTop: '1rem', padding: '0.75rem 1rem',
        background: 'white', border: '1px solid var(--ks-border)', borderRadius: '5px',
        fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: 'var(--ks-text-muted)',
        display: 'flex', alignItems: 'center', gap: '0.5rem'
      }}>
        <Info size={13} />
        Sending as <strong style={{ color: 'var(--ks-text)' }}>{member?.full_name}</strong>
        {isAdmin && <span style={{ color: 'var(--ks-crimson)', fontWeight: 600 }}>· Administrator</span>}
      </div>
    </div>
  )
}

export default withAuth(ComposePage)
