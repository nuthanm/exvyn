import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useExvyn } from '../context/ExvynContext'
import { ROLE_OPTIONS } from '../lib/roles'
import { getActiveSheet } from '../lib/workbook'
import { mappingSummary } from '../lib/visualize'
import type { ColumnRole } from '../types'

export function ReviewPage() {
  const navigate = useNavigate()
  const { session, setActiveSheet, updateMapping } = useExvyn()
  const [search, setSearch] = useState('')
  const [showAllRows, setShowAllRows] = useState(false)

  const sheet = session ? getActiveSheet(session) : null

  const previewHeaders = useMemo(() => {
    if (!sheet) return []
    return sheet.mappings.filter((m) => m.role !== 'ignore').map((m) => m.key)
  }, [sheet])

  const ignoredCount = sheet
    ? sheet.mappings.filter((m) => m.role === 'ignore').length
    : 0

  const filteredRows = useMemo(() => {
    if (!sheet) return []
    const q = search.trim().toLowerCase()
    if (!q) return sheet.rows.map((row, index) => ({ row, index }))
    return sheet.rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) =>
        previewHeaders.some((h) => String(row[h] ?? '').toLowerCase().includes(q)),
      )
  }, [sheet, search, previewHeaders])

  const visibleRows = showAllRows ? filteredRows : filteredRows.slice(0, 40)

  if (!session || !sheet) return <Navigate to="/" replace />

  const summary = mappingSummary(sheet.mappings)

  return (
    <div className="page">
      <div className="page-intro fade-up">
        <p className="kicker">Adjust mapping</p>
        <h1>{session.title}</h1>
        <p>
          {session.fileName} · {session.sheets.length} sheet
          {session.sheets.length === 1 ? '' : 's'}. Categories become filters on
          Visualize (Sprint, Company, Resource when present). Change a role only if
          something looks wrong.
        </p>
      </div>

      <div className="sheet-tabs fade-up fade-up-delay-1" role="tablist">
        {session.sheets.map((s) => (
          <button
            key={s.name}
            type="button"
            role="tab"
            aria-selected={s.name === sheet.name}
            className={`sheet-tab ${s.name === sheet.name ? 'is-active' : ''}`}
            onClick={() => {
              setActiveSheet(s.name)
              setSearch('')
              setShowAllRows(false)
            }}
          >
            {s.name}
            <em>{s.rows.length} rows</em>
          </button>
        ))}
      </div>

      <section className="role-guide fade-up fade-up-delay-1" aria-label="What each role means">
        <h2>What each role means</h2>
        <div className="role-guide-grid">
          {ROLE_OPTIONS.map((role) => (
            <article key={role.value}>
              <strong>{role.title}</strong>
              <p>{role.meaning}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="review-panel fade-up fade-up-delay-2">
        <div className="review-stats">
          <div>
            <span>Labels</span>
            <strong>{summary.labels}</strong>
          </div>
          <div>
            <span>Categories</span>
            <strong>{summary.categories}</strong>
          </div>
          <div>
            <span>Metrics</span>
            <strong>{summary.metrics}</strong>
          </div>
          <div>
            <span>Ignored</span>
            <strong>{summary.ignored}</strong>
          </div>
        </div>

        <div className="mapping-table-wrap">
          <table className="mapping-table">
            <thead>
              <tr>
                <th>Column</th>
                <th>Detected type</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {sheet.mappings.map((m) => (
                <tr key={m.key}>
                  <td>{m.label}</td>
                  <td>
                    <span className="type-chip">{m.kind}</span>
                  </td>
                  <td>
                    <select
                      value={m.role}
                      aria-label={`Role for ${m.label}`}
                      onChange={(e) =>
                        updateMapping(sheet.name, m.key, e.target.value as ColumnRole)
                      }
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.title}
                        </option>
                      ))}
                    </select>
                    <p className="role-hint">
                      {ROLE_OPTIONS.find((r) => r.value === m.role)?.meaning}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="preview-panel fade-up fade-up-delay-3">
        <div className="section-head-plain detail-head">
          <div>
            <h2>Sheet preview</h2>
            <p>
              Active columns from “{sheet.name}” (
              {sheet.rows.length.toLocaleString()} rows
              {ignoredCount
                ? ` · ${ignoredCount} ignored column${ignoredCount === 1 ? '' : 's'} hidden`
                : ''}
              ).
            </p>
          </div>
          <div className="detail-controls">
            <input
              type="search"
              placeholder="Search cells…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search sheet rows"
            />
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowAllRows((v) => !v)}
            >
              {showAllRows
                ? 'Show less'
                : `Show all ${filteredRows.length.toLocaleString()}`}
            </button>
          </div>
        </div>
        <div className="table-wrap table-wrap-tall">
          <table className="data">
            <thead>
              <tr>
                <th className="row-index">#</th>
                {previewHeaders.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map(({ row, index }) => (
                <tr key={index}>
                  <td className="row-index">{index + 1}</td>
                  {previewHeaders.map((h) => (
                    <td key={h}>{String(row[h] ?? '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="subtle-note">
          Showing {visibleRows.length.toLocaleString()} of{' '}
          {filteredRows.length.toLocaleString()} rows
          {search ? ' matching your search' : ''}.
        </p>
      </section>

      <div className="page-actions fade-up fade-up-delay-3">
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/')}>
          Back to upload
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={summary.metrics < 1 && session.template === 'generic'}
          onClick={() => navigate('/visualize')}
        >
          Back to visualize
        </button>
      </div>
    </div>
  )
}
