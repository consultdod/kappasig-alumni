'use client'
import { useState } from 'react'
import withAuth from '@/components/withAuth'
import { Mail, Plus, X } from 'lucide-react'

function SendInvitesPage({ member }) {
  const [emails, setEmails] = useState([''])
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)

  function addEmail() {
    setEmails(e => [...e, ''])
  }

  function removeEmail(i) {
    setEmails(e => e.filter((_, idx) => idx !== i))
  }

  function updateEmail(i, val) {
    setEmails(e => e.map((em, idx) => idx === i ? val : em))
  }

  async function handleSend(e) {
    e.preventDefault()
    setSending(true)
    setResult(null)

    const validEmails = emails.filter(em => em.trim() && em.includes('@'))
    if (validEmails.length === 0) {
      setResult({ type: 'error', msg: 'Please enter at least one valid email address.' })
      setSending(false)
      return
    }

    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: validEmails, invitedBy: member.full_name }),
      })
      const data = await res.json()
      if (data.success) {
        setResult({ type: 'success', msg: `Invitation${validEmails.length > 1 ? 's' : ''} sent to ${validEmails.join(', ')}.` })
        setEmails([''])
      } else {
        setResult({ type: 'error', msg: data.error || 'Failed to send invitations.' })
      }
    } catch {
      setResult({ type: 'error', msg: 'Network error. Please try again.' })
    }
    setSending(false)
  }

  return (
    <div style={{ maxWidth: '520px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.25rem' }}>Send Invitations</h1>
        <p style={{ color: 'var(--ks-text-muted)', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem' }}>
          Invite new alumni to join the portal. They'll receive an email with a link to create their account.
        </p>
      </div>

      <div className="card">
        {result && (
          <div className={result.type === 'success' ? 'alert-success' : 'alert-error'} style={{ marginBottom: '1.25rem' }}>
            {result.msg}
          </div>
        )}

        <form onSubmit={handleSend}>
          <div style={{ marginBottom: '1rem' }}>
            <label className="field-label">Email addresses to invite</label>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {emails.map((em, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    className="field-input"
                    type="email"
                    value={em}
                    onChange={e => updateEmail(i, e.target.value)}
                    placeholder={`email${i + 1}@example.com`}
                    required={i === 0}
                  />
                  {emails.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEmail(i)}
                      style={{
                        background: 'none', border: '1px solid var(--ks-border)',
                        borderRadius: '4px', padding: '0.45rem', cursor: 'pointer',
                        color: 'var(--ks-text-muted)', flexShrink: 0
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={addEmail}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--ks-crimson)', fontFamily: 'Inter, sans-serif',
              fontSize: '0.85rem', marginBottom: '1.5rem', padding: 0
            }}
          >
            <Plus size={14} /> Add another email
          </button>

          <button
            className="btn-primary"
            type="submit"
            disabled={sending}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Mail size={15} />
            {sending ? 'Sending…' : `Send invitation${emails.filter(e => e).length > 1 ? 's' : ''}`}
          </button>
        </form>
      </div>

      <div className="alert-info" style={{ marginTop: '1.5rem' }}>
        <strong>How it works:</strong> Invitees receive a sign-up link valid for 48 hours. Once they register, their account is active and they appear in the member directory.
      </div>
    </div>
  )
}

export default withAuth(SendInvitesPage, { adminOnly: true })
