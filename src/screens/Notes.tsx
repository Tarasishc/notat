import { useApp } from '../state'
import { fmtDate } from '../core/dates'
import { fmtPrice, plural } from '../core/format'
import { markDistance, markLabel } from '../core/marks'
import type { CoinNote } from '../data/db'
import { useNotes } from '../data/hooks'
import { usePrices } from '../data/prices'
import { deleteNote } from '../data/repo'
import { BackButton, Empty, Segmented } from '../ui/kit'
import { PlanScreen } from './Plan'

const newestFirst = (a: CoinNote, b: CoinNote) => (a.created_at < b.created_at ? 1 : -1)

function groupBySymbol(notes: CoinNote[]) {
  const map = new Map<string, CoinNote[]>()
  for (const n of [...notes].sort(newestFirst)) {
    map.set(n.symbol, [...(map.get(n.symbol) ?? []), n])
  }
  return [...map.entries()].map(([symbol, list]) => ({ symbol, list }))
}

export function Notes() {
  const { notesSeg, setNotesSeg } = useApp()
  const notes = useNotes()
  const groups = groupBySymbol(notes ?? [])

  return (
    <div>
      <header className="mb-4"><h1 className="text-screen">Нотатки</h1></header>
      <Segmented
        label="Розділ нотаток"
        value={notesSeg}
        onChange={setNotesSeg}
        options={[
          { value: 'coins', label: `Монети · ${groups.length}` },
          { value: 'plan', label: 'Мій план' },
        ]}
      />
      <div key={notesSeg} className="anim-screen">
        {notesSeg === 'plan' ? <PlanScreen /> : notes && <NoteCoins groups={groups} />}
      </div>
    </div>
  )
}

function MarkBadge({ level, price }: { level: number; price: number | null }) {
  const d = markDistance(level, price)
  return (
    <span className={d?.state === 'touched' ? 'badge bg-accent/15 text-accent' : 'badge-neutral'}>
      {fmtPrice(level)}{d && ` · ${markLabel(d)}`}
    </span>
  )
}

function NoteCoins({ groups }: { groups: { symbol: string; list: CoinNote[] }[] }) {
  const { setView } = useApp()
  const prices = usePrices()
  return (
    <div className="mt-4">
      <p className="text-cap text-muted px-1 mb-3">
        Записи для себе по будь-якій монеті, навіть якщо ти її ще не купив.
      </p>
      {groups.length === 0 ? (
        <Empty>Нотаток ще немає. Натисни плюс, щоб записати першу.</Empty>
      ) : (
        <ul className="space-y-2.5">
          {groups.map(({ symbol, list }) => {
            const price = prices.get(symbol)
            const marked = list.find((n) => n.price_level != null)
            return (
              <li key={symbol}>
                <button type="button" onClick={() => setView({ name: 'noteCoin', symbol })} className="card w-full text-left active:opacity-80">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[17px] font-semibold">{symbol}</div>
                      {price != null && <div className="text-cap text-muted mt-0.5">зараз {fmtPrice(price)}</div>}
                    </div>
                    {marked && <MarkBadge level={marked.price_level!} price={price} />}
                  </div>
                  <p className="text-body text-text2 mt-3 line-clamp-2 whitespace-pre-wrap">{list[0].text}</p>
                  <div className="text-tiny text-muted mt-3">
                    {list.length} {plural(list.length, 'нотатка', 'нотатки', 'нотаток')} · {fmtDate(list[0].created_at)}
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function NoteCoinScreen({ symbol }: { symbol: string }) {
  const { setView, openSheet, toast } = useApp()
  const notes = useNotes()
  const prices = usePrices()
  const price = prices.get(symbol)
  const list = (notes ?? []).filter((n) => n.symbol === symbol).sort(newestFirst)
  const back = () => setView({ name: 'home' })

  const remove = async (id: string) => {
    if (!confirm('Видалити цю нотатку?')) return
    await deleteNote(id)
    toast('Нотатку видалено')
    if (list.length === 1) back() // остання нотатка — монета зникає зі списку
  }

  return (
    <div>
      <BackButton label="Нотатки" onClick={back} />
      <header className="mt-1 mb-4">
        <h1 className="text-screen">{symbol}</h1>
        {price != null && <p className="text-body text-text2 mt-1">зараз {fmtPrice(price)}</p>}
      </header>

      <ul className="space-y-2.5">
        {list.map((n) => {
          const d = n.price_level != null ? markDistance(n.price_level, price) : null
          return (
            <li key={n.id} className="card">
              <div className="flex items-center justify-between -mt-2 -mr-1">
                <span className="text-tiny text-muted">{fmtDate(n.created_at)}</span>
                <button type="button" onClick={() => remove(n.id)} className="min-h-[44px] px-1 text-muted text-cap">
                  Видалити
                </button>
              </div>
              <p className="text-body whitespace-pre-wrap break-words">{n.text}</p>
              {n.price_level != null && (
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className="badge-neutral">Позначка {fmtPrice(n.price_level)}</span>
                  {d && (
                    <span className={`text-cap ${d.state === 'touched' ? 'text-accent font-medium' : 'text-text2'}`}>
                      {markLabel(d)}
                    </span>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <p className="text-tiny text-muted mt-4 px-1">
        Сповіщення, коли ціна торкнеться позначки, з'являться у версії з App Store.
      </p>
      <button type="button" className="btn-primary mt-4" onClick={() => openSheet({ kind: 'note', symbol })}>
        Додати нотатку
      </button>
    </div>
  )
}
