import { describe, expect, it } from 'vitest'
import {
  fmtWinrate,
  futuresPnl,
  futuresTakeDistancePct,
  liquidationPrice,
  pnlToMarginPct,
  positionSize,
  usdPerPercent,
  winrate,
} from './futures'
import { budgetWarning, maxLossPerTrade, monthInvested, riskWarning } from './plan'

const long = { side: 'long' as const, entry: 100, margin: 100, leverage: 5 }
const short = { side: 'short' as const, entry: 100, margin: 100, leverage: 5 }

describe("ф'ючі", () => {
  it('розмір позиції і рух на 1%', () => {
    expect(positionSize(100, 5)).toBe(500)
    expect(usdPerPercent(100, 5)).toBe(5)
  })

  it('лонг у плюс і в мінус', () => {
    expect(futuresPnl(long, 110)).toBeCloseTo(50, 8)
    expect(pnlToMarginPct(futuresPnl(long, 110), 100)).toBeCloseTo(50, 8)
    expect(futuresPnl(long, 90)).toBeCloseTo(-50, 8)
  })

  it('шорт у плюс і в мінус', () => {
    expect(futuresPnl(short, 90)).toBeCloseTo(50, 8)
    expect(futuresPnl(short, 110)).toBeCloseTo(-50, 8)
    expect(pnlToMarginPct(futuresPnl(short, 110), 100)).toBeCloseTo(-50, 8)
  })

  it('комісії віднімаються', () => {
    expect(futuresPnl({ ...long, fees: 2 }, 110)).toBeCloseTo(48, 8)
  })

  it('тейк і стоп для лонга', () => {
    expect(futuresPnl(long, 120)).toBeCloseTo(100, 8) // на тейку
    expect(futuresPnl(long, 95)).toBeCloseTo(-25, 8) // на стопі
    expect(futuresTakeDistancePct('long', 120, 100)).toBeCloseTo(20, 8)
    expect(futuresTakeDistancePct('long', 120, 125)).toBeLessThan(0) // досягнуто
  })

  it('тейк і стоп для шорта', () => {
    expect(futuresPnl(short, 80)).toBeCloseTo(100, 8)
    expect(futuresPnl(short, 105)).toBeCloseTo(-25, 8)
    expect(futuresTakeDistancePct('short', 80, 100)).toBeCloseTo(20, 8)
    expect(futuresTakeDistancePct('short', 80, 75)).toBeLessThan(0)
  })

  it('вінрейт: 0 закритих = «—»', () => {
    expect(winrate([])).toBeNull()
    expect(fmtWinrate(winrate([]))).toBe('—')
    expect(winrate([10, -5, 3, -1])).toBe(50)
    expect(fmtWinrate(winrate([10, -5, 3]))).toBe('67%')
  })

  it('приблизна ліквідація', () => {
    expect(liquidationPrice('long', 100, 5)).toBeCloseTo(80, 8)
    expect(liquidationPrice('short', 100, 5)).toBeCloseTo(120, 8)
  })
})

describe('мій план', () => {
  it('ліміт ризику', () => {
    expect(maxLossPerTrade(1000, 1)).toBe(10)
    expect(maxLossPerTrade(null, 1)).toBeNull()
    expect(maxLossPerTrade(1000, null)).toBeNull()
  })

  it('попередження з ліміту ризику', () => {
    const loss = -futuresPnl(long, 95) // 25
    expect(riskWarning(loss, 1000, 1)).toEqual({ loss: 25, limit: 10 })
    expect(riskWarning(loss, 5000, 1)).toBeNull() // ліміт 50
    expect(riskWarning(loss, null, null)).toBeNull() // план не заповнено
  })

  it('бюджет на місяць', () => {
    const trades = [
      { kind: 'buy' as const, price: 1, usd_amount: 100, traded_on: '2026-11-02' },
      { kind: 'buy' as const, price: 1, usd_amount: 50, traded_on: '2026-10-30' },
      { kind: 'sell' as const, price: 1, usd_amount: 30, traded_on: '2026-11-05' },
    ]
    expect(monthInvested(trades, '2026-11')).toBe(100)
    expect(budgetWarning(100, 250, 300)).toEqual({ total: 350, budget: 300 })
    expect(budgetWarning(100, 200, 300)).toBeNull()
    expect(budgetWarning(100, 999, null)).toBeNull()
  })
})
