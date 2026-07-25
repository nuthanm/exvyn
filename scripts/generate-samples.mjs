import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as XLSX from 'xlsx'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'samples')
mkdirSync(outDir, { recursive: true })

function bookFromSheets(sheets) {
  const wb = XLSX.utils.book_new()
  for (const { name, rows } of sheets) {
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, name)
  }
  return wb
}

const exampleOne = bookFromSheets([
  {
    name: 'People',
    rows: [
      { Name: 'Aisha Rahman', Role: 'Senior Engineer', Team: 'Platform', Sprint: 'Sprint 24.07', PBIs: 8, PRs: 14, LOC: 4820, Defects: 1 },
      { Name: 'Marcus Chen', Role: 'Engineer', Team: 'Platform', Sprint: 'Sprint 24.07', PBIs: 6, PRs: 11, LOC: 3610, Defects: 2 },
      { Name: 'Priya Nair', Role: 'Tech Lead', Team: 'Experience', Sprint: 'Sprint 24.07', PBIs: 5, PRs: 9, LOC: 2140, Defects: 0 },
      { Name: 'Jonah Blake', Role: 'Engineer', Team: 'Experience', Sprint: 'Sprint 24.07', PBIs: 7, PRs: 12, LOC: 3980, Defects: 3 },
      { Name: 'Elena Vargas', Role: 'Engineer', Team: 'Data', Sprint: 'Sprint 24.07', PBIs: 4, PRs: 8, LOC: 2750, Defects: 1 },
      { Name: 'Dev Patel', Role: 'Senior Engineer', Team: 'Data', Sprint: 'Sprint 24.07', PBIs: 9, PRs: 16, LOC: 5210, Defects: 2 },
      { Name: 'Sofia Lind', Role: 'Engineer', Team: 'Platform', Sprint: 'Sprint 24.07', PBIs: 5, PRs: 10, LOC: 3020, Defects: 0 },
      { Name: 'Noah Kim', Role: 'Engineer', Team: 'Experience', Sprint: 'Sprint 24.07', PBIs: 6, PRs: 7, LOC: 1890, Defects: 4 },
    ],
  },
  {
    name: 'Rollup',
    rows: [
      { Team: 'Platform', PBIs: 19, PRs: 35, LOC: 11450, Defects: 3, Focus: 'Reliability' },
      { Team: 'Experience', PBIs: 18, PRs: 28, LOC: 8010, Defects: 7, Focus: 'Conversion' },
      { Team: 'Data', PBIs: 13, PRs: 24, LOC: 7960, Defects: 3, Focus: 'Pipelines' },
    ],
  },
  {
    name: 'Issues',
    rows: [
      { Ticket: 'DEF-104', Owner: 'Jonah Blake', Team: 'Experience', Severity: 'High', AgeDays: 4, Status: 'Open' },
      { Ticket: 'DEF-118', Owner: 'Noah Kim', Team: 'Experience', Severity: 'Medium', AgeDays: 9, Status: 'Open' },
      { Ticket: 'DEF-121', Owner: 'Marcus Chen', Team: 'Platform', Severity: 'Low', AgeDays: 2, Status: 'Resolved' },
      { Ticket: 'DEF-130', Owner: 'Dev Patel', Team: 'Data', Severity: 'Medium', AgeDays: 6, Status: 'Open' },
      { Ticket: 'DEF-133', Owner: 'Elena Vargas', Team: 'Data', Severity: 'Low', AgeDays: 1, Status: 'Resolved' },
    ],
  },
])

const exampleTwo = bookFromSheets([
  {
    name: 'Transactions',
    rows: [
      { Vendor: 'Cloudflare', Category: 'Infrastructure', Department: 'Platform', Month: '2026-06', Amount: 4200, Status: 'Paid' },
      { Vendor: 'AWS', Category: 'Infrastructure', Department: 'Platform', Month: '2026-06', Amount: 18640, Status: 'Paid' },
      { Vendor: 'Figma', Category: 'Software', Department: 'Experience', Month: '2026-06', Amount: 960, Status: 'Paid' },
      { Vendor: 'Datadog', Category: 'Software', Department: 'Platform', Month: '2026-06', Amount: 5100, Status: 'Accrued' },
      { Vendor: 'Office Lease', Category: 'Facilities', Department: 'Operations', Month: '2026-06', Amount: 22000, Status: 'Paid' },
      { Vendor: 'TravelCo', Category: 'Travel', Department: 'Leadership', Month: '2026-06', Amount: 3475, Status: 'Paid' },
      { Vendor: 'Notion', Category: 'Software', Department: 'Operations', Month: '2026-06', Amount: 780, Status: 'Paid' },
      { Vendor: 'Snowflake', Category: 'Infrastructure', Department: 'Data', Month: '2026-06', Amount: 9400, Status: 'Accrued' },
      { Vendor: 'Conference', Category: 'Travel', Department: 'Experience', Month: '2026-05', Amount: 6120, Status: 'Paid' },
      { Vendor: 'AWS', Category: 'Infrastructure', Department: 'Data', Month: '2026-05', Amount: 15200, Status: 'Paid' },
      { Vendor: 'WeWork', Category: 'Facilities', Department: 'Operations', Month: '2026-05', Amount: 8600, Status: 'Paid' },
      { Vendor: 'GitHub', Category: 'Software', Department: 'Platform', Month: '2026-05', Amount: 2100, Status: 'Paid' },
    ],
  },
  {
    name: 'Categories',
    rows: [
      { Category: 'Infrastructure', Budget: 45000, Actual: 47440, Variance: 2440 },
      { Category: 'Software', Budget: 10000, Actual: 8940, Variance: -1060 },
      { Category: 'Facilities', Budget: 32000, Actual: 30600, Variance: -1400 },
      { Category: 'Travel', Budget: 12000, Actual: 9595, Variance: -2405 },
    ],
  },
  {
    name: 'Departments',
    rows: [
      { Department: 'Platform', Headcount: 18, Spend: 30040, CostPerPerson: 1669 },
      { Department: 'Experience', Headcount: 12, Spend: 7080, CostPerPerson: 590 },
      { Department: 'Data', Headcount: 9, Spend: 24600, CostPerPerson: 2733 },
      { Department: 'Operations', Headcount: 7, Spend: 31380, CostPerPerson: 4483 },
      { Department: 'Leadership', Headcount: 4, Spend: 3475, CostPerPerson: 869 },
    ],
  },
])

const onePath = join(outDir, 'example-one.xlsx')
const twoPath = join(outDir, 'example-two.xlsx')

writeFileSync(onePath, XLSX.write(exampleOne, { type: 'buffer', bookType: 'xlsx' }))
writeFileSync(twoPath, XLSX.write(exampleTwo, { type: 'buffer', bookType: 'xlsx' }))

console.log('Wrote', onePath)
console.log('Wrote', twoPath)
