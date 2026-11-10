import { fmtPct } from './format'

export type MarkState = 'above' | 'below' | 'touched'
export type MarkDistance = { pct: number; state: MarkState }

/** Поріг «ціна торкнулась», %. */
export const TOUCH_THRESHOLD_PCT = 0.05

/**
 * Відстань від поточної ціни до позначки: (позначка / поточна − 1) × 100.
 * null — якщо поточна ціна невідома (тоді показуємо лише позначку).
 */
export function markDistance(level: number, current: number | null): MarkDistance | null {
  if (current == null || !(current > 0) || !(level > 0)) return null
  const pct = (level / current - 1) * 100
  if (Math.abs(pct) < TOUCH_THRESHOLD_PCT) return { pct, state: 'touched' }
  return { pct, state: pct > 0 ? 'above' : 'below' }
}

/**
 * Чи торкнулась ціна позначки. Окрема чиста функція —
 * її можна без змін перенести на сервер для сповіщень.
 */
export function isMarkTouched(level: number, current: number | null): boolean {
  return markDistance(level, current)?.state === 'touched'
}

/** «вище ціни на 2.0%» / «нижче ціни на 3.1%» / «ціна торкнулась». */
export function markLabel(d: MarkDistance): string {
  if (d.state === 'touched') return 'ціна торкнулась'
  return `${d.state === 'above' ? 'вище ціни' : 'нижче ціни'} на ${fmtPct(d.pct, false)}`
}
