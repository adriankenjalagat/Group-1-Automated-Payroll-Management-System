import clsx from 'clsx'
import { useId, useState, type InputHTMLAttributes } from 'react'
import { Icon, type IconName } from './Icons'

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: string
  error?: string
  icon?: IconName
}

export function TextField({ label, hint, error, icon, className, ...rest }: FieldProps) {
  const id = useId()
  const describedBy = [hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(' ') || undefined
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-text mb-1.5">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
            <Icon name={icon} size={18} />
          </span>
        )}
        <input
          id={id}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy}
          {...rest}
          className={clsx(
            'w-full h-12 rounded-control bg-surface border text-base sm:text-sm text-text placeholder:text-text-muted/70 px-3.5',
            icon && 'pl-11',
            error ? 'border-danger' : 'border-border-strong hover:border-primary',
          )}
        />
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-text-muted">
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

export function PasswordField(props: Omit<FieldProps, 'type' | 'icon'>) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <TextField placeholder="••••••••••" {...props} icon="lock" type={show ? 'text' : 'password'} className={clsx(props.className)} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-pressed={show}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-2 top-[2.0625rem] size-9 grid place-items-center rounded-lg text-text-muted hover:text-primary cursor-pointer"
      >
        <Icon name={show ? 'eyeOff' : 'eye'} size={18} />
      </button>
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
