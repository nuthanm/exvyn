import { useEffect, useRef, useState, type ReactNode } from 'react'
import { copySection } from '../lib/export'

type Props = {
  title: string
  fileBase?: string
  children: ReactNode
  className?: string
  actions?: ReactNode
}

export function ExportableSection({ title, children, className, actions }: Props) {
  const ref = useRef<HTMLElement>(null)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    if (!status) return
    const t = window.setTimeout(() => setStatus(null), 2200)
    return () => window.clearTimeout(t)
  }, [status])

  async function handleCopy() {
    if (!ref.current) return
    setStatus('Capturing…')
    try {
      const mode = await copySection(ref.current)
      setStatus(mode === 'clipboard' ? 'Image copied' : 'Image downloaded')
    } catch {
      setStatus('Copy failed — try again')
    }
  }

  return (
    <section ref={ref} className={className} data-section={title}>
      <div className="section-toolbar" data-export-ignore="true">
        <div className="section-toolbar-title">{title}</div>
        <div className="section-actions">
          {actions}
          {status ? <span className="action-status">{status}</span> : null}
          <button type="button" className="btn btn-secondary" onClick={() => void handleCopy()}>
            Copy section
          </button>
        </div>
      </div>
      {children}
    </section>
  )
}
