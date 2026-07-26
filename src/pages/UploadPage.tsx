import { useRef, useState, type DragEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatedField } from '../components/AnimatedField'
import { useExvyn } from '../context/ExvynContext'

export function UploadPage() {
  const navigate = useNavigate()
  const { loadFile, loadFromUrl, busy, error, session } = useExvyn()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  async function handleFile(file: File | undefined) {
    if (!file) return
    try {
      await loadFile(file)
      navigate('/visualize')
    } catch {
      // error in context
    }
  }

  async function handleExample(path: string, name: string) {
    try {
      await loadFromUrl(path, name)
      navigate('/visualize')
    } catch {
      // error in context
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    void handleFile(event.dataTransfer.files?.[0])
  }

  return (
    <div className="page landing landing-solo">
      <AnimatedField density="hero" className="landing-field" />

      <section
        className={`hero-solo fade-up ${dragging ? 'is-dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <p className="brand-hero" aria-label="Exvyn">
          Exvyn
        </p>
        <h1 className="hero-title">
          Turn sheets into <em>sight</em>.
        </h1>
        <p className="hero-sub">
          Drop a workbook. Filters, charts, and tables appear in this browser — nothing
          is stored on our system.
        </p>

        <div className="hero-cta-stack">
          <button
            type="button"
            className="btn btn-primary btn-hero"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? 'Reading workbook…' : 'Choose Excel file'}
          </button>
          <p className="hero-drop-hint">
            {dragging ? 'Release to load' : 'or drag a file anywhere on this page'}
          </p>
          <p className="example-row hero-examples">
            Try{' '}
            <button
              type="button"
              className="text-link"
              disabled={busy}
              onClick={() =>
                void handleExample(
                  `${import.meta.env.BASE_URL}samples/resource-metrics.xlsx`,
                  'resource-metrics.xlsx',
                )
              }
            >
              resource metrics
            </button>
            {' · '}
            <button
              type="button"
              className="text-link"
              disabled={busy}
              onClick={() =>
                void handleExample(
                  `${import.meta.env.BASE_URL}samples/example-one.xlsx`,
                  'example-one.xlsx',
                )
              }
            >
              example one
            </button>
            {' · '}
            <button
              type="button"
              className="text-link"
              disabled={busy}
              onClick={() =>
                void handleExample(
                  `${import.meta.env.BASE_URL}samples/example-two.xlsx`,
                  'example-two.xlsx',
                )
              }
            >
              example two
            </button>
          </p>
          {session ? (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => navigate('/visualize')}
            >
              Continue to visualize
            </button>
          ) : (
            <Link to="/brief" className="btn btn-ghost">
              Open the brief
            </Link>
          )}
          {error ? <p className="error-text">{error}</p> : null}
        </div>

        <input
          ref={inputRef}
          className="file-input"
          type="file"
          accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
      </section>
    </div>
  )
}
