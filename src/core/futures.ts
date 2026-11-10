export type Side = 'long' | 'short'

export type FuturesInput = {
  side: Side
  entry: number
  margin: number
  leverage: number
  fees?: number
}

export const direction = (side: Side): 1 | -1 => (side === 'long' ? 1 : -1)

/** Розмір позиції, $ = маржа × плече. */
export const positionSize = (margin: number, leverage: number): number => margin * leverage

/** PnL = напрям × (ціна − вхід) / вхід × позиція − комісії. */
export function futuresPnl(p: FuturesInput, price: number): number {
  const size = positionSize(p.margin, p.leverage)
  return (direction(p.side) * (price - p.entry)) / p.entry * size - (p.fees ?? 0)
}

/** % до маржі. */
export function pnlToMarginPct(pnl: number, margin: number): number {
  return margin > 0 ? (pnl / margin) * 100 : 0
}

/** До тейку, %: лонг (тейк / поточна − 1) × 100; шорт (1 − тейк / поточна) × 100. ≤ 0 — тейк досягнуто. */
export function futuresTakeDistancePct(side: Side, tp: number, current: number): number {
  return side === 'long' ? (tp / current - 1) * 100 : (1 - tp / current) * 100
}

/** Скільки $ дає рух ціни на 1%. */
export const usdPerPercent = (margin: number, leverage: number): number =>
  positionSize(margin, leverage) / 100

/** Приблизна ціна ліквідації (без комісій і підтримувальної маржі). */
export function liquidationPrice(side: Side, entry: number, leverage: number): number {
  return side === 'long' ? entry * (1 - 1 / leverage) : entry * (1 + 1 / leverage)
}

/** Вінрейт, % — або null, якщо закритих угод немає (показуємо «—»). */
export function winrate(closedPnls: number[]): number | null {
  if (closedPnls.length === 0) return null
  return (closedPnls.filter((x) => x > 0).length / closedPnls.length) * 100
}

export const fmtWinrate = (w: number | null): string => (w == null ? '—' : `${Math.round(w)}%`)
