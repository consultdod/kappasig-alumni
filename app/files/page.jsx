'use client'
import { useState, useEffect, useRef } from 'react'
import withAuth from '@/components/withAuth'
import { supabase } from '@/lib/supabase'
import { Upload, Download, Trash2, FileText, Search } from 'lucide-react'

const FILE_ICONS = {
  'application/pdf': '📄',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'application/vnd.ms-excel': '📊',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
  'text/plain': '📃',
  'image/jpeg': '🖼️',
  'image/png': '🖼️',
  'image/gif': '🖼️',
  'image/webp': '🖼️',
  default: '📎',
}

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]

function formatSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}

function FilesPage({ member }) {
  const fileRef = useRef(null)
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const isAdmin = member?.role === 'admin'

  useEffect(() => { loadFiles() }, [])

  async function loadFiles() {
    setLoading(true)
    const { data, error } = await supabase
      .from('files')
      .select('*, uploader:members!files_uploaded_by_fkey(full_name)')
      .eq('file_type', 'document')
      .order('created_at', { ascending: false })
    if (error) console.error('Load error:', error)
    setFiles(data || [])
    setLoading(false)
  }

  async function handleUpload(fileList) {
    setUploadMsg('')
    const allFiles = Array.from(fileList)

    // Accept all files — filter out truly unsupported ones
    // For files with empty type (common on Windows), trust the extension
    const validFiles = allFiles.filter(f => {
      if (ALLOWED_TYPES.includes(f.type)) return true
      // Check by extension if type is missing
      const ext = f.name.split('.').pop().toLowerCase()
      return ['pdf','doc','docx','xls','xlsx','txt','jpg','jpeg','png','gif','webp'].includes(ext)
    })

    if (validFiles.length === 0) {
      setUploadMsg('error:No supported files found. Allowed: PDF, Word, Excel, images, text.')
      return
    }

    setUploading(true)
    let successCount = 0
    let errors = []

    for (const file of validFiles) {
      try {
        const ext = file.name.split('.').pop().toLowerCase()
        const path = `${member.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

        // Determine mime type from extension if browser didn't provide it
        const mimeMap = {
          pdf: 'application/pdf',
          doc: 'application/msword',
          docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          xls: 'application/vnd.ms-excel',
          xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          txt: 'text/plain',
          jpg: 'image/jpeg', jpeg: 'image/jpeg',
          png: 'image/png', gif: 'image/gif', webp: 'image/webp',
        }
        const mimeType = file.type || mimeMap[ext] || 'application/octet-stream'

        const { error: upErr } = await supabase.storage
          .from('documents')
          .upload(path, file, { contentType: mimeType })

        if (upErr) {
          console.error('Storage upload error:', upErr)
          errors.push(`${file.name}: ${upErr.message}`)
          continue
        }

        // Get signed URL since bucket is private
        const { data: signedData, error: signErr } = await supabase.storage
          .from('documents')
          .createSignedUrl(path, 60 * 60 * 24 * 365)

        if (signErr) {
          console.error('Signed URL error:', signErr)
          errors.push(`${file.name}: Could not create download link`)
          continue
        }

        const { error: dbErr } = await supabase.from('files').insert({
          name: file.name,
          storage_path: path,
          url: signedData.signedUrl,
          file_type: 'document',
          mime_type: mimeType,
          size_bytes: file.size,
          uploaded_by: member.id,
        })

        if (dbErr) {
          console.error('DB insert error:', dbErr)
          errors.push(`${file.name}: ${dbErr.message}`)
          continue
        }

        successCount++
      } catch (err) {
        console.error('Unexpected error:', err)
        errors.push(`${file.name}: ${err.message}`)
      }
    }

    setUploading(false)

    if (errors.length > 0) {
      setUploadMsg(`error:${errors.join(' | ')}`)
    } else {
      setUploadMsg(`success:${successCount} file${successCount !== 1 ? 's' : ''} uploaded successfully.`)
    }

    loadFiles()
  }

  async function handleDelete(file) {
    if (!confirm(`Delete "${file.name}"? This cannot be undone.`)) return
    setDeleting(file.id)
    await supabase.storage.from('documents').remove([file.storage_path])
    await supabase.from('files').delete().eq('id', file.id)
    setDeleting(null)
    loadFiles()
  }

  async function getDownloadUrl(file) {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(file.storage_path, 300)
    if (error) {
      alert('Could not generate download link. The file may have been moved or deleted.')
      return
    }
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const canDelete = (file) => isAdmin || file.uploaded_by === member.id

  const filtered = files.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.uploader?.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })

  return (
    <div style={{ maxWidth: '860px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Documents & Files</h1>
          <p style={{ color: 'var(--ks-text-muted)', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem' }}>
            Shared chapter documents, images, and files.
          </p>
        </div>
        <button onClick={() => fileRef.current.click()} className="btn-primary"
          disabled={uploading}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Upload size={15} /> {uploading ? 'Uploading…' : 'Upload File'}
        </button>
      </div>

      <input ref={fileRef} type="file" multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.webp"
        style={{ display: 'none' }}
        onChange={e => handleUpload(e.target.files)} />

      {/* Upload result message */}
      {uploadMsg && (
        <div className={uploadMsg.startsWith('error:') ? 'alert-error' : 'alert-success'}
          style={{ marginBottom: '1rem' }}
          onClick={() => setUploadMsg('')}>
          {uploadMsg.startsWith('error:') ? uploadMsg.slice(6) : uploadMsg.slice(8)}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files) }}
        onClick={() => fileRef.current.click()}
        style={{
          border: `2px dashed ${dragOver ? 'var(--ks-crimson)' : 'var(--ks-border)'}`,
          borderRadius: '6px', padding: '1.25rem', textAlign: 'center',
          marginBottom: '1.5rem', cursor: 'pointer',
          background: dragOver ? 'var(--ks-gold-pale)' : 'var(--ks-fog)',
          transition: 'all 0.15s',
          fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', color: 'var(--ks-text-muted)'
        }}>
        <Upload size={18} style={{ color: 'var(--ks-crimson)', marginBottom: '0.35rem' }} />
        <div>Drop files here or click to upload</div>
        <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
          PDF, Word, Excel, images (JPG, PNG) · Max 25MB each
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: '360px', marginBottom: '1.5rem' }}>
        <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--ks-text-muted)' }} />
        <input className="field-input" placeholder="Search files…" value={search}
          onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.25rem' }} />
      </div>

      {/* File list */}
      {loading ? (
        <p style={{ fontFamily: 'Inter, sans-serif', color: 'var(--ks-text-muted)' }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <FileText size={36} style={{ color: 'var(--ks-border)', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--ks-text-muted)', fontFamily: 'Inter, sans-serif' }}>
            {search ? 'No files match your search.' : 'No files uploaded yet.'}
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--ks-fog)', borderBottom: '1px solid var(--ks-border)' }}>
                {['File', 'Uploaded by', 'Date', 'Size', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left',
                    fontFamily: 'Inter, sans-serif', fontSize: '0.73rem', fontWeight: 600,
                    color: 'var(--ks-slate)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((file, i) => {
                const icon = FILE_ICONS[file.mime_type] || FILE_ICONS.default
                return (
                  <tr key={file.id} style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--ks-border)' : 'none',
                    background: i % 2 === 0 ? 'white' : 'var(--ks-fog)'
                  }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{icon}</span>
                        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem',
                          fontWeight: 500, color: 'var(--ks-text)',
                          wordBreak: 'break-word', maxWidth: '280px' }}>
                          {file.name}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'Inter, sans-serif',
                      fontSize: '0.8rem', color: 'var(--ks-text-muted)' }}>
                      {file.uploader?.full_name || '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'Inter, sans-serif',
                      fontSize: '0.8rem', color: 'var(--ks-text-muted)', whiteSpace: 'nowrap' }}>
                      {formatDate(file.created_at)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'Inter, sans-serif',
                      fontSize: '0.8rem', color: 'var(--ks-text-muted)', whiteSpace: 'nowrap' }}>
                      {formatSize(file.size_bytes)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button onClick={() => getDownloadUrl(file)}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.3rem',
                            padding: '0.3rem 0.65rem', border: '1px solid var(--ks-border)',
                            borderRadius: '4px', background: 'white', cursor: 'pointer',
                            fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: 'var(--ks-slate)' }}>
                          <Download size={12} /> Download
                        </button>
                        {canDelete(file) && (
                          <button onClick={() => handleDelete(file)} disabled={deleting === file.id}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem',
                              padding: '0.3rem 0.65rem', border: '1px solid #FCA5A5',
                              borderRadius: '4px', background: 'white', cursor: 'pointer',
                              fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: '#991B1B' }}>
                            <Trash2 size={12} /> {deleting === file.id ? '…' : 'Delete'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default withAuth(FilesPage)
