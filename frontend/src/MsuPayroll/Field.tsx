import clsx from 'clsx'
import { useId, useState, type InputHTMLAttributes } from 'react'
import { Icon, type IconName } from './Icons'

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  labelClassName?: string
  hint?: string
  error?: string
  icon?: IconName
}

export function TextField({ label, labelClassName, hint, error, icon, className, ...rest }: FieldProps) {
  const id = useId()
  const describedBy = [hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(' ') || undefined
  return (
    <div className={className}>
      <label htmlFor={id} className={clsx("block text-sm font-medium text-text mb-1.5", labelClassName)}>
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center justify-center">
            <Icon name={icon} size={18} />
          </span>
        )}
        <input
          id={id}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy}
          {...rest}
          className={clsx(
            'w-full h-12 rounded-xl bg-white border text-sm text-slate-900 placeholder:text-slate-400 px-3.5 outline-none transition-colors',
            icon && 'pl-11',
            error
              ? 'border-danger focus:border-danger focus:ring-2 focus:ring-danger/20'
              : 'border-slate-300 hover:border-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20',
          )}
        />
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="mt-1.5 text-xs text-danger font-medium flex items-center gap-1.5">
          <Icon name="alert" size={14} /> {error}
        </p>
      )}
    </div>
  )
}

export function PasswordField({
  label,
  labelClassName,
  hint,
  error,
  className,
  ...inputProps
}: Omit<FieldProps, 'type' | 'icon'>) {
  const [show, setShow] = useState(false)
  const id = useId()
  const describedBy = [hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(' ') || undefined

  return (
    <div className={className}>
      <label htmlFor={id} className={clsx("block text-sm font-medium text-text mb-1.5", labelClassName)}>
        {label}
      </label>
      <div className="relative flex items-center">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center justify-center z-10">
          <Icon name="lock" size={18} />
        </span>
        <input
          id={id}
          placeholder="••••••••••"
          {...inputProps}
          type={show ? 'text' : 'password'}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy}
          className={clsx(
            'w-full h-12 rounded-xl bg-white border text-sm text-slate-900 placeholder:text-slate-400 pl-11 pr-11 outline-none transition-colors',
            error
              ? 'border-danger focus:border-danger focus:ring-2 focus:ring-danger/20'
              : 'border-slate-300 hover:border-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20',
          )}
        />
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setShow((prev) => !prev)
          }}
          tabIndex={-1}
          aria-pressed={show}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-2 top-1/2 -translate-y-1/2 size-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer transition-colors z-20 focus:outline-none"
        >
          <Icon name={show ? 'eyeOff' : 'eye'} size={18} />
        </button>
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="mt-1.5 text-xs text-danger font-medium flex items-center gap-1.5">
          <Icon name="alert" size={14} /> {error}
        </p>
      )}
    </div>
  )
}

export const passwordRules = [
  { id: 'len', label: 'At least 10 characters', test: (v: string) => v.length >= 10 },
  { id: 'case', label: 'Upper and lower case letters', test: (v: string) => /[a-z]/.test(v) && /[A-Z]/.test(v) },
  { id: 'num', label: 'At least one number', test: (v: string) => /\d/.test(v) },
  { id: 'sym', label: 'At least one symbol', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
]

export function PasswordRules({ value }: { value: string }) {
  return (
    <ul className="grid gap-1.5" aria-label="Password requirements">
      {passwordRules.map((r) => {
        const ok = r.test(value)
        return (
          <li key={r.id} className={clsx('flex items-center gap-2 text-xs', ok ? 'text-success font-medium' : 'text-text-muted')}>
            <span
              className={clsx(
                'size-4 rounded-full grid place-items-center border',
                ok ? 'bg-success text-white border-success' : 'border-border-strong',
              )}
            >
              {ok && <Icon name="check" size={10} strokeWidth={3} />}
            </span>
            {r.label}
            <span className="sr-only">{ok ? ' — met' : ' — not met'}</span>
          </li>
        )
      })}
    </ul>
  )
}
