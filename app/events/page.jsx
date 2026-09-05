'use client'
import { useState, useEffect } from 'react'
import withAuth from '@/components/withAuth'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Calendar, Plus, MapPin, Clock, Users } from 'lucide-react'

function EventsPage({ member }) {
  const [upcoming, setUpcoming] = useState([])
  const [past, setPast] = useState([])
  const [rsvps, setRsvps] = useState({}) // eventId -> my response
  const [counts, setCounts] = useState({}) // eventId -> { yes, no, maybe }
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('upcoming')
  const isAdmin = member?.role === 'admin'

  useEffect(() => { loadEvents() }, [])

  async function loadEvents() {
    setLoading(true)
    const now = new Date().toISOString()

    const [{ data: up }, { data: past }] = await Promise.all([
      supabase.from('events').select('*').gte('event_date', now).order('event_date', { ascending: true }),
      supabase.from('events').select('*').lt('event_date', now).order('event_date', { ascending: false }).limit(10),
    ])
    setUpcoming(up || [])
    setPast(past || [])

    // My RSVPs
    const allIds = [...(up || []), ...(past || [])].map(e => e.id)
    if (allIds.length > 0) {
      const { data: myRsvps } = await supabase
        .from('rsvps')
        .select('event_id, response')
        .eq('member_id', member.id)
        .in('event_id', allIds)

      const rsvpMap = {}
      myRsvps?.forEach(r => { rsvpMap[r.event_id] = r.response })
      setRsvps(rsvpMap)

      // Attendance counts
      const { data: allRsvps } = await supabase
        .from('rsvps')
        .select('event_id, response')
        .in('event_id', allIds)

      const countMap = {}
      allRsvps?.forEach(r => {
        if (!countMap[r.event_id]) countMap[r.event_id] = { yes: 0, no: 0, maybe: 0 }
        countMap[r.event_id][r.response]++
      })
      setCounts(countMap)
    }
    setLoading(false)
  }

  const events = tab === 'upcoming' ? upcoming : past

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  })
  const formatTime = (d) => new Date(d).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit'
  })

  const rsvpColor = { yes: '#166534', no: '#991B1B', maybe: '#92400E' }
  const rsvpBg = { yes: '#DCFCE7', no: '#FEE2E2', maybe: '#FEF3C7' }
  const rsvpLabel = { yes: '✓ Attending', no: '✗ Declined', maybe: '? Maybe' }

  const TabBtn = ({ id, label, count }) => (
    <button onClick={() => setTab(id)} style={{
      padding: '0.6rem 1.25rem', border: 'none', cursor: 'pointer',
      fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: 500,
      borderBottom: tab === id ? '2px solid var(--ks-crimson)' : '2px solid transparent',
      color: tab === id ? 'var(--ks-crimson)' : 'var(--ks-text-muted)',
      background: 'none',
    }}>
      {label} {count > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--ks-text-muted)' }}>({count})</span>}
    </button>
  )

  return (
    <div style={{ maxWidth: '760px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Events</h1>
          <p style={{ color: 'var(--ks-text-muted)', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem' }}>
            Chapter lunches, meetings, and gatherings.
          </p>
        </div>
        {isAdmin && (
          <Link href="/events/create" className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            <Plus size={15} /> Create Event
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--ks-border)', marginBottom: '1.5rem' }}>
        <TabBtn id="upcoming" label="Upcoming" count={upcoming.length} />
        <TabBtn id="past" label="Past Events" count={past.length} />
      </div>

      {loading ? (
        <p style={{ fontFamily: 'Inter, sans-serif', color: 'var(--ks-text-muted)' }}>Loading…</p>
      ) : events.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Calendar size={36} style={{ color: 'var(--ks-border)', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--ks-text-muted)', fontFamily: 'Inter, sans-serif' }}>
            {tab === 'upcoming' ? 'No upcoming events scheduled.' : 'No past events found.'}
          </p>
          {isAdmin && tab === 'upcoming' && (
            <Link href="/events/create" className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginTop: '1rem', textDecoration: 'none' }}>
              <Plus size={14} /> Create the first event
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {events.map(ev => {
            const myRsvp = rsvps[ev.id]
            const count = counts[ev.id] || { yes: 0, no: 0, maybe: 0 }
            const isPast = new Date(ev.event_date) < new Date()
            return (
              <Link key={ev.id} href={`/events/${ev.id}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{
                  display: 'flex', gap: '1.25rem', alignItems: 'flex-start',
                  transition: 'box-shadow 0.15s', cursor: 'pointer',
                  borderLeft: `4px solid ${isPast ? 'var(--ks-border)' : 'var(--ks-crimson)'}`,
                }}
                  onMouseOver={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)'}
                  onMouseOut={e => e.currentTarget.style.boxShadow = 'none'}
                >
                  {/* Date block */}
                  <div style={{
                    minWidth: '56px', textAlign: 'center',
                    background: isPast ? 'var(--ks-fog)' : 'var(--ks-gold-pale)',
                    borderRadius: '6px', padding: '0.5rem 0.4rem', flexShrink: 0
                  }}>
                    <div style={{ fontSize: '0.65rem', fontFamily: 'Inter, sans-serif', fontWeight: 700,
                      color: isPast ? 'var(--ks-text-muted)' : 'var(--ks-crimson)', letterSpacing: '0.05em' }}>
                      {new Date(ev.event_date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                    </div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 700, lineHeight: 1,
                      color: isPast ? 'var(--ks-text-muted)' : 'var(--ks-crimson)' }}>
                      {new Date(ev.event_date).getDate()}
                    </div>
                    <div style={{ fontSize: '0.65rem', fontFamily: 'Inter, sans-serif',
                      color: isPast ? 'var(--ks-text-muted)' : 'var(--ks-slate)' }}>
                      {new Date(ev.event_date).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
                    </div>
                  </div>

                  {/* Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ marginBottom: '0.35rem', fontSize: '1.05rem',
                      color: isPast ? 'var(--ks-text-muted)' : 'var(--ks-text)' }}>
                      {ev.title}
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem',
                        fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: 'var(--ks-text-muted)' }}>
                        <Clock size={12} /> {formatTime(ev.event_date)}
                      </span>
                      {ev.location && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem',
                          fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: 'var(--ks-text-muted)' }}>
                          <MapPin size={12} /> {ev.location}
                        </span>
                      )}
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem',
                        fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: 'var(--ks-text-muted)' }}>
                        <Users size={12} /> {count.yes} attending
                      </span>
                    </div>
                    {ev.description && (
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', color: 'var(--ks-text-muted)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                        {ev.description}
                      </p>
                    )}
                  </div>

                  {/* My RSVP badge */}
                  {myRsvp && (
                    <div style={{
                      flexShrink: 0, padding: '0.3rem 0.7rem', borderRadius: '12px',
                      background: rsvpBg[myRsvp], color: rsvpColor[myRsvp],
                      fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', fontWeight: 600,
                      whiteSpace: 'nowrap'
                    }}>
                      {rsvpLabel[myRsvp]}
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default withAuth(EventsPage)
