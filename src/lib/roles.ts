import type { ColumnRole } from '../types'

export const ROLE_OPTIONS: {
  value: ColumnRole
  title: string
  meaning: string
}[] = [
  {
    value: 'label',
    title: 'Label',
    meaning: 'Names each row in the visual — for example a person, item, or vendor.',
  },
  {
    value: 'category',
    title: 'Category',
    meaning: 'Groups rows for filters and summary breakdowns — for example team, type, or status.',
  },
  {
    value: 'metric',
    title: 'Metric',
    meaning: 'Numeric values to total and chart — for example amount, count, or score.',
  },
  {
    value: 'ignore',
    title: 'Ignore',
    meaning: 'Skip this column. It will not appear in the visual.',
  },
]

export function roleTitle(role: ColumnRole) {
  return ROLE_OPTIONS.find((r) => r.value === role)?.title ?? role
}
