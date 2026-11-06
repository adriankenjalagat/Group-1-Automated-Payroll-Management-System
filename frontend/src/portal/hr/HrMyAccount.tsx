import { useState, type FormEvent, type ReactNode } from 'react'
import { Alert, Button, PasswordField, PasswordRules, StatusBadge, passwordRules } from '../../MsuPayroll'
import type { MockUser } from '../../auth/mockData'
import { seedUsers, statusLabel, type AccountStatus } from '../../admin/data'
import { Modal } from '../../admin/ui'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

function Section({ id, title, intro, children }: { id: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="py-6 first:pt-0 last:pb-0">
      <h2 id={id} className="text-lg font-semibold">{title}</h2>
      {intro && <p className="mt-1 text-sm text-text-muted text-pretty">{intro}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}

function Item({ label, value, empty }: { label: string; value?: ReactNode; empty: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-text-muted">{label}</dt>
      <dd className="mt-1 text-base sm:text-sm break-words">{value ? value : <span className="text-text-muted">{empty}</span>}</dd>
    </div>
  )
}

/** Change Password dialog. Interface demonstration only: nothing is checked, sent, or stored. */
function PasswordDialog({ onClose }: { onClose: () => void }) {
  const [f, setF] = useState({ cur: '', next: '', confirm: '' })
  const [errors, setErrors] = useState<Partial<typeof f>>({})
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (saving) return
    const next: typeof errors = {}
    if (!f.cur) next.cur = 'Enter your current password.'
    if (!f.next) next.next = 'Enter a new password.'
    else if (!passwordRules.every((r) => r.test(f.next))) next.next = 'Your new password does not meet all requirements yet.'
    else if (f.next === f.cur) next.next = 'Choose a password different from your current one.'
    if (!f.confirm) next.confirm = 'Confirm your new password.'
    else if (f.confirm !== f.next) next.confirm = 'Passwords do not match.'
    setErrors(next)
    if (Object.keys(next).length) return
    setSaving(true)
    await wait(800)
    setSaving(false)
    setF({ cur: '', next: '', confirm: '' })
    setDone(true)
  }

  return (
    <Modal title={done ? 'Password change demonstrated' : 'Change Password'} onClose={() => { if (!saving) onClose() }}>
      {done ? (
        <>
          <Alert tone="success" title="Demonstration complete">
            The form was validated, but no password was changed, checked, sent, or stored. Production password management requires backend authentication.
          </Alert>
          <div className="mt-6 flex justify-end"><Button type="button" onClick={onClose} className="h-11! px-5!">Close</Button></div>
        </>
      ) : (
        <form onSubmit={submit} noValidate className="grid gap-4">
          <p className="-mt-2 text-sm text-text-muted text-pretty">Interface demonstration only. No real credential is processed.</p>
          <PasswordField label="Current password" autoComplete="current-password" value={f.cur} onChange={(e) => set('cur')(e.target.value)} error={errors.cur} />
          <PasswordField label="New password" autoComplete="new-password" value={f.next} onChange={(e) => set('next')(e.target.value)} error={errors.next} />
          <PasswordRules value={f.next} />
          <PasswordField label="Confirm new password" autoComplete="new-password" value={f.confirm} onChange={(e) => set('confirm')(e.target.value)} error={errors.confirm} />
          <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving} className="h-11! px-5!">Cancel</Button>
            <Button type="submit" loading={saving} className="h-11! px-5!">{saving ? 'Changing…' : 'Change Password'}</Button>
          </div>
        </form>
      )}
    </Modal>
  )
}

export function HrMyAccount({ user }: { user: MockUser }) {
  const [dialog, setDialog] = useState(false)
  // Account details come from the shared Administrator user records when the username is listed there.
  const account = seedUsers.find((s) => s.username === user.username)
  const status: AccountStatus = account?.status ?? user.status
  const email = account?.email ?? user.email

  return (
    <div className="elevate rounded-card bg-surface p-5 sm:p-8 divide-y divide-border">
      <Section id="hr-acct-personal" title="Personal Information">
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <Item label="Full Name" value={user.name} empty="Not available." />
          <Item label="Institutional Email" value={email} empty="No institutional email is on file." />
        </dl>
      </Section>
      <Section id="hr-acct-account" title="Account Information" intro="Your role and account status are managed by a System Administrator.">
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <Item label="Username" value={user.username} empty="Not available." />
          <Item label="System Role" value="HR Office" empty="No role assigned." />
          <Item
            label="Account Status"
            empty="Not available."
            value={<StatusBadge tone={status === 'active' ? 'success' : status === 'pending' ? 'info' : 'warning'} icon={status === 'active' ? 'check' : 'info'}>{statusLabel[status]}</StatusBadge>}
          />
        </dl>
      </Section>
      <Section id="hr-acct-security" title="Security" intro="Nobody, including administrators, can see your password.">
        <Button type="button" onClick={() => setDialog(true)} className="h-11! px-5!">Change Password</Button>
        <p className="mt-3 text-xs text-text-muted">Use the account menu in the header to sign out.</p>
      </Section>
      {dialog && <PasswordDialog onClose={() => setDialog(false)} />}
    </div>
  )
}
