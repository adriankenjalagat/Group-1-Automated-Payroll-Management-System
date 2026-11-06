import clsx from 'clsx'
import { useEffect, useId, useRef, useState, type ReactNode, type SelectHTMLAttributes } from 'react'
import { Icon } from '../MsuPayroll'
import { statusLabel, type AccountStatus } from './data'

export function Avatar({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) {
  const text = name.split(' ').map((p) => p[0]).slice(0, 2).join('')
  return (
    <span
      aria-hidden="true"
      className={clsx(
        'shrink-0 rounded-full bg-primary/15 text-primary font-semibold grid place-items-center',
        size === 'md' ? 'size-9 text-xs' : 'size-12 text-sm',
      )}
    >
      {text}
    </span>
  )
}

const statusDot = { active: 'bg-success', pending: 'bg-warning', locked: 'bg-danger', deactivated: 'bg-danger' } as const

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm text-text">
      <span aria-hidden="true" className={clsx('size-2.5 rounded-full', statusDot[status])} />
      {statusLabel[status]}
    </span>
  )
}

export function Tag({ kind, children }: { kind: 'proposed' | 'placeholder' | 'simulated'; children: ReactNode }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium',
        kind === 'simulated' ? 'bg-accent text-on-accent' : 'border border-dashed border-border-strong text-text-muted',
      )}
    >
      {children}
    </span>
  )
}

export function SelectField({
  label, error, hint, placeholder, children, className, ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string; hint?: string; placeholder?: string }) {
  const id = useId()
  const describedBy = [hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(' ') || undefined
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium mb-1.5">{label}</label>
      <div className="relative">
        <select
          id={id}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy}
          {...rest}
          className={clsx(
            'w-full h-12 appearance-none rounded-control bg-surface border text-base sm:text-sm text-text pl-3.5 pr-10 disabled:opacity-60 disabled:cursor-not-allowed',
            error ? 'border-danger' : 'border-border-strong hover:border-primary',
          )}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {children}
        </select>
        <Icon name="chevronDown" size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
      </div>
      {hint && !error && <p id={`${id}-hint`} className="mt-1.5 text-xs text-text-muted">{hint}</p>}
      {error && (
        <p id={`${id}-err`} className="mt-1.5 text-xs text-danger font-medium flex items-center gap-1.5">
          <Icon name="alert" size={14} /> {error}
        </p>
      )}
    </div>
  )
}

export function DangerButton({ className, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={clsx(
        'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-control bg-danger text-surface text-sm font-semibold cursor-pointer transition-[opacity,scale] duration-150 ease-out active:scale-[0.96] hover:opacity-90 disabled:opacity-60',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null
    const dlg = ref.current
    dlg?.showModal()
    return () => {
      dlg?.close()
      trigger?.isConnected && trigger.focus()
    }
  }, [])

  useEffect(() => {
    heading.current?.focus()
  }, [title])

  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      onCancel={(e) => { e.preventDefault(); closeRef.current() }}
      onClick={(e) => { if (e.target === ref.current) closeRef.current() }}
      className={clsx(
        'm-auto w-[min(var(--w),calc(100vw-1.5rem))] max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain rounded-card bg-surface text-text p-0 elevate backdrop:bg-deep/60',
        wide ? '[--w:40rem]' : '[--w:30rem]',
      )}
    >
      <div className="p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4 mb-5">
          <h2 id="modal-title" ref={heading} tabIndex={-1} className="text-xl font-semibold leading-tight text-balance">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="-mt-1.5 -mr-2 size-10 shrink-0 grid place-items-center rounded-lg text-text-muted hover:text-text hover:bg-info-soft cursor-pointer"
          >
            <Icon name="x" size={18} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}

export function usePopover() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      ref.current?.querySelector<HTMLElement>('[data-trigger]')?.focus()
    }
    document.addEventListener('mousedown', down)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('mousedown', down)
      document.removeEventListener('keydown', key)
    }
  }, [open])
  return { open, setOpen, ref }
}

export type ToastItem = { id: number; text: string }

export function Toasts({ items, onDismiss }: { items: ToastItem[]; onDismiss: (id: number) => void }) {
  useEffect(() => {
    if (!items.length) return
    const t = setTimeout(() => onDismiss(items[0].id), 7000)
    return () => clearTimeout(t)
  }, [items, onDismiss])
  return (
    <div role="status" aria-live="polite" className="fixed z-[60] inset-x-3 bottom-3 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-96 grid gap-2 pb-[env(safe-area-inset-bottom)]">
      {items.map((t) => (
        <div key={t.id} className="elevate flex items-start gap-3 rounded-control bg-surface p-3.5 text-sm">
          <span className="mt-0.5 size-5 shrink-0 rounded-full bg-success text-surface grid place-items-center"><Icon name="check" size={12} strokeWidth={3} /></span>
          <div className="flex-1 min-w-0">
            <p>{t.text}</p>
            <p className="text-xs text-text-muted mt-0.5">Simulated. Nothing is saved in this prototype.</p>
          </div>
          <button type="button" onClick={() => onDismiss(t.id)} aria-label="Dismiss message" className="-m-1.5 size-8 grid place-items-center rounded-lg text-text-muted hover:text-text cursor-pointer">
            <Icon name="x" size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}
