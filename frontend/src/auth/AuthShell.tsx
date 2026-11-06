import type { ReactNode } from 'react'
import { Icon } from '../MsuPayroll'
import logo from '../assets/logo.png'

function Brand({ dark }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <img src={logo} alt="Mindanao State University at Naawan seal" className="size-12 sm:size-14 shrink-0 drop-shadow-[0_4px_12px_rgb(0_0_0/0.35)]" />
      <div className={dark ? 'text-on-primary' : 'text-primary'}>
        <p className="font-semibold text-base sm:text-lg leading-tight">MSU–Naawan</p>
        <p className={`text-xs leading-tight ${dark ? 'text-on-primary-muted' : 'text-text-muted'}`}>Automated Payroll Management System</p>
      </div>
    </div>
  )
}

const points = [
  'Submit and monitor payroll requirements',
  'Track payroll processing and approval status',
  'Secure access for authorized university personnel',
]

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-animated grid lg:grid-cols-2">
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 size-[28rem] rounded-full bg-white/10 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute left-1/4 bottom-0 size-72 rounded-full bg-blue-4/40 blur-3xl" />

      <aside className="on-dark relative hidden lg:grid grid-rows-[auto_1fr_auto] text-on-primary px-12 xl:px-20 py-10">
        <Brand dark />
        <div className="self-center max-w-md py-10">
          <p className="text-accent text-sm font-semibold tracking-wide uppercase mb-4">University payroll portal</p>
          <h2 className="text-4xl xl:text-5xl font-semibold leading-[1.1] tracking-tight">A simpler way to manage university payroll.</h2>
          <ul className="glass-panel mt-8 grid gap-4 rounded-card p-5">
            {points.map((p) => (
              <li key={p} className="flex gap-3 text-on-primary-muted">
                <span className="mt-0.5 size-6 shrink-0 rounded-full bg-accent text-on-accent grid place-items-center">
                  <Icon name="check" size={14} strokeWidth={3} />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-on-primary-muted">Mindanao State University at Naawan · Prototype with fictional data</p>
      </aside>

      <main className="relative grid grid-rows-[auto_1fr_auto] px-[max(1.25rem,env(safe-area-inset-left))] sm:px-10 xl:px-20 pt-[max(calc(env(safe-area-inset-top)+0.75rem),4rem)] pb-[max(calc(env(safe-area-inset-bottom)+0.75rem),4.5rem)] lg:py-10">
        <div className="on-dark lg:invisible"><Brand dark /></div>
        <div className="grid place-items-center py-6 lg:py-10">
          <div className="w-full max-w-[26.5rem] glass-card rounded-card p-5 min-[400px]:p-7 sm:p-9">{children}</div>
        </div>
        <p className="text-center text-xs text-on-primary-muted">
          For account access or assistance, contact your System Administrator.
        </p>
      </main>
    </div>
  )
}

export function ViewHeader({ title, subtitle, icon }: { title: string; subtitle?: ReactNode; icon?: ReactNode }) {
  return (
    <header className="mb-6">
      {icon && <div className="mb-4">{icon}</div>}
      <h1 id="view-title" tabIndex={-1} className="text-2xl font-semibold text-text tracking-tight outline-none">
        {title}
      </h1>
      {subtitle && <p className="mt-2 text-sm text-text-muted leading-relaxed">{subtitle}</p>}
    </header>
  )
}

export function BackLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-4 cursor-pointer rounded">
      <Icon name="arrowLeft" size={16} /> {children}
    </button>
  )
}
