import { useApp } from '../state'
import { fmtDate } from '../core/dates'
import { fmtPct, fmtPrice, fmtUsd, fmtUsdSigned } from '../core/format'
import { futuresPnl, liquidationPrice, positionSize } from '../core/futures'
import { useFutures } from '../data/model'
import { deletePosition } from '../data/repo'
import { BackButton, Stat, tone } from '../ui/kit'
import { SideBadge } from './Portfolio'

export function PositionScreen({ id }: { id: string }) {
  const { setView, openSheet, toast } = useApp()
  const fut = useFutures()
  const p = fut.all.find((x) => x.pos.id === id)
  const back = () => setView({ name: 'home' })

  if (!fut.ready) return null
  if (!p) return <div><BackButton label="Ф'ючі" onClick={back} /><p className="text-muted mt-4">Позицію не знайдено.</p></div>

  const { pos } = p
  const atTp = pos.tp != null ? futuresPnl({ ...pos, fees: 0 }, pos.tp) : null
  const atSl = pos.sl != null ? futuresPnl({ ...pos, fees: 0 }, pos.sl) : null

  const remove = async () => {
    if (!confirm('Видалити цю позицію? Вона зникне і з історії.')) return
    await deletePosition(pos.id)
    back()
    toast('Позицію видалено')
  }

  return (
    <div>
      <BackButton label="Ф'ючі" onClick={back} />
      <header className="mt-1 mb-4 flex items-center gap-3 flex-wrap">
        <h1 className="text-screen">{pos.pair}/USDT</h1>
        <SideBadge side={pos.side} leverage={pos.leverage} />
      </header>

      <section className="card">
        <div className="text-cap text-muted">{p.open ? 'Результат зараз' : 'Результат угоди'}</div>
        <div className={`text-amount mt-1 ${tone(p.pnl)}`}>{p.pnl != null ? fmtUsdSigned(p.pnl) : '—'}</div>
        {p.pnl != null && p.pnlPct != null
          ? <div className={`text-body font-medium mt-0.5 ${tone(p.pnl)}`}>{fmtPct(p.pnlPct)} до маржі</div>
          : <div className="text-cap text-muted mt-1">Результат з'явиться, коли підключимо живі ціни.</div>}
        <div className="grid grid-cols-2 gap-x-3 gap-y-4 mt-4 pt-4 border-t border-line">
          <Stat label="Вхід" value={fmtPrice(pos.entry)} />
          <Stat
            label={p.open ? 'Зараз' : 'Вихід'}
            value={p.price != null ? fmtPrice(p.price) : '—'}
          />
          <Stat label="Маржа" value={fmtUsd(pos.margin)} />
          <Stat label="Позиція" value={fmtUsd(positionSize(pos.margin, pos.leverage))} />
          {p.open && <Stat label="Ліквідація, приблизно" value={fmtPrice(liquidationPrice(pos.side, pos.entry, pos.leverage))} />}
          {!p.open && pos.fees > 0 && <Stat label="Комісія" value={fmtUsd(pos.fees)} />}
        </div>
      </section>

      <section className="card mt-2.5">
        <h2 className="text-title mb-3">План</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Stat label="Тейк" value={pos.tp != null ? fmtPrice(pos.tp) : '—'} />
            {atTp != null && <div className={`text-tiny mt-0.5 ${tone(atTp)}`}>{fmtUsdSigned(atTp)} на тейку</div>}
          </div>
          <div>
            <Stat label="Стоп" value={pos.sl != null ? fmtPrice(pos.sl) : '—'} />
            {atSl != null && <div className={`text-tiny mt-0.5 ${tone(atSl)}`}>{fmtUsdSigned(atSl)} на стопі</div>}
          </div>
        </div>
        {pos.note && <p className="text-body text-text2 mt-3 whitespace-pre-wrap">{pos.note}</p>}
      </section>

      <p className="text-cap text-muted mt-4 px-1">
        Відкрито {fmtDate(pos.opened_on)}{pos.closed_on && ` · закрито ${fmtDate(pos.closed_on)}`}
      </p>

      {p.open && (
        <button type="button" className="btn-primary mt-4" onClick={() => openSheet({ kind: 'close', positionId: pos.id })}>
          Закрити позицію
        </button>
      )}
      <button type="button" onClick={remove} className="w-full min-h-[44px] mt-3 text-muted text-cap">
        Видалити позицію
      </button>
    </div>
  )
}
