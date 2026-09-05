'use client'
import { useState, useEffect } from 'react'
import withAuth from '@/components/withAuth'
import { supabase } from '@/lib/supabase'
import { Search, Phone, Mail, GraduationCap, Shield, ChevronDown, ChevronUp } from 'lucide-react'

function DirectoryPage({ member: currentMember }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [sortBy, setSortBy] = useState('name') // name | year
  const [expanded, setExpanded] = useState(null)
  const isAdmin = currentMember?.role === 'admin'

  useEffect(() => { loadMembers() }, [])

  async function loadMembers() {
    setLoading(true)
    const { data } = await supabase
      .from('members')
      .select('id, full_name, email, phone, show_phone, grad_year, bio, role, status, avatar_url')
      .eq('status', 'active')
      .order('full_name', { ascending: true })
    setMembers(data || [])
    setLoading(false)
  }

  const gradYears = [...new Set(members.map(m => m.grad_year).filter(Boolean))].sort((a, b) => b - a)

  const filtered = members
    .filter(m => {
      const q = search.toLowerCase()
      const matchSearch = !q ||
        m.full_name?.toLowerCase().includes(q) ||
        m.grad_year?.toString().includes(q) ||
        m.bio?.toLowerCase().includes(q)
      const matchYear = !filterYear || m.grad_year?.toString() === filterYear
      return matchSearch && matchYear
    })
    .sort((a, b) => {
      if (sortBy === 'year') return (b.grad_year || 0) - (a.grad_year || 0)
      return a.full_name.localeCompare(b.full_name)
    })

  const initials = (name) => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'

  const avatarColor = (name) => {
    const colors = ['#8B1A1A', '#1A2744', '#166534', '#92400E', '#1D4ED8', '#6B21A8']
    const idx = (name?.charCodeAt(0) || 0) % colors.length
    return colors[idx]
  }

  return (
    <div style={{ maxWidth: '860px' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.25rem' }}>Member Directory</h1>
        <p style={{ color: 'var(--ks-text-muted)', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem' }}>
          {members.length} active members in the chapter.
        </p>
      </div>

      {/* Search + filter bar */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%',
            transform: 'translateY(-50%)', color: 'var(--ks-text-muted)' }} />
          <input className="field-input" placeholder="Search by name, year, or bio…"
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.25rem' }} />
        </div>

        <select className="field-input" value={filterYear}
          onChange={e => setFilterYear(e.target.value)}
          style={{ width: 'auto', minWidth: '140px' }}>
          <option value="">All years</option>
          {gradYears.map(y => (
            <option key={y} value={y}>Class of {y}</option>
          ))}
        </select>

        <select className="field-input" value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={{ width: 'auto', minWidth: '140px' }}>
          <option value="name">Sort: A–Z</option>
          <option value="year">Sort: Newest class</option>
        </select>
      </div>

      {/* Results count */}
      {search || filterYear ? (
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', color: 'var(--ks-text-muted)', marginBottom: '1rem' }}>
          Showing {filtered.length} of {members.length} members
          {filterYear && ` · Class of ${filterYear}`}
        </p>
      ) : null}

      {/* Member list */}
      {loading ? (
        <p style={{ fontFamily: 'Inter, sans-serif', color: 'var(--ks-text-muted)' }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
          <p style={{ color: 'var(--ks-text-muted)', fontFamily: 'Inter, sans-serif' }}>
            No members match your search.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.6rem' }}>
          {filtered.map(m => {
            const isOpen = expanded === m.id
            const isMe = m.id === currentMember?.id
            const showPhone = m.show_phone || isAdmin
            return (
              <div key={m.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Row */}
                <div
                  onClick={() => setExpanded(isOpen ? null : m.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '0.9rem 1.25rem', cursor: 'pointer',
                    background: isOpen ? 'var(--ks-fog)' : 'white',
                    transition: 'background 0.1s'
                  }}
                  onMouseOver={e => { if (!isOpen) e.currentTarget.style.background = '#FAFAFA' }}
                  onMouseOut={e => { if (!isOpen) e.currentTarget.style.background = 'white' }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                    background: m.avatar_url ? 'transparent' : avatarColor(m.full_name),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontFamily: 'Inter, sans-serif',
                    fontSize: '0.9rem', fontWeight: 700,
                    border: isMe ? '2px solid var(--ks-gold)' : 'none',
                  }}>
                    {m.avatar_url
                      ? <img src={m.avatar_url} alt={m.full_name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                      : initials(m.full_name)
                    }
                  </div>

                  {/* Name + year */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--ks-text)' }}>
                        {m.full_name}
                      </span>
                      {isMe && (
                        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem',
                          color: 'var(--ks-text-muted)', fontStyle: 'italic' }}>
                          (you)
                        </span>
                      )}
                      {m.role === 'admin' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                          fontFamily: 'Inter, sans-serif', fontSize: '0.68rem', fontWeight: 600,
                          color: 'var(--ks-crimson)', background: 'var(--ks-gold-pale)',
                          padding: '0.15rem 0.5rem', borderRadius: '10px' }}>
                          <Shield size={9} /> Admin
                        </span>
                      )}
                    </div>
                    {m.grad_year && (
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem',
                        color: 'var(--ks-text-muted)', marginTop: '0.1rem',
                        display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <GraduationCap size={12} /> Class of {m.grad_year}
                      </div>
                    )}
                  </div>

                  {/* Quick contact icons — desktop */}
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                    {showPhone && m.phone && (
                      <a href={`tel:${m.phone}`} onClick={e => e.stopPropagation()}
                        title={m.phone}
                        style={{ color: 'var(--ks-text-muted)', display: 'flex', alignItems: 'center' }}>
                        <Phone size={15} />
                      </a>
                    )}
                    {(isAdmin || m.id === currentMember?.id) && (
                      <a href={`mailto:${m.email}`} onClick={e => e.stopPropagation()}
                        title={m.email}
                        style={{ color: 'var(--ks-text-muted)', display: 'flex', alignItems: 'center' }}>
                        <Mail size={15} />
                      </a>
                    )}
                    {isOpen ? <ChevronUp size={16} style={{ color: 'var(--ks-text-muted)' }} />
                             : <ChevronDown size={16} style={{ color: 'var(--ks-text-muted)' }} />}
                  </div>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div style={{
                    padding: '1rem 1.25rem 1.25rem',
                    borderTop: '1px solid var(--ks-border)',
                    background: 'var(--ks-fog)',
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem'
                  }}>
                    {/* Contact info */}
                    <div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', fontWeight: 700,
                        color: 'var(--ks-slate)', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                        CONTACT
                      </div>
                      {(isAdmin || m.id === currentMember?.id) ? (
                        <a href={`mailto:${m.email}`}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem',
                            fontFamily: 'Inter, sans-serif', fontSize: '0.82rem',
                            color: 'var(--ks-crimson)', textDecoration: 'none', marginBottom: '0.35rem' }}>
                          <Mail size={13} /> {m.email}
                        </a>
                      ) : (
                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem',
                          color: 'var(--ks-text-muted)', marginBottom: '0.35rem' }}>
                          Email visible to admins only
                        </p>
                      )}
                      {showPhone && m.phone ? (
                        <a href={`tel:${m.phone}`}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem',
                            fontFamily: 'Inter, sans-serif', fontSize: '0.82rem',
                            color: 'var(--ks-crimson)', textDecoration: 'none' }}>
                          <Phone size={13} /> {m.phone}
                        </a>
                      ) : m.phone && !showPhone ? (
                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', color: 'var(--ks-text-muted)' }}>
                          Phone hidden by member
                        </p>
                      ) : null}
                    </div>

                    {/* Bio */}
                    {m.bio && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', fontWeight: 700,
                          color: 'var(--ks-slate)', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                          ABOUT
                        </div>
                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.85rem',
                          color: 'var(--ks-text)', lineHeight: 1.6, maxWidth: '100%' }}>
                          {m.bio}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default withAuth(DirectoryPage)
