import { useState } from 'react'
import { useApp, type PortfolioSeg } from '../state'
import { currentMonth, today } from '../core/dates'
import { fmtPrice, fmtQty, fmtUsd, fmtUsdSigned, priceInput } from '../core/format'
import { futuresPnl, liquidationPrice, positionSize, usdPerPercent, type Side } from '../core/futures'
import { parsePositive } from '../core/parse'
import { budgetWarning, monthInvested, riskWarning } from '../core/plan'
import { spotPnlAt, spotStats } from '../core/spot'
import type { SpotCoin } from '../data/db'
import { usePlan } from '../data/hooks'
import { useSpot } from '../data/model'
import { usePrices } from '../data/prices'
import { addSpotBuy, normSymbol, openPosition } from '../data/repo'
import { Field, FormError, Hint, Segmented, Sheet, TextArea, Warning, tone } from '../ui/kit'

const SPOT_QUICK = ['BTC', 'ETH', 'SOL', 'TON']
const FUT_QUICK = ['BTC', 'ETH', 'SOL', 'DOGE']
const LEVERAGES = [2, 3, 5, 10, 20]

type Props = { initialType: PortfolioSeg; initialSymbol?: string }

export function NewTradeSheet(props: Props) {
  const spot = useSpot()
  // Чекаємо, поки дані прочитаються з бази, — щоб план монети підставився у форму, а не затерся.
  if (!spot.ready) return null
  const preset = props.initialSymbol ? spot.all.find((c) => c.coin.symbol === props.initialSymbol)?.coin : undefined
  return <TradeForm {...props} preset={preset} />
}

function TradeForm({ initialType, initialSymbol, preset }: Props & { preset?: SpotCoin }) {
  const { closeSheet, setView, setPortfolioSeg, toast } = useApp()
  const prices = usePrices()
  const spot = useSpot()
  const plan = usePlan()

  const [type, setType] = useState<PortfolioSeg>(initialType)
  const [symbol, setSymbol] = useState(initialSymbol ?? '')
  const [side, setSide] = useState<Side>('long')
  const [entry, setEntry] = useState('')
  const [amount, setAmount] = useState('')
  const [leverage, setLeverage] = useState<number | null>(null)
  const [customLev, setCustomLev] = useState('')
  const [date, setDate] = useState(today())
  const [planOpen, setPlanOpen] = useState(false)
  const [tp, setTp] = useState(preset?.tp != null ? String(preset.tp) : '')
  const [sl, setSl] = useState(preset?.sl != null ? String(preset.sl) : '')
  const [note, setNote] = useState(preset?.note ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const isSpot = type === 'spot'
  const sym = normSymbol(symbol)
  const cur = sym ? prices.get(sym) : null
  const entryN = parsePositive(entry)
  const amountN = parsePositive(amount)
  const levN = customLev ? parsePositive(customLev) : leverage
  const tpN = parsePositive(tp)
  const slN = parsePositive(sl)
  const setNow = cur != null ? { label: 'зараз', onClick: () => setEntry(priceInput(cur)) } : null

  // Живий підказ
  let hint: string | null = null
  if (isSpot && sym && entryN && amountN) {
    const existing = spot.all.find((c) => c.coin.symbol === sym)?.trades ?? []
    const after = spotStats(
      [...existing, { kind: 'buy', price: entryN, usd_amount: amountN, traded_on: date, created_at: '~' }],
      null,
    )
    hint = `Купиш ${fmtQty(amountN / entryN)} ${sym}. Середня стане ${fmtPrice(after.avg)}${cur != null ? ` (зараз ${fmtPrice(cur)})` : ''}.`
  } else if (!isSpot && amountN && levN) {
    hint = `Позиція ${fmtUsd(positionSize(amountN, levN))} · рух ціни на 1% = ${fmtUsd(usdPerPercent(amountN, levN))}`
    if (entryN) hint += ` · ліквідація приблизно ${fmtPrice(liquidationPrice(side, entryN, levN))}`
  }

  // Результат на тейку й стопі
  const pnlAt = (target: number | null): number | null => {
    if (!target || !entryN || !amountN) return null
    if (isSpot) return spotPnlAt(entryN, amountN, target)
    return levN ? futuresPnl({ side, entry: entryN, margin: amountN, leverage: levN }, target) : null
  }
  const atTp = pnlAt(tpN)
  const atSl = pnlAt(slN)

  // Попередження з «Мого плану» — не блокують збереження
  let warning: string | null = null
  if (plan) {
    if (isSpot && amountN) {
      const w = budgetWarning(monthInvested(spot.allTrades, currentMonth()), amountN, plan.monthly_budget)
      if (w) warning = `З цією покупкою за місяць вкладеш ${fmtUsd(w.total)} — більше за бюджет ${fmtUsd(w.budget)}.`
    } else if (!isSpot && atSl != null && atSl < 0) {
      const w = riskWarning(-atSl, plan.deposit, plan.risk_pct)
      if (w) warning = `На стопі втратиш ${fmtUsd(w.loss)}. Це більше за твій ліміт ${fmtUsd(w.limit)} (${plan.risk_pct}% депозиту).`
    }
  }

  const save = async () => {
    if (!sym) return setError('Вкажи монету')
    if (!entryN || !amountN) return setError(isSpot ? 'Вкажи точку входу і суму' : 'Вкажи точку входу і маржу')
    if (!isSpot && !levN) return setError('Обери плече')
    setError('')
    setBusy(true)
    const touchPlan = tpN || slN || note.trim() || (isSpot && preset && preset.symbol === sym)
    const planFields = touchPlan ? { tp: tpN, sl: slN, note: note.trim() } : undefined
    try {
      if (isSpot) {
        const id = await addSpotBuy({ symbol: sym, price: entryN, usd: amountN, date, plan: planFields })
        setPortfolioSeg('spot')
        setView({ name: 'spotCoin', id })
        toast('Покупку додано')
      } else {
        await openPosition({ pair: sym, side, entry: entryN, margin: amountN, leverage: levN!, date, plan: planFields })
        setPortfolioSeg('futures')
        setView({ name: 'home' })
        toast('Позицію відкрито')
      }
      closeSheet()
    } catch {
      setError('Не вдалося зберегти. Спробуй ще раз.')
      setBusy(false)
    }
  }

  return (
    <Sheet title="Нова угода" onClose={closeSheet}>
      <Segmented
        label="Тип угоди"
        value={type}
        onChange={(t) => { setType(t); setError('') }}
        options={[{ value: 'spot', label: 'Спот' }, { value: 'futures', label: "Ф'ючі" }]}
      />

      <div>
        <Field
          label={isSpot ? 'Монета' : 'Пара до USDT'}
          value={symbol}
          onChange={(v) => setSymbol(v.toUpperCase())}
          placeholder="BTC"
          autoCapitalize="characters"
          className="!text-[22px] font-semibold uppercase !min-h-[56px]"
        />
        <div className="flex gap-2 mt-2.5 flex-wrap">
          {(isSpot ? SPOT_QUICK : FUT_QUICK).map((s) => (
            <button key={s} type="button" onClick={() => setSymbol(s)} className={`chip ${sym === s ? 'chip-on' : ''}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {!isSpot && (
        <div className="grid grid-cols-2 gap-2.5" role="group" aria-label="Напрям">
          <button type="button" aria-pressed={side === 'long'} onClick={() => setSide('long')}
            className={`btn border ${side === 'long' ? 'bg-up/[0.14] border-up text-up' : 'border-field-line text-text2'}`}>
            Лонг
          </button>
          <button type="button" aria-pressed={side === 'short'} onClick={() => setSide('short')}
            className={`btn border ${side === 'short' ? 'bg-down/[0.14] border-down text-down' : 'border-field-line text-text2'}`}>
            Шорт
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Точка входу, $" value={entry} onChange={setEntry} decimal
          placeholder={cur != null ? priceInput(cur) : '0'} action={setNow} />
        <Field label={isSpot ? 'Купив на суму, $' : 'Маржа, $'} value={amount} onChange={setAmount} decimal placeholder="0" />
      </div>

      {!isSpot && (
        <div>
          <div className="label">Плече</div>
          <div className="flex gap-2 flex-wrap" role="group" aria-label="Плече">
            {LEVERAGES.map((l) => (
              <button key={l} type="button" aria-pressed={!customLev && leverage === l}
                onClick={() => { setLeverage(l); setCustomLev('') }}
                className={`chip ${!customLev && leverage === l ? 'chip-on' : ''}`}>
                {l}×
              </button>
            ))}
            <input
              aria-label="Інше плече"
              value={customLev}
              onChange={(e) => setCustomLev(e.target.value)}
              inputMode="decimal"
              placeholder="інше"
              className={`input !w-[84px] !min-h-[44px] !rounded-full text-center ${customLev ? '!border-accent' : ''}`}
            />
          </div>
        </div>
      )}

      <Field label="Дата" type="date" value={date} onChange={setDate} max={today()} />

      {hint && <Hint>{hint}</Hint>}
      {warning && <Warning>{warning}</Warning>}

      {!planOpen ? (
        <button type="button" onClick={() => setPlanOpen(true)}
          className="w-full min-h-[50px] rounded-field border border-dashed border-field-line text-text2 text-body font-medium">
          + Нотатка і план
        </button>
      ) : (
        <div className="rounded-card border border-line p-3.5 space-y-3.5">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Field label="Тейк, $" value={tp} onChange={setTp} decimal placeholder="необов'язково" />
              {atTp != null && <div className={`text-cap mt-1.5 ${tone(atTp)}`}>На тейку: {fmtUsdSigned(atTp)}</div>}
            </div>
            <div>
              <Field label="Стоп, $" value={sl} onChange={setSl} decimal placeholder="необов'язково" />
              {atSl != null && <div className={`text-cap mt-1.5 ${tone(atSl)}`}>На стопі: {fmtUsdSigned(atSl)}</div>}
            </div>
          </div>
          <TextArea label="Нотатка" value={note} onChange={setNote}
            placeholder="Ціль, скільки ще хочу вкласти, коли докупити…" />
          <button type="button" onClick={() => setPlanOpen(false)} className="link">Сховати</button>
        </div>
      )}

      <FormError>{error}</FormError>
      <button type="button" className="btn-primary" onClick={save} disabled={busy}>
        {isSpot ? 'Додати в спот' : 'Відкрити позицію'}
      </button>
    </Sheet>
  )
}
