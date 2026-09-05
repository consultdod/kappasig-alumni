'use client'
import { useState, useEffect } from 'react'
import withAuth from '@/components/withAuth'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Calendar, Mail, Users, Image, ArrowRight, MapPin, Clock, CheckCircle } from 'lucide-react'

function DashboardPage({ member }) {
  const [stats, setStats] = useState({ members: 0, events: 0, messages: 0 })
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [recentMessages, setRecentMessages] = useState([])
  const [myRsvps, setMyRsvps] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const now = new Date().toISOString()

    const [
      { count: memberCount },
      { count: eventCount },
      { count: msgCount },
      { data: events },
      { data: msgs },
    ] = await Promise.all([
      supabase.from('members').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('events').select('*', { count: 'exact', head: true }).gte('event_date', now),
      supabase.from('messages').select('*', { count: 'exact', head: true }),
      supabase.from('events').select('*').gte('event_date', now).order('event_date', { ascending: true }).limit(4),
      supabase.from('messages').select('*, sender:members!messages_sender_id_fkey(full_name)').order('created_at', { ascending: false }).limit(5),
    ])

    setStats({ members: memberCount || 0, events: eventCount || 0, messages: msgCount || 0 })
    setUpcomingEvents(events || [])
    setRecentMessages(msgs || [])

    // My RSVPs for upcoming events
    if (events?.length > 0) {
      const { data: rsvps } = await supabase
        .from('rsvps')
        .select('event_id, response')
        .eq('member_id', member.id)
        .in('event_id', events.map(e => e.id))
      const map = {}
      rsvps?.forEach(r => { map[r.event_id] = r.response })
      setMyRsvps(map)
    }
    setLoading(false)
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const formatTime = (d) => new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const formatMsgDate = (d) => {
    const date = new Date(d)
    const diff = Date.now() - date
    if (diff < 86400000) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const rsvpColors = { yes: '#166534', no: '#991B1B', maybe: '#92400E' }
  const rsvpBgs = { yes: '#DCFCE7', no: '#FEE2E2', maybe: '#FEF3C7' }
  const rsvpLabels = { yes: '✓ Going', no: '✗ Declined', maybe: '? Maybe' }

  return (
    <div>
      {/* Welcome header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.25rem' }}>
          {greeting()}, {member?.full_name?.split(' ')[0]}
        </h1>
        <p style={{ color: 'var(--ks-text-muted)', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem' }}>
          Welcome to the Kappa Sigma Alumni portal.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { icon: <Users size={20} />, label: 'Active Members', value: stats.members, color: 'var(--ks-crimson)', href: '/directory' },
          { icon: <Calendar size={20} />, label: 'Upcoming Events', value: stats.events, color: 'var(--ks-gold)', href: '/events' },
          { icon: <Mail size={20} />, label: 'Messages', value: stats.messages, color: 'var(--ks-navy)', href: '/messages' },
        ].map(s => (
          <Link key={s.label} href={s.href} style={{ textDecoration: 'none' }}>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem',
              padding: '1.25rem', transition: 'box-shadow 0.15s', cursor: 'pointer' }}
              onMouseOver={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)'}
              onMouseOut={e => e.currentTarget.style.boxShadow = 'none'}>
              <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: s.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, lineHeight: 1 }}>{s.value}</div>
                <div style={{ color: 'var(--ks-text-muted)', fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                  {s.label}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

        {/* Upcoming Events */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 className="crimson-bar">Upcoming Events</h3>
            <Link href="/events" style={{ color: 'var(--ks-crimson)', fontFamily: 'Inter, sans-serif',
              fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none' }}>
              All events <ArrowRight size={13} />
            </Link>
          </div>
          {loading ? (
            <p style={{ fontFamily: 'Inter, sans-serif', color: 'var(--ks-text-muted)', fontSize: '0.875rem' }}>Loading…</p>
          ) : upcomingEvents.length === 0 ? (
            <p style={{ color: 'var(--ks-text-muted)', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem' }}>
              No upcoming events.
            </p>
          ) : upcomingEvents.map(ev => (
            <Link key={ev.id} href={`/events/${ev.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--ks-border)',
                display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}
                onMouseOver={e => e.currentTarget.style.opacity = '0.75'}
                onMouseOut={e => e.currentTarget.style.opacity = '1'}>
                {/* Mini date */}
                <div style={{ minWidth: '40px', textAlign: 'center', background: 'var(--ks-gold-pale)',
                  borderRadius: '4px', padding: '0.2rem 0.35rem', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.6rem', fontFamily: 'Inter, sans-serif', color: 'var(--ks-crimson)', fontWeight: 700 }}>
                    {new Date(ev.event_date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ks-crimson)', lineHeight: 1 }}>
                    {new Date(ev.event_date).getDate()}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: 'var(--ks-text)', fontSize: '0.875rem',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ev.title}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--ks-text-muted)', fontFamily: 'Inter, sans-serif', fontSize: '0.72rem',
                      display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <Clock size={10} /> {formatTime(ev.event_date)}
                    </span>
                    {ev.location && (
                      <span style={{ color: 'var(--ks-text-muted)', fontFamily: 'Inter, sans-serif', fontSize: '0.72rem',
                        display: 'flex', alignItems: 'center', gap: '0.2rem',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                        <MapPin size={10} /> {ev.location}
                      </span>
                    )}
                  </div>
                </div>
                {/* RSVP badge */}
                {myRsvps[ev.id] && (
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.68rem', fontWeight: 600,
                    flexShrink: 0, padding: '0.2rem 0.5rem', borderRadius: '10px',
                    background: rsvpBgs[myRsvps[ev.id]], color: rsvpColors[myRsvps[ev.id]] }}>
                    {rsvpLabels[myRsvps[ev.id]]}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>

        {/* Recent Messages */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 className="crimson-bar">Recent Messages</h3>
            <Link href="/messages" style={{ color: 'var(--ks-crimson)', fontFamily: 'Inter, sans-serif',
              fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none' }}>
              All messages <ArrowRight size={13} />
            </Link>
          </div>
          {loading ? (
            <p style={{ fontFamily: 'Inter, sans-serif', color: 'var(--ks-text-muted)', fontSize: '0.875rem' }}>Loading…</p>
          ) : recentMessages.length === 0 ? (
            <p style={{ color: 'var(--ks-text-muted)', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem' }}>
              No messages yet.
            </p>
          ) : recentMessages.map(msg => (
            <Link key={msg.id} href={`/messages/${msg.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ padding: '0.7rem 0', borderBottom: '1px solid var(--ks-border)' }}
                onMouseOver={e => e.currentTarget.style.opacity = '0.75'}
                onMouseOut={e => e.currentTarget.style.opacity = '1'}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--ks-text)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {msg.subject}
                  </span>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem',
                    color: 'var(--ks-text-muted)', flexShrink: 0, marginLeft: '0.5rem' }}>
                    {formatMsgDate(msg.created_at)}
                  </span>
                </div>
                <div style={{ color: 'var(--ks-text-muted)', fontFamily: 'Inter, sans-serif', fontSize: '0.78rem' }}>
                  {msg.sender?.full_name}
                  {msg.is_admin_msg && <span style={{ color: 'var(--ks-crimson)', marginLeft: '0.35rem', fontSize: '0.68rem', fontWeight: 600 }}>· Admin</span>}
                </div>
              </div>
            </Link>
          ))}
          <div style={{ marginTop: '1rem' }}>
            <Link href="/messages/compose" className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                textDecoration: 'none', fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
              <Mail size={13} /> Compose message
            </Link>
          </div>
        </div>
      </div>

      {/* Quick links row */}
      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Link href="/directory" className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}>
          <Users size={15} /> Member Directory
        </Link>
        <Link href="/photos" className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}>
          <Image size={15} /> Photo Albums
        </Link>
        {member?.role === 'admin' && (
          <Link href="/events/create" className="btn-gold"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}>
            <Calendar size={15} /> Create Event
          </Link>
        )}
      </div>

      <style>{`
        @media (max-width: 640px) {
          .stats-grid { grid-template-columns: 1fr !important; }
          .panels-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

export default withAuth(DashboardPage)
