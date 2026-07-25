import { toPng } from 'html-to-image'
import type { ExportMode } from '../types'

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

function cloneForExport(node: HTMLElement) {
  const clone = node.cloneNode(true) as HTMLElement
  clone.querySelectorAll('[data-export-ignore="true"]').forEach((el) => el.remove())
  clone.querySelectorAll('.animated-field').forEach((el) => el.remove())
  return clone
}

function waitFrames(count = 2) {
  return new Promise<void>((resolve) => {
    let left = count
    const step = () => {
      left -= 1
      if (left <= 0) resolve()
      else requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  })
}

/** Expand a capture clone only — never touches the live page layout. */
function expandCloneForFullCapture(root: HTMLElement) {
  root.classList.add('is-capturing')
  root.removeAttribute('hidden')

  // Fade/animation classes restart at opacity:0 on clone — strip them
  const fadeClasses = ['fade-up', 'fade-up-delay-1', 'fade-up-delay-2', 'fade-up-delay-3']
  ;[root, ...root.querySelectorAll<HTMLElement>('*')].forEach((el) => {
    el.classList.remove(...fadeClasses)
  })

  root.querySelectorAll<HTMLElement>('[hidden], .is-capture-only').forEach((el) => {
    el.hidden = false
    el.style.display = ''
    el.style.visibility = 'visible'
  })

  const unlock = (el: HTMLElement) => {
    el.style.setProperty('overflow', 'visible', 'important')
    el.style.setProperty('overflow-x', 'visible', 'important')
    el.style.setProperty('overflow-y', 'visible', 'important')
    el.style.setProperty('max-height', 'none', 'important')
    el.style.setProperty('max-width', 'none', 'important')
  }

  unlock(root)
  root.style.setProperty('width', 'max-content', 'important')
  root.style.setProperty('min-width', 'max-content', 'important')
  root.style.setProperty('height', 'auto', 'important')
  root.style.setProperty('opacity', '1', 'important')
  root.style.setProperty('visibility', 'visible', 'important')
  root.style.setProperty('transform', 'none', 'important')
  root.style.setProperty('position', 'relative', 'important')
  root.style.setProperty('left', 'auto', 'important')
  root.style.setProperty('top', 'auto', 'important')
  root.style.setProperty('margin', '0', 'important')
  root.style.setProperty('animation', 'none', 'important')
  root.style.setProperty('transition', 'none', 'important')
  root.style.setProperty('backdrop-filter', 'none', 'important')
  root.style.setProperty('-webkit-backdrop-filter', 'none', 'important')
  root.style.setProperty('background', '#ffffff', 'important')

  // Glass / translucent UI reads as wrong opacity in PNG — force solid fills
  root.querySelectorAll<HTMLElement>('*').forEach((el) => {
    el.style.setProperty('animation', 'none', 'important')
    el.style.setProperty('transition', 'none', 'important')
    el.style.setProperty('opacity', '1', 'important')
    el.style.setProperty('backdrop-filter', 'none', 'important')
    el.style.setProperty('-webkit-backdrop-filter', 'none', 'important')
  })

  root
    .querySelectorAll<HTMLElement>(
      '.viz-block, .table-wrap, .table-wrap-metrics, .visual-panel, .category-tile, .top-tile, .slice-tile',
    )
    .forEach((el) => {
      if (el.classList.contains('is-emphasize')) return
      el.style.setProperty('background', '#ffffff', 'important')
    })

  root.querySelectorAll<HTMLElement>('.kpi-tile').forEach((el) => {
    if (el.classList.contains('is-emphasize')) {
      el.style.setProperty('background', '#0f172a', 'important')
      return
    }
    el.style.setProperty('background', '#f0fdfa', 'important')
  })

  root.querySelectorAll<HTMLElement>('.table-wrap, .table-wrap-metrics').forEach((wrap) => {
    unlock(wrap)
    wrap.style.setProperty('width', 'max-content', 'important')
    wrap.style.setProperty('min-width', 'max-content', 'important')
    wrap.style.setProperty('height', 'auto', 'important')
    wrap.style.setProperty('background', '#ffffff', 'important')
  })

  root.querySelectorAll<HTMLElement>('table').forEach((table) => {
    table.style.setProperty('width', 'max-content', 'important')
    table.style.setProperty('min-width', 'max-content', 'important')
    table.style.setProperty('max-width', 'none', 'important')
    table.style.setProperty('background', '#ffffff', 'important')
  })

  // SVG chart paints can inherit CSS opacity mid-animation — freeze fully visible
  root.querySelectorAll('svg, svg *').forEach((el) => {
    ;(el as HTMLElement | SVGElement).style.setProperty('opacity', '1', 'important')
    ;(el as HTMLElement | SVGElement).style.setProperty('animation', 'none', 'important')
  })
}

function attachCaptureStyles(host: HTMLElement) {
  const style = document.createElement('style')
  style.textContent = `
    [data-export-stage="true"] .fade-up,
    [data-export-stage="true"] .fade-up-delay-1,
    [data-export-stage="true"] .fade-up-delay-2,
    [data-export-stage="true"] .fade-up-delay-3 {
      opacity: 1 !important;
      animation: none !important;
      transform: none !important;
    }
    [data-export-stage="true"] .viz-block,
    [data-export-stage="true"] .table-wrap-metrics,
    [data-export-stage="true"] .category-tile,
    [data-export-stage="true"] .top-tile {
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }
    [data-export-stage="true"] .donut-arc,
    [data-export-stage="true"] .column-bar,
    [data-export-stage="true"] .line-path,
    [data-export-stage="true"] .line-area,
    [data-export-stage="true"] .hbar-row .fill {
      opacity: 1 !important;
      animation: none !important;
    }
  `
  host.appendChild(style)
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl)
  return res.blob()
}

/**
 * Render a full uncropped PNG using an off-screen clone.
 * The live page does not expand — no layout jump for the user.
 * Clone stays opacity:1 (opacity:0 caused blank white images).
 */
async function renderSectionImage(node: HTMLElement): Promise<Blob> {
  const host = document.createElement('div')
  host.setAttribute('data-export-stage', 'true')
  host.setAttribute('aria-hidden', 'true')
  // Park fully painted clone far off-screen (must stay opacity:1 for html-to-image)
  Object.assign(host.style, {
    position: 'fixed',
    left: '-100000px',
    top: '0',
    zIndex: '0',
    opacity: '1',
    visibility: 'visible',
    pointerEvents: 'none',
    overflow: 'visible',
    background: '#f4f7fb',
  })

  attachCaptureStyles(host)
  const clone = cloneForExport(node)
  expandCloneForFullCapture(clone)
  host.appendChild(clone)
  document.body.appendChild(host)

  try {
    await waitFrames(3)
    expandCloneForFullCapture(clone)
    await waitFrames(2)

    const tableWidths = Array.from(
      clone.querySelectorAll<HTMLElement>('table, .table-wrap-metrics'),
    ).map((el) => el.scrollWidth)

    const width = Math.ceil(
      Math.max(clone.scrollWidth, clone.offsetWidth, ...tableWidths, 320),
    )
    const height = Math.ceil(
      Math.max(
        clone.scrollHeight,
        clone.offsetHeight,
        ...Array.from(clone.querySelectorAll<HTMLElement>('table, .table-wrap-metrics')).map(
          (el) => el.scrollHeight,
        ),
        180,
      ),
    )

    clone.style.setProperty('width', `${width}px`, 'important')
    clone.style.setProperty('min-width', `${width}px`, 'important')
    host.style.width = `${width}px`
    host.style.height = `${height}px`

    await waitFrames(2)

    const dataUrl = await toPng(clone, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: '#f4f7fb',
      width,
      height,
      style: {
        margin: '0',
        transform: 'none',
        opacity: '1',
        visibility: 'visible',
        overflow: 'visible',
        width: `${width}px`,
        height: `${height}px`,
        background: '#ffffff',
      },
    })

    if (!dataUrl || dataUrl === 'data:,') {
      throw new Error('Could not render section image')
    }

    return dataUrlToBlob(dataUrl)
  } finally {
    host.remove()
  }
}

/** Copy section as a PNG image (full uncropped content), like a snip. */
export async function copySection(node: HTMLElement) {
  const blob = await renderSectionImage(node)

  // Always offer a download fallback path if clipboard image write fails
  if (navigator.clipboard && 'write' in navigator.clipboard && window.ClipboardItem) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob,
        }),
      ])
      return 'clipboard' as const
    } catch {
      downloadBlob(blob, 'exvyn-section.png')
      return 'download' as const
    }
  }

  downloadBlob(blob, 'exvyn-section.png')
  return 'download' as const
}

function collectPageStyles() {
  return Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules)
          .map((rule) => rule.cssText)
          .join('\n')
      } catch {
        return ''
      }
    })
    .join('\n')
}

/** Full visual HTML export — charts, tiles, tables, and Exvyn styling. */
export function exportVisualHtml(
  node: HTMLElement,
  fileName: string,
  title: string,
  mode: ExportMode = 'full',
) {
  const styles = collectPageStyles()
  const clone = cloneForExport(node)
  if (mode === 'infographic') clone.classList.add('is-infographic')

  const widthNote =
    mode === 'infographic'
      ? 'max-width: 920px; margin: 0 auto;'
      : 'max-width: 1180px; margin: 0 auto;'

  const doc = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} · Exvyn</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Source+Sans+3:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    ${styles}
    html, body {
      margin: 0;
      min-height: 100%;
      background:
        radial-gradient(900px 520px at 50% -8%, rgba(8, 145, 178, 0.1), transparent 58%),
        linear-gradient(180deg, #fbfdff 0%, #f4f7fb 42%, #eef3f8 100%);
      color: #0f172a;
      font-family: 'Source Sans 3', sans-serif;
    }
    .export-root {
      ${widthNote}
      padding: 2rem 1.25rem 3rem;
      position: relative;
      z-index: 1;
    }
    .export-banner {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid rgba(15, 23, 42, 0.12);
    }
    .export-banner strong {
      font-family: 'Bricolage Grotesque', sans-serif;
      font-size: 1.35rem;
      letter-spacing: -0.03em;
    }
    .export-banner span {
      color: #64748b;
      font-size: 0.9rem;
    }
    .section-toolbar,
    [data-export-ignore="true"] {
      display: none !important;
    }
    .table-wrap,
    .table-wrap-metrics {
      max-height: none !important;
      max-width: none !important;
      overflow: visible !important;
      width: max-content !important;
    }
    table.data,
    .metrics-table {
      width: max-content !important;
      min-width: max-content !important;
    }
  </style>
</head>
<body>
  <div class="export-root">
    <header class="export-banner">
      <strong>${escapeHtml(title)}</strong>
      <span>Exported from Exvyn · full visual content</span>
    </header>
    ${clone.outerHTML}
  </div>
</body>
</html>`

  downloadBlob(new Blob([doc], { type: 'text/html;charset=utf-8' }), `${fileName}.html`)
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
