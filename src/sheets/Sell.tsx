import { useState } from 'react'
import { useApp } from '../state'
import { today } from '../core/dates'
import { fmtPrice, fmtQty, fmtUsdSigned, priceInput } from '../core/format'
import { parsePositive } from '../core/parse'
import { canSell, sellProfit, sellQty } from '../core/spot'
import { useSpot } from '../data/model'
import { addSpotSell } from '../data/repo'
import { Field, FormError, Hint, Sheet } from '../ui/kit'

export function SellSheet({ coinId }: { coinId: string }) {
  const { closeSheet, toast } = useApp()
  const spot = useSpot()
  const c = spot.all.find((x) => x.coin.id === coinId)

  const [price, setPrice] = useState('')
  const [usd, setUsd] = useState('')
  /** «усе»: продаємо точну кількість, а не округлену до копійок суму. */
  const [all, setAll] = useState(false)
  const [date, setDate] = useState(today())
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!c) return null
  const { coin, stats } = c
  const priceN = parsePositive(price)
  const usdN = all && priceN ? stats.qty * priceN : parsePositive(usd)
  const tooMuch = !!priceN && !!usdN && !canSell(stats.qty, usdN, priceN)

  const onPrice = (v: string) => {
    setPrice(v)
    const p = parsePositive(v)
    if (all && p) setUsd((stats.qty * p).toFixed(2))
  }
  const sellAll = () => {
    if (!priceN) return setError('Спершу вкажи ціну продажу')
    setError('')
    setAll(true)
    setUsd((stats.qty * priceN).toFixed(2))
  }

  const save = async () => {
    if (!priceN || !usdN) return setError('Вкажи ціну продажу і суму')
    if (tooMuch) return setError(`У тебе лише ${fmtQty(stats.qty)} ${coin.symbol}`)
    setBusy(true)
    try {
      await addSpotSell(coin.id, priceN, usdN, date)
      toast('Продаж додано')
      closeSheet()
    } catch {
      setError('Не вдалося зберегти. Спробуй ще раз.')
      setBusy(false)
    }
  }

  return (
    <Sheet title={`Продати ${coin.symbol}`} onClose={closeSheet}>
      <p className="text-body text-text2">
        У тебе {fmtQty(stats.qty)} {coin.symbol} · середня {fmtPrice(stats.avg)}
      </p>
      <Field label="Ціна продажу, $" value={price} onChange={onPrice} decimal
        placeholder={c.price != null ? priceInput(c.price) : '0'}
        action={c.price != null ? { label: 'зараз', onClick: () => onPrice(priceInput(c.price!)) } : null} />
      <Field label="Сума, $" value={usd} onChange={(v) => { setUsd(v); setAll(false) }} decimal placeholder="0"
        action={{ label: 'усе', onClick: sellAll }} />
      <Field label="Дата" type="date" value={date} onChange={setDate} max={today()} />

      {priceN && usdN && !tooMuch && (
        <Hint>
          Продаси {fmtQty(sellQty(usdN, priceN))} {coin.symbol} і зафіксуєш {fmtUsdSigned(sellProfit(stats.avg, usdN, priceN))}
        </Hint>
      )}
      <FormError>{tooMuch ? `Це більше, ніж є: у тебе ${fmtQty(stats.qty)} ${coin.symbol}.` : error}</FormError>
      <button type="button" className="btn-primary" onClick={save} disabled={busy || tooMuch}>
        Продати
      </button>
    </Sheet>
  )
}
