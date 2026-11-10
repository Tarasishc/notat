/** Усі зміни даних. Пишемо одразу в IndexedDB — інтерфейс ніколи не чекає мережі. */
import { today } from '../core/dates'
import { db, EMPTY_PLAN, type UserPlan } from './db'

const now = () => new Date().toISOString()
const uuid = () => crypto.randomUUID()
const stamp = () => ({ updated_at: now(), deleted_at: null, dirty: 1 as const })

export const normSymbol = (s: string) =>
  s.trim().toUpperCase().replace(/\/?USDT$/, '').replace(/[^A-Z0-9]/g, '')

export type PlanFields = { tp: number | null; sl: number | null; note: string }

export async function findCoin(symbol: string) {
  const sym = normSymbol(symbol)
  const rows = await db.spot_coins.where('symbol').equals(sym).toArray()
  return rows.find((c) => !c.deleted_at)
}

/** Покупка в споті. Якщо монета вже є — додаємо в неї, якщо ні — створюємо. Повертає id монети. */
export async function addSpotBuy(input: {
  symbol: string
  price: number
  usd: number
  date?: string
  plan?: PlanFields
}): Promise<string> {
  const sym = normSymbol(input.symbol)
  return db.transaction('rw', db.spot_coins, db.spot_trades, async () => {
    let coin = await findCoin(sym)
    if (!coin) {
      coin = { id: uuid(), symbol: sym, tp: null, sl: null, note: '', coingecko_id: null, ...stamp() }
      await db.spot_coins.add(coin)
    }
    if (input.plan) {
      await db.spot_coins.update(coin.id, { ...input.plan, updated_at: now(), dirty: 1 })
    }
    await addTrade(coin.id, 'buy', input.price, input.usd, input.date)
    return coin.id
  })
}

export const addSpotSell = (coinId: string, price: number, usd: number, date?: string) =>
  addTrade(coinId, 'sell', price, usd, date)

async function addTrade(coinId: string, kind: 'buy' | 'sell', price: number, usd: number, date?: string) {
  await db.spot_trades.add({
    id: uuid(),
    coin_id: coinId,
    kind,
    traded_on: date || today(),
    price,
    usd_amount: usd,
    created_at: now(),
    ...stamp(),
  })
}

const softDelete = { get: () => ({ deleted_at: now(), updated_at: now(), dirty: 1 as const }) }

export const deleteTrade = (id: string) => db.spot_trades.update(id, softDelete.get())

/** Видаляє монету разом з усіма її покупками й продажами. */
export async function deleteCoin(id: string) {
  await db.transaction('rw', db.spot_coins, db.spot_trades, async () => {
    await db.spot_trades.where('coin_id').equals(id).modify(softDelete.get())
    await db.spot_coins.update(id, softDelete.get())
  })
}

export async function openPosition(input: {
  pair: string
  side: 'long' | 'short'
  entry: number
  margin: number
  leverage: number
  date?: string
  plan?: PlanFields
}): Promise<string> {
  const id = uuid()
  await db.futures_positions.add({
    id,
    pair: normSymbol(input.pair),
    side: input.side,
    entry: input.entry,
    margin: input.margin,
    leverage: input.leverage,
    tp: input.plan?.tp ?? null,
    sl: input.plan?.sl ?? null,
    note: input.plan?.note ?? '',
    opened_on: input.date || today(),
    exit: null,
    closed_on: null,
    fees: 0,
    ...stamp(),
  })
  return id
}

export const closePosition = (id: string, exit: number, fees: number) =>
  db.futures_positions.update(id, { exit, fees, closed_on: today(), updated_at: now(), dirty: 1 })

export const deletePosition = (id: string) => db.futures_positions.update(id, softDelete.get())

export async function addNote(symbol: string, text: string, priceLevel: number | null) {
  await db.coin_notes.add({
    id: uuid(),
    symbol: normSymbol(symbol),
    text: text.trim(),
    price_level: priceLevel,
    created_at: now(),
    ...stamp(),
  })
}

export const deleteNote = (id: string) => db.coin_notes.update(id, softDelete.get())

export async function savePlan(patch: Partial<Omit<UserPlan, 'id'>>) {
  const cur = (await db.user_plan.get('plan')) ?? EMPTY_PLAN
  await db.user_plan.put({ ...cur, ...patch, id: 'plan', updated_at: now(), dirty: 1 })
}

export async function addRule(text: string) {
  const all = await db.plan_rules.toArray()
  const position = all.reduce((m, r) => Math.max(m, r.position), 0) + 1
  await db.plan_rules.add({ id: uuid(), text: text.trim(), position, ...stamp() })
}

export const removeRule = (id: string) => db.plan_rules.update(id, softDelete.get())
