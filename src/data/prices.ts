/**
 * Сховище цін. Поки живі ціни не підключено, воно порожнє: застосунок рахує лише
 * середню, вкладене й зафіксоване, без вигаданих результатів.
 * На етапі 3 тут з'явиться запит до Edge Function `prices` — решта застосунку не зміниться.
 */
import { useSyncExternalStore } from 'react'

export type PriceStatus = 'none' | 'live' | 'offline'
export type PriceState = { prices: Record<string, number>; status: PriceStatus }

let state: PriceState = { prices: {}, status: 'none' }
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
