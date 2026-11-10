import { useEffect, useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { useApp } from '../state'

export const tone = (n: number | null | undefined) =>
  n == null || Math.abs(n) < 0.005 ? 'text-text' : n > 0 ? 'text-up' : 'text-down'

export function Segmented<T extends string>(props: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  label: string
}) {
  const index = Math.max(0, props.options.findIndex((o) => o.value === props.value))
  const n = props.options.length
  return (
    <div role="tablist" aria-label={props.label} className="relative flex bg-card border border-line rounded-[16px] p-1">
      <span
        aria-hidden
        className="seg-thumb absolute top-1 bottom-1 left-1 rounded-[12px] bg-white/10"
        style={{ width: `calc((100% - 8px) / ${n})`, transform: `translateX(${index * 100}%)` }}
      />
      {props.options.map((o) => {
        const on = o.value === props.value
        return (
          <button
            key={o.value}
            role="tab"
            type="button"
            aria-selected={on}
            onClick={() => props.onChange(o.value)}
            className={`relative flex-1 min-w-0 min-h-[44px] rounded-[12px] px-2 text-body font-medium text-center truncate transition-colors duration-200 ${on ? 'text-text' : 'text-muted'}`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
  label: string
  value: string
  onChange: (v: string) => void
  /** Кнопка над полем праворуч, напр. «зараз». */
  action?: { label: string; onClick: () => void } | null
  decimal?: boolean
}

export function Field({ label, value, onChange, action, decimal, className, ...rest }: FieldProps) {
  const id = useId()
  return (
    <div>
      <div className="flex items-center justify-between h-[26px]">
        <label htmlFor={id} className="text-cap text-muted">{label}</label>
        {action && (
          <button type="button" onClick={action.onClick} className="link -my-3 -mr-1">
            {action.label}
          </button>
        )}
      </div>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={decimal ? 'decimal' : undefined}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className={`input ${className ?? ''}`}
        {...rest}
      />
    </div>
  )
}

export function TextArea(props: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="label">{props.label}</label>
      <textarea
        id={id}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        rows={props.rows ?? 3}
        className="input py-3 leading-[22px] resize-none"
      />
    </div>
  )
}

export function Stat({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div>
      <div className="text-tiny text-muted">{label}</div>
      <div className={`text-body font-semibold mt-0.5 ${className ?? ''}`}>{value}</div>
    </div>
  )
}

export function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="min-h-[44px] -ml-1 pr-3 text-accent text-body font-medium">
      ‹ {label}
    </button>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="card text-center text-muted py-8">{children}</div>
}

export function Sheet(props: { title: string; onClose: () => void; children: ReactNode }) {
  const { sheetClosing } = useApp()
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && props.onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [props.onClose])

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div className={`absolute inset-0 bg-black/60 ${sheetClosing ? 'anim-fade-out' : 'anim-fade'}`} onClick={props.onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={props.title}
        className={`${sheetClosing ? 'anim-sheet-out' : 'anim-sheet'} relative w-full max-w-[520px] max-h-[94dvh] flex flex-col bg-sheet rounded-t-sheet border-t border-line`}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-white/20" aria-hidden />
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-4 max-[350px]:px-3 pt-1 pb-2">
          <button type="button" onClick={props.onClose} className="justify-self-start min-h-[44px] text-text2 text-body">
            Скасувати
          </button>
          <h2 className="text-[17px] max-[350px]:text-[15px] font-semibold text-center truncate">{props.title}</h2>
          <span />
        </div>
        <div
          className="overflow-y-auto overscroll-contain px-4 space-y-4"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
        >
          {props.children}
        </div>
      </div>
    </div>
  )
}

export function Toast({ message, visible }: { message: string | null; visible: boolean }) {
  if (!message) return null
  return (
    <div
      role="status"
      className={`${visible ? 'anim-toast' : 'anim-toast-out'} fixed left-1/2 z-50 max-w-[calc(100%-32px)] truncate rounded-full bg-white text-[#0A0B0D] text-cap font-semibold px-4 py-2.5 shadow-lg`}
      style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
    >
      {message}
    </div>
  )
}

export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null
  return <p role="alert" className="text-down text-cap">{children}</p>
}

export function Warning({ children }: { children: ReactNode }) {
  return <div className="rounded-field bg-down/[0.12] text-down text-cap px-3.5 py-3 leading-[18px]">{children}</div>
}

export function Hint({ children }: { children: ReactNode }) {
  return <p className="text-cap text-text2 leading-[18px]">{children}</p>
}
