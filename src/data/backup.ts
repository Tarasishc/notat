/** Резервна копія у файл: експорт усіх даних у JSON і відновлення з нього. */
import { today } from '../core/dates'
import { db } from './db'

const TABLES = ['spot_coins', 'spot_trades', 'futures_positions', 'user_plan', 'plan_rules', 'coin_notes'] as const
type Backup = { app: 'shchodennyk'; version: 1; exported_at: string; data: Record<string, unknown[]> }

export async function buildBackup(): Promise<Backup> {
  const data: Record<string, unknown[]> = {}
  for (const t of TABLES) data[t] = await db.table(t).toArray()
  return { app: 'shchodennyk', version: 1, exported_at: new Date().toISOString(), data }
}

export async function exportBackup(): Promise<void> {
  const json = JSON.stringify(await buildBackup(), null, 2)
  const name = `shchodennyk-${today()}.json`
  const file = new File([json], name, { type: 'application/json' })
  // На iPhone у встановленому застосунку надійніше працює «Поділитися».
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Щоденник — резервна копія' })
      return
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Відновлення: запис із файлу замінює локальний, лише якщо він новіший. Повертає кількість змінених записів. */
export async function importBackup(text: string): Promise<number> {
  const parsed = JSON.parse(text) as Backup
  if (parsed?.app !== 'shchodennyk' || !parsed.data) throw new Error('Це не файл Щоденника')
  let count = 0
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      const table = db.table(t)
      for (const row of (parsed.data[t] ?? []) as { id: string; updated_at?: string }[]) {
        if (!row?.id) continue
        const local = await table.get(row.id)
        if (!local || (row.updated_at ?? '') > (local.updated_at ?? '')) {
          await table.put({ ...row, dirty: 1 })
          count++
        }
      }
    }
  })
  return count
}
