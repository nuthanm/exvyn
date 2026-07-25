import type { SheetTable, WorkbookTemplate } from '../types'

const FILTER_ALIASES = [
  { id: 'sprint', label: 'Sprint', match: /^(sprint|sprint\s*name)$/i },
  { id: 'company', label: 'Company', match: /^(company|company\s*name)$/i },
  {
    id: 'resource',
    label: 'Resource',
    match: /^(resource(\s*name)?|person|assignee|member)$/i,
  },
] as const

export type FilterAliasId = (typeof FILTER_ALIASES)[number]['id']

export function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function findColumnKey(headers: string[], matcher: RegExp): string | null {
  const hit = headers.find((h) => matcher.test(normalizeHeader(h)))
  return hit ?? null
}

export function resolveFilterColumns(sheets: SheetTable[]) {
  return FILTER_ALIASES.map((alias) => {
    const keysBySheet: Record<string, string> = {}
    for (const sheet of sheets) {
      const key = findColumnKey(sheet.headers, alias.match)
      if (key) keysBySheet[sheet.name] = key
    }
    return {
      id: alias.id as FilterAliasId,
      label: alias.label,
      keysBySheet,
      present: Object.keys(keysBySheet).length > 0,
    }
  }).filter((f) => f.present)
}

export function detectWorkbookTemplate(sheets: SheetTable[]): WorkbookTemplate {
  const allHeaders = sheets.flatMap((s) => s.headers.map(normalizeHeader))
  const hasSprint = allHeaders.some((h) => /^(sprint|sprint name)$/.test(h))
  const hasCompany = allHeaders.some((h) => /^(company|company name)$/.test(h))
  const hasResource = allHeaders.some((h) =>
    /^(resource( name)?|person|assignee|member)$/.test(h),
  )
  const signalCount = [hasSprint, hasCompany, hasResource].filter(Boolean).length

  const sheetBlob = sheets.map((s) => s.name.toLowerCase()).join(' | ')
  const sheetBonus =
    /resource|metrics|pr|loc|fetch|accuracy/.test(sheetBlob) && sheets.length >= 2

  if (signalCount >= 2 || (signalCount >= 1 && sheetBonus)) {
    return 'resource-metrics'
  }
  return 'generic'
}

/** Preferred display order for known resource-metrics columns. */
export function preferredColumnOrder(sheetName: string, headers: string[]): string[] {
  const name = sheetName.toLowerCase()
  let preferred: string[] = []

  if (/resource|metrics|capacity/.test(name)) {
    preferred = [
      'Resource Name',
      'Company',
      'Sprint',
      'Potential Capacity',
      'Capacity Committed',
      'Velocity',
      'Utilization',
      'Potential Capacity / Velocity',
      'No. of PBIs',
      'No. of PRs',
      'Total No. of LOC',
      'Defect Density (Total Defects / Velocity)',
      'PR efficiency (PRs with Zero Comments / Total PRs)',
    ]
  } else if (/pr|loc/.test(name)) {
    preferred = [
      'Company',
      'Resource Name',
      'PR Id',
      'Repository',
      'Target Branch',
      'Closed Date',
      'Lines Added',
      'Lines Deleted',
      'Lines Changed (LOC)',
      'Files Changed',
      'LOC Source',
      'Code Critique Comments',
      'Human Review Comments',
      'Zero Human Comments',
    ]
  } else if (/fetch|accuracy/.test(name)) {
    preferred = [
      'Sprint',
      'Current',
      'Overall Accuracy %',
      'Capacity Match %',
      'Work Items %',
      'Repos %',
      'PR LOC %',
      'PR Comments %',
    ]
  }

  const normalizedPreferred = preferred.map(normalizeHeader)
  const ordered: string[] = []
  for (const pref of preferred) {
    const hit = headers.find((h) => normalizeHeader(h) === normalizeHeader(pref))
    if (hit) ordered.push(hit)
  }
  for (const h of headers) {
    if (!normalizedPreferred.includes(normalizeHeader(h)) && !ordered.includes(h)) {
      ordered.push(h)
    }
  }
  return ordered.length ? ordered : headers
}

export function sheetBlurb(sheetName: string, template: WorkbookTemplate): string {
  if (template !== 'resource-metrics') {
    return 'Mapped columns for the current filters.'
  }
  const name = sheetName.toLowerCase()
  if (/resource|metrics|capacity/.test(name)) {
    return 'One row per configured resource. Use filters above to narrow the view.'
  }
  if (/pr|loc/.test(name)) {
    return 'Each completed PR for configured resources. Code critique and human review are top-level counts.'
  }
  if (/fetch|accuracy/.test(name)) {
    return 'Fetch accuracy for each sprint in the loaded snapshot.'
  }
  return 'Sheet data for the current filters.'
}
