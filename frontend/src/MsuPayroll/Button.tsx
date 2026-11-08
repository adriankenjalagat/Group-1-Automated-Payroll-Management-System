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
    'bg-[#facc15] hover:bg-[#eab308] text-slate-900 font-bold h-12 px-6 rounded-xl transition-colors shadow-sm active:translate-y-px',
  secondary:
    'bg-white text-slate-900 border border-slate-300 hover:bg-slate-50 font-medium h-12 px-6 rounded-xl transition-colors',
  link: 'text-[#2563eb] hover:underline font-medium px-1 py-1 rounded cursor-pointer',
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
