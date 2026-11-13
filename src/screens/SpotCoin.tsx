import { useApp } from '../state'
import { fmtDate } from '../core/dates'
import { fmtPct, fmtPrice, fmtQty, fmtUsd, fmtUsdSigned } from '../core/format'
import { spotTakeDistancePct } from '../core/spot'
import { useSpot } from '../data/model'
import { deleteCoin, deleteTrade } from '../data/repo'
import { BackButton, Stat, tone } from '../ui/kit'

export function SpotCoinScreen({ id }: { id: string }) {
  const { setView, openSheet, toast } = useApp()
  const spot = useSpot()
  const c = spot.all.find((x) => x.coin.id === id)
  const back = () => setView({ name: 'home' })

  if (!spot.ready) return null
  if (!c) return <div><BackButton label="Спот" onClick={back} /><p className="text-muted mt-4">Монету не знайдено.</p></div>

  const { coin, stats, price } = c
  const trades = [...c.trades].sort((a, b) => (a.traded_on + a.created_at < b.traded_on + b.created_at ? 1 : -1))
  const distance = coin.tp != null && price != null ? spotTakeDistancePct(coin.tp, price) : null

  const removeTrade = async (tradeId: string) => {
    if (!confirm('Видалити цей запис? Середня і результат перерахуються.')) return
    await deleteTrade(tradeId)
    toast('Запис видалено')
  }
  const removeCoin = async () => {
    if (!confirm(`Видалити ${coin.symbol} разом з усіма покупками й продажами?`)) return
    await deleteCoin(coin.id)
    back()
    toast('Монету видалено')
  }

  return (
    <div>
      <BackButton label="Спот" onClick={back} />
      <header className="mt-1 mb-4">
        <h1 className="text-screen">{coin.symbol}</h1>
        <p className="text-body text-text2 mt-1">
          {price != null ? `зараз ${fmtPrice(price)}` : `${fmtQty(stats.qty)} ${coin.symbol}`}
        </p>
      </header>

      <section className="card">
        {stats.pnl != null && stats.value != null ? (
          <>
            <div className="text-cap text-muted">Результат</div>
            <div className={`text-amount mt-1 ${tone(stats.pnl)}`}>{fmtUsdSigned(stats.pnl)}</div>
            <div className={`text-body font-medium mt-0.5 ${tone(stats.pnl)}`}>
              {fmtPct(stats.pnlPct ?? 0)} · вартує {fmtUsd(stats.value)}
            </div>
          </>
        ) : (
          <>
            <div className="text-cap text-muted">Середня точка входу</div>
            <div className="text-amount mt-1 text-accent">{fmtPrice(stats.avg)}</div>
            <div className="text-cap text-muted mt-1">Результат з'явиться, коли підключимо живі ціни.</div>
          </>
        )}
        <div className="grid grid-cols-2 gap-x-3 gap-y-4 mt-4 pt-4 border-t border-line">
          {stats.pnl != null && <Stat label="Середня ціна" value={fmtPrice(stats.avg)} className="text-accent" />}
          <Stat label="Вкладено" value={fmtUsd(stats.invested)} />
          <Stat label="Монет" value={fmtQty(stats.qty)} />
          <Stat label="Зафіксовано" value={fmtUsdSigned(stats.realized)} className={tone(stats.realized)} />
        </div>
      </section>

      <section className="card mt-2.5">
        <h2 className="text-title mb-3">План</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Stat label="Тейк" value={coin.tp != null ? fmtPrice(coin.tp) : '—'} />
            {distance != null && (
              <div className="text-tiny text-muted mt-0.5">
                {distance <= 0 ? 'досягнуто' : `ще ${fmtPct(distance)}`}
              </div>
            )}
          </div>
          <Stat label="Стоп" value={coin.sl != null ? fmtPrice(coin.sl) : '—'} />
        </div>
        {coin.note
          ? <p className="text-body text-text2 mt-3 whitespace-pre-wrap">{coin.note}</p>
          : <p className="text-cap text-muted mt-3">Нотатки немає. Додай її через «Докупити» → «Нотатка і план».</p>}
      </section>

      <h2 className="section">Покупки і продажі · {trades.length}</h2>
      <ul className="card !p-0 divide-y divide-line">
        {trades.map((t) => (
          <li key={t.id} className="px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <div className={`text-body font-semibold ${t.kind === 'buy' ? 'text-up' : 'text-down'}`}>
                {t.kind === 'buy' ? 'Покупка' : 'Продаж'}
              </div>
              <div className="text-tiny text-muted mt-0.5">{fmtDate(t.traded_on)} · по {fmtPrice(t.price)}</div>
            </div>
            <div className="flex items-center gap-1">
              <div className="text-body font-semibold">{fmtUsd(t.usd_amount)}</div>
              <button type="button" onClick={() => removeTrade(t.id)} className="min-h-[44px] min-w-[44px] text-muted text-cap" aria-label={`Видалити запис від ${fmtDate(t.traded_on)}`}>
                ✕
              </button>
            </div>
          </li>
        ))}
        {trades.length === 0 && <li className="px-4 py-4 text-muted text-cap">Записів немає.</li>}
      </ul>

      <div className="grid grid-cols-2 gap-2.5 mt-5">
        <button type="button" className="btn-primary" onClick={() => openSheet({ kind: 'trade', type: 'spot', symbol: coin.symbol })}>
          Докупити
        </button>
        <button type="button" className="btn-secondary" disabled={!(stats.qty > 0)} onClick={() => openSheet({ kind: 'sell', coinId: coin.id })}>
          Продати
        </button>
      </div>
      <button type="button" onClick={removeCoin} className="w-full min-h-[44px] mt-3 text-muted text-cap">
        Видалити монету
      </button>
    </div>
  )
}
