import type { ReactNode } from 'react'
import { Icon } from '../MsuPayroll'
import logo from '../assets/logo.png'

function Brand({ dark }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-3.5">
      <img
        src={logo}
        alt="Mindanao State University at Naawan seal"
        className="size-12 sm:size-13 shrink-0 drop-shadow-[0_4px_12px_rgb(0_0_0/0.35)]"
      />
      <div>
        <p className={`font-bold text-base sm:text-lg leading-tight tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>
          MSU-Naawan
        </p>
        <p className={`text-xs sm:text-[13px] leading-tight mt-0.5 ${dark ? 'text-white/70' : 'text-slate-500'}`}>
          Automated Payroll Management System
        </p>
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
    <div className="min-h-screen w-full bg-gradient-to-br from-[#151e50] via-[#1b2667] to-[#25358c] flex flex-col justify-between px-6 sm:px-12 lg:px-16 xl:px-20 py-8 lg:py-10">
      {/* Top Header: Brand at Top Left */}
      <header className="w-full">
        <Brand dark />
      </header>

      {/* Main Area: Two-column layout aligned exactly like the design */}
      <main className="w-full my-auto py-8 lg:py-4 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
        {/* Left Column: Heading and Feature Box */}
        <div className="hidden lg:flex flex-col items-start max-w-lg">
          <p className="text-[#facc15] text-xs font-bold tracking-wider uppercase mb-5">
            UNIVERSITY PAYROLL PORTAL
          </p>
          <h1 className="text-4xl xl:text-[2.75rem] font-bold leading-[1.15] tracking-tight text-white mb-8">
            A simpler way to<br />
            manage university<br />
            payroll.
          </h1>
          <div className="w-full max-w-[420px] rounded-2xl bg-[#141d4c]/50 border border-white/10 backdrop-blur-md p-6 shadow-lg">
            <ul className="flex flex-col gap-4">
              {points.map((p) => (
                <li key={p} className="flex items-center gap-3.5 text-white/90 text-sm">
                  <span className="size-6 rounded-full bg-[#facc15] text-slate-950 flex items-center justify-center shrink-0 font-bold shadow-sm">
                    <Icon name="check" size={13} strokeWidth={3} className="text-slate-950" />
                  </span>
                  <span className="leading-snug">{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Column: Centered Floating Card */}
        <div className="w-full flex flex-col items-center lg:items-center">
          <div className="w-full max-w-[420px]">
            <div className="rounded-3xl bg-[#eef2fa] p-8 sm:p-9 shadow-2xl">
              {children}
            </div>
            <p className="text-center text-xs text-white/60 mt-4 px-2">
              For account access or assistance, contact your System Administrator.
            </p>
          </div>
        </div>
      </main>

      {/* Bottom Footer: Left footnote */}
      <footer className="w-full pt-4">
        <p className="text-xs text-white/45">
          Mindanao State University at Naawan · Prototype with fictional data
        </p>
      </footer>
    </div>
  )
}

export function ViewHeader({ title, subtitle, icon }: { title: string; subtitle?: ReactNode; icon?: ReactNode }) {
  return (
    <header className="mb-6">
      {icon && <div className="mb-4">{icon}</div>}
      <h1 id="view-title" tabIndex={-1} className="text-2xl font-bold text-slate-900 tracking-tight outline-none">
        {title}
      </h1>
      {subtitle && <div className="mt-2 text-sm text-slate-600 leading-relaxed">{subtitle}</div>}
    </header>
  )
}

export function BackLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2563eb] hover:underline underline-offset-4 cursor-pointer rounded">
      <Icon name="arrowLeft" size={16} /> {children}
    </button>
  )
}
