import { detectWorkbookTemplate } from './templates'
import type { ColumnKind, ColumnMapping, ColumnRole, SheetTable, WorkbookSession } from '../types'

const MAX_FILE_BYTES = 8 * 1024 * 1024
const MAX_ROWS = 5000

export function assertSafeFile(file: File) {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('File exceeds the 8 MB limit. Split the workbook or remove unused sheets.')
  }
  const ok =
    /\.(xlsx|xls|csv)$/i.test(file.name) ||
    file.type.includes('sheet') ||
    file.type.includes('excel') ||
    file.type === 'text/csv' ||
    file.type === ''
  if (!ok) {
    throw new Error('Use an Excel workbook (.xlsx / .xls) or CSV file.')
  }
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'string') {
    const cleaned = value.replace(/[$€£,%\s]/g, '').replace(/,/g, '')
    if (!cleaned) return null
    const n = Number(cleaned)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function looksLikeDate(value: unknown): boolean {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return true
  if (typeof value === 'number' && value > 20000 && value < 60000) return true
  if (typeof value === 'string') {
    const t = Date.parse(value)
    return (
      Number.isFinite(t) &&
      /\d{4}|\d{1,2}[/-]\d{1,2}|[A-Za-z]{3,9}/.test(value)
    )
  }
  return false
}

export function inferKind(values: unknown[]): ColumnKind {
  const sample = values.filter((v) => v !== null && v !== undefined && String(v).trim() !== '')
  if (!sample.length) return 'text'

  const dateHits = sample.filter(looksLikeDate).length
  if (dateHits / sample.length >= 0.6) return 'date'

  const numberHits = sample.filter((v) => toNumber(v) !== null).length
  if (numberHits / sample.length >= 0.7) return 'number'

  const boolHits = sample.filter((v) => {
    const s = String(v).trim().toLowerCase()
    return ['true', 'false', 'yes', 'no', 'y', 'n', '0', '1'].includes(s)
  }).length
  if (boolHits / sample.length >= 0.8) return 'boolean'

  return 'text'
}

function headerHintRole(header: string, kind: ColumnKind): ColumnRole | null {
  const h = header.trim().toLowerCase()
  if (
    /^(__empty|empty|unnamed|column\d*|uuid|guid|row|#)$/i.test(h) ||
    /^(email|e-?mail|url|pr url|loc source|moved out|loc ok|comments ok)$/i.test(h)
  ) {
    return 'ignore'
  }
  if (/^__/.test(h)) return 'ignore'
  if (/^(sprint|sprint name|company|company name|resource|resource name|person|assignee|member|team)$/i.test(h)) {
    return 'category'
  }
  if (/^(resource name|title|pr id|name|item|label|expenses?\s*on)$/i.test(h)) {
    return 'label'
  }
  if (kind === 'number') return 'metric'
  if (/(category|type|status|group|region|department|owner|role|repository|target branch|current)/i.test(h)) {
    return 'category'
  }
  if (kind === 'date') return 'category'
  return null
}

export function inferMappings(headers: string[], rows: Record<string, unknown>[]): ColumnMapping[] {
  const mappings: ColumnMapping[] = headers.map((header) => {
    const values = rows.map((r) => r[header])
    const kind = inferKind(values)
    const unique = new Set(values.map((v) => String(v ?? '').trim()).filter(Boolean))
    const filled = unique.size
    const hinted = headerHintRole(header, kind)

    let role: ColumnRole = hinted ?? 'ignore'
    if (!hinted) {
      if (filled === 0) role = 'ignore'
      else if (kind === 'number') role = 'metric'
      else if (unique.size > 1 && unique.size <= Math.max(12, Math.ceil(rows.length * 0.35))) {
        role = 'category'
      } else if (kind === 'text') role = 'label'
      else role = 'ignore'
    }

    return {
      key: header,
      label: header,
      kind,
      role,
    }
  })

  ensureUsefulRoles(mappings, rows)
  return mappings
}

function ensureUsefulRoles(mappings: ColumnMapping[], rows: Record<string, unknown>[]) {
  if (!mappings.some((m) => m.role === 'label')) {
    const textCol = mappings.find((m) => m.kind === 'text' && m.role !== 'ignore')
    if (textCol) textCol.role = 'label'
    else if (mappings[0]) mappings[0].role = 'label'
  }

  if (!mappings.some((m) => m.role === 'metric')) {
    const numeric = mappings.find((m) => m.kind === 'number')
    if (numeric) numeric.role = 'metric'
  }

  if (!mappings.some((m) => m.role === 'category')) {
    const candidate = mappings.find((m) => {
      if (m.role === 'label' || m.role === 'metric') return false
      if (m.kind === 'number') return false
      const unique = new Set(rows.map((r) => String(r[m.key] ?? '').trim()).filter(Boolean))
      return unique.size >= 2 && unique.size <= 20
    })
    if (candidate) candidate.role = 'category'
  }
}

export function normalizeCell(value: unknown, kind: ColumnKind): string | number {
  if (kind === 'number') {
    return toNumber(value) ?? 0
  }
  if (kind === 'date') {
    if (typeof value === 'number') return value
    const d = new Date(String(value))
    return Number.isNaN(d.getTime()) ? String(value ?? '') : d.toISOString().slice(0, 10)
  }
  if (value == null) return ''
  return String(value)
}

export function buildSheetTable(
  name: string,
  rows: Record<string, unknown>[],
): SheetTable {
  const limited = rows.slice(0, MAX_ROWS)
  const headers =
    limited.length > 0
      ? Object.keys(limited[0])
      : []
  return {
    name,
    headers,
    rows: limited,
    mappings: inferMappings(headers, limited),
  }
}

export async function parseWorkbookFile(file: File): Promise<WorkbookSession> {
  assertSafeFile(file)
  const XLSX = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })

  if (!workbook.SheetNames.length) {
    throw new Error('This workbook has no sheets.')
  }

  const sheets: SheetTable[] = workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw: false,
    })
    return buildSheetTable(sheetName, rows)
  }).filter((s) => s.headers.length > 0)

  if (!sheets.length) {
    throw new Error('No readable tables found. Ensure the first row contains column headers.')
  }

  const title = file.name.replace(/\.(xlsx|xls|csv)$/i, '')
  const template = detectWorkbookTemplate(sheets)

  return {
    fileName: file.name,
    title,
    loadedAt: new Date().toISOString(),
    sheets,
    activeSheet: sheets[0].name,
    template,
  }
}

export function getActiveSheet(session: WorkbookSession): SheetTable {
  return (
    session.sheets.find((s) => s.name === session.activeSheet) ?? session.sheets[0]
  )
}

export function formatMetric(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 10_000) return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
  if (Number.isInteger(value)) return new Intl.NumberFormat('en-US').format(value)
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value)
}
