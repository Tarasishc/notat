/**
 * Сховище цін. На етапі 1 ціни статичні (тестові);
 * на етапі 3 тут з'явиться запит до Edge Function `prices` — решта застосунку не зміниться.
 */
import { useSyncExternalStore } from 'react'

export type PriceStatus = 'static' | 'live' | 'offline'
export type PriceState = { prices: Record<string, number>; status: PriceStatus }

const STATIC_PRICES: Record<string, number> = {
  BTC: 100516,
  ETH: 3405.57,
  SOL: 182.4,
  TON: 5.12,
  DOGE: 0.1834,
  BNB: 612.3,
  XRP: 2.31,
  ADA: 0.6412,
}

let state: PriceState = { prices: STATIC_PRICES, status: 'static' }
const listeners = new Set<() => void>()

export function setPriceState(next: PriceState) {
  state = next
  listeners.forEach((l) => l())
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function usePrices(): PriceState & { get: (symbol: string) => number | null } {
  const s = useSyncExternalStore(subscribe, () => state)
  return { ...s, get: (symbol) => s.prices[symbol.toUpperCase()] ?? null }
}
