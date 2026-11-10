/** PWA: постійне сховище, підказка про встановлення на iPhone і пігулка «Є нова версія». */
import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

const HINT_KEY = 'install-hint.seen'

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** iPhone/iPad у Safari (не Chrome/Firefox для iOS — там «На початковий екран» в іншому місці). */
function isIosSafari(): boolean {
  const ua = navigator.userAgent
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
}

/** Просимо браузер не стирати дані застосунку. */
export function requestPersistentStorage() {
  void navigator.storage?.persist?.().catch(() => false)
}

export function InstallHint() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    let seen = false
    try { seen = localStorage.getItem(HINT_KEY) === '1' } catch { /* приватний режим */ }
    if (!seen && isIosSafari() && !isStandalone()) setShow(true)
  }, [])

  if (!show) return null
  const dismiss = () => {
    try { localStorage.setItem(HINT_KEY, '1') } catch { /* приватний режим */ }
    setShow(false)
  }

  return (
    <div
      role="note"
      className="fixed z-30 left-1/2 -translate-x-1/2 w-[calc(100%-30px)] max-w-[490px] bg-card border border-line rounded-card px-4 py-3 flex items-center gap-3 shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 97px)' }}
    >
      <p className="flex-1 text-cap text-text2 leading-[18px]">
        Встанови на телефон: Поділитися → На початковий екран
      </p>
      <button type="button" onClick={dismiss} className="min-h-[44px] px-2 text-accent text-cap font-semibold shrink-0">
        Зрозуміло
      </button>
    </div>
  )
}

export function UpdatePill() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      // Перевіряємо нову версію щоразу, коли застосунок повертається на екран.
      if (!reg) return
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && navigator.onLine) void reg.update().catch(() => {})
      })
    },
  })

  if (!needRefresh) return null
  return (
    <button
      type="button"
      onClick={() => void updateServiceWorker(true)}
      className="fixed left-1/2 z-40 -translate-x-1/2 min-h-[44px] rounded-full bg-accent text-on-accent text-cap font-semibold px-4 shadow-lg whitespace-nowrap"
      style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
    >
      Є нова версія — оновити
    </button>
  )
}
