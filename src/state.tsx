import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

export type Tab = 'portfolio' | 'notes'
export type PortfolioSeg = 'spot' | 'futures'
export type NotesSeg = 'coins' | 'plan'

export type View =
  | { name: 'home' }
  | { name: 'spotCoin'; id: string }
  | { name: 'position'; id: string }
  | { name: 'noteCoin'; symbol: string }

export type SheetState =
  | { kind: 'trade'; type: PortfolioSeg; symbol?: string }
  | { kind: 'sell'; coinId: string }
  | { kind: 'close'; positionId: string }
  | { kind: 'note'; symbol?: string }
  | null

type Ctx = {
  tab: Tab
  setTab: (t: Tab) => void
  view: View
  setView: (v: View) => void
  sheet: SheetState
  openSheet: (s: SheetState) => void
  closeSheet: () => void
  /** Шторка грає анімацію закриття. */
  sheetClosing: boolean
  toastVisible: boolean
  toast: (msg: string) => void
  toastMsg: string | null
  portfolioSeg: PortfolioSeg
  setPortfolioSeg: (s: PortfolioSeg) => void
  notesSeg: NotesSeg
  setNotesSeg: (s: NotesSeg) => void
}

/** Тривалість анімацій зникнення, мс (збігається з CSS). */
export const EXIT_MS = 220

const AppCtx = createContext<Ctx | null>(null)

export function useApp(): Ctx {
  const c = useContext(AppCtx)
  if (!c) throw new Error('AppProvider is missing')
  return c
}

function usePref<T extends string>(key: string, fallback: T, allowed: readonly T[]) {
  const [v, setV] = useState<T>(() => {
    try {
      const s = localStorage.getItem(key) as T | null
      return s && allowed.includes(s) ? s : fallback
    } catch {
      return fallback
    }
  })
  const set = useCallback(
    (next: T) => {
      setV(next)
      try {
        localStorage.setItem(key, next)
      } catch {
        /* приватний режим — просто не запам'ятовуємо */
      }
    },
    [key],
  )
  return [v, set] as const
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [tab, setTabRaw] = useState<Tab>('portfolio')
  const [view, setViewRaw] = useState<View>({ name: 'home' })
  const [sheet, setSheet] = useState<SheetState>(null)
  const [sheetClosing, setSheetClosing] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [toastVisible, setToastVisible] = useState(false)
  const sheetTimer = useRef<number | undefined>(undefined)
  const toastGone = useRef<number | undefined>(undefined)
  const [portfolioSeg, setPortfolioSeg] = usePref<PortfolioSeg>('seg.portfolio', 'spot', ['spot', 'futures'])
  const [notesSeg, setNotesSeg] = usePref<NotesSeg>('seg.notes', 'coins', ['coins', 'plan'])
  const timer = useRef<number | undefined>(undefined)

  const setView = useCallback((v: View) => {
    setViewRaw(v)
    window.scrollTo(0, 0)
  }, [])

  const setTab = useCallback(
    (t: Tab) => {
      setTabRaw(t)
      setView({ name: 'home' })
    },
    [setView],
  )

  const toast = useCallback((msg: string) => {
    setToastMsg(msg)
    setToastVisible(true)
    window.clearTimeout(timer.current)
    window.clearTimeout(toastGone.current)
    timer.current = window.setTimeout(() => setToastVisible(false), 2000)
    toastGone.current = window.setTimeout(() => setToastMsg(null), 2000 + EXIT_MS)
  }, [])

  const openSheet = useCallback((s: SheetState) => {
    window.clearTimeout(sheetTimer.current)
    setSheetClosing(false)
    setSheet(s)
  }, [])

  // Закриття з анімацією: спершу шторка з'їжджає вниз, потім прибираємо її.
  const closeSheet = useCallback(() => {
    setSheetClosing(true)
    window.clearTimeout(sheetTimer.current)
    sheetTimer.current = window.setTimeout(() => {
      setSheet(null)
      setSheetClosing(false)
    }, EXIT_MS)
  }, [])

  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
      window.clearTimeout(toastGone.current)
      window.clearTimeout(sheetTimer.current)
    },
    [],
  )

  const value = useMemo<Ctx>(
    () => ({
      tab, setTab, view, setView,
      sheet, openSheet, closeSheet, sheetClosing,
      toast, toastMsg, toastVisible,
      portfolioSeg, setPortfolioSeg, notesSeg, setNotesSeg,
    }),
    [tab, setTab, view, setView, sheet, openSheet, closeSheet, sheetClosing, toast, toastMsg, toastVisible, portfolioSeg, setPortfolioSeg, notesSeg, setNotesSeg],
  )

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}
