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
  /** Статистика; якщо живої ціни немає — рахуємо за середньою (результат 0). */
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
      let stats = spotStats(own, price)
      if (price == null) stats = spotStats(own, stats.avg || null)
      return { coin, trades: own, price, stats }
    })
    const held = all
      .filter((c) => c.stats.qty > 0)
      .sort((a, b) => (b.stats.value ?? 0) - (a.stats.value ?? 0))
    const invested = held.reduce((s, c) => s + c.stats.invested, 0)
    const value = held.reduce((s, c) => s + (c.stats.value ?? c.stats.invested), 0)
    const realized = all.reduce((s, c) => s + c.stats.realized, 0)
    const pnl = value - invested
    return {
      ready: coins !== undefined && trades !== undefined,
      all, held, invested, value, realized, pnl,
      pnlPct: invested > 0 ? (pnl / invested) * 100 : null,
      allTrades: trades ?? [],
    }
  }, [coins, trades, prices.prices])
}

export type PositionModel = {
  pos: FuturesPosition
  open: boolean
  /** Ціна для розрахунку: вихід (закрита), жива, або вхід, якщо живої немає. */
  price: number
  priceKnown: boolean
  pnl: number
  pnlPct: number
}

export function useFutures() {
  const positions = usePositions()
  const prices = usePrices()

  return useMemo(() => {
    const all: PositionModel[] = (positions ?? []).map((pos) => {
      const open = pos.exit == null
      const live = prices.get(pos.pair)
      const price = open ? (live ?? pos.entry) : (pos.exit as number)
      const pnl = futuresPnl(pos, price)
      return { pos, open, price, priceKnown: !open || live != null, pnl, pnlPct: pnlToMarginPct(pnl, pos.margin) }
    })
    const open = all.filter((p) => p.open).sort((a, b) => (a.pos.updated_at < b.pos.updated_at ? 1 : -1))
    const closed = all
      .filter((p) => !p.open)
      .sort((a, b) => ((a.pos.closed_on ?? '') + a.pos.updated_at < (b.pos.closed_on ?? '') + b.pos.updated_at ? 1 : -1))
    return {
      ready: positions !== undefined,
      all, open, closed,
      openPnl: open.reduce((s, p) => s + p.pnl, 0),
      openMargin: open.reduce((s, p) => s + p.pos.margin, 0),
      closedPnl: closed.reduce((s, p) => s + p.pnl, 0),
    }
  }, [positions, prices.prices])
}
