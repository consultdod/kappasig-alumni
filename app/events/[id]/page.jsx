'use client'
import { useState, useEffect } from 'react'
import withAuth from '@/components/withAuth'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Clock, Calendar, Users, CheckCircle, XCircle, HelpCircle, Trash2, Send } from 'lucide-react'

function EventDetailPage({ member }) {
  const { id } = useParams()
  const router = useRouter()
  const [event, setEvent] = useState(null)
  const [rsvps, setRsvps] = useState([])
  const [myRsvp, setMyRsvp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rsvpLoading, setRsvpLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [rsvpBanner, setRsvpBanner] = useState(null)
  const isAdmin = member?.role === 'admin'

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const rsvpParam = params.get('rsvp')
    if (rsvpParam === 'yes') setRsvpBanner({ type: 'success', msg: "You're confirmed as attending! See you there." })
    else if (rsvpParam === 'no') setRsvpBanner({ type: 'info', msg: "You've declined. We hope to see you next time." })
    else if (rsvpParam === 'maybe') setRsvpBanner({ type: 'info', msg: "Marked as maybe. You can update your response any time." })
    else if (rsvpParam === 'error') setRsvpBanner({ type: 'error', msg: "There was a problem saving your RSVP. Please try again." })
  }, [])

  useEffect(() => { loadEvent() }, [id])

  async function loadEvent() {
    setLoading(true)
    const { data: ev } = await supabase
      .from('events')
      .select('*, creator:members!events_created_by_fkey(full_name)')
      .eq('id', id)
      .single()
    setEvent(ev)

    const { data: allRsvps } = await supabase
      .from('rsvps')
      .select('*, member:members(id, full_name, grad_year)')
      .eq('event_id', id)
      .order('responded_at', { ascending: true })
    setRsvps(allRsvps || [])

    const mine = allRsvps?.find(r => r.member_id === member.id)
    setMyRsvp(mine?.response || null)
    setLoading(false)
  }

  async function handleRsvp(response) {
    setRsvpLoading(true)
    const { data: existing } = await supabase
      .from('rsvps')
      .select('id')
      .eq('event_id', id)
      .eq('member_id', member.id)
      .single()

    if (existing) {
      await supabase.from('rsvps').update({ response, responded_at: new Date().toISOString() }).eq('id', existing.id)
    } else {
      await supabase.from('rsvps').insert({ event_id: id, member_id: member.id, response })
    }
    setMyRsvp(response)
    await loadEvent()
    setRsvpLoading(false)
  }

  async function handleDelete() {
    if (!confirm('Delete this event? This cannot be undone.')) return
    setDeleting(true)
    await supabase.from('events').delete().eq('id', id)
    router.push('/events')
  }

  async function resendInvitations() {
    try {
      const res = await fetch('/api/events/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: id, senderId: member.id }),
      })
      const data = await res.json()
      if (data.success) alert(`Invitations resent to ${data.sent} members.`)
      else alert('Error: ' + data.error)
    } catch (err) {
      alert('Network error: ' + err.message)
    }
  }

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  })
  const formatTime = (d) => new Date(d).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit'
  })

  const attending = rsvps.filter(r => r.response === 'yes')
  const declined = rsvps.filter(r => r.response === 'no')
  const maybe = rsvps.filter(r => r.response === 'maybe')
  const isPast = event && new Date(event.event_date) < new Date()

  const RsvpBtn = ({ response, label, icon: Icon, color, bg }) => (
    <button
      onClick={() => handleRsvp(response)}
      disabled={rsvpLoading}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.4rem',
        padding: '0.65rem 1.25rem', border: `2px solid ${myRsvp === response ? color : 'var(--ks-border)'}`,
        borderRadius: '5px', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
        fontSize: '0.875rem', fontWeight: myRsvp === response ? 700 : 500,
        background: myRsvp === response ? bg : 'white',
        color: myRsvp === response ? color : 'var(--ks-text-muted)',
        transition: 'all 0.15s',
      }}
      onMouseOver={e => { if (myRsvp !== response) e.currentTarget.style.borderColor = color }}
      onMouseOut={e => { if (myRsvp !== response) e.currentTarget.style.borderColor = 'var(--ks-border)' }}
    >
      <Icon size={16} /> {label}
    </button>
  )

  if (loading) return <p style={{ fontFamily: 'Inter, sans-serif', color: 'var(--ks-text-muted)' }}>Loading…</p>
  if (!event) return <p style={{ fontFamily: 'Inter, sans-serif', color: 'var(--ks-text-muted)' }}>Event not found.</p>

  return (
    <div style={{ maxWidth: '760px' }}>
      {/* Back */}
      <Link href="/events" style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
        color: 'var(--ks-text-muted)', fontFamily: 'Inter, sans-serif', fontSize: '0.85rem',
        textDecoration: 'none', marginBottom: '1.5rem'
      }}>
        <ArrowLeft size={14} /> Back to Events
      </Link>

      {rsvpBanner && (
        <div className={rsvpBanner.type === 'success' ? 'alert-success' : rsvpBanner.type === 'error' ? 'alert-error' : 'alert-info'}
          style={{ marginBottom: '1rem' }}>
          {rsvpBanner.msg}
        </div>
      )}

      {/* Event header card */}
      <div className="card" style={{ marginBottom: '1.5rem', borderLeft: `4px solid ${isPast ? 'var(--ks-border)' : 'var(--ks-crimson)'}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            {isPast && (
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', fontWeight: 600,
                color: 'var(--ks-text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Past Event
              </span>
            )}
            <h1 style={{ fontSize: '1.6rem', marginBottom: '1rem', marginTop: isPast ? '0.25rem' : 0 }}>
              {event.title}
            </h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem',
                fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', color: 'var(--ks-text)' }}>
                <Calendar size={16} style={{ color: 'var(--ks-crimson)', flexShrink: 0 }} />
                {formatDate(event.event_date)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem',
                fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', color: 'var(--ks-text)' }}>
                <Clock size={16} style={{ color: 'var(--ks-crimson)', flexShrink: 0 }} />
                {formatTime(event.event_date)}
              </div>
              {event.location && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem',
                  fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', color: 'var(--ks-text)' }}>
                  <MapPin size={16} style={{ color: 'var(--ks-crimson)', flexShrink: 0 }} />
                  {event.location}
                </div>
              )}
            </div>
          </div>

          {/* Attendance summary */}
          <div style={{ display: 'flex', gap: '1rem', flexShrink: 0 }}>
            {[
              { count: attending.length, label: 'Attending', color: '#166534', bg: '#DCFCE7' },
              { count: maybe.length, label: 'Maybe', color: '#92400E', bg: '#FEF3C7' },
              { count: declined.length, label: 'Declined', color: '#991B1B', bg: '#FEE2E2' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', padding: '0.5rem 0.75rem',
                background: s.bg, borderRadius: '6px', minWidth: '64px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.count}</div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', color: s.color, marginTop: '0.15rem' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {event.description && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--ks-border)',
            lineHeight: 1.8, color: 'var(--ks-text)', whiteSpace: 'pre-wrap' }}>
            {event.description}
          </div>
        )}

        <div style={{ marginTop: '0.75rem', fontFamily: 'Inter, sans-serif', fontSize: '0.775rem', color: 'var(--ks-text-muted)' }}>
          Created by {event.creator?.full_name || 'Administrator'}
        </div>
      </div>

      {/* RSVP buttons — only for future events */}
      {!isPast && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>
            {myRsvp ? 'Update your RSVP' : 'Will you attend?'}
          </h3>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <RsvpBtn response="yes" label="Yes, I'll attend" icon={CheckCircle}
              color="#166534" bg="#DCFCE7" />
            <RsvpBtn response="maybe" label="Maybe" icon={HelpCircle}
              color="#92400E" bg="#FEF3C7" />
            <RsvpBtn response="no" label="Can't make it" icon={XCircle}
              color="#991B1B" bg="#FEE2E2" />
          </div>
          {myRsvp && (
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: 'var(--ks-text-muted)', marginTop: '0.75rem' }}>
              Your response has been saved. You can change it any time before the event.
            </p>
          )}
        </div>
      )}

      {/* Attendee list */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={16} style={{ color: 'var(--ks-crimson)' }} />
          Who's coming ({attending.length})
        </h3>

        {attending.length === 0 ? (
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: 'var(--ks-text-muted)' }}>
            No RSVPs yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: maybe.length > 0 ? '1rem' : 0 }}>
            {attending.map(r => (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: '#DCFCE7', border: '1px solid #86EFAC',
                padding: '0.3rem 0.75rem', borderRadius: '20px'
              }}>
                <div style={{
                  width: '22px', height: '22px', borderRadius: '50%',
                  background: 'var(--ks-crimson)', color: 'white',
                  fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  {r.member?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', fontWeight: 500, color: '#166534' }}>
                  {r.member?.full_name}
                  {r.member?.grad_year && <span style={{ fontWeight: 400, opacity: 0.7 }}> '{String(r.member.grad_year).slice(-2)}</span>}
                </span>
              </div>
            ))}
          </div>
        )}

        {maybe.length > 0 && (
          <>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--ks-text-muted)', fontFamily: 'Inter, sans-serif',
              marginBottom: '0.5rem', fontWeight: 600 }}>
              Maybe ({maybe.length})
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {maybe.map(r => (
                <span key={r.id} style={{
                  fontFamily: 'Inter, sans-serif', fontSize: '0.82rem',
                  background: '#FEF3C7', border: '1px solid #FDE68A',
                  padding: '0.25rem 0.6rem', borderRadius: '12px', color: '#92400E'
                }}>
                  {r.member?.full_name}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Admin controls */}
      {isAdmin && (
        <div className="card" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: 'var(--ks-text-muted)', marginRight: '0.5rem' }}>
            Admin:
          </span>
          {!isPast && (
            <button onClick={resendInvitations} className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Send size={14} /> Resend Invitations
            </button>
          )}
          <button onClick={handleDelete} disabled={deleting}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.6rem 1.1rem', border: '1.5px solid #FCA5A5',
              borderRadius: '4px', background: 'white', cursor: 'pointer',
              fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: '#991B1B',
            }}>
            <Trash2 size={14} /> {deleting ? 'Deleting…' : 'Delete Event'}
          </button>
        </div>
      )}
    </div>
  )
}

export default withAuth(EventDetailPage)
