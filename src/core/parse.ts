/** Розбирає ввід користувача: «1 000,50» → 1000.5. Повертає null, якщо це не додатне число. */
export function parseNum(input: string | null | undefined): number | null {
  if (input == null) return null
  const s = String(input).replace(/[\s  $]/g, '').replace(',', '.')
  if (!/^(\d+\.?\d*|\.\d+)$/.test(s)) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** Те саме, але лише для чисел > 0. */
export function parsePositive(input: string | null | undefined): number | null {
  const n = parseNum(input)
  return n != null && n > 0 ? n : null
}
