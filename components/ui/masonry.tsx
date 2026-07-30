"use client"

/**
 * Masonry — adaptado do componente de reactbits.dev (https://reactbits.dev/components/masonry).
 * Client-only: mede a largura do container via ResizeObserver e posiciona os itens
 * de forma absoluta, animando com `motion`. Enquanto a largura não é conhecida (SSR /
 * antes da hidratação) renderiza nada, evitando mismatch de SSR/streaming.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { motion } from "motion/react"

export type MasonryItem = { id: string; height: number }

type ColumnsBreakpoints = { sm?: number; md?: number; lg?: number; base?: number }

export function Masonry<T extends MasonryItem>({
  items,
  renderItem,
  gap = 12,
  columnsBreakpoints,
  getHeight,
}: {
  items: T[]
  renderItem: (item: T, width: number) => ReactNode
  gap?: number
  columnsBreakpoints?: ColumnsBreakpoints
  /** Altura do item em função da largura da coluna. Se ausente, usa item.height. */
  getHeight?: (item: T, colWidth: number) => number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const columns = useMemo(() => {
    if (width >= 1024) return columnsBreakpoints?.lg ?? 4
    if (width >= 768)  return columnsBreakpoints?.md ?? 3
    if (width >= 480)  return columnsBreakpoints?.sm ?? 2
    return columnsBreakpoints?.base ?? 1
  }, [width, columnsBreakpoints])

  const layout = useMemo(() => {
    if (width === 0) return { positions: [] as (T & { x: number; y: number; w: number })[], height: 0 }
    const colWidth = (width - gap * (columns - 1)) / columns
    const colHeights = new Array(columns).fill(0)
    const positions = items.map((item) => {
      const h = getHeight ? getHeight(item, colWidth) : item.height
      const col = colHeights.indexOf(Math.min(...colHeights))
      const x = col * (colWidth + gap)
      const y = colHeights[col]
      colHeights[col] += h + gap
      return { ...item, x, y, w: colWidth, _h: h }
    })
    return { positions, height: Math.max(0, ...colHeights) }
  }, [items, width, columns, gap, getHeight])

  return (
    <div ref={ref} className="relative w-full" style={{ height: layout.height }}>
      {layout.positions.map((p) => (
        <motion.div
          key={p.id}
          className="absolute left-0 top-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, x: p.x, y: p.y }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{ width: p.w, height: p._h }}
        >
          {renderItem(p, p.w)}
        </motion.div>
      ))}
    </div>
  )
}
