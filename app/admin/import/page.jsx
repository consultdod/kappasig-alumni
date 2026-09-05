'use client'
import { useState, useRef } from 'react'
import withAuth from '@/components/withAuth'
import { Upload, Download, CheckCircle, XCircle, AlertCircle, FileText, ChevronDown, ChevronUp } from 'lucide-react'

// ── CSV parser (no library needed) ──────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return { headers: [], rows: [] }

  // Handle quoted fields
  function splitLine(line) {
    const result = []
    let inQuotes = false
    let current = ''
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; continue }
      if (ch === '"') { inQuotes = !inQuotes; continue }
      if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue }
      current += ch
    }
    result.push(current.trim())
    return result
  }

  const headers = splitLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'))
  const rows = lines.slice(1).filter(l => l.trim()).map(line => {
    const values = splitLine(line)
    const obj = {}
    headers.forEach((h, i) => { obj[h] = values[i] || '' })
    return obj
  })
  return { headers, rows }
}

// ── Column mapping: CSV header → member field ────────────────────────────────
const FIELD_MAP = {
  // full_name aliases
  full_name: 'full_name', name: 'full_name', member_name: 'full_name',
  first_last: 'full_name',
  // email aliases
  email: 'email', email_address: 'email', e_mail: 'email',
  // phone aliases
  phone: 'phone', mobile: 'phone', cell: 'phone', mobile_number: 'phone',
  phone_number: 'phone', cell_phone: 'phone',
  // grad year aliases
  grad_year: 'grad_year', graduation_year: 'grad_year', class_year: 'grad_year',
  year: 'grad_year', graduation: 'grad_year', class: 'grad_year',
  // bio aliases
  bio: 'bio', about: 'bio', notes: 'bio',
}

function mapRow(raw) {
  const mapped = { full_name: '', email: '', phone: '', grad_year: '', bio: '' }
  for (const [key, val] of Object.entries(raw)) {
    const field = FIELD_MAP[key]
    if (field) mapped[field] = val
  }
  return mapped
}

function validateRow(row, index) {
  const errors = []
  if (!row.full_name) errors.push('Name is required')
  if (!row.email) errors.push('Email is required')
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push('Email is invalid')
  if (row.grad_year && (isNaN(row.grad_year) || row.grad_year < 1900 || row.grad_year > new Date().getFullYear()))
    errors.push('Grad year must be a valid 4-digit year')
  return errors
}

// ── TEMPLATE download ────────────────────────────────────────────────────────
function downloadTemplate() {
  const header = 'full_name,email,phone,grad_year,bio'
  const example = [
    'John Smith,john.smith@example.com,(337) 555-0101,1998,Chapter president 1997-98.',
    'Mary Johnson,mary.j@example.com,(337) 555-0102,2003,',
    'Robert Thibodaux,rthibodaux@example.com,,2010,',
  ].join('\n')
  const csv = header + '\n' + example
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'kappasig_members_template.csv'; a.click()
  URL.revokeObjectURL(url)
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
function ImportMembersPage() {
  const fileRef = useRef(null)
  const [stage, setStage] = useState('upload')   // upload | preview | importing | done
  const [parsed, setParsed] = useState([])        // { mapped, errors, raw }[]
  const [fileName, setFileName] = useState('')
  const [results, setResults] = useState([])      // import results per row
  const [showErrors, setShowErrors] = useState(false)
  const [sendInvites, setSendInvites] = useState(true)
  const [dragOver, setDragOver] = useState(false)

  function handleFile(file) {
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const { rows } = parseCSV(e.target.result)
      const parsed = rows.map((raw, i) => {
        const mapped = mapRow(raw)
        const errors = validateRow(mapped, i)
        return { mapped, errors, raw, selected: errors.length === 0 }
      })
      setParsed(parsed)
      setStage('preview')
    }
    reader.readAsText(file)
  }

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file?.name.endsWith('.csv')) handleFile(file)
  }

  function toggleRow(i) {
    setParsed(p => p.map((r, idx) => idx === i ? { ...r, selected: !r.selected } : r))
  }

  function editField(rowIdx, field, value) {
    setParsed(p => p.map((r, i) => {
      if (i !== rowIdx) return r
      const mapped = { ...r.mapped, [field]: value }
      const errors = validateRow(mapped, i)
      return { ...r, mapped, errors, selected: errors.length === 0 }
    }))
  }

  const validRows = parsed.filter(r => r.selected && r.errors.length === 0)
  const errorRows = parsed.filter(r => r.errors.length > 0)

  async function handleImport() {
    setStage('importing')
    const res = await fetch('/api/import-members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        members: validRows.map(r => r.mapped),
        sendInvites,
      }),
    })
    const data = await res.json()
    setResults(data.results || [])
    setStage('done')
  }

  const importedOk = results.filter(r => r.success).length
  const importedFail = results.filter(r => !r.success).length

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '860px' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.25rem' }}>Import Members</h1>
        <p style={{ color: 'var(--ks-text-muted)', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem' }}>
          Upload a CSV file to add multiple members at once. You can edit any row before importing.
        </p>
      </div>

      {/* Progress steps */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: '2rem', fontFamily: 'Inter, sans-serif' }}>
        {['Upload', 'Preview & Edit', 'Import'].map((label, i) => {
          const stageIdx = stage === 'upload' ? 0 : (stage === 'preview' ? 1 : 2)
          const done = i < stageIdx
          const active = i === stageIdx
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                  background: done ? 'var(--ks-crimson)' : active ? 'var(--ks-crimson)' : 'var(--ks-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: done || active ? 'white' : 'var(--ks-text-muted)',
                  fontSize: '0.75rem', fontWeight: 700
                }}>
                  {done ? '✓' : i + 1}
                </div>
                <span style={{
                  fontSize: '0.8rem', fontWeight: active ? 600 : 400,
                  color: active ? 'var(--ks-crimson)' : done ? 'var(--ks-text)' : 'var(--ks-text-muted)'
                }}>{label}</span>
              </div>
              {i < 2 && <div style={{ flex: 1, height: '1px', background: 'var(--ks-border)', margin: '0 0.75rem' }} />}
            </div>
          )
        })}
      </div>

      {/* ── STAGE: UPLOAD ─────────────────────────────────────────── */}
      {stage === 'upload' && (
        <div>
          {/* Template download */}
          <div className="alert-info" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <strong>Start with the template.</strong> Download the CSV template, fill it in with your member list, then upload it here.
            </div>
            <button onClick={downloadTemplate} className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
              <Download size={14} /> Download Template
            </button>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current.click()}
            style={{
              border: `2px dashed ${dragOver ? 'var(--ks-crimson)' : 'var(--ks-border)'}`,
              borderRadius: '8px',
              padding: '3rem 2rem',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragOver ? 'var(--ks-gold-pale)' : 'white',
              transition: 'all 0.15s'
            }}
          >
            <Upload size={36} style={{ color: 'var(--ks-crimson)', marginBottom: '1rem' }} />
            <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.35rem' }}>
              Drop your CSV file here, or click to browse
            </p>
            <p style={{ fontFamily: 'Inter, sans-serif', color: 'var(--ks-text-muted)', fontSize: '0.8rem' }}>
              Accepts .csv files only
            </p>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files[0])} />
          </div>

          {/* Column guide */}
          <div className="card" style={{ marginTop: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Accepted column names</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter, sans-serif', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: 'var(--ks-fog)' }}>
                  {['Field', 'Required', 'Accepted column headers'].map(h => (
                    <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: 'var(--ks-slate)', fontWeight: 600, borderBottom: '1px solid var(--ks-border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Full Name', 'Yes', 'full_name, name, member_name'],
                  ['Email', 'Yes', 'email, email_address, e_mail'],
                  ['Phone', 'No', 'phone, mobile, cell, phone_number, mobile_number, cell_phone'],
                  ['Grad Year', 'No', 'grad_year, graduation_year, class_year, year, class'],
                  ['Bio / Notes', 'No', 'bio, about, notes'],
                ].map(([field, req, cols], i) => (
                  <tr key={field} style={{ background: i % 2 === 0 ? 'white' : 'var(--ks-fog)' }}>
                    <td style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>{field}</td>
                    <td style={{ padding: '0.55rem 0.75rem' }}>
                      <span className={`badge ${req === 'Yes' ? 'badge-admin' : 'badge-member'}`}>{req}</span>
                    </td>
                    <td style={{ padding: '0.55rem 0.75rem', color: 'var(--ks-text-muted)' }}>{cols}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.775rem', color: 'var(--ks-text-muted)', marginTop: '0.75rem' }}>
              Column names are not case-sensitive. Extra columns in your CSV are safely ignored.
            </p>
          </div>
        </div>
      )}

      {/* ── STAGE: PREVIEW ────────────────────────────────────────── */}
      {stage === 'preview' && (
        <div>
          {/* Summary bar */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="card" style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={16} style={{ color: 'var(--ks-crimson)' }} />
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem' }}>
                <strong>{parsed.length}</strong> rows from <strong>{fileName}</strong>
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span className="badge badge-active">{validRows.length} ready</span>
              {errorRows.length > 0 && <span className="badge badge-inactive">{errorRows.length} have errors</span>}
            </div>
            <button onClick={() => { setStage('upload'); setParsed([]); setFileName('') }}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ks-text-muted)', fontFamily: 'Inter, sans-serif', fontSize: '0.8rem' }}>
              ← Choose different file
            </button>
          </div>

          {/* Error rows notice */}
          {errorRows.length > 0 && (
            <div className="alert-error" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span><strong>{errorRows.length} row{errorRows.length > 1 ? 's' : ''}</strong> have validation errors. Fix them inline below or uncheck to skip them.</span>
                <button onClick={() => setShowErrors(!showErrors)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: 'Inter, sans-serif', fontSize: '0.8rem' }}>
                  {showErrors ? <><ChevronUp size={14} /> Hide</> : <><ChevronDown size={14} /> Show errors only</>}
                </button>
              </div>
            </div>
          )}

          {/* Preview table */}
          <div className="card" style={{ padding: 0, overflow: 'auto', marginBottom: '1.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '680px' }}>
              <thead>
                <tr style={{ background: 'var(--ks-fog)', borderBottom: '1px solid var(--ks-border)' }}>
                  {['', 'Full Name', 'Email', 'Phone', 'Grad Year', 'Bio', 'Status'].map(h => (
                    <th key={h} style={{
                      padding: '0.6rem 0.75rem', textAlign: 'left',
                      fontFamily: 'Inter, sans-serif', fontSize: '0.73rem', fontWeight: 600,
                      color: 'var(--ks-slate)', whiteSpace: 'nowrap'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed
                  .filter(r => !showErrors || r.errors.length > 0)
                  .map((row, visIdx) => {
                    // find real index in parsed array
                    const realIdx = parsed.indexOf(row)
                    const hasError = row.errors.length > 0
                    return (
                      <tr key={realIdx} style={{
                        borderBottom: '1px solid var(--ks-border)',
                        background: !row.selected ? '#FAFAFA' : hasError ? '#FFF5F5' : visIdx % 2 === 0 ? 'white' : 'var(--ks-fog)',
                        opacity: row.selected ? 1 : 0.55
                      }}>
                        {/* Checkbox */}
                        <td style={{ padding: '0.5rem 0.5rem 0.5rem 0.75rem' }}>
                          <input type="checkbox" checked={row.selected} onChange={() => toggleRow(realIdx)}
                            style={{ accentColor: 'var(--ks-crimson)', width: '15px', height: '15px', cursor: 'pointer' }} />
                        </td>
                        {/* Editable fields */}
                        {['full_name', 'email', 'phone', 'grad_year', 'bio'].map(field => (
                          <td key={field} style={{ padding: '0.35rem 0.5rem' }}>
                            <input
                              value={row.mapped[field] || ''}
                              onChange={e => editField(realIdx, field, e.target.value)}
                              style={{
                                width: field === 'bio' ? '160px' : field === 'email' ? '180px' : field === 'full_name' ? '150px' : '80px',
                                border: `1px solid ${hasError && ['full_name', 'email'].includes(field) && !row.mapped[field] ? '#FCA5A5' : 'var(--ks-border)'}`,
                                borderRadius: '3px', padding: '0.3rem 0.45rem',
                                fontFamily: 'Inter, sans-serif', fontSize: '0.78rem',
                                background: 'white', outline: 'none'
                              }}
                              onFocus={e => e.target.style.borderColor = 'var(--ks-crimson)'}
                              onBlur={e => e.target.style.borderColor = 'var(--ks-border)'}
                            />
                          </td>
                        ))}
                        {/* Status */}
                        <td style={{ padding: '0.5rem 0.75rem' }}>
                          {hasError ? (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.3rem' }}>
                              <XCircle size={14} style={{ color: '#DC2626', flexShrink: 0, marginTop: '1px' }} />
                              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', color: '#991B1B' }}>
                                {row.errors.join('; ')}
                              </span>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <CheckCircle size={14} style={{ color: '#16A34A' }} />
                              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.73rem', color: '#166534' }}>Ready</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>

          {/* Options + Import button */}
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem' }}>
              <input type="checkbox" checked={sendInvites} onChange={e => setSendInvites(e.target.checked)}
                style={{ accentColor: 'var(--ks-crimson)', width: '16px', height: '16px' }} />
              Send invitation email to each imported member so they can set their password
            </label>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              {validRows.length === 0 && (
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: '#991B1B' }}>
                  No valid rows selected to import.
                </span>
              )}
              <button
                className="btn-primary"
                onClick={handleImport}
                disabled={validRows.length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Upload size={15} />
                Import {validRows.length} member{validRows.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STAGE: IMPORTING ──────────────────────────────────────── */}
      {stage === 'importing' && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: 'var(--ks-crimson)', margin: '0 auto 1.25rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '3px solid var(--ks-gold)'
          }}>
            <span style={{ color: 'var(--ks-gold)', fontWeight: 700, fontSize: '1.1rem' }}>ΚΣ</span>
          </div>
          <h2 style={{ marginBottom: '0.5rem' }}>Importing members…</h2>
          <p style={{ fontFamily: 'Inter, sans-serif', color: 'var(--ks-text-muted)', fontSize: '0.9rem' }}>
            Adding {validRows.length} members. This may take a moment.
          </p>
        </div>
      )}

      {/* ── STAGE: DONE ───────────────────────────────────────────── */}
      {stage === 'done' && (
        <div>
          <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center', padding: '2rem' }}>
            {importedFail === 0 ? (
              <CheckCircle size={40} style={{ color: '#16A34A', marginBottom: '0.75rem' }} />
            ) : (
              <AlertCircle size={40} style={{ color: '#D97706', marginBottom: '0.75rem' }} />
            )}
            <h2 style={{ marginBottom: '0.5rem' }}>
              {importedOk} member{importedOk !== 1 ? 's' : ''} imported successfully
              {importedFail > 0 ? `, ${importedFail} failed` : ''}
            </h2>
            <p style={{ fontFamily: 'Inter, sans-serif', color: 'var(--ks-text-muted)', fontSize: '0.875rem' }}>
              {sendInvites ? 'Invitation emails have been sent to each imported member.' : 'No invitation emails were sent. Members can be invited separately.'}
            </p>
          </div>

          {/* Results table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--ks-fog)', borderBottom: '1px solid var(--ks-border)' }}>
                  {['Name', 'Email', 'Result'].map(h => (
                    <th key={h} style={{ padding: '0.6rem 1rem', textAlign: 'left', fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', fontWeight: 600, color: 'var(--ks-slate)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--ks-border)', background: i % 2 === 0 ? 'white' : 'var(--ks-fog)' }}>
                    <td style={{ padding: '0.6rem 1rem', fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', fontWeight: 600 }}>{r.full_name}</td>
                    <td style={{ padding: '0.6rem 1rem', fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: 'var(--ks-text-muted)' }}>{r.email}</td>
                    <td style={{ padding: '0.6rem 1rem' }}>
                      {r.success ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <CheckCircle size={14} style={{ color: '#16A34A' }} />
                          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', color: '#166534' }}>Imported</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <XCircle size={14} style={{ color: '#DC2626' }} />
                          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', color: '#991B1B' }}>{r.error}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn-primary" onClick={() => { setStage('upload'); setParsed([]); setResults([]); setFileName('') }}>
              Import another file
            </button>
            <a href="/admin/members" className="btn-secondary" style={{ textDecoration: 'none' }}>
              View all members
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

export default withAuth(ImportMembersPage, { adminOnly: true })
