import { describe, expect, it } from 'vitest'
import { isMarkTouched, markDistance, markLabel } from './marks'
import { fmtPct, fmtPrice, fmtQty, fmtUsd, fmtUsdSigned, plural } from './format'
import { fmtDate } from './dates'

describe('позначки', () => {
  it('позначка вище ціни', () => {
    const d = markDistance(102, 100)!
    expect(d.state).toBe('above')
    expect(markLabel(d)).toBe('вище ціни на 2.0%')
  })

  it('позначка нижче ціни', () => {
    const d = markDistance(3300, 3405.57)!
    expect(d.state).toBe('below')
    expect(markLabel(d)).toBe('нижче ціни на 3.1%')
  })

  it('майже дорівнює ціні → «ціна торкнулась»', () => {
    const d = markDistance(100.04, 100)!
    expect(d.state).toBe('touched')
    expect(markLabel(d)).toBe('ціна торкнулась')
    expect(isMarkTouched(100.04, 100)).toBe(true)
    expect(isMarkTouched(100.06, 100)).toBe(false)
  })

  it('монета без відомої ціни — без відстані', () => {
    expect(markDistance(3300, null)).toBeNull()
    expect(isMarkTouched(3300, null)).toBe(false)
  })
})

describe('форматування', () => {
  it('ціни', () => {
    expect(fmtPrice(102300)).toBe('$102 300')
    expect(fmtPrice(1000)).toBe('$1 000')
    expect(fmtPrice(182.4)).toBe('$182.40')
    expect(fmtPrice(0.18342)).toBe('$0.1834')
  })
  it('суми', () => {
    expect(fmtUsd(200)).toBe('$200.00')
    expect(fmtUsd(1234.5)).toBe('$1 234.50')
    expect(fmtUsd(12345.6)).toBe('$12 346')
    expect(fmtUsd(-25)).toBe('−$25.00')
  })
  it('результати зі знаком', () => {
    expect(fmtUsdSigned(25)).toBe('+$25.00')
    expect(fmtUsdSigned(-16.666)).toBe('−$16.67')
    expect(fmtUsdSigned(0)).toBe('$0.00')
    expect(fmtUsdSigned(-0.001)).toBe('$0.00')
    expect(fmtPct(12.5)).toBe('+12.5%')
    expect(fmtPct(-3.14)).toBe('−3.1%')
    expect(fmtPct(-3.14, false)).toBe('3.1%')
  })
  it('кількість монет', () => {
    expect(fmtQty(0.15)).toBe('0.15')
    expect(fmtQty(0.0019551)).toBe('0.001955')
    expect(fmtQty(2)).toBe('2')
    expect(fmtQty(1234.5)).toBe('1 234.5')
  })
  it('множина і дати', () => {
    expect(plural(1, 'нотатка', 'нотатки', 'нотаток')).toBe('нотатка')
    expect(plural(3, 'нотатка', 'нотатки', 'нотаток')).toBe('нотатки')
    expect(plural(11, 'нотатка', 'нотатки', 'нотаток')).toBe('нотаток')
    expect(fmtDate('2026-11-10', new Date('2026-11-12'))).toBe('10 лис')
    expect(fmtDate('2025-03-01', new Date('2026-11-12'))).toBe('1 бер 2025')
  })
})
