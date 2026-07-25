import type { ReactNode } from 'react'
import type { VisualModel } from './visualize'
import { formatMetric } from './visualize'

export type BriefSlide = {
  id: string
  kicker: string
  title: string
  subtitle?: string
  why?: string
  what?: string
  pills?: string[]
  body?: ReactNode
}

const sampleKpis = [
  { label: 'Amount', value: '4.0L' },
  { label: 'Rows', value: '116' },
  { label: 'Dates', value: '25' },
]

export function buildBriefSlides(model: VisualModel | null): BriefSlide[] {
  const hasLive = Boolean(model)
  const metricLabel = model?.metricKeys[0]?.label ?? 'Amount'
  const groupLabel = model?.groupByLabel ?? 'Category'
  const lensTitle = model?.lens.title ?? 'Adaptive view'
  const rowCount = model?.rowCount ?? 116

  return [
    {
      id: 'title',
      kicker: 'The Brief',
      title: 'Exvyn',
      subtitle:
        'Drop an Excel file. Confirm the columns. Get a clear visual brief — totals, trends, and tiles — without uploading to a server.',
      pills: ['Excel + vision', 'In-browser only', 'No sign-in'],
    },
    {
      id: 'what',
      kicker: 'What it is',
      title: 'A visual brief from your workbook',
      subtitle:
        'Exvyn turns messy sheets into something you can present and understand in minutes — shaped by how you map each column.',
      what: 'Upload → Review mapping → Visualize with charts and tiles.',
      why: 'Spreadsheets hold the truth, but they rarely show the story.',
      pills: ['Any .xlsx / .xls / .csv', 'Multi-sheet aware'],
    },
    {
      id: 'trust',
      kicker: 'Why it is safe to try',
      title: 'Your file never leaves the browser',
      subtitle:
        'Parsing and visuals run in memory on your device. Close the tab and the data is gone — nothing is stored for later.',
      pills: ['No account', 'No database', 'No fear to try'],
      why: 'Visitors should feel safe dropping real workbooks.',
    },
    {
      id: 'path',
      kicker: 'How it works',
      title: 'Three steps. One composition.',
      what: '1 Upload the workbook · 2 Review column roles · 3 Visualize the brief.',
      why: 'Mapping once unlocks charts, tiles, and totals that match your intent.',
      pills: ['Upload', 'Review', 'Visualize'],
    },
    {
      id: 'roles',
      kicker: 'Review',
      title: 'Roles decide what the visual means',
      subtitle:
        'Label names the item. Category groups it (date, team, type). Metric totals the number. Ignore hides noise like empty columns.',
      what: 'Set Ignore on columns you do not want in preview or Visualize.',
      why: 'Without roles, charts guess wrong — and “Unspecified” takes over.',
      pills: ['Label', 'Category', 'Metric', 'Ignore'],
    },
    {
      id: 'lens',
      kicker: 'Visualize adapts',
      title: lensTitle,
      subtitle: model?.lens.blurb
        ?? 'Date sheets become timelines. Few categories become composition. Many categories become rankings. Multiple metrics become comparison.',
      what: `Group by ${groupLabel} to reshuffle the story.`,
      why: 'One static dashboard cannot fit every workbook — the lens follows your data.',
      pills: hasLive
        ? [model!.lens.id, `${rowCount} rows`, groupLabel]
        : ['Timeline', 'Composition', 'Ranking', 'Ledger'],
    },
    {
      id: 'kpis',
      kicker: 'Slide · Key measures',
      title: 'Totals at a glance',
      what: `Sums of each Metric across ${rowCount.toLocaleString()} rows in view.`,
      why: 'You need the headline numbers before you dive into dates or categories.',
      body: (
        <div className="brief-kpi-row">
          {(model?.kpis.length
            ? model.kpis.map((k) => ({ label: k.label, value: formatMetric(k.value) }))
            : sampleKpis
          ).map((k) => (
            <article key={k.label} className="brief-kpi">
              <span>{k.label}</span>
              <strong>{k.value}</strong>
            </article>
          ))}
        </div>
      ),
    },
    {
      id: 'trend',
      kicker: 'Slide · Trend / breakdown',
      title: hasLive && model?.lens.chart === 'timeline'
        ? `Trend by ${groupLabel}`
        : `Breakdown by ${groupLabel}`,
      what: hasLive && model?.lens.chart === 'timeline'
        ? `A full-width line chart of ${metricLabel} over time, with tooltips on each date.`
        : `Share and distribution of ${metricLabel} across ${groupLabel.toLowerCase()} values.`,
      why: 'This is where the pattern appears — peaks, outliers, and which groups carry the total.',
      pills: ['Hover for details', 'All points included'],
    },
    {
      id: 'top',
      kicker: 'Slide · Top items',
      title: `Largest ${metricLabel} first`,
      what: 'Ranked tiles for the strongest rows — useful for “what stands out?”',
      why: 'After the trend, you still need the concrete line items that drive the spike.',
    },
    {
      id: 'tiles',
      kicker: 'Slide · Category tiles',
      title: `${groupLabel} as visual tiles`,
      what: `Each ${groupLabel.toLowerCase()} is a tile with its total, share bar, and item chips — not an Excel grid.`,
      why: 'Tables recreate the spreadsheet. Tiles make the grouping obvious at a glance.',
      pills: hasLive
        ? [`${model!.groups.length} tiles`, metricLabel]
        : ['One tile per group', 'Expand for more items'],
    },
    {
      id: 'close',
      kicker: 'What you get',
      title: 'A brief you can understand — and share',
      subtitle:
        'Key measures, adaptive charts, top items, and category tiles — all from your mapping, all in the browser.',
      pills: ['Export PNG / HTML', 'Copy section', 'Adjust mapping anytime'],
      what: hasLive
        ? 'Open Visualize to explore the live brief, or step back to Review to retune roles.'
        : 'Upload a workbook (or try an example) to see these slides fill with your numbers.',
    },
  ]
}
