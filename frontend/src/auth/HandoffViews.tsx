import { useEffect } from 'react'
import { Alert, Button, Icon, StatusBadge } from '../MsuPayroll'
import { ViewHeader } from './AuthShell'
import { initials, roleHome, type MockUser, type Role } from './mockData'

export function WorkspaceSelector({ user, onPick, onSignOut }: { user: MockUser; onPick: (r: Role) => void; onSignOut: () => void }) {
  return (
    <>
      <ViewHeader title={`Welcome, ${user.name.split(' ')[0]}`} subtitle="Your account has more than one role. Choose where to work now. You can switch later." />
      <ul className="grid gap-3 mb-5">
        {user.roles.map((r) => (
          <li key={r}>
            <button
              type="button"
              onClick={() => onPick(r)}
              className="w-full text-left flex items-center gap-4 rounded-control border border-border-strong p-4 hover:border-primary hover:bg-info-soft cursor-pointer"
            >
              <span className="size-11 rounded-xl bg-primary text-on-primary grid place-items-center"><Icon name="building" /></span>
              <span className="flex-1">
                <span className="block font-semibold">{r}</span>
                <span className="block text-xs text-text-muted">Opens {roleHome[r]}</span>
              </span>
              <Icon name="arrowRight" className="text-primary" />
            </button>
          </li>
        ))}
      </ul>
      <Button variant="link" onClick={onSignOut}>Not you? Sign out</Button>
    </>
  )
}

export function DashboardHandoff({ user, role, onSignOut, onSwitch }: { user: MockUser; role: Role; onSignOut: () => void; onSwitch?: () => void }) {
  useEffect(() => {
    document.getElementById('view-title')?.focus()
  }, [])
  return (
    <>
      <ViewHeader title="You’re signed in" subtitle="This is where the prototype hands off to the role dashboard." />
      <div className="flex items-center gap-3 rounded-control bg-info-soft p-3 mb-4">
        <div className="size-11 rounded-full bg-primary text-on-primary grid place-items-center text-sm font-semibold">{initials(user.name)}</div>
        <div className="text-sm min-w-0">
          <p className="font-semibold">{user.name}</p>
          <p className="text-text-muted truncate">{user.office}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
        <StatusBadge tone="success" icon="shield">Signed in</StatusBadge>
        <span className="text-text-muted">as</span>
        <strong>{role}</strong>
      </div>
      <Alert tone="info" title={`Next: ${roleHome[role]}`}>
        The dashboard is outside this authentication flow. Navigation shown there depends on your role.
      </Alert>
      <div className="grid gap-3 mt-5">
        {onSwitch && <Button variant="secondary" fullWidth onClick={onSwitch}>Switch workspace</Button>}
        <Button variant="link" onClick={onSignOut}>Sign out</Button>
      </div>
    </>
  )
}
