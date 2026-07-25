import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { parseWorkbookFile } from '../lib/workbook'
import type { ColumnMapping, ColumnRole, WorkbookSession } from '../types'

type ExvynContextValue = {
  session: WorkbookSession | null
  error: string | null
  busy: boolean
  loadFile: (file: File) => Promise<void>
  loadFromUrl: (url: string, fileName: string) => Promise<void>
  clear: () => void
  setActiveSheet: (name: string) => void
  updateMapping: (sheetName: string, key: string, role: ColumnRole) => void
  updateMappings: (sheetName: string, mappings: ColumnMapping[]) => void
}

const ExvynContext = createContext<ExvynContextValue | null>(null)

export function ExvynProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<WorkbookSession | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const loadFile = useCallback(async (file: File) => {
    setBusy(true)
    setError(null)
    try {
      const next = await parseWorkbookFile(file)
      setSession(next)
    } catch (err) {
      setSession(null)
      setError(err instanceof Error ? err.message : 'Could not read that workbook')
      throw err
    } finally {
      setBusy(false)
    }
  }, [])

  const loadFromUrl = useCallback(async (url: string, fileName: string) => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Could not load that workbook')
      const blob = await res.blob()
      const file = new File([blob], fileName, {
        type: blob.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const next = await parseWorkbookFile(file)
      setSession(next)
    } catch (err) {
      setSession(null)
      setError(err instanceof Error ? err.message : 'Could not load that workbook')
      throw err
    } finally {
      setBusy(false)
    }
  }, [])

  const clear = useCallback(() => {
    setSession(null)
    setError(null)
  }, [])

  const setActiveSheet = useCallback((name: string) => {
    setSession((prev) => (prev ? { ...prev, activeSheet: name } : prev))
  }, [])

  const updateMapping = useCallback((sheetName: string, key: string, role: ColumnRole) => {
    setSession((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        sheets: prev.sheets.map((sheet) => {
          if (sheet.name !== sheetName) return sheet
          return {
            ...sheet,
            mappings: sheet.mappings.map((m) => (m.key === key ? { ...m, role } : m)),
          }
        }),
      }
    })
  }, [])

  const updateMappings = useCallback((sheetName: string, mappings: ColumnMapping[]) => {
    setSession((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        sheets: prev.sheets.map((sheet) =>
          sheet.name === sheetName ? { ...sheet, mappings } : sheet,
        ),
      }
    })
  }, [])

  const value = useMemo(
    () => ({
      session,
      error,
      busy,
      loadFile,
      loadFromUrl,
      clear,
      setActiveSheet,
      updateMapping,
      updateMappings,
    }),
    [
      session,
      error,
      busy,
      loadFile,
      loadFromUrl,
      clear,
      setActiveSheet,
      updateMapping,
      updateMappings,
    ],
  )

  return <ExvynContext.Provider value={value}>{children}</ExvynContext.Provider>
}

export function useExvyn() {
  const ctx = useContext(ExvynContext)
  if (!ctx) throw new Error('useExvyn must be used within ExvynProvider')
  return ctx
}
