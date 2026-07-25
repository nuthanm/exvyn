import { useMemo, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  ColumnChart,
  DonutChart,
  HorizontalBars,
  LineChart,
  SliceTiles,
  TONES,
  withOtherBucket,
} from '../components/charts'
import { ExportableSection } from '../components/ExportableSection'
import { useExvyn } from '../context/ExvynContext'
import { exportVisualHtml } from '../lib/export'
import {
  buildDashboardModel,
  cellDisplay,
  formatMetric,
  type DashboardSheetView,
  type DashboardVisuals,
} from '../lib/visualize'

const ROW_CAP = 80
const TILE_CAP = 12

export function VisualizePage() {
  const { session } = useExvyn()
  const pageRef = useRef<HTMLDivElement>(null)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [expandedSheets, setExpandedSheets] = useState<Record<string, boolean>>({})
  const [showAllTiles, setShowAllTiles] = useState(false)
  const [exportStatus, setExportStatus] = useState<string | null>(null)

  const model = useMemo(() => {
    if (!session) return null
    return buildDashboardModel(session, filters)
  }, [session, filters])

  if (!session || !model) return <Navigate to="/" replace />

  const visuals = model.visuals

  function handleExportHtml() {
    if (!pageRef.current || !session || !model) return
    try {
      exportVisualHtml(
        pageRef.current,
        `${slug(session.title)}-visual`,
        model.title,
        'full',
      )
      setExportStatus('HTML exported')
      window.setTimeout(() => setExportStatus(null), 2200)
    } catch {
      setExportStatus('Export failed')
      window.setTimeout(() => setExportStatus(null), 2200)
    }
  }

  return (
    <div
      ref={pageRef}
      className={`page visualize-page dash-page template-${model.template}`}
    >
      <header className="dash-hero fade-up">
        <div className="dash-hero-copy">
          <p className="kicker">Visualize</p>
          <h1>{model.title}</h1>
          <p>
            {session.fileName} · {model.filteredRowCount.toLocaleString()} rows matching
            filters
          </p>
          <p className="dash-context">{model.contextLine}</p>
        </div>

        <div className="dash-control-bar" data-export-ignore="true">
          <div className="filters dash-filters">
            {model.filters.map((filter) => (
              <div className="field" key={filter.id}>
                <label htmlFor={`filter-${filter.id}`}>{filter.label}</label>
                <select
                  id={`filter-${filter.id}`}
                  value={filters[filter.id] ?? 'All'}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, [filter.id]: e.target.value }))
                  }
                >
                  <option value="All">All {allLabel(filter.label)}</option>
                  {filter.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="export-html-bar">
            {exportStatus ? <span className="action-status">{exportStatus}</span> : null}
            <button type="button" className="btn btn-primary" onClick={handleExportHtml}>
              Export HTML
            </button>
          </div>
          <p className="filter-note dash-control-note">
            Filters use loaded data only · Export HTML includes charts, tiles, and tables
          </p>
        </div>
      </header>

      <ExportableSection
        className="viz-block fade-up fade-up-delay-1"
        title="Summary"
        fileBase={`${slug(session.title)}-summary`}
      >
        <p className="section-lead">Totals for the current filters (loaded snapshot only).</p>
        <div className="kpi-tile-grid" aria-label="Summary">
          {model.kpis.map((kpi) => (
            <article
              className={`kpi-tile ${kpi.emphasize ? 'is-emphasize' : ''}`}
              key={kpi.key}
            >
              <div className="kpi-tile-label">{kpi.label}</div>
              <div className="kpi-tile-value">{kpi.value}</div>
              {kpi.hint ? <div className="kpi-tile-hint">{kpi.hint}</div> : null}
            </article>
          ))}
        </div>
      </ExportableSection>

      {visuals ? (
        <VisualCharts
          visuals={visuals}
          fileBase={`${slug(session.title)}-charts`}
        />
      ) : null}

      {visuals?.topItems ? (
        <ExportableSection
          className="viz-block fade-up fade-up-delay-2"
          title={visuals.topItems.title}
          fileBase={`${slug(session.title)}-top`}
        >
          <p className="section-lead">
            Highest {visuals.metricLabel.toLowerCase()} values in the filtered snapshot.
          </p>
          <div className="top-tiles">
            {visuals.topItems.items.map((item, index) => {
              const max = visuals.topItems!.items[0]?.value || 1
              return (
                <article
                  className="top-tile"
                  key={item.id}
                  style={{ ['--tile-tone' as string]: TONES[index % TONES.length] }}
                >
                  <span className="top-tile-rank">{index + 1}</span>
                  <strong title={item.label}>{item.label}</strong>
                  <span className="top-tile-meta">{item.meta || '—'}</span>
                  <div className="top-tile-bar" aria-hidden="true">
                    <i style={{ width: `${Math.max(8, (item.value / max) * 100)}%` }} />
                  </div>
                  <em>{formatMetric(item.value)}</em>
                </article>
              )
            })}
          </div>
        </ExportableSection>
      ) : null}

      {visuals?.groups ? (
        <ExportableSection
          className="viz-block fade-up fade-up-delay-2"
          title={visuals.groups.title}
          fileBase={`${slug(session.title)}-tiles`}
          actions={
            visuals.groups.tiles.length > TILE_CAP ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowAllTiles((v) => !v)}
              >
                {showAllTiles
                  ? 'Show fewer tiles'
                  : `Show all ${visuals.groups.tiles.length} tiles`}
              </button>
            ) : null
          }
        >
          <p className="section-lead">
            Grouped cards for {visuals.groups.byLabel.toLowerCase()} — each card lists
            related rows and totals for {visuals.metricLabel}.
          </p>
          <GroupTiles
            groups={visuals.groups}
            metricLabel={visuals.metricLabel}
            showAll={showAllTiles}
          />
        </ExportableSection>
      ) : null}

      {model.sheets.map((sheet, index) => (
        <SheetTableSection
          key={sheet.name}
          sheet={sheet}
          fileBase={`${slug(session.title)}-${slug(sheet.name)}`}
          delay={index + 3}
          expanded={Boolean(expandedSheets[sheet.name])}
          onToggle={() =>
            setExpandedSheets((prev) => ({
              ...prev,
              [sheet.name]: !prev[sheet.name],
            }))
          }
        />
      ))}

      <footer className="dash-footer">
        <span>Your file stays in browser memory. Nothing is stored on a server.</span>
        <Link to="/review">Adjust mapping</Link>
      </footer>
    </div>
  )
}

function VisualCharts({
  visuals,
  fileBase,
}: {
  visuals: DashboardVisuals
  fileBase: string
}) {
  const hasAny = visuals.composition || visuals.ranking || visuals.trend
  if (!hasAny) return null

  const donutSlices = visuals.composition
    ? withOtherBucket(visuals.composition.slices, 10)
    : []

  return (
    <ExportableSection
      className="viz-block fade-up fade-up-delay-1"
      title="Visuals"
      fileBase={fileBase}
    >
      <p className="section-lead">
        Charts update with your Sprint, Company, and Resource filters.
      </p>

      <div className="visual-grid">
        {visuals.composition ? (
          <div className="visual-panel">
            <div className="chart-solo-head">
              <p className="share-title">{visuals.composition.title}</p>
              <span className="chart-count">by {visuals.composition.byLabel}</span>
            </div>
            <div className="donut-wrap donut-wrap-stack">
              <DonutChart
                slices={donutSlices}
                centerLabel={visuals.metricLabel}
                centerValue={formatMetric(visuals.composition.total)}
              />
            </div>
            <SliceTiles slices={visuals.composition.slices.slice(0, 8)} />
          </div>
        ) : null}

        {visuals.ranking ? (
          <div className="visual-panel">
            <div className="chart-solo-head">
              <p className="share-title">{visuals.ranking.title}</p>
              <span className="chart-count">by {visuals.ranking.byLabel}</span>
            </div>
            <ColumnChart rows={visuals.ranking.slices} />
            <HorizontalBars rows={visuals.ranking.slices.slice(0, 10)} />
          </div>
        ) : null}
      </div>

      {visuals.trend ? (
        <div className="visual-panel visual-panel-wide">
          <div className="chart-solo-head">
            <p className="share-title">{visuals.trend.title}</p>
            <span className="chart-count">{visuals.trend.slices.length} sprints</span>
          </div>
          <LineChart rows={visuals.trend.slices} />
          <SliceTiles slices={visuals.trend.slices} />
        </div>
      ) : null}
    </ExportableSection>
  )
}

function GroupTiles({
  groups,
  metricLabel,
  showAll,
}: {
  groups: NonNullable<DashboardVisuals['groups']>
  metricLabel: string
  showAll: boolean
}) {
  const max = Math.max(...groups.tiles.map((t) => t.total), 1)
  const visibleCount = showAll ? groups.tiles.length : Math.min(TILE_CAP, groups.tiles.length)

  return (
    <>
      <div className={`category-tiles ${showAll ? 'is-expanded' : ''}`}>
        {groups.tiles.map((group, index) => (
          <article
            className={`category-tile ${index >= TILE_CAP && !showAll ? 'is-capture-only' : ''}`}
            key={group.key}
            style={{ ['--tile-tone' as string]: TONES[index % TONES.length] }}
            hidden={index >= TILE_CAP && !showAll ? true : undefined}
            data-capture-include={index >= TILE_CAP ? 'true' : undefined}
          >
            <header className="category-tile-head">
              <div>
                <strong title={group.label}>{group.label}</strong>
                <span>
                  {group.count} item{group.count === 1 ? '' : 's'}
                </span>
              </div>
              <em>
                {formatMetric(group.total)}
                <small>{metricLabel}</small>
              </em>
            </header>
            <div className="category-tile-meter" aria-hidden="true">
              <i style={{ width: `${Math.max(6, (group.total / max) * 100)}%` }} />
            </div>
            <ul className="item-chips">
              {group.items.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong title={item.label}>{item.label}</strong>
                    {item.meta ? <span>{item.meta}</span> : null}
                  </div>
                  <b>{formatMetric(item.value)}</b>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <p className="subtle-note">
        {visibleCount.toLocaleString()} of {groups.tiles.length.toLocaleString()} group tiles.
      </p>
    </>
  )
}

function SheetTableSection({
  sheet,
  fileBase,
  delay,
  expanded,
  onToggle,
}: {
  sheet: DashboardSheetView
  fileBase: string
  delay: number
  expanded: boolean
  onToggle: () => void
}) {
  const needsCap = sheet.rows.length > ROW_CAP

  return (
    <ExportableSection
      className={`viz-block fade-up fade-up-delay-${Math.min(delay, 3)}`}
      title={sheet.title}
      fileBase={fileBase}
      actions={
        needsCap ? (
          <button type="button" className="btn btn-ghost" onClick={onToggle}>
            {expanded ? 'Show fewer rows' : `Show all ${sheet.rows.length}`}
          </button>
        ) : null
      }
    >
      <p className="section-lead">{sheet.blurb}</p>
      {sheet.columns.length && sheet.rows.length ? (
        <>
          <div
            className={`table-wrap table-wrap-metrics ${expanded ? 'is-expanded' : ''}`}
          >
            <table className="data metrics-table">
              <thead>
                <tr>
                  {sheet.columns.map((col) => (
                    <th key={col.key} className={col.align === 'right' ? 'is-num' : undefined}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sheet.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {sheet.columns.map((col) => (
                      <td
                        key={col.key}
                        className={col.align === 'right' ? 'is-num' : undefined}
                      >
                        {cellDisplay(row[col.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="subtle-note">
            {sheet.totalRows.toLocaleString()} rows
            {needsCap && !expanded
              ? ' · scroll or Copy section for the full image'
              : ''}.
          </p>
        </>
      ) : (
        <p className="empty-note">No rows match the current filters for this sheet.</p>
      )}
    </ExportableSection>
  )
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'exvyn'
}

function allLabel(label: string) {
  const key = label.trim().toLowerCase()
  if (key === 'company') return 'companies'
  if (key === 'resource') return 'resources'
  if (key === 'sprint') return 'sprints'
  if (key.endsWith('s')) return key
  return `${key}s`
}
