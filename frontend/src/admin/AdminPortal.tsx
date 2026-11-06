import clsx from 'clsx'
import { useCallback, useEffect, useRef, useState } from 'react'
import logo from '../assets/logo.png'
import { Icon, type IconName } from '../MsuPayroll'
import type { MockUser } from '../auth/mockData'
import { Dashboard } from './Dashboard'
import {
  UserManagement,
  initialDirectory,
  type DirectoryUser,
  type UserPreset,
} from './UserManagement'
import { PayrollConfiguration } from './PayrollConfiguration'
import { AuditLogs } from './AuditLogs'
import { MyAccount, profileFor } from '../account/MyAccount'
import { seedActivity, seedNotifications, seedUsers, formatDateTime, type Activity, type AdminUser } from './data'
import { Avatar, Toasts, usePopover, type ToastItem } from './ui'

export type Page = 'dashboard' | 'users' | 'payroll' | 'audit' | 'account'

const nav: { page: Page; label: string; icon: IconName; soon?: boolean }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { page: 'users', label: 'User Management', icon: 'users' },
  { page: 'payroll', label: 'Payroll Configuration', icon: 'sliders' },
  { page: 'audit', label: 'Audit Logs', icon: 'clipboard' },
  { page: 'account', label: 'My Account', icon: 'user' },
]

const titles: Record<Page, string> = {
  dashboard: 'System Overview', users: 'User Management', payroll: 'Payroll Configuration', audit: 'Audit Logs', account: 'My Account',
}

function useTheme() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('msu-theme')
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  useEffect(() => { localStorage.setItem('msu-theme', dark ? 'dark' : 'light') }, [dark])
  return [dark, setDark] as const
}

function SidebarNav({ page, onGo, onSignOut }: { page: Page; onGo: (p: Page) => void; onSignOut: () => void }) {
  return (
    <nav aria-label="Administrator" className="grid gap-1">
      {nav.map((n) => {
        const active = n.page === page
        return (
          <button
            key={n.page}
            type="button"
            onClick={() => onGo(n.page)}
            aria-current={active ? 'page' : undefined}
            className={clsx(
              'flex items-center gap-3 min-h-11 py-1.5 rounded-control text-sm cursor-pointer transition-colors px-3',
              active ? 'bg-accent text-on-accent font-semibold' : 'text-text-muted hover:bg-info-soft hover:text-text font-medium',
            )}
          >
            <Icon name={n.icon} size={20} className="shrink-0" />
            <span className="flex-1 text-left">{n.label}</span>
            {n.soon && <span className={clsx('shrink-0 rounded-full border border-dashed px-2 py-0.5 text-xs font-medium', active ? 'border-on-accent/50 text-on-accent' : 'border-border-strong text-text-muted')}>Placeholder</span>}
          </button>
        )
      })}
      <button type="button" onClick={onSignOut} className="mt-2 flex items-center gap-3 min-h-11 py-1.5 px-3 rounded-control text-sm font-medium text-text-muted hover:bg-info-soft hover:text-text cursor-pointer transition-colors">
        <Icon name="logout" size={20} className="shrink-0" />
        <span className="flex-1 text-left">Sign Out</span>
      </button>
    </nav>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-3 h-16 pl-5 pr-2 shrink-0">
      <img src={logo} alt="Mindanao State University at Naawan seal" className="size-9 shrink-0" />
      <div className="min-w-0 leading-tight">
        <p className="font-semibold">MSU–Naawan</p>
        <p className="text-xs text-text-muted">Administrator portal</p>
      </div>
    </div>
  )
}

function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  const layer = 'absolute inset-0 grid place-items-center transition-[opacity,filter,scale] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none'
  const on = 'scale-100 opacity-100 blur-0'
  const off = 'scale-[0.25] opacity-0 blur-[4px]'
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={dark}
      aria-label="Dark mode"
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="relative size-10 rounded-control text-text-muted hover:text-text hover:bg-info-soft cursor-pointer"
    >
      <span className={clsx(layer, dark ? off : on)}><Icon name="sun" size={19} /></span>
      <span className={clsx(layer, dark ? on : off)}><Icon name="moon" size={19} /></span>
    </button>
  )
}

function Notifications() {
  const { open, setOpen, ref } = usePopover()
  const [items, setItems] = useState(seedNotifications)
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        data-trigger
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={items.length ? `Notifications, ${items.length} unread` : 'Notifications'}
        className="relative size-10 grid place-items-center rounded-control text-text-muted hover:text-text hover:bg-info-soft cursor-pointer"
      >
        <Icon name="bell" size={19} />
        {items.length > 0 && (
          <span aria-hidden="true" className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-accent text-on-accent text-[0.625rem] font-bold grid place-items-center tabular-nums">{items.length}</span>
        )}
      </button>
      {open && (
        <div className="elevate absolute right-0 mt-2 w-[22rem] max-w-[calc(100vw-1.5rem)] rounded-card bg-surface p-4 z-30">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Notifications</h2>
            {items.length > 0 && (
              <button type="button" onClick={() => setItems([])} className="text-xs font-medium text-primary underline underline-offset-4 cursor-pointer">Mark all as read</button>
            )}
          </div>
          {items.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm font-medium">You are all caught up</p>
              <p className="text-xs text-text-muted mt-1">Account alerts, such as locked or unactivated accounts, appear here.</p>
            </div>
          ) : (
            <ul className="grid gap-3">
              {items.map((n) => (
                <li key={n.id} className="text-sm">
                  <p className="font-medium">{n.title}</p>
                  <p className="text-xs text-text-muted">{n.text}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function AccountMenu({ user, onGo, onSignOut }: { user: MockUser; onGo: (p: Page) => void; onSignOut: () => void }) {
  const { open, setOpen, ref } = usePopover()
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        data-trigger
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={`Account menu for ${user.name}`}
        className="flex items-center gap-2 h-10 pl-1 pr-2 rounded-control hover:bg-info-soft cursor-pointer"
      >
        <Avatar name={user.name} />
        <span className="hidden md:block text-sm font-medium max-w-40 truncate">{user.name}</span>
        <Icon name="chevronDown" size={16} className="text-text-muted" />
      </button>
      {open && (
        <div className="elevate absolute right-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)] rounded-card bg-surface p-2 z-30">
          <div className="px-3 py-2.5">
            <p className="text-sm font-semibold">{user.name}</p>
            <p className="text-xs text-text-muted break-all">{user.email}</p>
            <p className="text-xs text-text-muted mt-1">System Administrator</p>
          </div>
          <div className="border-t border-border my-1" />
          <button type="button" onClick={() => { setOpen(false); onGo('account') }} className="w-full flex items-center gap-3 h-10 px-3 rounded-control text-sm hover:bg-info-soft cursor-pointer">
            <Icon name="user" size={17} /> My account
          </button>
          <button type="button" onClick={onSignOut} className="w-full flex items-center gap-3 h-10 px-3 rounded-control text-sm hover:bg-info-soft cursor-pointer">
            <Icon name="logout" size={17} /> Sign out
          </button>
        </div>
      )}
    </div>
  )
}

export function AdminPortal({ user, onSignOut }: { user: MockUser; onSignOut: () => void }) {
  const [dark, setDark] = useTheme()
  const [page, setPage] = useState<Page>('dashboard')
  const [drawer, setDrawer] = useState(() => window.innerWidth >= 1024)
  const [users, setUsers] = useState<AdminUser[]>(seedUsers)
  const [directoryUsers, setDirectoryUsers] = useState<DirectoryUser[]>(initialDirectory)
  const [activity, setActivity] = useState<Activity[]>(seedActivity)
  const [preset, setPreset] = useState<UserPreset>({})
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const first = useRef(true)
  const toastId = useRef(0)

  useEffect(() => {
    if (first.current) { first.current = false; return }
    document.getElementById('page-title')?.focus()
  }, [page])

  useEffect(() => {
    if (!drawer) return
    const key = (e: KeyboardEvent) => e.key === 'Escape' && window.innerWidth < 1024 && setDrawer(false)
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [drawer])

  const go = (p: Page, next: UserPreset = {}) => {
    setPreset(next)
    setPage(p)
    if (window.innerWidth < 1024) setDrawer(false)
  }

  const record = useCallback((action: string, target: string, toast: string) => {
    setActivity((a) => [{ id: `s${Date.now()}`, actor: user.name, action, target, at: new Date().toISOString(), simulated: true }, ...a])
    setToasts((t) => [...t, { id: ++toastId.current, text: toast }])
  }, [user.name])

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  return (
    <div className={dark ? 'dark' : undefined}>
      <div className="min-h-dvh bg-canvas text-text flex">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:z-[70] focus:top-3 focus:left-3 focus:rounded-control focus:bg-accent focus:text-on-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold">
          Skip to main content
        </a>

        {drawer && (
          <div className="fixed inset-0 z-40 lg:static lg:inset-auto lg:z-auto lg:shrink-0">
            <div className="absolute inset-0 bg-deep/30 lg:hidden" onClick={() => setDrawer(false)} aria-hidden="true" />
            <aside aria-label="Menu" className="absolute inset-y-0 left-0 w-80 max-w-[88vw] bg-surface flex flex-col pt-[env(safe-area-inset-top)] elevate overflow-x-hidden lg:sticky lg:top-0 lg:h-dvh lg:w-72 lg:max-w-none lg:border-r lg:border-border">
              <div className="border-b border-border">
                <Brand />
              </div>
              <div className="px-4 py-4 overflow-y-auto"><SidebarNav page={page} onGo={(p) => go(p)} onSignOut={onSignOut} /></div>
              <p className="mt-auto px-5 py-4 border-t border-border text-xs text-text-muted">Prototype with fictional data</p>
            </aside>
          </div>
        )}

        <div className="flex-1 min-w-0 flex flex-col">
          <header className="sticky top-0 z-20 bg-surface/90 backdrop-blur border-b border-border pt-[env(safe-area-inset-top)]">
            <div className="h-16 px-3 sm:px-6 flex items-center gap-2">
              <button type="button" onClick={() => setDrawer((d) => !d)} aria-label={drawer ? 'Hide menu' : 'Show menu'} aria-expanded={drawer} className="size-10 grid place-items-center rounded-control text-text-muted hover:text-text hover:bg-info-soft cursor-pointer">
                <Icon name="menu" size={20} />
              </button>
              <h1 id="page-title" tabIndex={-1} className="flex-1 min-w-0 text-lg sm:text-xl font-semibold truncate">{titles[page]}</h1>
              <ThemeToggle dark={dark} onToggle={() => setDark((d) => !d)} />
              <Notifications />
              <AccountMenu user={user} onGo={go} onSignOut={onSignOut} />
            </div>
          </header>

          <main id="main" className="flex-1 px-3 sm:px-6 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto max-w-6xl grid gap-6">
              <p className="text-xs text-text-muted">Prototype with fictional data. Nothing is saved or sent.</p>
              {page === 'dashboard' && <Dashboard users={users} activity={activity} onGo={go} />}
              {page === 'users' && (
                <UserManagement
                  key={JSON.stringify(preset)}
                  me={user.username}
                  directory={directoryUsers}
                  setDirectory={setDirectoryUsers}
                  record={record}
                  preset={preset}
                />
              )}
              {page === 'payroll' && (
                <PayrollConfiguration record={record} />
              )}
              {page === 'audit' && (
                <AuditLogs activity={activity} />
              )}
              {page === 'account' && <MyAccount profile={profileFor(user, 'System Administrator')} lastSignIn={formatDateTime('2026-10-26T08:12:00')} onAudit={record} />}
            </div>
          </main>
        </div>
      </div>
      <Toasts items={toasts} onDismiss={dismiss} />
    </div>
  )
}
