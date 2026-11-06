import clsx from 'clsx'
import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icons'

type Tone = 'danger' | 'warning' | 'success' | 'info'

const tones: Record<Tone, { box: string; icon: IconName; label: string }> = {
  danger: { box: 'bg-danger-soft text-danger border-danger/30', icon: 'alert', label: 'Error' },
  warning: { box: 'bg-warning-soft text-warning border-warning/30', icon: 'clock', label: 'Notice' },
  success: { box: 'bg-success-soft text-success border-success/30', icon: 'check', label: 'Success' },
  info: { box: 'bg-info-soft text-primary border-primary/20', icon: 'info', label: 'Note' },
}

export function Alert({ tone = 'info', title, children }: { tone?: Tone; title?: string; children: ReactNode }) {
  const t = tones[tone]
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={clsx('flex gap-3 rounded-control border p-3.5 text-sm', t.box)}>
      <Icon name={t.icon} size={18} className="mt-0.5 shrink-0" />
      <div>
        <p className="font-semibold">
          <span className="sr-only">{t.label}: </span>
          {title}
        </p>
        <div className={clsx('text-text', title && 'mt-0.5')}>{children}</div>
      </div>
    </div>
  )
}

export function StatusBadge({ tone, icon, children }: { tone: Tone; icon: IconName; children: ReactNode }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold', tones[tone].box)}>
      <Icon name={icon} size={13} /> {children}
    </span>
  )
}

export function StatusMark({ tone, icon }: { tone: Tone; icon: IconName }) {
  return (
    <div className={clsx('size-16 rounded-full grid place-items-center border-2', tones[tone].box)}>
      <Icon name={icon} size={30} />
    </div>
  )
}
