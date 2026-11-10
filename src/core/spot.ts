export type SpotTradeInput = {
  kind: 'buy' | 'sell'
  price: number
  usd_amount: number
  traded_on: string
  created_at?: string
}

export type SpotStats = {
  /** Монет зараз. */
  qty: number
  /** Зважена середня ціна покупок (у поточному циклі володіння). */
  avg: number
  /** Вкладено = середня × монет зараз. */
  invested: number
  /** Зафіксований прибуток з усіх продажів. */
  realized: number
  /** Нижче — null, якщо поточна ціна невідома. */
  value: number | null
  pnl: number | null
  pnlPct: number | null
}

const EPS = 1e-9

function byTime(a: SpotTradeInput, b: SpotTradeInput): number {
  if (a.traded_on !== b.traded_on) return a.traded_on < b.traded_on ? -1 : 1
  const ca = a.created_at ?? ''
  const cb = b.created_at ?? ''
  return ca < cb ? -1 : ca > cb ? 1 : 0
}

/**
 * Рахує стан монети за списком покупок і продажів.
 *
 * Середня — зважена за всіма покупками циклу, продаж її не змінює.
 * Цикл закінчується, коли продано все; наступна покупка починає нову середню
 * (зафіксований прибуток попередніх циклів зберігається).
 */
export function spotStats(trades: SpotTradeInput[], currentPrice: number | null): SpotStats {
  const sorted = [...trades].sort(byTime)

  let buyUsd = 0
  let boughtQty = 0
  let sells: { price: number; qty: number }[] = []
  let realizedDone = 0

  const cycleAvg = () => (boughtQty > 0 ? buyUsd / boughtQty : 0)
  const cycleRealized = () => {
    const avg = cycleAvg()
    return sells.reduce((s, x) => s + (x.price - avg) * x.qty, 0)
  }
  const cycleSold = () => sells.reduce((s, x) => s + x.qty, 0)

  for (const t of sorted) {
    if (!(t.price > 0) || !(t.usd_amount > 0)) continue
    const q = t.usd_amount / t.price
    if (t.kind === 'buy') {
      buyUsd += t.usd_amount
      boughtQty += q
    } else {
      sells.push({ price: t.price, qty: q })
      if (cycleSold() >= boughtQty * (1 - EPS)) {
        realizedDone += cycleRealized()
        buyUsd = 0
        boughtQty = 0
        sells = []
      }
    }
  }

  const avg = cycleAvg()
  const qty = Math.max(0, boughtQty - cycleSold())
  const invested = avg * qty
  const realized = realizedDone + cycleRealized()

  const hasPrice = currentPrice != null && currentPrice > 0
  const value = hasPrice ? qty * currentPrice : null
  const pnl = value != null ? value - invested : null
  const pnlPct = pnl != null && invested > 0 ? (pnl / invested) * 100 : null

  return { qty, avg, invested, realized, value, pnl, pnlPct }
}

/** Скільки монет піде в продаж на цю суму за цією ціною. */
export function sellQty(usd: number, price: number): number {
  return price > 0 ? usd / price : 0
}

/** Чи можна продати на цю суму: не більше, ніж є. */
export function canSell(availableQty: number, usd: number, price: number): boolean {
  if (!(usd > 0) || !(price > 0) || !(availableQty > 0)) return false
  return sellQty(usd, price) <= availableQty * (1 + EPS)
}

/** Прибуток, який зафіксує продаж. */
export function sellProfit(avg: number, usd: number, price: number): number {
  return (price - avg) * sellQty(usd, price)
}

/** До тейку, %: (тейк / поточна − 1) × 100. */
export function spotTakeDistancePct(tp: number, current: number): number {
  return (tp / current - 1) * 100
}

/** Результат у $ для покупки на суму usd за ціною entry, якщо ціна дійде до target. */
export function spotPnlAt(entry: number, usd: number, target: number): number {
  return (target / entry - 1) * usd
}
