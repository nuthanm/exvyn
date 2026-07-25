import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as XLSX from 'xlsx'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'samples')
mkdirSync(outDir, { recursive: true })

function sheetFromRows(rows) {
  return XLSX.utils.json_to_sheet(rows)
}

function withAutoFilter(ws, rows) {
  if (!rows.length) return ws
  const headers = Object.keys(rows[0])
  const lastCol = XLSX.utils.encode_col(headers.length - 1)
  const lastRow = rows.length + 1
  ws['!autofilter'] = { ref: `A1:${lastCol}${lastRow}` }
  ws['!cols'] = headers.map((h) => ({ wch: Math.min(36, Math.max(12, h.length + 2)) }))
  return ws
}

const resourceMetrics = [
  {
    Sprint: 'Sprint 27.1.3',
    'Sprint Start': '2026-07-16',
    'Sprint End': '2026-08-05',
    'Resource Name': 'Test user 1',
    Email: 'test1@company.com',
    Company: 'Company 1',
    'Potential Capacity': 84,
    'Capacity Committed': 86,
    Velocity: 0,
    Utilization: '102.4%',
    'Potential Capacity / Velocity': '',
    'No. of PBIs': 5,
    'No. of PRs': 0,
    'Total No. of LOC': '',
    'Total Defects': 0,
    'Defect Density (Total Defects / Velocity)': '',
    'PR efficiency (PRs with Zero Comments / Total PRs)': '',
    'Completed Hours (tasks)': 34,
  },
  {
    Sprint: 'Sprint 27.1.3',
    'Sprint Start': '2026-07-16',
    'Sprint End': '2026-08-05',
    'Resource Name': 'Test user 2',
    Email: 'test2@company.com',
    Company: 'Company 2',
    'Potential Capacity': 45,
    'Capacity Committed': 42,
    Velocity: 0,
    Utilization: '93.3%',
    'Potential Capacity / Velocity': '',
    'No. of PBIs': 0,
    'No. of PRs': 1,
    'Total No. of LOC': '',
    'Total Defects': 2,
    'Defect Density (Total Defects / Velocity)': '',
    'PR efficiency (PRs with Zero Comments / Total PRs)': '0.0%',
    'Completed Hours (tasks)': 0,
  },
  {
    Sprint: 'Sprint 27.1.2',
    'Sprint Start': '2026-06-25',
    'Sprint End': '2026-07-15',
    'Resource Name': 'Test user 1',
    Email: 'test1@company.com',
    Company: 'Company 1',
    'Potential Capacity': 90,
    'Capacity Committed': 90,
    Velocity: 15,
    Utilization: '100.0%',
    'Potential Capacity / Velocity': 6,
    'No. of PBIs': 5,
    'No. of PRs': 3,
    'Total No. of LOC': 30,
    'Total Defects': 0,
    'Defect Density (Total Defects / Velocity)': 0,
    'PR efficiency (PRs with Zero Comments / Total PRs)': '66.7%',
    'Completed Hours (tasks)': 90,
  },
  {
    Sprint: 'Sprint 27.1.2',
    'Sprint Start': '2026-06-25',
    'Sprint End': '2026-07-15',
    'Resource Name': 'Test user 2',
    Email: 'test2@company.com',
    Company: 'Company 2',
    'Potential Capacity': 42,
    'Capacity Committed': 43,
    Velocity: 6,
    Utilization: '102.4%',
    'Potential Capacity / Velocity': 7,
    'No. of PBIs': 2,
    'No. of PRs': 3,
    'Total No. of LOC': 20,
    'Total Defects': 0,
    'Defect Density (Total Defects / Velocity)': 0,
    'PR efficiency (PRs with Zero Comments / Total PRs)': '100.0%',
    'Completed Hours (tasks)': 42,
  },
]

const prLocDetail = [
  {
    Sprint: 'Sprint 27.1.3',
    'Resource Name': 'User 1',
    Email: 'user1@Company.com',
    Company: 'Company 1',
    'PR Id': 892622,
    Title:
      'Merged PR 892062: Task#7211403 - Fix SonarQube code style violations (SA1101,...)',
    Repository: 'Repo-name-1',
    'Target Branch': 'develop',
    'Closed Date': '2026-07-22T12:14:42',
    'Lines Added': 26,
    'Lines Deleted': 69,
    'Lines Changed (LOC)': 95,
    'Files Changed': 8,
    'Code Critique Comments': 2,
    'Human Review Comments': 0,
    'Zero Human Comments': 'Yes',
    'LOC Source': 'cache:fileDiff:8files',
    'LOC OK': 'Yes',
    'Comments OK': 'Yes',
    'Moved Out': 'No',
    'PR URL': 'https://dev.azure.com/org/project/_git/repo-one/pullrequest/892622',
  },
  {
    Sprint: 'Sprint 27.1.3',
    'Resource Name': 'User 2',
    Email: 'user2@Company.com',
    Company: 'Company 2',
    'PR Id': 892062,
    Title: 'PR title - fix issues',
    Repository: 'Repo-name-2',
    'Target Branch': 'release-dx2',
    'Closed Date': '2026-07-21T12:05:22',
    'Lines Added': 30,
    'Lines Deleted': 76,
    'Lines Changed (LOC)': 106,
    'Files Changed': 10,
    'Code Critique Comments': 1,
    'Human Review Comments': 0,
    'Zero Human Comments': 'Yes',
    'LOC Source': 'cache:fileDiff:10files',
    'LOC OK': 'Yes',
    'Comments OK': 'Yes',
    'Moved Out': 'No',
    'PR URL': 'https://dev.azure.com/org/project/_git/repo-two/pullrequest/892062',
  },
]

const fetchAccuracy = [
  {
    Sprint: 'Sprint 27.1.3',
    'Sprint Start': '2026-07-16',
    'Sprint End': '2026-08-05',
    Current: 'Yes',
    'Overall Accuracy %': 99.8,
    'Capacity Match %': 100,
    'Capacity Matched': 27,
    'Capacity Expected': 27,
    'Work Items %': 100,
    'Work Items Loaded': 532,
    'Work Items Requested': 532,
    'Repos %': 100,
    'Repos Resolved': 6,
    'Repos Configured': 6,
    'PR LOC %': 99.1,
    'PRs LOC OK': 114,
    'PR Comments %': 100,
    'PRs Comments OK': 115,
    'PRs Enriched': 115,
    'PRs Skipped (Moved Out)': 0,
  },
  {
    Sprint: 'Sprint 27.1.2',
    'Sprint Start': '2026-06-25',
    'Sprint End': '2026-07-15',
    Current: 'No',
    'Overall Accuracy %': 100,
    'Capacity Match %': 100,
    'Capacity Matched': 27,
    'Capacity Expected': 27,
    'Work Items %': 100,
    'Work Items Loaded': 662,
    'Work Items Requested': 662,
    'Repos %': 100,
    'Repos Resolved': 6,
    'Repos Configured': 6,
    'PR LOC %': 100,
    'PRs LOC OK': 204,
    'PR Comments %': 100,
    'PRs Comments OK': 204,
    'PRs Enriched': 204,
    'PRs Skipped (Moved Out)': 0,
  },
  {
    Sprint: 'Sprint 27.1.1',
    'Sprint Start': '2026-06-04',
    'Sprint End': '2026-06-24',
    Current: 'No',
    'Overall Accuracy %': 98.5,
    'Capacity Match %': 92.6,
    'Capacity Matched': 25,
    'Capacity Expected': 27,
    'Work Items %': 100,
    'Work Items Loaded': 550,
    'Work Items Requested': 550,
    'Repos %': 100,
    'Repos Resolved': 6,
    'Repos Configured': 6,
    'PR LOC %': 100,
    'PRs LOC OK': 168,
    'PR Comments %': 100,
    'PRs Comments OK': 168,
    'PRs Enriched': 168,
    'PRs Skipped (Moved Out)': 0,
  },
  {
    Sprint: 'PI-17 Sprint',
    'Sprint Start': '2026-05-20',
    'Sprint End': '2026-06-03',
    Current: 'No',
    'Overall Accuracy %': 95.6,
    'Capacity Match %': 77.8,
    'Capacity Matched': 21,
    'Capacity Expected': 27,
    'Work Items %': 100,
    'Work Items Loaded': 335,
    'Work Items Requested': 335,
    'Repos %': 100,
    'Repos Resolved': 6,
    'Repos Configured': 6,
    'PR LOC %': 100,
    'PRs LOC OK': 126,
    'PR Comments %': 100,
    'PRs Comments OK': 126,
    'PRs Enriched': 126,
    'PRs Skipped (Moved Out)': 0,
  },
]

const wb = XLSX.utils.book_new()
const sheets = [
  { name: 'Resource Metrics', rows: resourceMetrics },
  { name: 'PR LOC Detail', rows: prLocDetail },
  { name: 'Fetch Accuracy', rows: fetchAccuracy },
]

for (const { name, rows } of sheets) {
  const ws = withAutoFilter(sheetFromRows(rows), rows)
  XLSX.utils.book_append_sheet(wb, ws, name)
}

const outPath = join(outDir, 'resource-metrics.xlsx')
writeFileSync(outPath, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
console.log('Wrote', outPath)
