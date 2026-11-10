import { useApp } from '../state'
import { fmtDate } from '../core/dates'
import { fmtPct, fmtPrice, fmtUsd, fmtUsdSigned, plural } from '../core/format'
import { fmtWinrate, futuresTakeDistancePct, winrate } from '../core/futures'
import { spotTakeDistancePct } from '../core/spot'
import { useFutures, useSpot, type CoinModel, type PositionModel } from '../data/model'
import { usePrices } from '../data/prices'
import { Empty, Segmented, Stat, tone } from '../ui/kit'

export function PriceBadge() {
  const { status } = usePrices()
  const live = status === 'live'
  const text = live ? 'ціни наживо' : status === 'offline' ? 'офлайн' : 'тестові ціни'
  return (
    <span className="inline-flex items-center gap-1.5 text-tiny text-text2">
      <span className={`h-2 w-2 rounded-full ${live ? 'bg-up' : 'bg-muted'}`} aria-hidden />
      {text}
    </span>
  )
}

export function TakeBadge({ distance }: { distance: number | null }) {
  if (distance == null) return <span className="badge-neutral">без тейку</span>
  if (distance <= 0) return <span className="badge-up">тейк досягнуто</span>
  return <span className="badge-neutral">до тейку {fmtPct(distance)}</span>
}

export function SideBadge({ side, leverage }: { side: 'long' | 'short'; leverage: number }) {
  return (
    <span className={side === 'long' ? 'badge-up' : 'badge-down'}>
      {side === 'long' ? 'Лонг' : 'Шорт'} {leverage}×
    </span>
  )
}

export function Portfolio() {
  const { portfolioSeg, setPortfolioSeg } = useApp()
  const spot = useSpot()
  const fut = useFutures()

  return (
    <div>
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-screen">Портфель</h1>
        <PriceBadge />
      </header>
      <Segmented
        label="Розділ портфеля"
        value={portfolioSeg}
        onChange={setPortfolioSeg}
        options={[
          { value: 'spot', label: `Спот · ${spot.held.length}` },
          { value: 'futures', label: `Ф'ючі · ${fut.open.length}` },
        ]}
      />
      {portfolioSeg === 'spot' ? <SpotList /> : <FuturesList />}
    </div>
  )
}

function SpotList() {
  const s = useSpot()
  if (!s.ready) return null
  return (
    <div className="mt-4">
      <section className="card">
        <div className="text-cap text-muted">Портфель зараз</div>
        <div className="text-amount mt-1">{fmtUsd(s.value)}</div>
        <div className={`text-body font-medium mt-0.5 ${tone(s.pnl)}`}>
          {fmtUsdSigned(s.pnl)}{s.pnlPct != null && ` · ${fmtPct(s.pnlPct)}`}
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-line">
          <Stat label="Вкладено" value={fmtUsd(s.invested)} />
          <Stat label="Зафіксовано" value={fmtUsdSigned(s.realized)} className={tone(s.realized)} />
        </div>
      </section>

      <h2 className="section">Монети · {s.held.length}</h2>
      {s.held.length === 0 ? (
        <Empty>Монет ще немає. Натисни плюс, щоб додати першу покупку.</Empty>
      ) : (
        <ul className="space-y-2.5">
          {s.held.map((c) => <li key={c.coin.id}><CoinCard c={c} /></li>)}
        </ul>
      )}
    </div>
  )
}

function CoinCard({ c }: { c: CoinModel }) {
  const { setView } = useApp()
  const { stats, coin, price } = c
  const distance = coin.tp != null && price != null ? spotTakeDistancePct(coin.tp, price) : null
  return (
    <button type="button" onClick={() => setView({ name: 'spotCoin', id: coin.id })} className="card w-full text-left active:opacity-80">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[17px] font-semibold">{coin.symbol}</div>
          <div className="text-cap text-muted mt-0.5">середня {fmtPrice(stats.avg)}</div>
        </div>
        <div className="text-right">
          {price != null ? (
            <>
              <div className={`text-[17px] font-semibold ${tone(stats.pnl)}`}>{fmtUsdSigned(stats.pnl ?? 0)}</div>
              <div className={`text-cap mt-0.5 ${tone(stats.pnl)}`}>{fmtPct(stats.pnlPct ?? 0)}</div>
            </>
          ) : (
            <div className="text-cap text-muted">ціни немає</div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 mt-3">
        <div className="text-cap text-text2">
          {fmtUsd(stats.invested)} → {fmtUsd(stats.value ?? stats.invested)}
        </div>
        {coin.tp != null && price == null
          ? <span className="badge-neutral">тейк {fmtPrice(coin.tp)}</span>
          : <TakeBadge distance={distance} />}
      </div>
    </button>
  )
}

function FuturesList() {
  const f = useFutures()
  if (!f.ready) return null
  const n = f.open.length
  return (
    <div className="mt-4">
      <section className="card">
        <div className="text-cap text-muted">Відкриті позиції зараз</div>
        <div className={`text-amount mt-1 ${tone(f.openPnl)}`}>{fmtUsdSigned(f.openPnl)}</div>
        <div className="text-body text-text2 mt-0.5">
          {n} {plural(n, 'позиція', 'позиції', 'позицій')} · маржа {fmtUsd(f.openMargin)}
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-line">
          <Stat label="Закриті, разом" value={fmtUsdSigned(f.closedPnl)} className={tone(f.closedPnl)} />
          <Stat label="Вінрейт" value={fmtWinrate(winrate(f.closed.map((p) => p.pnl)))} />
        </div>
      </section>

      <h2 className="section">Відкриті · {n}</h2>
      {n === 0 ? (
        <Empty>Відкритих позицій немає. Натисни плюс, щоб відкрити.</Empty>
      ) : (
        <ul className="space-y-2.5">
          {f.open.map((p) => <li key={p.pos.id}><PositionCard p={p} /></li>)}
        </ul>
      )}

      {f.closed.length > 0 && (
        <>
          <h2 className="section">Історія · {f.closed.length}</h2>
          <ul className="card !p-0 divide-y divide-line">
            {f.closed.map((p) => <li key={p.pos.id}><HistoryRow p={p} /></li>)}
          </ul>
        </>
      )}
    </div>
  )
}

function PositionCard({ p }: { p: PositionModel }) {
  const { setView } = useApp()
  const { pos } = p
  const distance = pos.tp != null && p.priceKnown ? futuresTakeDistancePct(pos.side, pos.tp, p.price) : null
  return (
    <button type="button" onClick={() => setView({ name: 'position', id: pos.id })} className="card w-full text-left active:opacity-80">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[17px] font-semibold">{pos.pair}/USDT</div>
          <div className="mt-1.5"><SideBadge side={pos.side} leverage={pos.leverage} /></div>
        </div>
        <div className="text-right">
          <div className={`text-[17px] font-semibold ${tone(p.pnl)}`}>{fmtUsdSigned(p.pnl)}</div>
          <div className={`text-cap mt-0.5 ${tone(p.pnl)}`}>{fmtPct(p.pnlPct)} до маржі</div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 mt-3">
        <div className="text-cap text-text2">
          {fmtPrice(pos.entry)} → {p.priceKnown ? fmtPrice(p.price) : 'ціни немає'}
        </div>
        <TakeBadge distance={distance} />
      </div>
    </button>
  )
}

function HistoryRow({ p }: { p: PositionModel }) {
  const { setView } = useApp()
  const { pos } = p
  return (
    <button type="button" onClick={() => setView({ name: 'position', id: pos.id })} className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 active:opacity-80">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-body font-semibold">{pos.pair}</span>
          <SideBadge side={pos.side} leverage={pos.leverage} />
        </div>
        <div className="text-tiny text-muted mt-1">
          {fmtDate(pos.closed_on ?? pos.opened_on)} · {fmtPrice(pos.entry)} → {fmtPrice(p.price)}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className={`text-body font-semibold ${tone(p.pnl)}`}>{fmtUsdSigned(p.pnl)}</div>
        <div className={`text-tiny mt-0.5 ${tone(p.pnl)}`}>{fmtPct(p.pnlPct)}</div>
      </div>
    </button>
  )
}
