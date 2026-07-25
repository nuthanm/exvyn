import { useEffect, useRef } from 'react'

type Mark =
  | {
      kind: 'cell'
      x: number
      y: number
      homeX: number
      homeY: number
      w: number
      h: number
      vx: number
      vy: number
      life: number
      pulse: number
      tone: number
    }
  | {
      kind: 'ring'
      x: number
      y: number
      homeX: number
      homeY: number
      r: number
      thickness: number
      vx: number
      vy: number
      life: number
      pulse: number
      tone: number
    }
  | {
      kind: 'arc'
      x: number
      y: number
      homeX: number
      homeY: number
      r: number
      start: number
      sweep: number
      thickness: number
      vx: number
      vy: number
      life: number
      pulse: number
      tone: number
    }

type Props = {
  className?: string
  density?: 'hero' | 'soft'
}

/**
 * Transparent atmospheric field — sheet cells, soft rings, and arc marks
 * that gather toward the cursor across the full viewport.
 */
export function AnimatedField({ className = '', density = 'hero' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const markCount = density === 'hero' ? 120 : 70

    let width = 0
    let height = 0
    let marks: Mark[] = []
    let raf = 0
    let running = true
    const pointer = { x: 0, y: 0, active: false }
    const target = { x: 0, y: 0 }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = Math.max(1, window.innerWidth)
      height = Math.max(1, window.innerHeight)
      canvas!.width = Math.floor(width * dpr)
      canvas!.height = Math.floor(height * dpr)
      canvas!.style.width = `${width}px`
      canvas!.style.height = `${height}px`
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      seed()
      if (!pointer.active) {
        pointer.x = width * 0.5
        pointer.y = height * 0.42
        target.x = pointer.x
        target.y = pointer.y
      }
    }

    function seed() {
      const cols = Math.max(6, Math.ceil(Math.sqrt(markCount * (width / Math.max(height, 1)))))
      const rows = Math.max(4, Math.ceil(markCount / cols))
      marks = []
      let n = 0
      for (let row = 0; row < rows && n < markCount; row++) {
        for (let col = 0; col < cols && n < markCount; col++) {
          const jitterX = (Math.random() - 0.5) * (width / cols) * 0.75
          const jitterY = (Math.random() - 0.5) * (height / rows) * 0.75
          const homeX = ((col + 0.5) / cols) * width + jitterX
          const homeY = ((row + 0.5) / rows) * height + jitterY
          marks.push(makeMark(homeX, homeY, n))
          n += 1
        }
      }
    }

    function makeMark(homeX: number, homeY: number, index: number): Mark {
      const roll = (index * 17 + Math.floor(Math.random() * 100)) % 10
      const base = {
        x: homeX,
        y: homeY,
        homeX,
        homeY,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        life: 0.22 + Math.random() * 0.55,
        pulse: Math.random() * Math.PI * 2,
        tone: Math.random(),
      }

      if (roll < 6) {
        const tall = Math.random() > 0.65
        return {
          ...base,
          kind: 'cell',
          w: tall ? 2.5 + Math.random() * 4 : 6 + Math.random() * 14,
          h: tall ? 10 + Math.random() * 22 : 2.5 + Math.random() * 5,
        }
      }

      if (roll < 8) {
        return {
          ...base,
          kind: 'ring',
          r: 8 + Math.random() * 22,
          thickness: 1 + Math.random() * 1.8,
        }
      }

      return {
        ...base,
        kind: 'arc',
        r: 10 + Math.random() * 28,
        start: Math.random() * Math.PI * 2,
        sweep: 0.6 + Math.random() * 1.8,
        thickness: 1.4 + Math.random() * 2.2,
      }
    }

    function onPointerMove(event: PointerEvent) {
      pointer.x = event.clientX
      pointer.y = event.clientY
      pointer.active = true
    }

    function onPointerLeave() {
      pointer.active = false
    }

    function paint() {
      if (!running) return
      ctx!.clearRect(0, 0, width, height)

      const follow = pointer.active ? 0.14 : 0.045
      const restX = width * 0.5
      const restY = height * 0.42
      const goalX = pointer.active ? pointer.x : restX
      const goalY = pointer.active ? pointer.y : restY
      target.x += (goalX - target.x) * follow
      target.y += (goalY - target.y) * follow

      const radius =
        density === 'hero'
          ? Math.min(width, height) * 0.45
          : Math.min(width, height) * 0.34

      for (const mark of marks) {
        if (!reduceMotion) {
          const dx = target.x - mark.x
          const dy = target.y - mark.y
          const dist = Math.hypot(dx, dy) || 1
          const pull = pointer.active
            ? Math.max(0, 1 - dist / radius) * 0.62
            : Math.max(0, 1 - dist / (radius * 1.15)) * 0.1

          const homePull = 0.0075
          mark.vx += (dx / dist) * pull * 0.95 + (mark.homeX - mark.x) * homePull
          mark.vy += (dy / dist) * pull * 0.95 + (mark.homeY - mark.y) * homePull
          mark.vx *= 0.91
          mark.vy *= 0.91
          mark.x += mark.vx
          mark.y += mark.vy
          mark.pulse += 0.022 + pull * 0.045
        }

        const near =
          1 - Math.min(1, Math.hypot(mark.x - target.x, mark.y - target.y) / (radius * 1.15))
        const alpha =
          mark.life *
          (0.16 + 0.28 * (0.5 + 0.5 * Math.sin(mark.pulse)) + near * 0.38) *
          (density === 'hero' ? 0.9 : 0.5)

        const cool = mark.tone > 0.42
        const stroke = cool
          ? `rgba(8, 145, 178, ${alpha})`
          : `rgba(15, 23, 42, ${alpha * 0.45})`
        const fill = cool
          ? `rgba(34, 211, 238, ${alpha * 0.55})`
          : `rgba(51, 65, 85, ${alpha * 0.35})`

        if (mark.kind === 'cell') {
          ctx!.fillStyle = fill
          roundRect(ctx!, mark.x, mark.y, mark.w, mark.h, 1.4)
          ctx!.fill()
        } else if (mark.kind === 'ring') {
          ctx!.strokeStyle = stroke
          ctx!.lineWidth = mark.thickness
          ctx!.beginPath()
          ctx!.arc(mark.x, mark.y, mark.r, 0, Math.PI * 2)
          ctx!.stroke()
        } else {
          ctx!.strokeStyle = stroke
          ctx!.lineWidth = mark.thickness
          ctx!.lineCap = 'round'
          ctx!.beginPath()
          ctx!.arc(mark.x, mark.y, mark.r, mark.start, mark.start + mark.sweep)
          ctx!.stroke()
        }
      }

      if (!reduceMotion) raf = requestAnimationFrame(paint)
    }

    resize()
    paint()
    if (!reduceMotion) raf = requestAnimationFrame(paint)

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerleave', onPointerLeave)
    window.addEventListener('resize', resize)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerleave', onPointerLeave)
      window.removeEventListener('resize', resize)
    }
  }, [density])

  return (
    <canvas
      ref={canvasRef}
      className={`animated-field ${className}`.trim()}
      aria-hidden="true"
    />
  )
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}
