import { useState } from 'react'
import { formatMetric } from '../lib/visualize'

const TONES = ['#0891b2', '#0e7490', '#22d3ee', '#67e8f9', '#334155', '#155e75']

export type ChartSlice = {
  label: string
  value: number
  share: number
}

/** Keep every slice; optionally fold a long tail into one “Other” row for dense donuts. */
export function withOtherBucket(slices: ChartSlice[], maxNamed = 12): ChartSlice[] {
  const positive = slices.filter((s) => s.share > 0 || s.value > 0)
  if (positive.length <= maxNamed) return positive
  const named = positive.slice(0, maxNamed - 1)
  const rest = positive.slice(maxNamed - 1)
  return [
    ...named,
    {
      label: `Other (${rest.length})`,
      value: rest.reduce((sum, r) => sum + r.value, 0),
      share: rest.reduce((sum, r) => sum + r.share, 0),
    },
  ]
}

type DonutProps = {
  slices: ChartSlice[]
  centerLabel?: string
  centerValue?: string
  size?: number
}

export function DonutChart({
  slices,
  centerLabel,
  centerValue,
  size = 168,
}: DonutProps) {
  const stroke = 22
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  let offset = 0
  const visible = slices.filter((s) => s.share > 0 || s.value > 0)

  return (
    <div className="donut-chart" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(20,24,22,0.08)"
          strokeWidth={stroke}
        />
        {visible.map((slice, i) => {
          const len = Math.max(slice.share * c, 1.2)
          const el = (
            <circle
              key={`${slice.label}-${i}`}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={TONES[i % TONES.length]}
              strokeWidth={stroke}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              className="donut-arc"
              style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
            >
              <title>{`${slice.label}: ${formatMetric(slice.value)} (${Math.round(slice.share * 100)}%)`}</title>
            </circle>
          )
          offset += len
          return el
        })}
      </svg>
      <div className="donut-center">
        {centerValue ? <strong>{centerValue}</strong> : null}
        {centerLabel ? <span>{centerLabel}</span> : null}
      </div>
    </div>
  )
}

type LineChartProps = {
  rows: ChartSlice[]
  valueFormatter?: (n: number) => string
}

export function LineChart({
  rows,
  valueFormatter = formatMetric,
}: LineChartProps) {
  const data = rows.filter((r) => r.value > 0 || r.share > 0)
  const [active, setActive] = useState<number | null>(null)

  if (!data.length) {
    return <p className="empty-note">No values to chart.</p>
  }

  const max = Math.max(...data.map((d) => d.value), 1)
  const min = 0
  const padL = 48
  const padR = 16
  const padTop = 28
  const padBottom = 40
  const w = 960
  const h = 260
  const chartW = w - padL - padR
  const chartH = h - padTop - padBottom

  const xAt = (i: number) =>
    padL + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW)
  const yAt = (v: number) =>
    padTop + chartH - ((v - min) / (max - min || 1)) * chartH

  const points = data.map((row, i) => ({
    ...row,
    x: xAt(i),
    y: yAt(row.value),
  }))

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(padTop + chartH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padTop + chartH).toFixed(1)} Z`

  const ticks = [0, 0.5, 1].map((t) => min + (max - min) * t)
  const labelEvery = data.length > 12 ? 2 : 1
  const activePoint = active != null ? points[active] : null
  const gradId = 'lineAreaFill'

  function nearestIndex(clientX: number, svg: SVGSVGElement) {
    const rect = svg.getBoundingClientRect()
    if (rect.width <= 0) return 0
    const x = ((clientX - rect.left) / rect.width) * w
    let best = 0
    let bestDist = Infinity
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(points[i].x - x)
      if (d < bestDist) {
        bestDist = d
        best = i
      }
    }
    return best
  }

  return (
    <div
      className="line-chart"
      onMouseLeave={() => setActive(null)}
    >
      <svg
        className="line-chart-svg"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Line chart"
        onMouseMove={(e) => setActive(nearestIndex(e.clientX, e.currentTarget))}
        onTouchStart={(e) => {
          const touch = e.touches[0]
          if (touch) setActive(nearestIndex(touch.clientX, e.currentTarget))
        }}
        onTouchMove={(e) => {
          const touch = e.touches[0]
          if (touch) setActive(nearestIndex(touch.clientX, e.currentTarget))
        }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0891b2" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#0891b2" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {ticks.map((tick) => {
          const y = yAt(tick)
          return (
            <g key={tick}>
              <line
                x1={padL}
                y1={y}
                x2={w - padR}
                y2={y}
                stroke="rgba(20,24,22,0.08)"
                strokeWidth={1}
              />
              <text x={padL - 10} y={y + 4} textAnchor="end" className="line-axis">
                {compact(tick)}
              </text>
            </g>
          )
        })}

        <path d={areaPath} fill={`url(#${gradId})`} className="line-area" />
        <path
          d={linePath}
          fill="none"
          stroke="#0891b2"
          strokeWidth={2.75}
          strokeLinejoin="round"
          strokeLinecap="round"
          className="line-path"
          vectorEffect="non-scaling-stroke"
        />

        {activePoint ? (
          <line
            x1={activePoint.x}
            y1={padTop}
            x2={activePoint.x}
            y2={padTop + chartH}
            stroke="rgba(8,145,178,0.28)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
        ) : null}

        {points.map((p, i) => (
          <g key={`${p.label}-${i}`} className="line-point">
            <circle
              cx={p.x}
              cy={p.y}
              r={active === i ? 6.5 : 4.5}
              fill="#0891b2"
              stroke="#fffaf4"
              strokeWidth={2}
            />
            {i % labelEvery === 0 || i === data.length - 1 ? (
              <text
                x={p.x}
                y={h - padBottom + 18}
                textAnchor="middle"
                className="line-label"
              >
                {shortLabel(p.label)}
              </text>
            ) : null}
          </g>
        ))}
      </svg>

      {activePoint ? (
        <div
          className={`chart-tooltip ${activePoint.x / w > 0.72 ? 'is-left' : ''}`}
          style={{
            left: `${(activePoint.x / w) * 100}%`,
            top: `${(activePoint.y / h) * 100}%`,
          }}
          role="tooltip"
        >
          <strong>{activePoint.label}</strong>
          <span>{valueFormatter(activePoint.value)}</span>
          <em>{Math.round(activePoint.share * 100)}% of total</em>
        </div>
      ) : (
        <p className="chart-hint">Hover or tap a point for details</p>
      )}
    </div>
  )
}

type ColumnChartProps = {
  rows: ChartSlice[]
  valueFormatter?: (n: number) => string
}

export function ColumnChart({
  rows,
  valueFormatter = formatMetric,
}: ColumnChartProps) {
  const data = rows.filter((r) => r.value > 0 || r.share > 0)
  const max = Math.max(...data.map((d) => d.value), 1)
  const median = [...data.map((d) => d.value)].sort((a, b) => a - b)[Math.floor(data.length / 2)] ?? 1
  const skewed = max / Math.max(median, 1) > 8
  const scale = (v: number) => (skewed ? Math.sqrt(v) : v)
  const scaleMax = scale(max) || 1
  const barSlot = data.length > 14 ? 28 : data.length > 8 ? 32 : 36
  const padX = 8
  const padTop = 18
  const padBottom = 36
  const gap = 5
  const w = Math.max(360, padX * 2 + data.length * barSlot)
  const h = 180
  const barW = Math.max(10, (w - padX * 2 - gap * Math.max(data.length - 1, 0)) / Math.max(data.length, 1))
  const chartH = h - padTop - padBottom

  if (!data.length) {
    return <p className="empty-note">No values to chart.</p>
  }

  return (
    <div className="column-chart">
      {skewed ? (
        <p className="chart-hint">Scaled for readability — one value dominates the range.</p>
      ) : null}
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Column chart" width={w} height={h}>
        <line
          x1={padX}
          y1={h - padBottom}
          x2={w - padX}
          y2={h - padBottom}
          stroke="rgba(20,24,22,0.14)"
          strokeWidth={1}
        />
        {data.map((row, i) => {
          const barH = Math.max(2, (scale(row.value) / scaleMax) * chartH)
          const x = padX + i * (barW + gap)
          const y = h - padBottom - barH
          const label = shortLabel(row.label)
          return (
            <g key={`${row.label}-${i}`} className="column-bar">
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx={4}
                fill={TONES[i % TONES.length]}
                style={{ animationDelay: `${Math.min(i, 16) * 30}ms` }}
              >
                <title>{`${row.label}: ${valueFormatter(row.value)} (${Math.round(row.share * 100)}%)`}</title>
              </rect>
              <text
                x={x + barW / 2}
                y={y - 6}
                textAnchor="middle"
                className="column-value"
              >
                {compact(row.value)}
              </text>
              <text
                x={x + barW / 2}
                y={h - padBottom + 14}
                textAnchor="middle"
                className="column-label"
              >
                {label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

type HBarProps = {
  rows: ChartSlice[]
  valueFormatter?: (n: number) => string
}

export function HorizontalBars({
  rows,
  valueFormatter = formatMetric,
}: HBarProps) {
  const data = rows.filter((r) => r.value > 0 || r.share > 0)
  const max = Math.max(...data.map((r) => r.value), 1)
  return (
    <div className="hbar-chart hbar-scroll" role="list">
      {data.map((row, i) => (
        <div className="hbar-row" key={`${row.label}-${i}`} role="listitem">
          <div className="name" title={row.label}>
            {row.label}
          </div>
          <div className="track">
            <div
              className="fill"
              style={{
                width: `${Math.max(3, (row.value / max) * 100)}%`,
                background: TONES[i % TONES.length],
                animationDelay: `${Math.min(i, 16) * 25}ms`,
              }}
            />
          </div>
          <div className="num-stack">
            <strong>{valueFormatter(row.value)}</strong>
            <span>{Math.round(row.share * 100)}%</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export function SliceTiles({ slices }: { slices: ChartSlice[] }) {
  const max = Math.max(...slices.map((s) => s.value), 1)
  return (
    <div className="slice-tiles" role="list">
      {slices.map((row, index) => (
        <article
          key={`${row.label}-${index}`}
          className="slice-tile"
          role="listitem"
          style={{ ['--tile-tone' as string]: TONES[index % TONES.length] }}
        >
          <div className="slice-tile-top">
            <span className="slice-tile-label" title={row.label}>
              {shortLabel(row.label, 14)}
            </span>
            <strong>{formatMetric(row.value)}</strong>
          </div>
          <div className="slice-tile-bar" aria-hidden="true">
            <i style={{ width: `${Math.max(6, (row.value / max) * 100)}%` }} />
          </div>
          <span className="slice-tile-share">{Math.round(row.share * 100)}% of total</span>
        </article>
      ))}
    </div>
  )
}

function shortLabel(label: string, max = 8) {
  if (label.length <= max) return label
  const dateMatch = label.match(/^(\d{1,2})[-/ ]([A-Za-z]{3,9})/)
  if (dateMatch) {
    const mon = dateMatch[2].slice(0, 3)
    return `${dateMatch[1]} ${mon}`
  }
  return `${label.slice(0, max - 1)}…`
}

function compact(n: number) {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`
  if (Number.isInteger(n)) return String(n)
  return n.toFixed(1)
}

export { TONES }
