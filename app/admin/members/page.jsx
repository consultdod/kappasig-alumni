'use client'
import { useState, useEffect } from 'react'
import withAuth from '@/components/withAuth'
import { supabase } from '@/lib/supabase'
import { Search, UserCheck, UserX, Shield, User, Pencil } from 'lucide-react'
import Link from 'next/link'

function ManageMembersPage({ member: adminMember }) {
  const [members, setMembers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState('')

  useEffect(() => { loadMembers() }, [])

  async function loadMembers() {
    setLoading(true)
    const { data } = await supabase
      .from('members')
      .select('*')
      .order('full_name', { ascending: true })
    setMembers(data || [])
    setLoading(false)
  }

  async function toggleStatus(m) {
    const newStatus = m.status === 'active' ? 'inactive' : 'active'
    await supabase.from('members').update({ status: newStatus }).eq('id', m.id)
    setActionMsg(`${m.full_name} marked as ${newStatus}.`)
    loadMembers()
  }

  async function toggleRole(m) {
    if (m.id === adminMember.id) return // Can't change own role
    const newRole = m.role === 'admin' ? 'member' : 'admin'
    await supabase.from('members').update({ role: newRole }).eq('id', m.id)
    setActionMsg(`${m.full_name} is now a${newRole === 'admin' ? 'n admin' : ' member'}.`)
    loadMembers()
  }

  const filtered = members.filter(m =>
    m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase())
  )

  const adminCount = members.filter(m => m.role === 'admin').length

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.25rem' }}>Manage Members</h1>
        <p style={{ color: 'var(--ks-text-muted)', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem' }}>
          {members.length} total members · {members.filter(m => m.status === 'active').length} active · {adminCount} administrators
        </p>
      </div>

      {actionMsg && (
        <div className="alert-success" style={{ marginBottom: '1rem' }} onClick={() => setActionMsg('')}>
          {actionMsg}
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: '360px', marginBottom: '1.5rem' }}>
        <Search size={15} style={{
          position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)',
          color: 'var(--ks-text-muted)'
        }} />
        <input
          className="field-input"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: '2.25rem' }}
        />
      </div>

      {loading ? (
        <p style={{ fontFamily: 'Inter, sans-serif', color: 'var(--ks-text-muted)' }}>Loading…</p>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--ks-fog)', borderBottom: '1px solid var(--ks-border)' }}>
                {['Name', 'Email', 'Phone', 'Year Went Active', 'Role', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{
                    padding: '0.75rem 1rem', textAlign: 'left',
                    fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', fontWeight: 600,
                    color: 'var(--ks-slate)'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => (
                <tr key={m.id} style={{
                  borderBottom: i < filtered.length - 1 ? '1px solid var(--ks-border)' : 'none',
                  background: i % 2 === 0 ? 'white' : 'var(--ks-fog)'
                }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.875rem' }}>
                    {m.full_name}
                    {m.id === adminMember.id && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--ks-text-muted)', fontFamily: 'Inter, sans-serif', marginLeft: '0.4rem' }}>(you)</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: 'var(--ks-text-muted)' }}>
                    {m.email}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: 'var(--ks-text-muted)' }}>
                    {m.phone || '—'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: 'var(--ks-text-muted)' }}>
                    {m.grad_year || '—'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span className={`badge ${m.role === 'admin' ? 'badge-admin' : 'badge-member'}`}>
                      {m.role}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span className={`badge ${m.status === 'active' ? 'badge-active' : 'badge-inactive'}`}>
                      {m.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => toggleStatus(m)}
                        title={m.status === 'active' ? 'Deactivate' : 'Activate'}
                        style={{
                          padding: '0.3rem 0.6rem', border: '1px solid var(--ks-border)',
                          borderRadius: '4px', background: 'white', cursor: 'pointer',
                          fontFamily: 'Inter, sans-serif', fontSize: '0.75rem',
                          display: 'flex', alignItems: 'center', gap: '0.3rem',
                          color: m.status === 'active' ? '#991B1B' : '#166534'
                        }}
                      >
                        {m.status === 'active' ? <><UserX size={12} /> Deactivate</> : <><UserCheck size={12} /> Activate</>}
                      </button>
                      {m.id !== adminMember.id && (adminCount < 3 || m.role === 'admin') && (
                        <button
                          onClick={() => toggleRole(m)}
                          title={m.role === 'admin' ? 'Remove admin' : 'Make admin'}
                          style={{
                            padding: '0.3rem 0.6rem', border: '1px solid var(--ks-border)',
                            borderRadius: '4px', background: 'white', cursor: 'pointer',
                            fontFamily: 'Inter, sans-serif', fontSize: '0.75rem',
                            display: 'flex', alignItems: 'center', gap: '0.3rem',
                            color: 'var(--ks-slate)'
                          }}
                        >
                          {m.role === 'admin' ? <><User size={12} /> Remove admin</> : <><Shield size={12} /> Make admin</>}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--ks-text-muted)', fontFamily: 'Inter, sans-serif' }}>
                    No members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default withAuth(ManageMembersPage, { adminOnly: true })

