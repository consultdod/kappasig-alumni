'use client'
import { useState, useEffect, useRef } from 'react'
import withAuth from '@/components/withAuth'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, X, Trash2, Download, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'

function AlbumPage({ member }) {
  const { albumId } = useParams()
  const router = useRouter()
  const fileRef = useRef(null)
  const [album, setAlbum] = useState(null)
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [lightbox, setLightbox] = useState(null) // index of photo in lightbox
  const [deleting, setDeleting] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const isAdmin = member?.role === 'admin'

  useEffect(() => { loadAlbum() }, [albumId])

  // Keyboard nav for lightbox
  useEffect(() => {
    function handleKey(e) {
      if (lightbox === null) return
      if (e.key === 'ArrowRight') setLightbox(i => Math.min(i + 1, photos.length - 1))
      if (e.key === 'ArrowLeft') setLightbox(i => Math.max(i - 1, 0))
      if (e.key === 'Escape') setLightbox(null)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [lightbox, photos.length])

  async function loadAlbum() {
    setLoading(true)
    const { data: alb } = await supabase
      .from('albums')
      .select('*, creator:members!albums_created_by_fkey(full_name, id)')
      .eq('id', albumId)
      .single()
    setAlbum(alb)

    const { data: files } = await supabase
      .from('files')
      .select('*, uploader:members!files_uploaded_by_fkey(full_name)')
      .eq('album_id', albumId)
      .eq('file_type', 'photo')
      .order('created_at', { ascending: false })
    setPhotos(files || [])
    setLoading(false)
  }

  async function handleUpload(fileList) {
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'))
    if (files.length === 0) return
    setUploading(true)
    setUploadProgress(0)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const ext = file.name.split('.').pop()
      const path = `${albumId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

      const { error: upErr } = await supabase.storage.from('photos').upload(path, file)
      if (upErr) { console.error('Upload error:', upErr); continue }

      const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path)

      await supabase.from('files').insert({
        name: file.name,
        storage_path: path,
        url: publicUrl,
        file_type: 'photo',
        mime_type: file.type,
        size_bytes: file.size,
        album_id: albumId,
        uploaded_by: member.id,
      })
      setUploadProgress(Math.round(((i + 1) / files.length) * 100))
    }

    setUploading(false)
    setUploadProgress(0)
    loadAlbum()
  }

  async function handleDelete(photo) {
    if (!confirm('Delete this photo? This cannot be undone.')) return
    setDeleting(photo.id)
    await supabase.storage.from('photos').remove([photo.storage_path])
    await supabase.from('files').delete().eq('id', photo.id)
    if (lightbox !== null) setLightbox(null)
    setDeleting(null)
    loadAlbum()
  }

  async function handleDeleteAlbum() {
    if (!confirm('Delete this entire album and all its photos? This cannot be undone.')) return
    // Delete all storage files
    if (photos.length > 0) {
      const paths = photos.map(p => p.storage_path)
      await supabase.storage.from('photos').remove(paths)
    }
    await supabase.from('albums').delete().eq('id', albumId)
    router.push('/photos')
  }

  const canDelete = (photo) => isAdmin || photo.uploaded_by === member.id

  if (loading) return <p style={{ fontFamily: 'Inter, sans-serif', color: 'var(--ks-text-muted)' }}>Loading…</p>
  if (!album) return <p style={{ fontFamily: 'Inter, sans-serif', color: 'var(--ks-text-muted)' }}>Album not found.</p>

  const currentPhoto = lightbox !== null ? photos[lightbox] : null

  return (
    <div>
      {/* Back */}
      <Link href="/photos" style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
        color: 'var(--ks-text-muted)', fontFamily: 'Inter, sans-serif', fontSize: '0.85rem',
        textDecoration: 'none', marginBottom: '1.5rem'
      }}>
        <ArrowLeft size={14} /> Back to Albums
      </Link>

      {/* Album header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>{album.name}</h1>
          {album.description && (
            <p style={{ color: 'var(--ks-text-muted)', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem' }}>
              {album.description}
            </p>
          )}
          <p style={{ color: 'var(--ks-text-muted)', fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', marginTop: '0.25rem' }}>
            {photos.length} photo{photos.length !== 1 ? 's' : ''} · Created by {album.creator?.full_name}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={() => fileRef.current.click()} className="btn-primary"
            disabled={uploading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Upload size={15} /> {uploading ? `Uploading ${uploadProgress}%…` : 'Upload Photos'}
          </button>
          {(isAdmin || album.creator?.id === member.id) && (
            <button onClick={handleDeleteAlbum}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.6rem 1rem', border: '1.5px solid #FCA5A5',
                borderRadius: '4px', background: 'white', cursor: 'pointer',
                fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: '#991B1B',
              }}>
              <Trash2 size={14} /> Delete Album
            </button>
          )}
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
        onChange={e => handleUpload(e.target.files)} />

      {/* Drop zone when no photos */}
      {photos.length === 0 ? (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files) }}
          onClick={() => fileRef.current.click()}
          style={{
            border: `2px dashed ${dragOver ? 'var(--ks-crimson)' : 'var(--ks-border)'}`,
            borderRadius: '8px', padding: '4rem 2rem', textAlign: 'center', cursor: 'pointer',
            background: dragOver ? 'var(--ks-gold-pale)' : 'white', transition: 'all 0.15s'
          }}>
          <Upload size={36} style={{ color: 'var(--ks-crimson)', marginBottom: '1rem' }} />
          <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, marginBottom: '0.35rem' }}>
            Drop photos here or click to upload
          </p>
          <p style={{ fontFamily: 'Inter, sans-serif', color: 'var(--ks-text-muted)', fontSize: '0.85rem' }}>
            JPG, PNG, WebP supported
          </p>
        </div>
      ) : (
        <>
          {/* Inline drop zone strip when photos exist */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files) }}
            style={{
              border: `2px dashed ${dragOver ? 'var(--ks-crimson)' : 'var(--ks-border)'}`,
              borderRadius: '6px', padding: '0.75rem', textAlign: 'center',
              marginBottom: '1.25rem', background: dragOver ? 'var(--ks-gold-pale)' : 'var(--ks-fog)',
              fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', color: 'var(--ks-text-muted)',
              cursor: 'pointer', transition: 'all 0.15s'
            }}
            onClick={() => fileRef.current.click()}>
            Drop more photos here or click to add
          </div>

          {/* Photo grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
            {photos.map((photo, idx) => (
              <div key={photo.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: '6px', overflow: 'hidden',
                background: 'var(--ks-fog)', cursor: 'pointer' }}
                onClick={() => setLightbox(idx)}>
                <img src={photo.url} alt={photo.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.2s' }}
                  onMouseOver={e => e.target.style.transform = 'scale(1.04)'}
                  onMouseOut={e => e.target.style.transform = 'scale(1)'}
                />
                {/* Zoom hint */}
                <div style={{
                  position: 'absolute', top: '0.4rem', right: '0.4rem',
                  background: 'rgba(0,0,0,0.45)', borderRadius: '4px', padding: '0.2rem 0.3rem',
                  opacity: 0, transition: 'opacity 0.15s'
                }} className="zoom-hint">
                  <ZoomIn size={14} style={{ color: 'white' }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Lightbox */}
      {currentPhoto && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
          zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
          onClick={() => setLightbox(null)}>
          {/* Close */}
          <button onClick={() => setLightbox(null)}
            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.15)',
              border: 'none', borderRadius: '50%', width: '40px', height: '40px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
            <X size={20} />
          </button>

          {/* Prev */}
          {lightbox > 0 && (
            <button onClick={e => { e.stopPropagation(); setLightbox(i => i - 1) }}
              style={{ position: 'absolute', left: '1rem', background: 'rgba(255,255,255,0.15)',
                border: 'none', borderRadius: '50%', width: '44px', height: '44px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
              <ChevronLeft size={22} />
            </button>
          )}

          {/* Next */}
          {lightbox < photos.length - 1 && (
            <button onClick={e => { e.stopPropagation(); setLightbox(i => i + 1) }}
              style={{ position: 'absolute', right: '1rem', background: 'rgba(255,255,255,0.15)',
                border: 'none', borderRadius: '50%', width: '44px', height: '44px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
              <ChevronRight size={22} />
            </button>
          )}

          {/* Photo */}
          <img src={currentPhoto.url} alt={currentPhoto.name}
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '4px' }} />

          {/* Caption bar */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
            padding: '2rem 1.5rem 1.25rem',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end'
          }} onClick={e => e.stopPropagation()}>
            <div>
              <div style={{ color: 'white', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: 500 }}>
                {currentPhoto.name}
              </div>
              <div style={{ color: '#94A3B8', fontFamily: 'Inter, sans-serif', fontSize: '0.775rem', marginTop: '0.2rem' }}>
                Uploaded by {currentPhoto.uploader?.full_name} ·{' '}
                {new Date(currentPhoto.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                {' '}· {lightbox + 1} of {photos.length}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <a href={currentPhoto.url} download={currentPhoto.name} target="_blank" rel="noreferrer"
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '6px',
                  padding: '0.5rem 0.75rem', color: 'white', cursor: 'pointer', textDecoration: 'none',
                  display: 'flex', alignItems: 'center', gap: '0.3rem',
                  fontFamily: 'Inter, sans-serif', fontSize: '0.8rem' }}>
                <Download size={14} /> Save
              </a>
              {canDelete(currentPhoto) && (
                <button onClick={() => handleDelete(currentPhoto)} disabled={deleting === currentPhoto.id}
                  style={{ background: 'rgba(220,38,38,0.7)', border: 'none', borderRadius: '6px',
                    padding: '0.5rem 0.75rem', color: 'white', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                    fontFamily: 'Inter, sans-serif', fontSize: '0.8rem' }}>
                  <Trash2 size={14} /> Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default withAuth(AlbumPage)
