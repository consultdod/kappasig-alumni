'use client'
import { useState } from 'react'
import withAuth from '@/components/withAuth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Calendar, Send } from 'lucide-react'

function CreateEventPage({ member }) {
  const router = useRouter()
  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    event_date: '',
    event_time: '',
  })
  const [sendInvites, setSendInvites] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/events/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          sendInvites,
          createdBy: member.id,
        }),
      })
      const data = await res.json()
      if (data.success) {
        router.push(`/events/${data.eventId}`)
      } else {
        setError(data.error || 'Failed to create event.')
      }
    } catch (err) {
      setError('Network error: ' + err.message)
    }
    setSaving(false)
  }

  // Build min date string for date input (today)
  const today = new Date().toISOString().split('T')[0]

  return (
    <div style={{ maxWidth: '600px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.25rem' }}>Create Event</h1>
        <p style={{ color: 'var(--ks-text-muted)', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem' }}>
          Schedule a chapter lunch, meeting, or gathering.
        </p>
      </div>

      <div className="card">
        {error && <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: '1.25rem' }}>

            <div>
              <label className="field-label">Event title</label>
              <input className="field-input" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                required placeholder="e.g. Fall Chapter Lunch" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="field-label">Date</label>
                <input className="field-input" type="date" value={form.event_date}
                  onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))}
                  required min={today} />
              </div>
              <div>
                <label className="field-label">Time</label>
                <input className="field-input" type="time" value={form.event_time}
                  onChange={e => setForm(f => ({ ...f, event_time: e.target.value }))}
                  required />
              </div>
            </div>

            <div>
              <label className="field-label">Location</label>
              <input className="field-input" value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="e.g. Prejean's Restaurant, Lafayette" />
            </div>

            <div>
              <label className="field-label">Description (optional)</label>
              <textarea className="field-input" value={form.description} rows={4}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Add details about the event, dress code, what to bring, etc."
                style={{ resize: 'vertical' }} />
            </div>

            {/* Send invitations toggle */}
            <div style={{
              padding: '1rem', background: 'var(--ks-fog)',
              borderRadius: '5px', border: '1px solid var(--ks-border)'
            }}>
              <label style={{ display: 'flex', gap: '0.75rem', cursor: 'pointer', alignItems: 'flex-start' }}>
                <input type="checkbox" checked={sendInvites}
                  onChange={e => setSendInvites(e.target.checked)}
                  style={{ accentColor: 'var(--ks-crimson)', width: '16px', height: '16px', marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: 600 }}>
                    Send invitation emails to all members
                  </div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.775rem', color: 'var(--ks-text-muted)', marginTop: '0.2rem' }}>
                    Each member will receive an email with one-click Accept / Decline / Maybe buttons.
                  </div>
                </div>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-primary" type="submit" disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {sendInvites ? <Send size={15} /> : <Calendar size={15} />}
                {saving ? 'Creating…' : sendInvites ? 'Create & Send Invitations' : 'Create Event'}
              </button>
              <Link href="/events" className="btn-secondary" style={{ textDecoration: 'none' }}>
                Cancel
              </Link>
            </div>

          </div>
        </form>
      </div>
    </div>
  )
}

export default withAuth(CreateEventPage, { adminOnly: true })
