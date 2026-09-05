'use client'
import { useState, useEffect } from 'react'
import withAuth from '@/components/withAuth'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Image, Plus, Camera, ChevronRight } from 'lucide-react'

function PhotosPage({ member }) {
  const [albums, setAlbums] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newAlbum, setNewAlbum] = useState({ name: '', description: '' })
  const [creating, setCreating] = useState(false)
  const isAdmin = member?.role === 'admin'

  useEffect(() => { loadAlbums() }, [])

  async function loadAlbums() {
    setLoading(true)
    const { data } = await supabase
      .from('albums')
      .select('*, creator:members!albums_created_by_fkey(full_name), files(id)')
      .order('created_at', { ascending: false })
    setAlbums(data || [])
    setLoading(false)
  }

  async function handleCreateAlbum(e) {
    e.preventDefault()
    setCreating(true)
    const { data, error } = await supabase
      .from('albums')
      .insert({ name: newAlbum.name, description: newAlbum.description, created_by: member.id })
      .select()
      .single()
    if (!error && data) {
      setShowCreate(false)
      setNewAlbum({ name: '', description: '' })
      loadAlbums()
    }
    setCreating(false)
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Photo Albums</h1>
          <p style={{ color: 'var(--ks-text-muted)', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem' }}>
            Chapter photos and memories.
          </p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={15} /> New Album
        </button>
      </div>

      {/* Create album form */}
      {showCreate && (
        <div className="card" style={{ marginBottom: '1.5rem', borderColor: 'var(--ks-gold)' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Create New Album</h3>
          <form onSubmit={handleCreateAlbum}>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label className="field-label">Album name</label>
                <input className="field-input" value={newAlbum.name}
                  onChange={e => setNewAlbum(a => ({ ...a, name: e.target.value }))}
                  required placeholder="e.g. Fall Reunion 2026" />
              </div>
              <div>
                <label className="field-label">Description (optional)</label>
                <input className="field-input" value={newAlbum.description}
                  onChange={e => setNewAlbum(a => ({ ...a, description: e.target.value }))}
                  placeholder="Brief description of this album" />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn-primary" type="submit" disabled={creating}>
                  {creating ? 'Creating…' : 'Create album'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Albums grid */}
      {loading ? (
        <p style={{ fontFamily: 'Inter, sans-serif', color: 'var(--ks-text-muted)' }}>Loading…</p>
      ) : albums.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Camera size={40} style={{ color: 'var(--ks-border)', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--ks-text-muted)', fontFamily: 'Inter, sans-serif', marginBottom: '1rem' }}>
            No photo albums yet. Create the first one!
          </p>
          <button onClick={() => setShowCreate(true)} className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <Plus size={14} /> Create Album
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
          {albums.map(album => (
            <Link key={album.id} href={`/photos/${album.id}`} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                onMouseOver={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'}
                onMouseOut={e => e.currentTarget.style.boxShadow = 'none'}>
                {/* Cover photo placeholder */}
                <div style={{
                  height: '160px', background: 'linear-gradient(135deg, var(--ks-navy) 0%, var(--ks-crimson) 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
                }}>
                  {album.cover_url ? (
                    <img src={album.cover_url} alt={album.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Image size={40} style={{ color: 'rgba(255,255,255,0.3)' }} />
                  )}
                  <div style={{
                    position: 'absolute', bottom: '0.5rem', right: '0.5rem',
                    background: 'rgba(0,0,0,0.5)', color: 'white',
                    fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', fontWeight: 600,
                    padding: '0.2rem 0.5rem', borderRadius: '10px'
                  }}>
                    {album.files?.length || 0} photo{album.files?.length !== 1 ? 's' : ''}
                  </div>
                </div>
                {/* Album info */}
                <div style={{ padding: '0.9rem 1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--ks-text)' }}>
                      {album.name}
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--ks-text-muted)', flexShrink: 0 }} />
                  </div>
                  {album.description && (
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', color: 'var(--ks-text-muted)', marginTop: '0.25rem' }}>
                      {album.description}
                    </div>
                  )}
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: 'var(--ks-text-muted)', marginTop: '0.35rem' }}>
                    By {album.creator?.full_name} · {new Date(album.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default withAuth(PhotosPage)
