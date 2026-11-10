import Dexie, { type Table } from 'dexie'

/** Спільні поля синхронізації. dirty = 1 — запис ще не відправлено на сервер. */
type Sync = { updated_at: string; deleted_at: string | null; dirty: 0 | 1 }

export type SpotCoin = Sync & {
  id: string
  symbol: string
  tp: number | null
  sl: number | null
  note: string
  coingecko_id: string | null
}

export type SpotTrade = Sync & {
  id: string
  coin_id: string
  kind: 'buy' | 'sell'
  traded_on: string
  price: number
  usd_amount: number
  created_at: string
}

export type FuturesPosition = Sync & {
  id: string
  pair: string
  side: 'long' | 'short'
  entry: number
  margin: number
  leverage: number
  tp: number | null
  sl: number | null
  note: string
  opened_on: string
  exit: number | null
  closed_on: string | null
  fees: number
}

export type UserPlan = {
  id: 'plan'
  strategy: string
  deposit: number | null
  risk_pct: number | null
  monthly_budget: number | null
  updated_at: string
  dirty: 0 | 1
}

export type PlanRule = Sync & { id: string; text: string; position: number }

export type CoinNote = Sync & {
  id: string
  symbol: string
  text: string
  price_level: number | null
  created_at: string
}

export type PriceRow = { symbol: string; price: number; source: string; at: string }

class DiaryDB extends Dexie {
  spot_coins!: Table<SpotCoin, string>
  spot_trades!: Table<SpotTrade, string>
  futures_positions!: Table<FuturesPosition, string>
  user_plan!: Table<UserPlan, string>
  plan_rules!: Table<PlanRule, string>
  coin_notes!: Table<CoinNote, string>
  prices!: Table<PriceRow, string>

  constructor() {
    super('shchodennyk')
    this.version(1).stores({
      spot_coins: 'id, symbol, dirty',
      spot_trades: 'id, coin_id, dirty',
      futures_positions: 'id, dirty',
      user_plan: 'id',
      plan_rules: 'id, dirty',
      coin_notes: 'id, symbol, dirty',
      prices: 'symbol',
    })
  }
}

export const db = new DiaryDB()

export const EMPTY_PLAN: UserPlan = {
  id: 'plan',
  strategy: '',
  deposit: null,
  risk_pct: null,
  monthly_budget: null,
  updated_at: '',
  dirty: 0,
}
