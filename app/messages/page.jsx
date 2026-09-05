'use client'
import { useState, useEffect } from 'react'
import withAuth from '@/components/withAuth'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Mail, Send, Plus, Shield, Users, User } from 'lucide-react'

function MessagesPage({ member }) {
  const [tab, setTab] = useState('inbox')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadMessages() }, [tab])

  async function loadMessages() {
    setLoading(true)
    if (tab === 'inbox') {
      // Messages sent to this member (via recipients table) or broadcasts
      const { data } = await supabase
        .from('messages')
        .select('*, sender:members!messages_sender_id_fkey(full_name, role)')
        .order('created_at', { ascending: false })
        .limit(50)
      setMessages(data || [])
    } else {
      // Sent by this member
      const { data } = await supabase
        .from('messages')
        .select('*, sender:members!messages_sender_id_fkey(full_name, role)')
        .eq('sender_id', member.id)
        .order('created_at', { ascending: false })
        .limit(50)
      setMessages(data || [])
    }
    setLoading(false)
  }

  const formatDate = (d) => {
    const date = new Date(d)
    const now = new Date()
    const diff = now - date
    if (diff < 86400000) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    if (diff < 604800000) return date.toLocaleDateString('en-US', { weekday: 'short' })
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const audienceLabel = (msg) => {
    if (msg.is_admin_msg) return { label: 'Admin', icon: <Shield size={11} />, color: 'var(--ks-crimson)' }
    if (msg.audience === 'all') return { label: 'All Members', icon: <Users size={11} />, color: '#1D4ED8' }
    return { label: 'Members', icon: <User size={11} />, color: '#166534' }
  }

  const TabBtn = ({ id, label, icon: Icon }) => (
    <button onClick={() => setTab(id)} style={{
      display: 'flex', alignItems: 'center', gap: '0.4rem',
      padding: '0.6rem 1.25rem', border: 'none', cursor: 'pointer',
      fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: 500,
      borderBottom: tab === id ? '2px solid var(--ks-crimson)' : '2px solid transparent',
      color: tab === id ? 'var(--ks-crimson)' : 'var(--ks-text-muted)',
      background: 'none',
    }}>
      <Icon size={15} /> {label}
    </button>
  )

  return (
    <div style={{ maxWidth: '760px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Messages</h1>
          <p style={{ color: 'var(--ks-text-muted)', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem' }}>
            Chapter communications and announcements.
          </p>
        </div>
        <Link href="/messages/compose" className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <Plus size={15} /> Compose
        </Link>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--ks-border)', marginBottom: '1.5rem' }}>
        <TabBtn id="inbox" label="Inbox" icon={Mail} />
        <TabBtn id="sent" label="Sent" icon={Send} />
      </div>

      {/* Message list */}
      {loading ? (
        <p style={{ fontFamily: 'Inter, sans-serif', color: 'var(--ks-text-muted)' }}>Loading…</p>
      ) : messages.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Mail size={36} style={{ color: 'var(--ks-border)', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--ks-text-muted)', fontFamily: 'Inter, sans-serif' }}>
            {tab === 'inbox' ? 'No messages yet.' : 'You haven\'t sent any messages yet.'}
          </p>
          {tab === 'inbox' && (
            <Link href="/messages/compose" className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginTop: '1rem', textDecoration: 'none' }}>
              <Plus size={14} /> Send the first message
            </Link>
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {messages.map((msg, i) => {
            const audience = audienceLabel(msg)
            return (
              <Link key={msg.id} href={`/messages/${msg.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '1rem 1.25rem',
                  borderBottom: i < messages.length - 1 ? '1px solid var(--ks-border)' : 'none',
                  display: 'flex', gap: '1rem', alignItems: 'flex-start',
                  background: 'white',
                  transition: 'background 0.1s',
                  cursor: 'pointer',
                }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--ks-fog)'}
                  onMouseOut={e => e.currentTarget.style.background = 'white'}
                >
                  {/* Avatar */}
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                    background: msg.is_admin_msg ? 'var(--ks-crimson)' : 'var(--ks-navy)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', fontWeight: 600
                  }}>
                    {msg.sender?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: 600, color: 'var(--ks-text)' }}>
                        {tab === 'sent' ? 'You' : msg.sender?.full_name || 'Unknown'}
                      </span>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: 'var(--ks-text-muted)', flexShrink: 0 }}>
                        {formatDate(msg.created_at)}
                      </span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--ks-text)', marginBottom: '0.2rem', 
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {msg.subject}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                        fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', fontWeight: 500,
                        color: audience.color, background: audience.color + '18',
                        padding: '0.15rem 0.5rem', borderRadius: '10px'
                      }}>
                        {audience.icon} {audience.label}
                      </span>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', color: 'var(--ks-text-muted)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {msg.body.slice(0, 80)}{msg.body.length > 80 ? '…' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default withAuth(MessagesPage)
