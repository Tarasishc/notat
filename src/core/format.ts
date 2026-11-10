export const NBSP = ' '
export const MINUS = '−'

function fixed(abs: number, decimals: number): string {
  const [int, frac] = abs.toFixed(decimals).split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)
  return frac ? `${grouped}.${frac}` : grouped
}

function isZero(n: number, decimals: number): boolean {
  return Number(Math.abs(n).toFixed(decimals)) === 0
}

/** Ціна: ≥ 1000 — без копійок, ≥ 1 — 2 знаки, < 1 — 4 знаки. */
export function fmtPrice(n: number): string {
  const a = Math.abs(n)
  const d = a >= 1000 ? 0 : a >= 1 ? 2 : 4
  return `$${fixed(a, d)}`
}

/** Число ціни без «$» — для підстановки в поле вводу. */
export function priceInput(n: number): string {
  const a = Math.abs(n)
  const d = a >= 1000 ? 0 : a >= 1 ? 2 : 4
  return a.toFixed(d)
}

function usdDecimals(n: number): number {
  return Math.abs(n) >= 10000 ? 0 : 2
}

/** Сума: ≥ $10 000 — без копійок; від'ємна — зі справжнім мінусом. */
export function fmtUsd(n: number): string {
  const d = usdDecimals(n)
  const neg = n < 0 && !isZero(n, d)
  return `${neg ? MINUS : ''}$${fixed(Math.abs(n), d)}`
}

/** Результат у $: «+$25.00» / «−$25.00». */
export function fmtUsdSigned(n: number): string {
  const d = usdDecimals(n)
  if (isZero(n, d)) return `$${fixed(0, d)}`
  return `${n > 0 ? '+' : MINUS}$${fixed(Math.abs(n), d)}`
}

/** Відсоток: «+12.5%» / «−3.1%». signed=false — без знака плюс і мінус. */
export function fmtPct(n: number, signed = true): string {
  const body = `${fixed(Math.abs(n), 1)}%`
  if (!signed || isZero(n, 1)) return body
  return `${n > 0 ? '+' : MINUS}${body}`
}

/** Кількість монет: до 6 знаків, без зайвих нулів. */
export function fmtQty(n: number): string {
  const [int, frac = ''] = Math.abs(n).toFixed(6).split('.')
  const trimmed = frac.replace(/0+$/, '')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)
  return trimmed ? `${grouped}.${trimmed}` : grouped
}

/** Українська множина: plural(2, 'нотатка', 'нотатки', 'нотаток'). */
export function plural(n: number, one: string, few: string, many: string): string {
  const a = Math.abs(n) % 100
  const b = a % 10
  if (a > 10 && a < 20) return many
  if (b === 1) return one
  if (b >= 2 && b <= 4) return few
  return many
}
