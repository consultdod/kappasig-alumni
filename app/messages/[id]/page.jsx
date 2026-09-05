'use client'
import { useState, useEffect } from 'react'
import withAuth from '@/components/withAuth'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Shield, Users, Reply } from 'lucide-react'
import Link from 'next/link'

function MessageViewPage({ member }) {
  const { id } = useParams()
  const router = useRouter()
  const [message, setMessage] = useState(null)
  const [recipients, setRecipients] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: msg } = await supabase
        .from('messages')
        .select('*, sender:members!messages_sender_id_fkey(id, full_name, role, grad_year)')
        .eq('id', id)
        .single()
      setMessage(msg)

      if (member?.role === 'admin' && msg) {
        const { data: recs } = await supabase
          .from('message_recipients')
          .select('*, member:members(full_name, email)')
          .eq('message_id', id)
          .order('delivered_at', { ascending: true })
        setRecipients(recs || [])
      }
      setLoading(false)
    }
    load()
  }, [id, member])

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit'
  })

  if (loading) return (
    <p style={{ fontFamily: 'Inter, sans-serif', color: 'var(--ks-text-muted)' }}>Loading…</p>
  )

  if (!message) return (
    <div>
      <p style={{ fontFamily: 'Inter, sans-serif', color: 'var(--ks-text-muted)' }}>Message not found.</p>
      <Link href="/messages" className="btn-secondary" style={{ marginTop: '1rem', textDecoration: 'none', display: 'inline-block' }}>
        Back to Messages
      </Link>
    </div>
  )

  const isOwnMessage = message.sender_id === member?.id

  return (
    <div style={{ maxWidth: '720px' }}>
      {/* Back */}
      <Link href="/messages" style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
        color: 'var(--ks-text-muted)', fontFamily: 'Inter, sans-serif', fontSize: '0.85rem',
        textDecoration: 'none', marginBottom: '1.5rem'
      }}>
        <ArrowLeft size={14} /> Back to Messages
      </Link>

      {/* Message card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        {/* Subject */}
        <h2 style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--ks-border)' }}>
          {message.subject}
        </h2>

        {/* Meta row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
              background: message.is_admin_msg ? 'var(--ks-crimson)' : 'var(--ks-navy)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: 600
            }}>
              {message.sender?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
            </div>
            <div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '0.9rem' }}>
                {message.sender?.full_name || 'Unknown'}
                {message.is_admin_msg && (
                  <span style={{
                    marginLeft: '0.5rem', fontSize: '0.7rem', color: 'var(--ks-crimson)',
                    background: '#FEE2E2', padding: '0.15rem 0.5rem', borderRadius: '10px',
                    display: 'inline-flex', alignItems: 'center', gap: '0.2rem'
                  }}>
                    <Shield size={10} /> Administrator
                  </span>
                )}
              </div>
              {message.sender?.grad_year && (
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.775rem', color: 'var(--ks-text-muted)' }}>
                  Class of {message.sender.grad_year}
                </div>
              )}
            </div>
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: 'var(--ks-text-muted)', textAlign: 'right' }}>
            {formatDate(message.created_at)}
          </div>
        </div>

        {/* Body */}
        <div style={{
          lineHeight: 1.8, fontSize: '1rem', color: 'var(--ks-text)',
          whiteSpace: 'pre-wrap', borderTop: '1px solid var(--ks-border)', paddingTop: '1.25rem'
        }}>
          {message.body}
        </div>
      </div>

      {/* Reply button — only if member has opt-in and message is not their own */}
      {!isOwnMessage && member?.opt_in_member_emails && (
        <Link
          href={`/messages/compose?reply=${encodeURIComponent(message.subject)}`}
          className="btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', marginBottom: '1.5rem' }}
        >
          <Reply size={15} /> Reply to chapter
        </Link>
      )}

      {/* Admin: recipient list */}
      {member?.role === 'admin' && recipients.length > 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={16} style={{ color: 'var(--ks-crimson)' }} />
            Delivered to {recipients.length} member{recipients.length !== 1 ? 's' : ''}
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {recipients.map(r => (
              <span key={r.id} style={{
                fontFamily: 'Inter, sans-serif', fontSize: '0.78rem',
                background: 'var(--ks-fog)', border: '1px solid var(--ks-border)',
                padding: '0.25rem 0.6rem', borderRadius: '12px', color: 'var(--ks-text)'
              }}>
                {r.member?.full_name || r.member?.email}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default withAuth(MessageViewPage)
