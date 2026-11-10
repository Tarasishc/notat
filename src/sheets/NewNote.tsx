import { useEffect, useState } from 'react'
import { useApp } from '../state'
import { fmtPct, priceInput } from '../core/format'
import { markDistance } from '../core/marks'
import { parsePositive } from '../core/parse'
import { useNotes } from '../data/hooks'
import { usePrices } from '../data/prices'
import { addNote, normSymbol } from '../data/repo'
import { Field, FormError, Hint, Sheet, TextArea } from '../ui/kit'

const DEFAULT_QUICK = ['BTC', 'SOL', 'TON']
const APP_STORE = 'у версії з App Store'

export function NewNoteSheet({ initialSymbol }: { initialSymbol?: string }) {
  const { closeSheet, setView, setNotesSeg, toast } = useApp()
  const prices = usePrices()
  const notes = useNotes()

  const [symbol, setSymbol] = useState(initialSymbol ?? '')
  const [text, setText] = useState('')
  const [level, setLevel] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Помилка зникає, щойно користувач щось виправив
  useEffect(() => setError(''), [symbol, text, level])

  // Швидкі кнопки: спершу монети з нотатками (свіжіші перші), потім типові; до 5 штук.
  const recent = [...(notes ?? [])].sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1)).map((n) => n.symbol)
  const quick = [...new Set([...recent, ...DEFAULT_QUICK])].slice(0, 5)

  const sym = normSymbol(symbol)
  const cur = sym ? prices.get(sym) : null
  const levelN = parsePositive(level)
  const d = levelN ? markDistance(levelN, cur) : null

  let hint = `Позначка — ціна, за якою стежиш. Поки що застосунок показує, скільки до неї лишилось; сповіщення з'являться ${APP_STORE}.`
  if (levelN) {
    if (!d) hint = `Живої ціни для цієї монети немає, тож відстань до позначки не покажу. Сповіщення — ${APP_STORE}.`
    else if (d.state === 'touched') hint = `Позначка майже дорівнює поточній ціні. Сповіщення, коли ціна її торкнеться, — ${APP_STORE}.`
    else hint = `Позначка ${d.state === 'above' ? 'вище' : 'нижче'} поточної ціни на ${fmtPct(d.pct, false)}. Сповіщення, коли ціна її торкнеться, — ${APP_STORE}.`
  }

  const save = async () => {
    if (!sym) return setError('Вкажи монету')
    if (!text.trim()) return setError('Напиши нотатку')
    if (level.trim() && !levelN) return setError('Позначка має бути числом')
    setBusy(true)
    try {
      await addNote(sym, text, levelN)
      setNotesSeg('coins')
      setView({ name: 'noteCoin', symbol: sym })
      toast('Нотатку збережено')
      closeSheet()
    } catch {
      setError('Не вдалося зберегти. Спробуй ще раз.')
      setBusy(false)
    }
  }

  return (
    <Sheet title="Нова нотатка" onClose={closeSheet}>
      <div>
        <Field label="Монета" value={symbol} onChange={(v) => setSymbol(v.toUpperCase())} placeholder="ETH"
          autoCapitalize="characters" className="!text-[22px] font-semibold uppercase !min-h-[56px]" />
        <div className="flex gap-2 mt-2.5 flex-wrap">
          {quick.map((s) => (
            <button key={s} type="button" onClick={() => setSymbol(s)} className={`chip ${sym === s ? 'chip-on' : ''}`}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <TextArea label="Нотатка" value={text} onChange={setText} rows={4}
        placeholder="Куплю на $200, якщо впаде до 3 300…" />
      <Field label="Позначка ціни, $ · необов'язково" value={level} onChange={setLevel} decimal
        placeholder={cur != null ? priceInput(cur) : '0'}
        action={cur != null ? { label: 'зараз', onClick: () => setLevel(priceInput(cur)) } : null} />
      <Hint>{hint}</Hint>
      <FormError>{error}</FormError>
      <button type="button" className="btn-primary" onClick={save} disabled={busy}>
        Зберегти нотатку
      </button>
    </Sheet>
  )
}
