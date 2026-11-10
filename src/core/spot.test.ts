import { describe, expect, it } from 'vitest'
import { canSell, sellProfit, spotStats, spotTakeDistancePct, type SpotTradeInput } from './spot'
import { parseNum, parsePositive } from './parse'

const buys: SpotTradeInput[] = [
  { kind: 'buy', price: 1000, usd_amount: 100, traded_on: '2026-01-01' },
  { kind: 'buy', price: 2000, usd_amount: 100, traded_on: '2026-01-02' },
]

describe('спот', () => {
  it('зважена середня: $100 по 1000 + $100 по 2000', () => {
    const s = spotStats(buys, 1500)
    expect(s.qty).toBeCloseTo(0.15, 10)
    expect(s.avg).toBeCloseTo(1333.33, 2)
    expect(s.avg).not.toBeCloseTo(1500, 0)
    expect(s.invested).toBeCloseTo(200, 8)
    expect(s.value).toBeCloseTo(225, 8)
    expect(s.pnl).toBeCloseTo(25, 8)
    expect(s.pnlPct).toBeCloseTo(12.5, 8)
  })

  it('продаж $150 по 1500: зафіксовано +16.67, середня та сама', () => {
    const s = spotStats(
      [...buys, { kind: 'sell', price: 1500, usd_amount: 150, traded_on: '2026-01-03' }],
      1500,
    )
    expect(s.realized).toBeCloseTo(16.67, 2)
    expect(s.qty).toBeCloseTo(0.05, 10)
    expect(s.avg).toBeCloseTo(1333.33, 2)
    expect(s.invested).toBeCloseTo(66.67, 2)
  })

  it('нуль покупок', () => {
    const s = spotStats([], 1500)
    expect(s).toMatchObject({ qty: 0, avg: 0, invested: 0, realized: 0, value: 0, pnl: 0 })
    expect(s.pnlPct).toBeNull()
  })

  it('немає поточної ціни', () => {
    const s = spotStats(buys, null)
    expect(s.avg).toBeCloseTo(1333.33, 2)
    expect(s.invested).toBeCloseTo(200, 8)
    expect(s.value).toBeNull()
    expect(s.pnl).toBeNull()
    expect(s.pnlPct).toBeNull()
  })

  it('не можна продати більше, ніж є', () => {
    expect(canSell(0.15, 225, 1500)).toBe(true) // рівно все
    expect(canSell(0.15, 226, 1500)).toBe(false)
    expect(canSell(0, 10, 1500)).toBe(false)
    expect(canSell(0.15, 0, 1500)).toBe(false)
  })

  it('прибуток продажу і відстань до тейку', () => {
    expect(sellProfit(1333.3333333, 150, 1500)).toBeCloseTo(16.67, 2)
    expect(spotTakeDistancePct(1800, 1500)).toBeCloseTo(20, 8)
    expect(spotTakeDistancePct(1400, 1500)).toBeLessThan(0)
  })

  it('порядок рядків не впливає: рахуємо за датою', () => {
    const s = spotStats(
      [{ kind: 'sell', price: 1500, usd_amount: 150, traded_on: '2026-01-03' }, ...buys],
      1500,
    )
    expect(s.qty).toBeCloseTo(0.05, 10)
  })

  it('після повного продажу нова покупка починає нову середню', () => {
    const s = spotStats(
      [
        ...buys,
        { kind: 'sell', price: 1500, usd_amount: 225, traded_on: '2026-01-03' },
        { kind: 'buy', price: 3000, usd_amount: 300, traded_on: '2026-02-01' },
      ],
      3000,
    )
    expect(s.realized).toBeCloseTo(25, 8)
    expect(s.avg).toBeCloseTo(3000, 8)
    expect(s.qty).toBeCloseTo(0.1, 10)
    expect(s.pnl).toBeCloseTo(0, 8)
  })
})

describe('ввід чисел', () => {
  it('«1 000,50» → 1000.5', () => {
    expect(parseNum('1 000,50')).toBe(1000.5)
    expect(parseNum('1 000.5')).toBe(1000.5)
    expect(parseNum('$250')).toBe(250)
    expect(parseNum('.5')).toBe(0.5)
  })
  it('сміття → null', () => {
    expect(parseNum('')).toBeNull()
    expect(parseNum('abc')).toBeNull()
    expect(parseNum('-5')).toBeNull()
    expect(parseNum('1.2.3')).toBeNull()
    expect(parsePositive('0')).toBeNull()
  })
})
