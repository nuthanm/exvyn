export type ColumnKind = 'text' | 'number' | 'date' | 'boolean'

export type ColumnRole = 'label' | 'category' | 'metric' | 'ignore'

export type WorkbookTemplate = 'resource-metrics' | 'generic'

export type ColumnMapping = {
  key: string
  label: string
  kind: ColumnKind
  role: ColumnRole
}

export type SheetTable = {
  name: string
  headers: string[]
  rows: Record<string, unknown>[]
  mappings: ColumnMapping[]
}

export type WorkbookSession = {
  fileName: string
  title: string
  loadedAt: string
  sheets: SheetTable[]
  activeSheet: string
  template: WorkbookTemplate
}

export type ExportMode = 'full' | 'infographic'
