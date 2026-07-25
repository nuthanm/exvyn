import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LineChart, SliceTiles } from '../components/charts'
import { useExvyn } from '../context/ExvynContext'
import { buildBriefSlides } from '../lib/briefSlides'
import { getActiveSheet } from '../lib/workbook'
import { buildVisualModel, formatMetric, pickBestCategoryKey } from '../lib/visualize'

export function BriefPage() {
  const navigate = useNavigate()
  const { session } = useExvyn()
  const [index, setIndex] = useState(0)
  const [dir, setDir] = useState<'in' | 'out'>('in')

  const sheet = session ? getActiveSheet(session) : null
  const model = useMemo(() => {
    if (!session || !sheet) return null
    return buildVisualModel(sheet, session.title, {}, undefined)
  }, [session, sheet])

  const slides = useMemo(() => buildBriefSlides(model), [model])
  const slide = slides[index]
  const total = slides.length
  const progress = ((index + 1) / total) * 100

  const chartSlices = useMemo(() => {
    if (!model?.breakdown || !model.metricKeys[0]) return []
    const key = model.metricKeys[0].key
    return model.breakdown.rows.map((row) => ({
      label: row.label,
      value: row.values[key] ?? 0,
      share: row.share,
    }))
  }, [model])

  function go(next: number) {
    if (next < 0 || next >= total || next === index) return
    setDir('out')
    window.setTimeout(() => {
      setIndex(next)
      setDir('in')
    }, 180)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault()
        go(index + 1)
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        go(index - 1)
      } else if (e.key === 'Escape') {
        navigate(session ? '/visualize' : '/')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const primaryMetric = model?.metricKeys[0]
  const activeGroup =
    (model && (pickBestCategoryKey(model.categories) || '')) || ''

  return (
    <div className="brief-root">
      <div className="brief-progress" aria-hidden="true">
        <div className="brief-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="brief-shell">
        <header className="brief-header">
          <Link to="/" className="brand-mark">
            <span />
            Exvyn
          </Link>
          <div className="brief-meta">
            <span className="brief-meta-label">
              {session ? `${session.title} · Live brief` : 'Product brief'}
            </span>
            <span>
              {index + 1} / {total}
            </span>
          </div>
        </header>

        <main className="brief-stage">
          <div
            key={slide.id}
            className={`brief-slide ${dir === 'out' ? 'is-out' : 'is-in'}`}
          >
            <div className="brief-stagger">
              <p className="brief-kicker">{slide.kicker}</p>
              <h1 className="brief-title">
                {slide.title}
                {slide.id === 'title' ? (
                  <span className="brief-title-accent">Excel + vision</span>
                ) : null}
              </h1>
              {slide.subtitle ? <p className="brief-subtitle">{slide.subtitle}</p> : null}

              {(slide.what || slide.why) && (
                <div className="brief-explain">
                  {slide.what ? (
                    <article>
                      <strong>What you get</strong>
                      <p>{slide.what}</p>
                    </article>
                  ) : null}
                  {slide.why ? (
                    <article>
                      <strong>Why it matters</strong>
                      <p>{slide.why}</p>
                    </article>
                  ) : null}
                </div>
              )}

              {slide.pills?.length ? (
                <div className="brief-pills">
                  {slide.pills.map((p) => (
                    <span key={p} className="brief-pill">
                      {p}
                    </span>
                  ))}
                </div>
              ) : null}

              {slide.body}

              {slide.id === 'trend' && chartSlices.length ? (
                <div className="brief-visual">
                  <LineChart rows={chartSlices} />
                </div>
              ) : null}

              {slide.id === 'trend' && !chartSlices.length ? (
                <div className="brief-visual brief-placeholder">
                  <p>
                    Upload a workbook to see your live {activeGroup || 'category'} trend
                    here.
                  </p>
                </div>
              ) : null}

              {slide.id === 'top' && model?.topItems.length && primaryMetric ? (
                <div className="brief-top-list">
                  {model.topItems.slice(0, 5).map((row, i) => (
                    <div key={row.id} className="brief-top-row">
                      <em>{i + 1}</em>
                      <strong>{row.label}</strong>
                      <span>{formatMetric(row.metrics[primaryMetric.key] ?? 0)}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              {slide.id === 'tiles' && chartSlices.length ? (
                <div className="brief-visual">
                  <SliceTiles slices={chartSlices.slice(0, 8)} />
                </div>
              ) : null}

              {slide.id === 'close' ? (
                <div className="brief-cta">
                  {session ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => navigate('/visualize')}
                      >
                        Open Visualize
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => navigate('/review')}
                      >
                        Adjust mapping
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => navigate('/')}
                      >
                        Start with a file
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => go(0)}
                      >
                        Replay brief
                      </button>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </main>
      </div>

      <footer className="brief-footer">
        <button
          type="button"
          className="brief-nav-btn"
          aria-label="Previous slide"
          disabled={index === 0}
          onClick={() => go(index - 1)}
        >
          ←
        </button>
        <div className="brief-dots" role="tablist" aria-label="Slides">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-label={`Go to slide ${i + 1}`}
              aria-selected={i === index}
              className={`brief-dot ${i === index ? 'is-active' : ''}`}
              onClick={() => go(i)}
            />
          ))}
        </div>
        <button
          type="button"
          className="brief-nav-btn"
          aria-label="Next slide"
          disabled={index === total - 1}
          onClick={() => go(index + 1)}
        >
          →
        </button>
      </footer>
    </div>
  )
}
