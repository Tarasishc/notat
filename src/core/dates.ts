const pad = (n: number) => String(n).padStart(2, '0')

/** Локальна дата 'YYYY-MM-DD'. */
export function today(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const currentMonth = (d = new Date()): string => today(d).slice(0, 7)

const MONTHS = ['січ', 'лют', 'бер', 'кві', 'тра', 'чер', 'лип', 'сер', 'вер', 'жов', 'лис', 'гру']

/** '2026-11-10' або ISO-час → «10 лис» (рік додаємо, якщо не поточний). */
export function fmtDate(iso: string, now = new Date()): string {
  const d = iso.length === 10 ? new Date(`${iso}T00:00:00`) : new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`
  return d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`
}
