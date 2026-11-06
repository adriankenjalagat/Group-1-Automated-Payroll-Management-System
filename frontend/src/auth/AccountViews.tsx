import { useState, type FormEvent } from 'react'
import { Button, PasswordField, PasswordRules, StatusMark, passwordRules } from '../MsuPayroll'
import { ViewHeader } from './AuthShell'
import { users } from './mockData'

function PasswordSetForm({ cta, onDone }: { cta: string; onDone: () => void }) {
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [touched, setTouched] = useState(false)
  const [loading, setLoading] = useState(false)
  const rulesOk = passwordRules.every((r) => r.test(pw))
  const matches = pw === confirm

  async function submit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (!rulesOk || !matches || !confirm) return
    setLoading(true)
    await new Promise((r) => setTimeout(r, 900))
    onDone()
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <PasswordField label="New password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
      <PasswordRules value={pw} />
      <PasswordField
        label="Confirm password"
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        error={touched && !matches ? 'Passwords do not match.' : touched && !confirm ? 'Confirm your password.' : undefined}
      />
      {touched && !rulesOk && <p role="alert" className="text-xs text-danger font-medium">Your password does not meet all requirements yet.</p>}
      <Button type="submit" fullWidth loading={loading}>{loading ? 'Saving…' : cta}</Button>
    </form>
  )
}

export function ActivateAccount({ onDone }: { onDone: () => void }) {
  const u = users.find((x) => x.username === 'preyes') ?? users[0]
  return (
    <>
      <ViewHeader title={`Welcome, ${u.name.split(' ')[0]}`} subtitle="An administrator created your account. Set a password to activate it." />
      <dl className="rounded-control bg-info-soft p-4 mb-5 grid gap-2.5 text-sm">
        <div>
          <dt className="text-xs text-text-muted">Your username</dt>
          <dd className="font-semibold break-all">{u.username}</dd>
        </div>
        <div>
          <dt className="text-xs text-text-muted">Institutional email</dt>
          <dd className="break-all">{u.email}</dd>
        </div>
        <div>
          <dt className="text-xs text-text-muted">Assigned role</dt>
          <dd>{u.roles.join(', ')}</dd>
        </div>
      </dl>
      <PasswordSetForm cta="Activate account" onDone={onDone} />
      <p className="mt-4 text-xs text-text-muted text-pretty">Your role was set by an administrator and cannot be changed here. You will sign in with your username and this password.</p>
    </>
  )
}

export function SetNewPassword({ onDone }: { onDone: () => void }) {
  return (
    <>
      <ViewHeader title="Set a new password" subtitle="Choose a password you have not used on this system before." />
      <PasswordSetForm cta="Save new password" onDone={onDone} />
    </>
  )
}

function Unavailable({ title, text, onPrimary, primary, onAdmin }: { title: string; text: string; onPrimary: () => void; primary: string; onAdmin?: () => void }) {
  return (
    <>
      <ViewHeader icon={<StatusMark tone="warning" icon="clock" />} title={title} subtitle={text} />
      <div className="grid gap-3">
        <Button fullWidth onClick={onPrimary}>{primary}</Button>
        {onAdmin && <Button variant="link" onClick={onAdmin}>Ask an administrator for help</Button>}
      </div>
    </>
  )
}

export function ActivationUnavailable({ kind = 'expired', onAdmin, onBack }: { kind?: 'expired' | 'invalid'; onAdmin: () => void; onBack: () => void }) {
  return (
    <Unavailable
      title={kind === 'expired' ? 'Invitation expired' : 'Activation link not valid'}
      text={kind === 'expired'
        ? 'This invitation has expired. Ask a System Administrator to resend it. The new link replaces this one.'
        : 'This link is not valid or was already used. Check that you opened the full link from your invitation email, or ask a System Administrator to resend it.'}
      primary="Back to sign in"
      onPrimary={onBack}
      onAdmin={onAdmin}
    />
  )
}

export function ResetUnavailable({ onRequest, onAdmin }: { onRequest: () => void; onAdmin: () => void }) {
  return (
    <Unavailable
      title="Reset link unavailable"
      text="This password reset link has expired or was already used. Request a new one to continue."
      primary="Request a new link"
      onPrimary={onRequest}
      onAdmin={onAdmin}
    />
  )
}

export function Success({ title, text, cta, onNext }: { title: string; text: string; cta: string; onNext: () => void }) {
  return (
    <>
      <ViewHeader icon={<StatusMark tone="success" icon="check" />} title={title} subtitle={text} />
      <Button fullWidth onClick={onNext}>{cta}</Button>
    </>
  )
}
