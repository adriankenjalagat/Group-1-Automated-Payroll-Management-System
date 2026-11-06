import clsx from 'clsx'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'link'
  loading?: boolean
  fullWidth?: boolean
  children: ReactNode
}

const styles = {
  primary:
    'bg-accent text-on-accent hover:bg-accent-hover font-semibold h-12 px-6 rounded-control shadow-[0_6px_0_-2px_rgb(15_14_46/0.25)] active:translate-y-px',
  secondary:
    'bg-surface text-primary border border-border-strong hover:bg-info-soft font-medium h-12 px-6 rounded-control',
  link: 'text-primary underline underline-offset-4 hover:text-primary-hover font-medium px-1 py-1 rounded',
}

export function Button({ variant = 'primary', loading, fullWidth, disabled, className, children, ...rest }: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(
        'inline-flex items-center justify-center gap-2 text-sm transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed',
        styles[variant],
        fullWidth && 'w-full',
        className,
      )}
    >
      {loading && (
        <span className="size-4 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden="true" />
      )}
      {children}
    </button>
  )
}
