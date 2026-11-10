import { useEffect, useRef, useState } from 'react'
import { useApp } from '../state'
import { currentMonth } from '../core/dates'
import { fmtUsd } from '../core/format'
import { parseNum } from '../core/parse'
import { maxLossPerTrade, monthInvested } from '../core/plan'
import { exportBackup, importBackup } from '../data/backup'
import type { UserPlan } from '../data/db'
import { usePlan, useRules, useTrades } from '../data/hooks'
import { addRule, removeRule, savePlan } from '../data/repo'
import { Field, TextArea } from '../ui/kit'

export function PlanScreen() {
  const plan = usePlan()
  // Форму показуємо, коли план уже прочитано з бази, — щоб поля стартували з правильних значень.
  return plan ? <PlanForm initial={plan} /> : null
}

const str = (n: number | null) => (n == null ? '' : String(n))

function PlanForm({ initial }: { initial: UserPlan }) {
  const { toast } = useApp()
  const rules = useRules() ?? []
  const trades = useTrades() ?? []

  const [strategy, setStrategy] = useState(initial.strategy)
  const [deposit, setDeposit] = useState(str(initial.deposit))
  const [risk, setRisk] = useState(str(initial.risk_pct))
  const [budget, setBudget] = useState(str(initial.monthly_budget))
  const [newRule, setNewRule] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const first = useRef(true)

  const depositN = parseNum(deposit)
  const riskN = parseNum(risk)
  const budgetN = parseNum(budget)

  // Автозбереження
  useEffect(() => {
    if (first.current) { first.current = false; return }
    const t = setTimeout(() => {
      void savePlan({ strategy, deposit: depositN, risk_pct: riskN, monthly_budget: budgetN })
    }, 350)
    return () => clearTimeout(t)
  }, [strategy, depositN, riskN, budgetN])

  const maxLoss = maxLossPerTrade(depositN, riskN)
  const invested = monthInvested(trades, currentMonth())
  const over = budgetN != null && budgetN > 0 && invested > budgetN
  const progress = budgetN && budgetN > 0 ? Math.min(100, (invested / budgetN) * 100) : 0

  const submitRule = async () => {
    const text = newRule.trim()
    if (!text) return
    setNewRule('') // очищаємо одразу, щоб не стерти наступне правило, яке вже почали вводити
    await addRule(text)
  }

  const onImport = async (file: File | undefined) => {
    if (!file) return
    try {
      const n = await importBackup(await file.text())
      toast(n > 0 ? `Відновлено записів: ${n}` : 'Нових записів у файлі немає')
    } catch {
      toast('Не вдалося прочитати файл')
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="mt-4 space-y-2.5">
      <p className="text-cap text-muted px-1 mb-3">
        Твої правила. Щоденник нагадає про них, коли додаватимеш угоду.
      </p>

      <section className="card">
        <h2 className="text-title mb-3">Моя стратегія</h2>
        <TextArea label="Як я торгую" value={strategy} onChange={setStrategy} rows={5}
          placeholder="Що купую, коли входжу, коли фіксую…" />
      </section>

      <section className="card">
        <h2 className="text-title mb-3">Ризик на ф'ючах</h2>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Депозит, $" value={deposit} onChange={setDeposit} decimal placeholder="0" />
          <Field label="Ризик на угоду, %" value={risk} onChange={setRisk} decimal placeholder="1" />
        </div>
        <p className="text-cap text-text2 mt-3">
          Максимальний збиток на угоду: <span className="font-semibold text-text">{maxLoss != null ? fmtUsd(maxLoss) : '—'}</span>
        </p>
      </section>

      <section className="card">
        <h2 className="text-title mb-3">Спот</h2>
        <Field label="Бюджет на місяць, $" value={budget} onChange={setBudget} decimal placeholder="0" />
        <p className="text-cap text-text2 mt-3">
          Цього місяця вкладено {fmtUsd(invested)}{budgetN ? ` із ${fmtUsd(budgetN)}` : ''}
        </p>
        {!!budgetN && budgetN > 0 && (
          <>
            <div className="h-1 rounded-full bg-white/10 mt-2 overflow-hidden" role="progressbar"
              aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Використано бюджету">
              <div className={`h-full rounded-full transition-[width,background-color] duration-500 ease-out ${over ? 'bg-down' : 'bg-accent'}`} style={{ width: `${progress}%` }} />
            </div>
            <p className={`text-tiny mt-2 ${over ? 'text-down' : 'text-muted'}`}>
              {over ? `Перевищено на ${fmtUsd(invested - budgetN)}` : `Лишилось ${fmtUsd(budgetN - invested)}`}
            </p>
          </>
        )}
      </section>

      <section className="card">
        <h2 className="text-title mb-3">Мої правила</h2>
        {rules.length > 0 && (
          <ol className="divide-y divide-line -mt-1 mb-3">
            {rules.map((r, i) => (
              <li key={r.id} className="flex items-center gap-3 py-1.5">
                <span className="text-muted text-cap w-5 shrink-0">{i + 1}.</span>
                <span className="flex-1 text-body break-words min-w-0">{r.text}</span>
                <button type="button" onClick={() => removeRule(r.id)} className="min-h-[44px] px-1 text-muted text-cap shrink-0">
                  Прибрати
                </button>
              </li>
            ))}
          </ol>
        )}
        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); void submitRule() }}>
          <div className="flex-1"><Field label="Нове правило" value={newRule} onChange={setNewRule} placeholder="Не входжу без стопа" /></div>
          <button type="submit" aria-label="Додати правило" className="min-h-[50px] px-4 rounded-field bg-accent text-on-accent font-semibold disabled:opacity-40" disabled={!newRule.trim()}>
            Додати
          </button>
        </form>
      </section>

      <section className="card">
        <h2 className="text-title mb-1">Налаштування</h2>
        <dl className="divide-y divide-line">
          <Row k="Ціни" v="Bybit, потім CoinGecko" />
          <Row k="Валюта" v="USD" />
          <Row k="Мова" v="Українська" />
          <Row k="Акаунт" v="Дані лише на цьому телефоні" />
        </dl>
        <p className="text-tiny text-muted mt-1">
          Вхід і синхронізація з'являться на етапі 4. Поки що збережи копію у файл, щоб дані не загубились.
        </p>
        <div className="grid grid-cols-2 gap-2.5 mt-3">
          <button type="button" className="btn-secondary !min-h-[48px] !text-body" onClick={() => void exportBackup()}>
            Зберегти копію
          </button>
          <button type="button" className="btn-secondary !min-h-[48px] !text-body" onClick={() => fileRef.current?.click()}>
            Відновити з копії
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden"
            aria-label="Файл резервної копії" onChange={(e) => void onImport(e.target.files?.[0])} />
        </div>
      </section>

      <p className="text-tiny text-muted text-center pt-2">Усе зберігається автоматично.</p>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3 min-h-[44px]">
      <dt className="text-body text-text2">{k}</dt>
      <dd className="text-body text-right">{v}</dd>
    </div>
  )
}
