import { useLiveQuery } from 'dexie-react-hooks'
import { db, EMPTY_PLAN, type CoinNote, type FuturesPosition, type PlanRule, type SpotCoin, type SpotTrade, type UserPlan } from './db'

const alive = <T extends { deleted_at: string | null }>(rows: T[]) => rows.filter((r) => !r.deleted_at)

export const useCoins = (): SpotCoin[] | undefined =>
  useLiveQuery(async () => alive(await db.spot_coins.toArray()))

export const useTrades = (): SpotTrade[] | undefined =>
  useLiveQuery(async () => alive(await db.spot_trades.toArray()))

export const usePositions = (): FuturesPosition[] | undefined =>
  useLiveQuery(async () => alive(await db.futures_positions.toArray()))

export const useNotes = (): CoinNote[] | undefined =>
  useLiveQuery(async () => alive(await db.coin_notes.toArray()))

export const useRules = (): PlanRule[] | undefined =>
  useLiveQuery(async () => alive(await db.plan_rules.toArray()).sort((a, b) => a.position - b.position))

export const usePlan = (): UserPlan | undefined =>
  useLiveQuery(async () => (await db.user_plan.get('plan')) ?? EMPTY_PLAN)
