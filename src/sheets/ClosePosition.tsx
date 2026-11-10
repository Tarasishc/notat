import { useEffect, useState } from 'react'
import { useApp } from '../state'
import { fmtPct, fmtUsdSigned, priceInput } from '../core/format'
import { futuresPnl, pnlToMarginPct } from '../core/futures'
import { parseNum, parsePositive } from '../core/parse'
import { useFutures } from '../data/model'
import { closePosition } from '../data/repo'
import { Field, FormError, Sheet, tone } from '../ui/kit'

export function ClosePositionSheet({ positionId }: { positionId: string }) {
  const { closeSheet, setView, toast } = useApp()
  const fut = useFutures()
  const p = fut.all.find((x) => x.pos.id === positionId)

  const [exit, setExit] = useState('')
  const [fees, setFees] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Помилка зникає, щойно користувач щось виправив
  useEffect(() => setError(''), [exit, fees])

  if (!p) return null
  const { pos } = p
  const live = p.priceKnown ? p.price : null
  const exitN = parsePositive(exit)
  const feesN = fees.trim() ? parseNum(fees) : 0
  const pnl = exitN && feesN != null ? futuresPnl({ ...pos, fees: feesN }, exitN) : null

  const save = async () => {
    if (!exitN) return setError('Вкажи ціну виходу')
    if (feesN == null) return setError('Комісія має бути числом')
    setBusy(true)
    try {
      await closePosition(pos.id, exitN, feesN)
      setView({ name: 'home' })
      toast('Позицію закрито')
      closeSheet()
    } catch {
      setError('Не вдалося зберегти. Спробуй ще раз.')
      setBusy(false)
    }
  }

  return (
    <Sheet title="Закрити позицію" onClose={closeSheet}>
      <Field label="Ціна виходу, $" value={exit} onChange={setExit} decimal
        placeholder={live != null ? priceInput(live) : '0'}
        action={live != null ? { label: 'зараз', onClick: () => setExit(priceInput(live)) } : null} />
      <Field label="Комісія, $ · необов'язково" value={fees} onChange={setFees} decimal placeholder="0" />

      <div className="card text-center py-6">
        <div className="text-cap text-muted">Результат угоди</div>
        <div className={`text-amount mt-1 ${tone(pnl)}`}>{pnl != null ? fmtUsdSigned(pnl) : '—'}</div>
        {pnl != null && (
          <div className={`text-body font-medium mt-0.5 ${tone(pnl)}`}>
            {fmtPct(pnlToMarginPct(pnl, pos.margin))} до маржі
          </div>
        )}
      </div>

      <FormError>{error}</FormError>
      <button type="button" className="btn-primary" onClick={save} disabled={busy}>
        Закрити позицію
      </button>
    </Sheet>
  )
}
