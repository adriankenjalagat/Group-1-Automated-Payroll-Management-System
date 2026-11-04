import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'

// Hard-coded test account (for the demo only)
const TEST_USERNAME = 'admin'
const TEST_PASSWORD = 'admin123'

const FEATURES = [
  'Submit and monitor payroll requirements',
  'Track payroll processing and approval status',
  'Secure access for authorized university personnel',
]

const yellowButton =
  'w-full rounded-xl bg-[#f5e60a] py-4 font-semibold text-slate-900 shadow-[0_4px_0_#a9a8c4] transition hover:brightness-95 active:translate-y-0.5 active:shadow-[0_2px_0_#a9a8c4]'

/* ---------- Small icons ---------- */
const iconProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

function UserIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg {...iconProps}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 3l18 18" />
      <path d="M10.6 6.1A9.8 9.8 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 4" />
      <path d="M6.6 6.6C3.8 8.3 2 12 2 12s4 7 10 7c1.6 0 3-.4 4.3-1" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg {...iconProps} width={16} height={16} strokeWidth={3}>
      <path d="M5 12l5 5 9-10" />
    </svg>
  )
}

/* ---------- Logo (falls back to a yellow circle if logo.png is missing) ---------- */
function Logo() {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f5e60a] text-sm font-bold text-blue-950">
        MSU
      </div>
    )
  }

  return (
    <img
      src="/logo.png"
      alt="MSU-Naawan seal"
      className="h-14 w-14 rounded-full object-cover"
      onError={() => setFailed(true)}
    />
  )
}

/* ---------- Page frame: header + footer around the content ---------- */
function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[linear-gradient(120deg,#33398a_0%,#2c4fb0_50%,#231b5a_100%)] text-white">
      <header className="flex items-center gap-4 px-6 py-8 lg:px-12">
        <Logo />
        <div>
          <p className="text-xl font-bold leading-tight">MSU–Naawan</p>
          <p className="text-sm text-white/80">
            Automated Payroll Management System
          </p>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-6 lg:flex-row lg:justify-between lg:px-12">
        {children}
      </main>

      <footer className="flex flex-col gap-2 px-6 py-8 text-sm text-white/70 lg:flex-row lg:justify-between lg:px-12">
        <p>Mindanao State University at Naawan</p>
        <p>
          For account access or assistance, contact your System Administrator.
        </p>
      </footer>
    </div>
  )
}

/* ---------- Main component ---------- */
function App() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault() // stops the page from reloading

    if (username === TEST_USERNAME && password === TEST_PASSWORD) {
      setError('')
      setLoggedIn(true)
    } else {
      setError('Invalid username or password.')
    }
  }

  function handleSignOut() {
    setLoggedIn(false)
    setUsername('')
    setPassword('')
    setShowPassword(false)
  }

  // Screen shown AFTER a successful sign-in
  if (loggedIn) {
    return (
      <Layout>
        <div className="mx-auto w-full max-w-md rounded-3xl bg-[#dadbf2] p-8 text-center text-slate-900 shadow-2xl">
          <h1 className="text-2xl font-semibold">Welcome, Admin!</h1>
          <p className="mt-2 text-slate-600">
            You are signed in to the MSU-Naawan Automated Payroll Management
            System.
          </p>
          <button onClick={handleSignOut} className={`${yellowButton} mt-8`}>
            Sign out
          </button>
        </div>
      </Layout>
    )
  }

  // Sign-in screen
  return (
    <Layout>
      {/* Left side: headline and checklist */}
      <section className="w-full max-w-xl">
        <p className="text-sm font-bold uppercase tracking-wide text-[#f5e60a]">
          University Payroll Portal
        </p>
        <h2 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
          A simpler way to manage university payroll.
        </h2>

        <ul className="mt-10 space-y-4 rounded-3xl border border-white/20 bg-white/10 p-6">
          {FEATURES.map((text) => (
            <li key={text} className="flex items-start gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f5e60a] text-slate-900">
                <CheckIcon />
              </span>
              <span className="text-lg text-white/85">{text}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Right side: sign-in card */}
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-3xl bg-[#dadbf2] p-8 text-slate-900 shadow-2xl"
      >
        <h1 className="text-2xl font-semibold">Sign in to your account</h1>
        <p className="mt-2 text-slate-500">
          Enter your university email or assigned username to continue.
        </p>

        <label htmlFor="username" className="mt-8 block font-medium">
          Email or username
        </label>
        <div className="relative mt-2">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700">
            <UserIcon />
          </span>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="name@msunaawan.example"
            autoComplete="username"
            className="h-14 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        <label htmlFor="password" className="mt-5 block font-medium">
          Password
        </label>
        <div className="relative mt-2">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700">
            <LockIcon />
          </span>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            className="h-14 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-12 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700"
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="h-5 w-5 rounded border-slate-400 accent-indigo-700"
            />
            Remember me
          </label>
          <button type="button" className="text-indigo-900 underline">
            Forgot password?
          </button>
        </div>

        {error && (
          <p className="mt-5 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button type="submit" className={`${yellowButton} mt-6`}>
          Sign in
        </button>
      </form>
    </Layout>
  )
}

export default App