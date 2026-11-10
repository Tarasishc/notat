import type { SpotTradeInput } from './spot'

/** Максимальний збиток на угоду = депозит × ризик%. null — якщо план не заповнено. */
export function maxLossPerTrade(deposit: number | null, riskPct: number | null): number | null {
  if (deposit == null || riskPct == null || !(deposit > 0) || !(riskPct > 0)) return null
  return (deposit * riskPct) / 100
}

/** Попередження з ліміту ризику: збиток на стопі більший за ліміт. */
export function riskWarning(
  lossAtStop: number,
  deposit: number | null,
  riskPct: number | null,
): { loss: number; limit: number } | null {
  const limit = maxLossPerTrade(deposit, riskPct)
  if (limit == null || !(lossAtStop > limit)) return null
  return { loss: lossAtStop, limit }
}

/** Сума покупок за календарний місяць (month = 'YYYY-MM'). Продажі не віднімаємо. */
export function monthInvested(trades: SpotTradeInput[], month: string): number {
  return trades
    .filter((t) => t.kind === 'buy' && t.traded_on.startsWith(month))
    .reduce((s, t) => s + t.usd_amount, 0)
}

/** Попередження з бюджету: з цією покупкою місяць перевищить бюджет. */
export function budgetWarning(
  investedThisMonth: number,
  newAmount: number,
  budget: number | null,
): { total: number; budget: number } | null {
  if (budget == null || !(budget > 0)) return null
  const total = investedThisMonth + newAmount
  return total > budget ? { total, budget } : null
}
