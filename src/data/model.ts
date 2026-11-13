/** Зведені дані для екранів: записи з IndexedDB + ціни → готові до показу числа. */
import { useMemo } from 'react'
import { futuresPnl, pnlToMarginPct } from '../core/futures'
import { spotStats, type SpotStats } from '../core/spot'
import type { FuturesPosition, SpotCoin, SpotTrade } from './db'
import { useCoins, usePositions, useTrades } from './hooks'
import { usePrices } from './prices'

export type CoinModel = {
  coin: SpotCoin
  trades: SpotTrade[]
  /** Жива ціна або null, якщо монети немає в жодному джерелі. */
  price: number | null
  /** Статистика; без живої ціни value, pnl і pnlPct дорівнюють null. */
  stats: SpotStats
}

export function useSpot() {
  const coins = useCoins()
  const trades = useTrades()
  const prices = usePrices()

  return useMemo(() => {
    const all: CoinModel[] = (coins ?? []).map((coin) => {
      const own = (trades ?? []).filter((t) => t.coin_id === coin.id)
      const price = prices.get(coin.symbol)
      const stats = spotStats(own, price)
      return { coin, trades: own, price, stats }
    })
    const held = all
      .filter((c) => c.stats.qty > 0)
      .sort((a, b) => (b.stats.value ?? b.stats.invested) - (a.stats.value ?? a.stats.invested))
    const invested = held.reduce((s, c) => s + c.stats.invested, 0)
    const realized = all.reduce((s, c) => s + c.stats.realized, 0)
    // Результат рахуємо лише по монетах із живою ціною; решта входить у суму за вкладеним.
    const priced = held.filter((c) => c.stats.pnl != null)
    const pricedInvested = priced.reduce((s, c) => s + c.stats.invested, 0)
    const pnl = priced.length ? priced.reduce((s, c) => s + (c.stats.pnl as number), 0) : null
    const value = invested + (pnl ?? 0)
    return {
      ready: coins !== undefined && trades !== undefined,
      all, held, invested, value, realized, pnl,
      pnlPct: pnl != null && pricedInvested > 0 ? (pnl / pricedInvested) * 100 : null,
      /** Скільки монет без живої ціни. */
      unpriced: held.length - priced.length,
      allTrades: trades ?? [],
    }
  }, [coins, trades, prices.prices])
}

export type PositionModel = {
  pos: FuturesPosition
  open: boolean
  /** Ціна для розрахунку: вихід (закрита) або жива; null — живої ціни немає. */
  price: number | null
  priceKnown: boolean
  /** null — результат невідомий, бо немає живої ціни. */
  pnl: number | null
  pnlPct: number | null
}

export function useFutures() {
  const positions = usePositions()
  const prices = usePrices()

  return useMemo(() => {
    const all: PositionModel[] = (positions ?? []).map((pos) => {
      const open = pos.exit == null
      const live = prices.get(pos.pair)
      const price = open ? live : (pos.exit as number)
      const pnl = price != null ? futuresPnl(pos, price) : null
      return {
        pos, open, price, priceKnown: price != null, pnl,
        pnlPct: pnl != null ? pnlToMarginPct(pnl, pos.margin) : null,
      }
    })
    const open = all.filter((p) => p.open).sort((a, b) => (a.pos.updated_at < b.pos.updated_at ? 1 : -1))
    const closed = all
      .filter((p) => !p.open)
      .sort((a, b) => ((a.pos.closed_on ?? '') + a.pos.updated_at < (b.pos.closed_on ?? '') + b.pos.updated_at ? 1 : -1))
    return {
      ready: positions !== undefined,
      all, open, closed,
      openPnl: open.some((p) => p.pnl != null) ? open.reduce((s, p) => s + (p.pnl ?? 0), 0) : null,
      openMargin: open.reduce((s, p) => s + p.pos.margin, 0),
      closedPnl: closed.reduce((s, p) => s + (p.pnl ?? 0), 0),
    }
  }, [positions, prices.prices])
}
