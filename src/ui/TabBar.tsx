import { useApp, type Tab } from '../state'

const icon = {
  width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true,
}

const WalletIcon = () => (
  <svg {...icon}>
    <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H17a1 1 0 0 1 1 1v2" />
    <path d="M4 7.5v9A2.5 2.5 0 0 0 6.5 19H19a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H6.5A2.5 2.5 0 0 1 4 7.5Z" />
    <path d="M16 13.5h.5" />
  </svg>
)

const NoteIcon = () => (
  <svg {...icon}>
    <path d="M7 3.5h7.5L19 8v11a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 19V5a1.5 1.5 0 0 1 1-1.5Z" />
    <path d="M14.5 3.5V8H19" />
    <path d="M9 12.5h6M9 16h4.5" />
  </svg>
)

const PlusIcon = () => (
  <svg {...icon} width={26} height={26} strokeWidth={2.2}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

function TabButton({ id, label, children }: { id: Tab; label: string; children: React.ReactNode }) {
  const { tab, setTab } = useApp()
  const on = tab === id
  return (
    <button
      type="button"
      onClick={() => setTab(id)}
      aria-current={on ? 'page' : undefined}
      className={`flex-1 h-full flex flex-col items-center justify-center gap-1 text-tiny font-medium ${on ? 'text-text' : 'text-muted'}`}
    >
      {children}
      {label}
    </button>
  )
}

export function TabBar({ onPlus }: { onPlus: () => void }) {
  return (
    <nav
      aria-label="Головна навігація"
      className="fixed z-30 left-1/2 -translate-x-1/2 w-[calc(100%-30px)] max-w-[490px] h-[70px] bg-bar border border-bar-line rounded-bar flex items-center px-2 shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 15px)' }}
    >
      <TabButton id="portfolio" label="Портфель"><WalletIcon /></TabButton>
      <button
        type="button"
        aria-label="Додати"
        onClick={onPlus}
        className="mx-3 h-[52px] w-[52px] shrink-0 rounded-[17px] bg-accent text-on-accent flex items-center justify-center active:opacity-80"
      >
        <PlusIcon />
      </button>
      <TabButton id="notes" label="Нотатки"><NoteIcon /></TabButton>
    </nav>
  )
}
