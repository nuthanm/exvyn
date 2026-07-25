import type { ColumnMapping, ColumnKind, SheetTable, WorkbookSession } from '../types'
import {
  normalizeHeader,
  preferredColumnOrder,
  resolveFilterColumns,
  sheetBlurb,
} from './templates'
import { formatMetric, normalizeCell } from './workbook'

export type KpiStat = {
  key: string
  label: string
  value: number
}

export type BreakdownRow = {
  label: string
  values: Record<string, number>
  share: number
  count: number
}

export type DetailRow = {
  id: string
  label: string
  categories: Record<string, string>
  metrics: Record<string, number>
}

export type DetailGroup = {
  key: string
  label: string
  count: number
  totals: Record<string, number>
  rows: DetailRow[]
}

export type CategoryMeta = {
  key: string
  label: string
  kind: ColumnKind
  options: string[]
}

export type ViewLens = {
  id: 'timeline' | 'composition' | 'ranking' | 'comparison' | 'ledger'
  title: string
  blurb: string
  chart: 'timeline' | 'composition' | 'ranking' | 'comparison'
  emphasize: Array<'kpis' | 'charts' | 'top' | 'groups'>
}

export type VisualModel = {
  title: string
  sheetName: string
  rowCount: number
  kpis: KpiStat[]
  categories: CategoryMeta[]
  breakdown: {
    by: string
    byLabel: string
    metrics: { key: string; label: string }[]
    rows: BreakdownRow[]
    total: number
  } | null
  details: DetailRow[]
  groups: DetailGroup[]
  groupByKey: string | null
  groupByLabel: string | null
  metricKeys: { key: string; label: string }[]
  topItems: DetailRow[]
  filledDown: boolean
  lens: ViewLens
}

function numeric(value: unknown): number {
  const n = normalizeCell(value, 'number')
  return typeof n === 'number' ? n : Number(n) || 0
}

function cellText(value: unknown): string {
  return String(value ?? '').trim()
}

function cleanLabel(value: unknown): string {
  const text = cellText(value)
  return text || 'Unspecified'
}

/** Expense-style sheets often leave date/category blank under a section header. */
function fillDownRows(
  rows: Record<string, unknown>[],
  keys: string[],
): { rows: Record<string, unknown>[]; filledDown: boolean } {
  if (!keys.length) return { rows, filledDown: false }
  let filledDown = false
  const last: Record<string, string> = {}
  const next = rows.map((row) => {
    const copy = { ...row }
    for (const key of keys) {
      const text = cellText(copy[key])
      if (text) {
        last[key] = text
      } else if (last[key]) {
        copy[key] = last[key]
        filledDown = true
      }
    }
    return copy
  })
  return { rows: next, filledDown }
}

function parseSortableDate(value: string): number | null {
  if (!value || value === 'Unspecified') return null
  const t = Date.parse(value)
  if (Number.isFinite(t)) return t
  return null
}

function sortCategoryOptions(options: string[], kind: ColumnKind): string[] {
  const copy = [...options]
  if (kind === 'date') {
    return copy.sort((a, b) => {
      const da = parseSortableDate(a)
      const db = parseSortableDate(b)
      if (da != null && db != null) return da - db
      if (da != null) return -1
      if (db != null) return 1
      if (a === 'Unspecified') return 1
      if (b === 'Unspecified') return -1
      return a.localeCompare(b)
    })
  }
  return copy.sort((a, b) => {
    if (a === 'Unspecified') return 1
    if (b === 'Unspecified') return -1
    return a.localeCompare(b)
  })
}

function scoreCategory(optionsCount: number, kind: ColumnKind): number {
  if (optionsCount < 2) return -100
  if (kind === 'date') {
    if (optionsCount <= 40) return 70 - Math.abs(optionsCount - 12)
    return 20
  }
  if (optionsCount >= 2 && optionsCount <= 12) return 100 - optionsCount
  if (optionsCount <= 24) return 50
  return 5 - Math.min(optionsCount, 80)
}

export function pickBestCategoryKey(
  categories: CategoryMeta[],
  preferredKey?: string,
): string | null {
  if (!categories.length) return null
  if (preferredKey && categories.some((c) => c.key === preferredKey)) return preferredKey
  const ranked = [...categories].sort(
    (a, b) => scoreCategory(b.options.length, b.kind) - scoreCategory(a.options.length, a.kind),
  )
  return ranked[0]?.key ?? null
}

function sortGroupLabels(labels: string[], kind: ColumnKind | undefined): string[] {
  return sortCategoryOptions(labels, kind ?? 'text')
}

function inferLens(
  primaryCategory: CategoryMeta | null,
  metricsCount: number,
  breakdownCount: number,
  filledDown: boolean,
): ViewLens {
  const dateLike =
    primaryCategory?.kind === 'date' ||
    Boolean(
      primaryCategory &&
        primaryCategory.options.filter((o) => o !== 'Unspecified').length >= 2 &&
        primaryCategory.options
          .filter((o) => o !== 'Unspecified')
          .slice(0, 8)
          .every((o) => Number.isFinite(Date.parse(o))),
    )

  if (dateLike) {
    return {
      id: filledDown ? 'ledger' : 'timeline',
      title: filledDown ? 'Ledger view' : 'Timeline view',
      blurb: filledDown
        ? 'Date sections with items filled under each day, plus a trend chart.'
        : 'Values over time — full trend and every date in the legend.',
      chart: 'timeline',
      emphasize: filledDown
        ? ['kpis', 'charts', 'groups', 'top']
        : ['kpis', 'charts', 'groups', 'top'],
    }
  }

  if (metricsCount >= 2) {
    return {
      id: 'comparison',
      title: 'Comparison view',
      blurb: 'Multiple metrics side by side — totals, share, and ranked items.',
      chart: 'comparison',
      emphasize: ['kpis', 'charts', 'top', 'groups'],
    }
  }

  if (breakdownCount > 0 && breakdownCount <= 8) {
    return {
      id: 'composition',
      title: 'Composition view',
      blurb: 'Share of the whole across a few categories — donut and bars.',
      chart: 'composition',
      emphasize: ['kpis', 'charts', 'top', 'groups'],
    }
  }

  return {
    id: 'ranking',
    title: 'Ranking view',
    blurb: 'Many categories — ranked bars and top items lead the brief.',
    chart: 'ranking',
    emphasize: ['kpis', 'top', 'charts', 'groups'],
  }
}

export function buildVisualModel(
  sheet: SheetTable,
  workbookTitle: string,
  filters: Record<string, string> = {},
  groupByKey?: string,
): VisualModel {
  const metrics = sheet.mappings.filter((m) => m.role === 'metric')
  const categoryMappings = sheet.mappings.filter((m) => m.role === 'category')
  const labelCol =
    sheet.mappings.find((m) => m.role === 'label') ??
    sheet.mappings.find((m) => m.kind === 'text') ??
    sheet.mappings[0]

  const fillKeys = categoryMappings.map((c) => c.key)
  const { rows: normalizedRows, filledDown } = fillDownRows(sheet.rows, fillKeys)

  const filtered = normalizedRows.filter((row) =>
    categoryMappings.every((cat) => {
      const selected = filters[cat.key]
      if (!selected || selected === 'All') return true
      return cleanLabel(row[cat.key]) === selected
    }),
  )

  const kpis: KpiStat[] = metrics.slice(0, 4).map((m) => ({
    key: m.key,
    label: m.label,
    value: filtered.reduce((sum, row) => sum + numeric(row[m.key]), 0),
  }))

  const categories: CategoryMeta[] = categoryMappings.map((c) => {
    const options = Array.from(new Set(normalizedRows.map((r) => cleanLabel(r[c.key]))))
    return {
      key: c.key,
      label: c.label,
      kind: c.kind,
      options: sortCategoryOptions(options, c.kind),
    }
  })

  const activeGroupKey = pickBestCategoryKey(categories, groupByKey)
  const primaryCategory = categories.find((c) => c.key === activeGroupKey) ?? null
  let breakdown: VisualModel['breakdown'] = null

  if (primaryCategory && metrics.length) {
    const groups = new Map<string, { values: Record<string, number>; count: number }>()
    for (const row of filtered) {
      const key = cleanLabel(row[primaryCategory.key])
      const bucket =
        groups.get(key) ?? {
          values: Object.fromEntries(metrics.map((m) => [m.key, 0])),
          count: 0,
        }
      for (const m of metrics) {
        bucket.values[m.key] += numeric(row[m.key])
      }
      bucket.count += 1
      groups.set(key, bucket)
    }

    const metricKey = metrics[0].key
    const total = Array.from(groups.values()).reduce(
      (sum, g) => sum + (g.values[metricKey] ?? 0),
      0,
    )

    const rows = Array.from(groups.entries())
      .map(([label, bucket]) => ({
        label,
        values: bucket.values,
        count: bucket.count,
        share: total > 0 ? (bucket.values[metricKey] ?? 0) / total : 0,
      }))
      .sort((a, b) => {
        if (a.label === 'Unspecified') return 1
        if (b.label === 'Unspecified') return -1
        if (primaryCategory.kind === 'date') {
          const da = parseSortableDate(a.label)
          const db = parseSortableDate(b.label)
          if (da != null && db != null) return da - db
        }
        return (b.values[metricKey] ?? 0) - (a.values[metricKey] ?? 0)
      })

    breakdown = {
      by: primaryCategory.key,
      byLabel: primaryCategory.label,
      metrics: metrics.map((m) => ({ key: m.key, label: m.label })),
      rows,
      total,
    }
  }

  const details: DetailRow[] = filtered.map((row, index) => ({
    id: String(index + 1),
    label: String(labelCol ? row[labelCol.key] ?? `Row ${index + 1}` : `Row ${index + 1}`),
    categories: Object.fromEntries(
      categoryMappings.map((c) => [c.key, cleanLabel(row[c.key])]),
    ),
    metrics: Object.fromEntries(metrics.map((m) => [m.key, numeric(row[m.key])])),
  }))

  const groupMap = new Map<string, DetailRow[]>()
  for (const row of details) {
    const key = activeGroupKey ? row.categories[activeGroupKey] || 'Unspecified' : 'All rows'
    const list = groupMap.get(key) ?? []
    list.push(row)
    groupMap.set(key, list)
  }

  const orderedKeys = sortGroupLabels(
    Array.from(groupMap.keys()),
    primaryCategory?.kind,
  )

  const groups: DetailGroup[] = orderedKeys.map((key) => {
    const rows = groupMap.get(key) ?? []
    const totals = Object.fromEntries(
      metrics.map((m) => [
        m.key,
        rows.reduce((sum, r) => sum + (r.metrics[m.key] ?? 0), 0),
      ]),
    )
    return {
      key,
      label: key,
      count: rows.length,
      totals,
      rows,
    }
  })

  const primaryMetricKey = metrics[0]?.key
  const topItems = primaryMetricKey
    ? [...details]
        .sort((a, b) => (b.metrics[primaryMetricKey] ?? 0) - (a.metrics[primaryMetricKey] ?? 0))
        .slice(0, 8)
    : details.slice(0, 8)

  const lens = inferLens(
    primaryCategory,
    metrics.length,
    breakdown?.rows.length ?? 0,
    filledDown,
  )

  return {
    title: workbookTitle,
    sheetName: sheet.name,
    rowCount: filtered.length,
    kpis,
    categories,
    breakdown,
    details,
    groups,
    groupByKey: activeGroupKey,
    groupByLabel: primaryCategory?.label ?? null,
    metricKeys: metrics.map((m) => ({ key: m.key, label: m.label })),
    topItems,
    filledDown,
    lens,
  }
}

export function mappingSummary(mappings: ColumnMapping[]) {
  return {
    labels: mappings.filter((m) => m.role === 'label').length,
    categories: mappings.filter((m) => m.role === 'category').length,
    metrics: mappings.filter((m) => m.role === 'metric').length,
    ignored: mappings.filter((m) => m.role === 'ignore').length,
  }
}

export type DashboardFilter = {
  id: string
  label: string
  options: string[]
}

export type DashboardKpi = {
  key: string
  label: string
  value: string
  hint?: string
  emphasize?: boolean
}

export type DashboardColumn = {
  key: string
  label: string
  kind: ColumnKind
  align: 'left' | 'right'
}

export type DashboardSheetView = {
  name: string
  title: string
  blurb: string
  columns: DashboardColumn[]
  rows: Record<string, unknown>[]
  totalRows: number
}

export type DashboardModel = {
  title: string
  template: 'resource-metrics' | 'generic'
  filters: DashboardFilter[]
  kpis: DashboardKpi[]
  sheets: DashboardSheetView[]
  visuals: DashboardVisuals | null
  contextLine: string
  filteredRowCount: number
}

export type DashboardChartSlice = {
  label: string
  value: number
  share: number
}

export type DashboardTileItem = {
  id: string
  label: string
  meta: string
  value: number
  metrics: { label: string; value: number }[]
}

export type DashboardGroupTile = {
  key: string
  label: string
  count: number
  total: number
  items: DashboardTileItem[]
}

export type DashboardVisuals = {
  metricLabel: string
  composition: {
    title: string
    byLabel: string
    slices: DashboardChartSlice[]
    total: number
  } | null
  ranking: {
    title: string
    byLabel: string
    slices: DashboardChartSlice[]
  } | null
  trend: {
    title: string
    byLabel: string
    slices: DashboardChartSlice[]
  } | null
  groups: {
    title: string
    byLabel: string
    tiles: DashboardGroupTile[]
  } | null
  topItems: {
    title: string
    items: DashboardTileItem[]
  } | null
}

function cellDisplay(value: unknown): string {
  if (value == null || value === '') return '—'
  return String(value)
}

function parsePercent(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null
  const cleaned = value.replace(/%/g, '').trim()
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function findHeader(headers: string[], patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const hit = headers.find((h) => pattern.test(normalizeHeader(h)))
    if (hit) return hit
  }
  return null
}

function sumColumn(rows: Record<string, unknown>[], key: string | null): number {
  if (!key) return 0
  return rows.reduce((sum, row) => sum + numeric(row[key]), 0)
}

function distinctCount(rows: Record<string, unknown>[], key: string | null): number {
  if (!key) return 0
  return new Set(rows.map((r) => cleanLabel(r[key])).filter((v) => v !== 'Unspecified')).size
}

function formatKpiNumber(value: number): string {
  return formatMetric(value)
}

function formatKpiPercent(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return `${rounded}%`
}

function buildResourceMetricsKpis(
  sheets: SheetTable[],
  filteredBySheet: Map<string, Record<string, unknown>[]>,
  filters: Record<string, string>,
): DashboardKpi[] {
  const resourceSheet =
    sheets.find((s) => /resource|metrics|capacity/i.test(s.name)) ?? sheets[0]
  const prSheet = sheets.find((s) => /pr|loc/i.test(s.name))
  const accuracySheet = sheets.find((s) => /fetch|accuracy/i.test(s.name))

  const resourceRows = filteredBySheet.get(resourceSheet?.name ?? '') ?? []
  const prRows = prSheet ? filteredBySheet.get(prSheet.name) ?? [] : []
  const accuracyRows = accuracySheet
    ? filteredBySheet.get(accuracySheet.name) ?? []
    : []

  const sprintKey = resourceSheet
    ? findHeader(resourceSheet.headers, [/^sprint( name)?$/])
    : null
  const resourceKey = resourceSheet
    ? findHeader(resourceSheet.headers, [/^resource( name)?$/, /^person$/, /^assignee$/])
    : null
  const prCountKey = resourceSheet
    ? findHeader(resourceSheet.headers, [/^no\.?\s*of\s*prs?$/, /^prs?$/])
    : null
  const locKey = resourceSheet
    ? findHeader(resourceSheet.headers, [
        /^total\s*no\.?\s*of\s*loc$/,
        /^total\s*loc$/,
        /^loc$/,
      ])
    : null
  const velocityKey = resourceSheet
    ? findHeader(resourceSheet.headers, [/^velocity$/])
    : null
  const prLocKey = prSheet
    ? findHeader(prSheet.headers, [/^lines\s*changed\s*\(loc\)$/, /^loc$/, /^lines\s*changed$/])
    : null

  const sprintFilter = filters.sprint && filters.sprint !== 'All' ? filters.sprint : null
  const sprintCount = sprintFilter ? 1 : distinctCount(resourceRows, sprintKey)
  const sprintHint = sprintFilter
    ? sprintFilter
    : sprintKey
      ? Array.from(
          new Set(resourceRows.map((r) => cleanLabel(r[sprintKey!])).filter((v) => v !== 'Unspecified')),
        )
          .slice(0, 2)
          .join(', ') || 'Filtered view'
      : 'Filtered view'

  const prsFromResource = sumColumn(resourceRows, prCountKey)
  const prs = prsFromResource > 0 ? prsFromResource : prRows.length
  const locFromResource = sumColumn(resourceRows, locKey)
  const loc = locFromResource > 0 ? locFromResource : sumColumn(prRows, prLocKey)
  const velocity = sumColumn(resourceRows, velocityKey)

  const overallKey = accuracySheet
    ? findHeader(accuracySheet.headers, [/^overall\s*accuracy\s*%?$/, /^accuracy\s*%?$/])
    : null
  let accuracyValue: string | null = null
  let accuracyHint = 'Loaded snapshot'
  if (accuracyRows.length && overallKey && accuracySheet) {
    const accuracySprintKey = findHeader(accuracySheet.headers, [/^sprint( name)?$/])
    const currentKey = findHeader(accuracySheet.headers, [/^current$/])
    const pick =
      (sprintFilter && accuracySprintKey
        ? accuracyRows.find((r) => cleanLabel(r[accuracySprintKey]) === sprintFilter)
        : null) ??
      accuracyRows.find((r) =>
        currentKey ? /^yes|true|y|1$/i.test(String(r[currentKey] ?? '')) : false,
      ) ??
      accuracyRows[0]
    const pct = parsePercent(pick?.[overallKey])
    if (pct != null) {
      accuracyValue = formatKpiPercent(pct)
      accuracyHint = accuracySprintKey ? cleanLabel(pick?.[accuracySprintKey]) : accuracyHint
    }
  }

  const kpis: DashboardKpi[] = [
    {
      key: 'sprints',
      label: 'Sprints',
      value: String(sprintCount),
      hint: sprintHint,
    },
    {
      key: 'resources',
      label: 'Resources',
      value: String(distinctCount(resourceRows, resourceKey) || resourceRows.length),
      hint: 'Filtered view',
    },
    {
      key: 'prs',
      label: 'PRs',
      value: formatKpiNumber(prs),
      hint: prSheet ? prSheet.name : 'From resource metrics',
    },
    {
      key: 'loc',
      label: 'Total LOC',
      value: formatKpiNumber(loc),
      hint: 'Configured resources',
    },
    {
      key: 'velocity',
      label: 'Velocity (SP)',
      value: formatKpiNumber(velocity),
      hint: 'Includes moved-out in stats',
    },
  ]

  if (accuracyValue) {
    kpis.push({
      key: 'accuracy',
      label: 'Fetch accuracy',
      value: accuracyValue,
      hint: accuracyHint,
      emphasize: true,
    })
  }

  return kpis
}

function buildGenericKpis(
  sheets: SheetTable[],
  filteredBySheet: Map<string, Record<string, unknown>[]>,
): DashboardKpi[] {
  const kpis: DashboardKpi[] = [
    {
      key: 'sheets',
      label: 'Sheets',
      value: String(sheets.length),
      hint: 'In this workbook',
    },
  ]

  let totalRows = 0
  for (const sheet of sheets) {
    const rows = filteredBySheet.get(sheet.name) ?? []
    totalRows += rows.length
    const metrics = sheet.mappings.filter((m) => m.role === 'metric').slice(0, 2)
    for (const metric of metrics) {
      if (kpis.length >= 6) break
      const value = rows.reduce((sum, row) => sum + numeric(row[metric.key]), 0)
      kpis.push({
        key: `${sheet.name}-${metric.key}`,
        label: metric.label,
        value: formatKpiNumber(value),
        hint: sheet.name,
      })
    }
    if (kpis.length >= 6) break
  }

  kpis.splice(1, 0, {
    key: 'rows',
    label: 'Rows',
    value: formatKpiNumber(totalRows),
    hint: 'Matching filters',
  })

  return kpis.slice(0, 6)
}

function toSlices(
  buckets: Map<string, number>,
): DashboardChartSlice[] {
  const total = Array.from(buckets.values()).reduce((sum, v) => sum + v, 0)
  return Array.from(buckets.entries())
    .map(([label, value]) => ({
      label,
      value,
      share: total > 0 ? value / total : 0,
    }))
    .filter((s) => s.label !== 'Unspecified')
    .sort((a, b) => b.value - a.value)
}

function pickPrimarySheet(
  sheets: SheetTable[],
  filteredBySheet: Map<string, Record<string, unknown>[]>,
  template: WorkbookSession['template'],
): { sheet: SheetTable; rows: Record<string, unknown>[] } | null {
  const preferred =
    template === 'resource-metrics'
      ? sheets.find((s) => /resource|metrics|capacity/i.test(s.name)) ??
        sheets.find((s) => (filteredBySheet.get(s.name)?.length ?? 0) > 0) ??
        sheets[0]
      : sheets.find((s) => s.mappings.some((m) => m.role === 'metric')) ?? sheets[0]

  if (!preferred) return null
  const rows = filteredBySheet.get(preferred.name) ?? []
  if (!rows.length) return null
  return { sheet: preferred, rows }
}

function pickMetricKey(sheet: SheetTable, template: WorkbookSession['template']): {
  key: string
  label: string
} | null {
  if (template === 'resource-metrics') {
    const preferred = [
      /^total\s*no\.?\s*of\s*loc$/,
      /^lines\s*changed\s*\(loc\)$/,
      /^no\.?\s*of\s*prs?$/,
      /^capacity\s*committed$/,
      /^potential\s*capacity$/,
      /^velocity$/,
    ]
    for (const pattern of preferred) {
      const hit = sheet.mappings.find(
        (m) => m.role === 'metric' && pattern.test(normalizeHeader(m.key)),
      )
      if (hit) return { key: hit.key, label: hit.label }
    }
  }
  const metric = sheet.mappings.find((m) => m.role === 'metric')
  return metric ? { key: metric.key, label: metric.label } : null
}

function pickLabelKey(sheet: SheetTable): string | null {
  const label = sheet.mappings.find((m) => m.role === 'label')
  if (label) return label.key
  return (
    findHeader(sheet.headers, [
      /^resource( name)?$/,
      /^title$/,
      /^name$/,
      /^pr id$/,
    ]) ?? sheet.headers[0] ?? null
  )
}

function aggregateBy(
  rows: Record<string, unknown>[],
  groupKey: string,
  metricKey: string,
): Map<string, number> {
  const buckets = new Map<string, number>()
  for (const row of rows) {
    const label = cleanLabel(row[groupKey])
    buckets.set(label, (buckets.get(label) ?? 0) + numeric(row[metricKey]))
  }
  return buckets
}

function buildDashboardVisuals(
  session: WorkbookSession,
  filteredBySheet: Map<string, Record<string, unknown>[]>,
  filterDefs: ReturnType<typeof resolveFilterColumns>,
): DashboardVisuals | null {
  const primary = pickPrimarySheet(session.sheets, filteredBySheet, session.template)
  if (!primary) return null

  const { sheet, rows } = primary
  const metric = pickMetricKey(sheet, session.template)
  if (!metric) return null

  const labelKey = pickLabelKey(sheet)
  const companyKey =
    filterDefs.find((f) => f.id === 'company')?.keysBySheet[sheet.name] ??
    findHeader(sheet.headers, [/^company( name)?$/])
  const sprintKey =
    filterDefs.find((f) => f.id === 'sprint')?.keysBySheet[sheet.name] ??
    findHeader(sheet.headers, [/^sprint( name)?$/])
  const resourceKey =
    filterDefs.find((f) => f.id === 'resource')?.keysBySheet[sheet.name] ??
    findHeader(sheet.headers, [/^resource( name)?$/, /^person$/, /^assignee$/])

  const categoryFallback = sheet.mappings.find((m) => m.role === 'category')?.key ?? null

  const compositionKey = companyKey ?? categoryFallback
  const rankingKey = resourceKey ?? labelKey ?? categoryFallback
  const trendKey = sprintKey

  const compositionSlices = compositionKey
    ? toSlices(aggregateBy(rows, compositionKey, metric.key)).slice(0, 12)
    : []
  const rankingSlices = rankingKey
    ? toSlices(aggregateBy(rows, rankingKey, metric.key)).slice(0, 14)
    : []
  const trendBuckets = trendKey ? aggregateBy(rows, trendKey, metric.key) : new Map()
  const trendSlices = trendKey
    ? Array.from(trendBuckets.entries())
        .map(([label, value]) => {
          const total = Array.from(trendBuckets.values()).reduce((s, v) => s + v, 0)
          return {
            label,
            value,
            share: total > 0 ? value / total : 0,
          }
        })
        .filter((s) => s.label !== 'Unspecified')
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
    : []

  const groupKey = companyKey ?? sprintKey ?? resourceKey ?? categoryFallback ?? labelKey
  const itemLabelKey = resourceKey ?? labelKey
  let groups: DashboardVisuals['groups'] = null
  if (groupKey) {
    const groupMap = new Map<string, DashboardTileItem[]>()
    rows.forEach((row, index) => {
      const groupLabel = cleanLabel(row[groupKey])
      const itemLabel = itemLabelKey
        ? cleanLabel(row[itemLabelKey])
        : `Row ${index + 1}`
      const metaParts = [companyKey, sprintKey, resourceKey]
        .filter((k): k is string => Boolean(k) && k !== groupKey && k !== itemLabelKey)
        .map((k) => cleanLabel(row[k]))
        .filter((v) => v && v !== 'Unspecified')
      const extraMetrics = sheet.mappings
        .filter((m) => m.role === 'metric' && m.key !== metric.key)
        .slice(0, 3)
        .map((m) => ({ label: m.label, value: numeric(row[m.key]) }))

      const item: DashboardTileItem = {
        id: `${groupLabel}-${index}`,
        label:
          itemLabel && itemLabel !== groupLabel
            ? itemLabel
            : metaParts[0] || `Row ${index + 1}`,
        meta: metaParts.slice(0, 2).join(' · ') || sheet.name,
        value: numeric(row[metric.key]),
        metrics: extraMetrics,
      }
      const list = groupMap.get(groupLabel) ?? []
      list.push(item)
      groupMap.set(groupLabel, list)
    })

    const tiles: DashboardGroupTile[] = Array.from(groupMap.entries())
      .map(([label, items]) => ({
        key: label,
        label,
        count: items.length,
        total: items.reduce((sum, i) => sum + i.value, 0),
        items: [...items].sort((a, b) => b.value - a.value),
      }))
      .filter((t) => t.label !== 'Unspecified')
      .sort((a, b) => b.total - a.total)

    const groupTitle = companyKey
      ? 'Company tiles'
      : sprintKey
        ? 'Sprint tiles'
        : resourceKey
          ? 'Resource tiles'
          : `${groupKey} tiles`

    groups = {
      title: groupTitle,
      byLabel: groupKey,
      tiles,
    }
  }

  const flatItems: DashboardTileItem[] = rows.map((row, index) => {
    const itemLabel = itemLabelKey
      ? cleanLabel(row[itemLabelKey])
      : labelKey
        ? cleanLabel(row[labelKey])
        : `Row ${index + 1}`
    const metaParts = [companyKey, sprintKey, resourceKey]
      .filter((k): k is string => Boolean(k) && k !== itemLabelKey)
      .map((k) => cleanLabel(row[k]))
      .filter((v) => v && v !== 'Unspecified' && v !== itemLabel)
    return {
      id: `top-${index}`,
      label: itemLabel,
      meta: metaParts.slice(0, 2).join(' · ') || sheet.name,
      value: numeric(row[metric.key]),
      metrics: [],
    }
  })

  const topItems = [...flatItems].sort((a, b) => b.value - a.value).slice(0, 8)

  return {
    metricLabel: metric.label,
    composition: compositionSlices.length
      ? {
          title: `Share of ${metric.label}`,
          byLabel: compositionKey ?? 'Category',
          slices: compositionSlices,
          total: compositionSlices.reduce((s, x) => s + x.value, 0),
        }
      : null,
    ranking: rankingSlices.length
      ? {
          title: `Ranked by ${metric.label}`,
          byLabel: rankingKey ?? 'Item',
          slices: rankingSlices,
        }
      : null,
    trend: trendSlices.length
      ? {
          title: `${metric.label} by sprint`,
          byLabel: trendKey ?? 'Sprint',
          slices: trendSlices,
        }
      : null,
    groups,
    topItems: topItems.length
      ? {
          title: `Top by ${metric.label}`,
          items: topItems,
        }
      : null,
  }
}

export function buildDashboardModel(
  session: WorkbookSession,
  filters: Record<string, string> = {},
): DashboardModel {
  const filterDefs = resolveFilterColumns(session.sheets)

  const filterMetas: DashboardFilter[] = filterDefs.map((def) => {
    const values = new Set<string>()
    for (const sheet of session.sheets) {
      const key = def.keysBySheet[sheet.name]
      if (!key) continue
      for (const row of sheet.rows) {
        const text = cleanLabel(row[key])
        if (text !== 'Unspecified') values.add(text)
      }
    }
    return {
      id: def.id,
      label: def.label,
      options: Array.from(values).sort((a, b) => a.localeCompare(b)),
    }
  })

  // Fallback: use first 3 category mappings when template filters are absent
  if (!filterMetas.length) {
    const seen = new Set<string>()
    for (const sheet of session.sheets) {
      for (const mapping of sheet.mappings) {
        if (mapping.role !== 'category') continue
        if (seen.has(mapping.key)) continue
        seen.add(mapping.key)
        const options = Array.from(
          new Set(sheet.rows.map((r) => cleanLabel(r[mapping.key])).filter((v) => v !== 'Unspecified')),
        ).sort((a, b) => a.localeCompare(b))
        filterMetas.push({
          id: mapping.key,
          label: mapping.label,
          options,
        })
        if (filterMetas.length >= 3) break
      }
      if (filterMetas.length >= 3) break
    }
  }

  const filteredBySheet = new Map<string, Record<string, unknown>[]>()
  let filteredRowCount = 0

  for (const sheet of session.sheets) {
    const rows = sheet.rows.filter((row) => {
      if (filterDefs.length) {
        return filterDefs.every((def) => {
          const selected = filters[def.id]
          if (!selected || selected === 'All') return true
          const key = def.keysBySheet[sheet.name]
          if (!key) return true
          return cleanLabel(row[key]) === selected
        })
      }

      return filterMetas.every((meta) => {
        const selected = filters[meta.id]
        if (!selected || selected === 'All') return true
        if (!(meta.id in row) && !sheet.headers.includes(meta.id)) return true
        const key = sheet.headers.includes(meta.id)
          ? meta.id
          : sheet.mappings.find((m) => m.key === meta.id)?.key
        if (!key) return true
        return cleanLabel(row[key]) === selected
      })
    })
    filteredBySheet.set(sheet.name, rows)
    filteredRowCount += rows.length
  }

  const kpis =
    session.template === 'resource-metrics'
      ? buildResourceMetricsKpis(session.sheets, filteredBySheet, filters)
      : buildGenericKpis(session.sheets, filteredBySheet)

  const sheetViews: DashboardSheetView[] = session.sheets.map((sheet) => {
    const rows = filteredBySheet.get(sheet.name) ?? []
    const visibleMappings =
      session.template === 'resource-metrics'
        ? preferredColumnOrder(
            sheet.name,
            sheet.mappings.filter((m) => m.role !== 'ignore').map((m) => m.key),
          ).flatMap((key) => {
            const mapping = sheet.mappings.find((m) => m.key === key)
            return mapping && mapping.role !== 'ignore' ? [mapping] : []
          })
        : sheet.mappings.filter((m) => m.role !== 'ignore')

    const columns: DashboardColumn[] = visibleMappings.map((m) => ({
      key: m.key,
      label: m.label,
      kind: m.kind,
      align: m.kind === 'number' ? 'right' : 'left',
    }))

    return {
      name: sheet.name,
      title: sheet.name,
      blurb: sheetBlurb(sheet.name, session.template),
      columns,
      rows,
      totalRows: rows.length,
    }
  })

  const visuals = buildDashboardVisuals(session, filteredBySheet, filterDefs)

  const activeFilters = filterMetas
    .map((f) => {
      const selected = filters[f.id]
      if (!selected || selected === 'All') return null
      return `${f.label}: ${selected}`
    })
    .filter(Boolean)

  const allLabel =
    filterMetas.length > 0
      ? filterMetas
          .map((f) => {
            const key = f.label.toLowerCase()
            if (key === 'company') return 'All companies'
            if (key === 'resource') return 'All resources'
            if (key === 'sprint') return 'All sprints'
            return `All ${key}${key.endsWith('s') ? '' : 's'}`
          })
          .join(' · ')
      : 'All loaded rows'

  return {
    title: session.title,
    template: session.template,
    filters: filterMetas,
    kpis,
    sheets: sheetViews,
    visuals,
    contextLine: activeFilters.length ? activeFilters.join(' · ') : allLabel,
    filteredRowCount,
  }
}

export { formatMetric, cellDisplay }
