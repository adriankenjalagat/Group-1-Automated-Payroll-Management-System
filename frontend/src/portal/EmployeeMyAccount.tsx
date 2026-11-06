import { useState, type FormEvent, type ReactNode } from 'react'
import { Alert, Button, PasswordField, PasswordRules, StatusBadge, passwordRules } from '../MsuPayroll'
import type { MockUser } from '../auth/mockData'
import { seedUsers, statusLabel, type AccountStatus } from '../admin/data'
import { Modal } from '../admin/ui'
import { currentAssignment, payrollConfig, type HrEmployee } from './hr/hrData'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const NOT_LINKED = 'Not available. No HR employee record is linked to your account.'

function Section({ id, title, intro, children }: { id: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="py-6 first:pt-0 last:pb-0">
      <h2 id={id} className="text-lg font-semibold">{title}</h2>
      {intro && <p className="mt-1 text-sm text-text-muted text-pretty">{intro}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}

/** A read-only value. Missing values render a neutral message, never an invented value. */
function Item({ label, value, empty }: { label: string; value?: ReactNode; empty: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-text-muted">{label}</dt>
      <dd className="mt-1 text-base sm:text-sm break-words">
        {value ? value : <span className="text-text-muted">{empty}</span>}
      </dd>
    </div>
  )
}

const grid = 'grid gap-x-8 gap-y-5 sm:grid-cols-2'

function ChangePassword() {
  const [f, setF] = useState({ cur: '', next: '', confirm: '' })
  const [errors, setErrors] = useState<Partial<typeof f>>({})
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const set = (k: keyof typeof f) => (v: string) => { setDone(false); setF((s) => ({ ...s, [k]: v })) }

  function validate(e: FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!f.cur) next.cur = 'Enter your current password.'
    if (!f.next) next.next = 'Enter a new password.'
    else if (!passwordRules.every((r) => r.test(f.next))) next.next = 'Your new password does not meet all requirements yet.'
    else if (f.next === f.cur) next.next = 'Choose a password different from your current one.'
    if (!f.confirm) next.confirm = 'Confirm your new password.'
    else if (f.confirm !== f.next) next.confirm = 'Passwords do not match.'
    setErrors(next)
    setDone(false)
    if (Object.keys(next).length === 0) setConfirming(true)
  }

  // Prototype only: nothing is checked, sent, or stored. Typed values are cleared as soon as the demo completes.
  async function apply() {
    setSaving(true)
    await wait(800)
    setSaving(false)
    setConfirming(false)
    setF({ cur: '', next: '', confirm: '' })
    setErrors({})
    setDone(true)
  }

  return (
    <>
      <form onSubmit={validate} noValidate className="grid gap-4 max-w-md">
        {done && (
          <Alert tone="success" title="Password changed (demonstration)">
            This is an interface demonstration. No password was checked, sent, or saved.
          </Alert>
        )}
        <PasswordField label="Current password" autoComplete="current-password" value={f.cur} onChange={(e) => set('cur')(e.target.value)} error={errors.cur} />
        <PasswordField label="New password" autoComplete="new-password" value={f.next} onChange={(e) => set('next')(e.target.value)} error={errors.next} />
        <PasswordRules value={f.next} />
        <PasswordField label="Confirm new password" autoComplete="new-password" value={f.confirm} onChange={(e) => set('confirm')(e.target.value)} error={errors.confirm} />
        <div><Button type="submit" className="h-11! px-5!">Change password</Button></div>
      </form>

      {confirming && (
        <Modal title="Change your password?" onClose={() => { if (!saving) setConfirming(false) }}>
          <p className="text-sm text-text-muted text-pretty">
            In the live system, you would use the new password the next time you sign in. This prototype does not change any password.
          </p>
          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <Button type="button" variant="secondary" disabled={saving} onClick={() => setConfirming(false)} className="h-11! px-5!">Cancel</Button>
            <Button type="button" loading={saving} onClick={apply} className="h-11! px-5!">{saving ? 'Confirming…' : 'Confirm change'}</Button>
          </div>
        </Modal>
      )}
    </>
  )
}

export function EmployeeMyAccount({ user, employee }: { user: MockUser; employee: HrEmployee | null }) {
  // Account details come from the shared Administrator user records when the username is listed there.
  const account = seedUsers.find((s) => s.username === user.username)
  const status: AccountStatus = account?.status ?? user.status
  const email = account?.email ?? user.email
  const payrollType = employee ? payrollConfig(currentAssignment(employee)?.payrollTypeId)?.name : undefined

  return (
    <div className="elevate rounded-card bg-surface p-5 sm:p-8 divide-y divide-border">
      <Section id="acct-personal" title="Personal Information">
        {!employee && (
          <div className="mb-5">
            <Alert tone="warning" title="No employee record is linked to your account">
              Personal and employment details come from the HR Office. Contact the HR Office to link your record.
            </Alert>
          </div>
        )}
        <dl className={grid}>
          <Item label="Full Name" value={employee?.name} empty={NOT_LINKED} />
          <Item label="Employee ID" value={employee?.employeeId} empty={NOT_LINKED} />
          <Item label="Employee Classification" value={employee?.classification} empty={NOT_LINKED} />
        </dl>
      </Section>

      <Section id="acct-employment" title="Employment Information" intro="Maintained by the HR Office. You cannot edit these details.">
        <dl className={grid}>
          <Item label="Employment Type" value={employee?.employmentType} empty={employee ? 'Not yet recorded by HR.' : NOT_LINKED} />
          <Item label="Assigned Payroll Type" value={payrollType} empty={employee ? 'Not yet assigned by HR.' : NOT_LINKED} />
          <Item label="Cost Center / Office" value={employee?.office} empty={employee ? 'Not yet assigned by HR.' : NOT_LINKED} />
          <Item label="Immediate Supervisor" value={employee?.supervisor} empty={employee ? 'No Immediate Supervisor is recorded in your HR record.' : NOT_LINKED} />
        </dl>
        <div className="mt-5">
          <Alert tone="info" title="Something look incorrect?">
            To update your employment or payroll information, please contact the HR Office.
          </Alert>
        </div>
      </Section>

      <Section id="acct-account" title="Account Information" intro="Roles and account status are managed by a System Administrator.">
        <dl className={grid}>
          <Item label="Username" value={user.username} empty="Not available." />
          <Item label="Institutional Email" value={email} empty="No institutional email is on file." />
          <Item label="System Role" value={user.roles.join(', ')} empty="No role assigned." />
          <Item
            label="Account Status"
            empty="Not available."
            value={<StatusBadge tone={status === 'active' ? 'success' : status === 'pending' ? 'info' : 'warning'} icon={status === 'active' ? 'check' : 'info'}>{statusLabel[status]}</StatusBadge>}
          />
        </dl>
      </Section>

      <Section id="acct-security" title="Security" intro="Change the password you use to sign in. Nobody, including administrators, can see it.">
        <h3 className="text-sm font-semibold mb-4">Change Password</h3>
        <ChangePassword />
      </Section>
    </div>
  )
}
