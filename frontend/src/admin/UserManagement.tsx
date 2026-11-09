import clsx from 'clsx'
import { useMemo, useState, type FormEvent } from 'react'
import { apiClient } from '../api/client'
import { Alert, Button, Icon, TextField } from '../MsuPayroll'
import type { Role } from '../auth/mockData'
import type { AccountStatus } from './data'
import { Avatar, Modal, SelectField, Tag } from './ui'

export type UserPreset = { status?: AccountStatus | 'attention'; role?: Role }
type RecordFn = (action: string, target: string, toast: string) => void

const SYSTEM_ROLES = [
  'Employee',
  'Immediate Supervisor',
  'HR Office',
  'Accounting Section',
  'Accountant',
  'Cost Center Signatory',
  'Budget Office',
  'Office of the Chancellor',
  'Cashier',
  'Administrator',
] as const

type SystemRole = (typeof SYSTEM_ROLES)[number]
type Classification = 'Faculty' | 'Staff'
type DirectoryStatus = 'Active' | 'Deactivated'
type DataState = 'loaded' | 'empty' | 'error'

type EmployeeRecord = {
  employeeId: string
  name: string
  classification: Classification
  employmentType: string
  payrollType: string
  office: string
  supervisor?: string
}

export type DirectoryUser = {
  userId: string
  name: string
  username: string
  role: SystemRole
  status: DirectoryStatus
  employeeId: string | null
  simulated?: boolean
}

const employeeRecords: EmployeeRecord[] = [
  {
    employeeId: 'EMP-001',
    name: 'Alex Rivera',
    classification: 'Staff',
    employmentType: 'Permanent',
    payrollType: 'Payroll for Permanent Staff Employees',
    office: 'Campus Administrative Services (fictional)',
    supervisor: 'Jordan Reyes',
  },
  {
    employeeId: 'EMP-002',
    name: 'Mika Flores',
    classification: 'Faculty',
    employmentType: 'Permanent',
    payrollType: 'Payroll for Permanent Faculty Employees',
    office: 'Academic Unit A (fictional)',
    supervisor: 'Jordan Reyes',
  },
  {
    employeeId: 'EMP-003',
    name: 'Jordan Reyes',
    classification: 'Staff',
    employmentType: 'Permanent',
    payrollType: 'Payroll for Permanent Staff Employees',
    office: 'Academic Support Office (fictional)',
  },
  {
    employeeId: 'EMP-004',
    name: 'Casey Lim',
    classification: 'Faculty',
    employmentType: 'Contractual',
    payrollType: 'Payroll for Contractual Faculty Employees',
    office: 'Academic Unit B (fictional)',
    supervisor: 'Jordan Reyes',
  },
  {
    employeeId: 'EMP-005',
    name: 'Taylor Cruz',
    classification: 'Staff',
    employmentType: 'Job Order',
    payrollType: 'Payroll for Job Order Staff Employees',
    office: 'Campus Services Unit (fictional)',
  },
]

export const initialDirectory: DirectoryUser[] = [
  { userId: 'DEMO-U001', name: 'Ramon Bautista', username: 'rbautista', role: 'Administrator', status: 'Active', employeeId: null },
  { userId: 'DEMO-U002', name: 'Alex Rivera', username: 'alex.employee.archive', role: 'Employee', status: 'Deactivated', employeeId: 'EMP-001' },
  { userId: 'DEMO-U003', name: 'Mika Flores', username: 'mflores', role: 'Employee', status: 'Active', employeeId: 'EMP-002' },
  { userId: 'DEMO-U004', name: 'Jordan Reyes', username: 'supervisor.demo', role: 'Immediate Supervisor', status: 'Deactivated', employeeId: 'EMP-003' },
  { userId: 'DEMO-SUP-001', name: 'Alex Rivera', username: 'arivera', role: 'Immediate Supervisor', status: 'Active', employeeId: null },
  { userId: 'DEMO-U005', name: 'Nina Santos', username: 'nsantos', role: 'HR Office', status: 'Active', employeeId: null },
  { userId: 'DEMO-U006', name: 'Owen Garcia', username: 'ogarcia', role: 'Accounting Section', status: 'Active', employeeId: null },
  { userId: 'DEMO-U007', name: 'Priya Mendoza', username: 'pmendoza', role: 'Accountant', status: 'Active', employeeId: null },
  { userId: 'DEMO-U008', name: 'Quinn Navarro', username: 'qnavarro', role: 'Cost Center Signatory', status: 'Active', employeeId: null },
  { userId: 'DEMO-U009', name: 'Riley Torres', username: 'rtorres', role: 'Budget Office', status: 'Active', employeeId: null },
  { userId: 'DEMO-U010', name: 'Sam Villanueva', username: 'svillanueva', role: 'Office of the Chancellor', status: 'Active', employeeId: null },
  { userId: 'DEMO-U011', name: 'Toni Aquino', username: 'taquino', role: 'Cashier', status: 'Deactivated', employeeId: null },
]

const roleDescriptions: Record<SystemRole, string> = {
  Employee: 'Access to their own records, attachments, and payslips.',
  'Immediate Supervisor': 'Access to submissions for employees under their supervision.',
  'HR Office': 'Access for maintaining employee records and verifying payroll requirements.',
  'Accounting Section': 'Access needed for payroll preparation and review.',
  Accountant: 'Disbursement Voucher review and approval.',
  'Cost Center Signatory': 'Payroll and budget documents for the assigned Cost Center.',
  'Budget Office': 'Relevant approved payroll and budget documents.',
  'Office of the Chancellor': 'Disbursement Voucher approval.',
  Cashier: 'Payment documents and release information.',
  Administrator: 'Account management, system configuration, and audit-log viewing.',
}

const presetRole = (role?: Role): SystemRole | '' => {
  if (!role) return ''
  if (role === 'System Administrator') return 'Administrator'
  if (role === 'Accounting') return 'Accounting Section'
  return role
}

function linkedRecord(user: DirectoryUser): EmployeeRecord | undefined {
  if (!user.employeeId) return undefined
  const match = employeeRecords.find((record) => record.employeeId === user.employeeId)
  if (match) return match

  return {
    employeeId: user.employeeId,
    name: user.name,
    classification: (user.role === 'Employee' ? 'Staff' : 'Staff') as Classification,
    employmentType: 'Permanent',
    payrollType: 'Permanent Staff',
    office: 'University Office',
  }
}

function StatusBadge({ status }: { status: DirectoryStatus }) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-2 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold',
      status === 'Active' ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger',
    )}>
      <span className={clsx('size-2 rounded-full', status === 'Active' ? 'bg-success' : 'bg-danger')} aria-hidden="true" />
      {status}
    </span>
  )
}

function DataPoint({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium text-text-muted">{label}</dt>
      <dd className={clsx('mt-1 text-sm font-medium leading-snug', muted && 'text-text-muted')}>{value}</dd>
    </div>
  )
}

function EmployeeInformation({ record }: { record: EmployeeRecord }) {
  return (
    <div className="rounded-control bg-canvas p-4">
      <p className="text-sm font-semibold">Linked Employee Information</p>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <DataPoint label="Employee ID" value={record.employeeId} />
        <DataPoint label="Employee Classification" value={record.classification} />
        <DataPoint label="Employment Type" value={record.employmentType} />
        <DataPoint label="Assigned Payroll Type" value={record.payrollType} />
        <DataPoint label="Cost Center / Office" value={record.office} />
        <DataPoint label="Immediate Supervisor" value={record.supervisor ?? 'Not provided'} muted={!record.supervisor} />
      </dl>
      <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-text-muted">
        Employee and payroll assignment information is maintained by the HR Office and cannot be edited here.
      </p>
    </div>
  )
}

function EmptyEmployeeInformation() {
  return (
    <div className="rounded-control border border-dashed border-border-strong p-4 text-center">
      <Icon name="link" size={22} className="mx-auto text-text-muted" />
      <p className="mt-2 text-sm font-medium">No linked employee record</p>
      <p className="mt-1 text-xs leading-relaxed text-text-muted">
        This account is not linked to an HR-maintained employee or payroll assignment.
      </p>
    </div>
  )
}

function UserDetails({ user, onClose }: { user: DirectoryUser; onClose: () => void }) {
  const employee = linkedRecord(user)
  return (
    <Modal title="User Details" onClose={onClose} wide>
      <div className="flex items-center gap-3">
        <Avatar name={user.name} size="lg" />
        <div>
          <p className="font-semibold">{user.name}</p>
          <p className="text-sm text-text-muted">@{user.username}</p>
        </div>
      </div>
      <section className="mt-5">
        <p role="heading" aria-level={3} className="text-sm font-semibold">Account Information</p>
        <dl className="mt-3 grid gap-4 rounded-control border border-border p-4 sm:grid-cols-2">
          <DataPoint label="User ID" value={user.userId} />
          <DataPoint label="Full Name" value={user.name} />
          <DataPoint label="Username" value={user.username} />
          <DataPoint label="System Role" value={user.role} />
          <div>
            <dt className="text-xs font-medium text-text-muted">Account Status</dt>
            <dd className="mt-1"><StatusBadge status={user.status} /></dd>
          </div>
        </dl>
        <p className="mt-3 rounded-control bg-info-soft px-3 py-2 text-xs leading-relaxed text-text">
          <span className="font-semibold">Access context:</span> {roleDescriptions[user.role]} Production permissions must also be enforced by the backend.
        </p>
      </section>
      <section className="mt-5">
        {employee ? <EmployeeInformation record={employee} /> : <EmptyEmployeeInformation />}
      </section>
      <div className="mt-5 flex justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  )
}

type Draft = {
  firstName: string
  lastName: string
  name: string
  username: string
  role: SystemRole | ''
  employeeId: string
}
type EditorMode = { kind: 'add' } | { kind: 'edit'; userId: string }

function UserEditor({
  mode,
  directory,
  onClose,
  onSave,
}: {
  mode: EditorMode
  directory: DirectoryUser[]
  onClose: () => void
  onSave: (draft: Draft) => void
}) {
  const existing = mode.kind === 'edit' ? directory.find((user) => user.userId === mode.userId) : undefined
  const existingParts = (existing?.name ?? '').trim().split(/\s+/)
  const initialFirst = existingParts.length > 1 ? existingParts.slice(0, -1).join(' ') : existingParts[0] || ''
  const initialLast = existingParts.length > 1 ? existingParts.slice(-1)[0] : ''

  const [draft, setDraft] = useState<Draft>({
    firstName: initialFirst,
    lastName: initialLast,
    name: existing?.name ?? '',
    username: existing?.username ?? '',
    role: existing?.role ?? '',
    employeeId: existing?.employeeId ?? '',
  })
  const [usernameManuallyEdited, setUsernameManuallyEdited] = useState(mode.kind === 'edit')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirmRole, setConfirmRole] = useState(false)
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }))
  
  const toUsername = (first: string, last: string) => {
    const f = first.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
    const l = last.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
    if (f && l) return `${f}.${l}`
    if (f) return f
    if (l) return l
    return ''
  }

  const handleFirstChange = (val: string) => {
    setDraft((cur) => {
      const full = [val.trim(), cur.lastName.trim()].filter(Boolean).join(' ')
      const nextUsername = !usernameManuallyEdited ? toUsername(val, cur.lastName) : cur.username
      return { ...cur, firstName: val, name: full, username: nextUsername }
    })
  }

  const handleLastChange = (val: string) => {
    setDraft((cur) => {
      const full = [cur.firstName.trim(), val.trim()].filter(Boolean).join(' ')
      const nextUsername = !usernameManuallyEdited ? toUsername(cur.firstName, val) : cur.username
      return { ...cur, lastName: val, name: full, username: nextUsername }
    })
  }

  const handleUsernameChange = (val: string) => {
    setUsernameManuallyEdited(true)
    const cleaned = val.replace(/^@/, '').toLowerCase()
    set('username', cleaned)
  }

  const requiresEmployeeLink = draft.role === 'Employee'
  const linked = employeeRecords.find((record) => record.employeeId === draft.employeeId)
  const availableRecords = employeeRecords.filter((record) =>
    record.employeeId === existing?.employeeId ||
    !directory.some((user) => user.employeeId === record.employeeId),
  )

  const validate = () => {
    const next: Record<string, string> = {}
    const cleanUser = draft.username.replace(/^@/, '').trim().toLowerCase()
    if (!draft.firstName.trim()) next.firstName = 'Enter first name.'
    if (!draft.lastName.trim()) next.lastName = 'Enter last name.'
    if (!cleanUser) next.username = 'Enter a username.'
    else if (directory.some((user) =>
      user.userId !== existing?.userId &&
      user.username.toLowerCase() === cleanUser,
    )) next.username = 'This username is already used by another demonstration account.'
    if (!draft.role) next.role = 'Select a system role.'
    if (requiresEmployeeLink && !draft.employeeId) next.employeeId = 'Link an existing HR employee record for this Employee account.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!validate()) return
    if (existing && existing.role !== draft.role && !confirmRole) {
      setConfirmRole(true)
      return
    }
    const cleanUser = draft.username.replace(/^@/, '').trim().toLowerCase()
    const finalDraft = {
      ...draft,
      username: cleanUser,
      name: draft.name.trim() || `${draft.firstName.trim()} ${draft.lastName.trim()}`,
    }
    onSave(finalDraft)
  }

  return (
    <Modal title={mode.kind === 'add' ? 'Add User' : 'Edit User'} onClose={onClose} wide>
      {confirmRole && existing ? (
        <>
          <Alert tone="warning" title="Confirm system role change">
            Change {existing.name}'s permission role from <span className="font-semibold">{existing.role}</span> to <span className="font-semibold">{draft.role}</span>?
            This does not change any HR employment or payroll information.
          </Alert>
          <p className="mt-4 text-xs leading-relaxed text-text-muted">
            Prototype only. Production permission changes require backend authorization enforcement and persistent audit logging.
          </p>
          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setConfirmRole(false)}>Back</Button>
            <Button type="button" onClick={() => onSave(draft)}>Confirm Role Change</Button>
          </div>
        </>
      ) : (
        <form onSubmit={submit} noValidate className="grid gap-4">
          <p className="-mt-2 text-sm leading-relaxed text-text-muted">
            {mode.kind === 'add'
              ? 'Create a system account and assign an access role.'
              : 'Update account fields without changing HR-maintained employee information.'}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="First Name"
              value={draft.firstName}
              onChange={(event) => handleFirstChange(event.target.value)}
              error={errors.firstName}
              autoComplete="off"
              placeholder="e.g. Ramon"
            />
            <TextField
              label="Last Name"
              value={draft.lastName}
              onChange={(event) => handleLastChange(event.target.value)}
              error={errors.lastName}
              autoComplete="off"
              placeholder="e.g. Bautista"
            />
          </div>
          <TextField
            label="Username"
            icon="user"
            value={draft.username}
            onChange={(event) => handleUsernameChange(event.target.value)}
            error={errors.username}
            autoComplete="off"
            autoCapitalize="none"
            placeholder="e.g. firstname.lastname"
            hint={mode.kind === 'add' && !usernameManuallyEdited ? 'Automatically generated from First Name and Last Name' : undefined}
          />
          <SelectField
            label="System Role"
            value={draft.role}
            onChange={(event) => set('role', event.target.value as SystemRole)}
            placeholder="Select a system role"
            error={errors.role}
          >
            {SYSTEM_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
          </SelectField>
          {draft.role && (
            <p className="-mt-2 rounded-control bg-info-soft px-3 py-2 text-xs leading-relaxed text-text">
              <span className="font-semibold">Access context:</span> {roleDescriptions[draft.role]}
            </p>
          )}
          <SelectField
            label={`Linked Employee Record${requiresEmployeeLink ? ' (required)' : ' (optional)'}`}
            value={draft.employeeId}
            onChange={(event) => set('employeeId', event.target.value)}
            placeholder="Not linked"
            error={errors.employeeId}
            hint="Select an existing fictional HR record. Its classification, employment type, and payroll assignment remain read-only."
          >
            {availableRecords.map((record) => (
              <option key={record.employeeId} value={record.employeeId}>{record.employeeId} · {record.name}</option>
            ))}
          </SelectField>
          {availableRecords.length === 0 && requiresEmployeeLink && (
            <Alert tone="warning" title="No linked record available">
              No matching employee record is available. Please coordinate with the HR Office.
            </Alert>
          )}
          {linked ? <EmployeeInformation record={linked} /> : (
            <p className="rounded-control border border-dashed border-border-strong p-3 text-xs leading-relaxed text-text-muted">
              Non-employee administrative roles may remain unlinked. No employee appointment record will be created from this form.
            </p>
          )}
          <Alert tone="info" title="Frontend prototype only">
            Saving changes updates local demonstration state. No university account, credentials, invitation, or backend record is created.
          </Alert>
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit">{mode.kind === 'add' ? 'Create User' : 'Save Changes'}</Button>
          </div>
        </form>
      )}
    </Modal>
  )
}

function ConfirmationDialog({
  kind,
  user,
  onClose,
  onConfirm,
}: {
  kind: 'reset' | 'deactivate'
  user: DirectoryUser
  onClose: () => void
  onConfirm: () => void
}) {
  const reset = kind === 'reset'
  return (
    <Modal title={reset ? 'Reset Password?' : 'Deactivate Account?'} onClose={onClose}>
      <Alert tone={reset ? 'info' : 'warning'} title={reset ? 'Demonstration reset only' : 'Preserve account history'}>
        {reset
          ? `Simulate an administrative password reset for ${user.name}. No password will be generated, shown, stored, or delivered.`
          : `Deactivate ${user.name}'s access without deleting the account or its historical identity.`}
      </Alert>
      <p className="mt-4 text-sm leading-relaxed text-text-muted">
        {reset
          ? 'The future backend must require a new password at the next sign-in and securely handle the reset.'
          : 'The account will remain available for authorized review. This local prototype does not delete records or persistent audit history.'}
      </p>
      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="button" onClick={onConfirm}>{reset ? 'Confirm Demo Reset' : 'Confirm Deactivation'}</Button>
      </div>
    </Modal>
  )
}

function EmptyState({
  title,
  detail,
  action,
}: {
  title: string
  detail: string
  action?: React.ReactNode
}) {
  return (
    <div className="border-t border-border px-5 py-14 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-info-soft text-primary"><Icon name="users" size={24} /></span>
      <p className="mt-4 font-semibold">{title}</p>
      <p className="mt-1 text-sm text-text-muted">{detail}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}

export function UserManagement({
  me,
  directory,
  setDirectory,
  record,
  preset,
  onRefresh,
}: {
  me: string
  directory: DirectoryUser[]
  setDirectory: (update: (users: DirectoryUser[]) => DirectoryUser[]) => void
  record: RecordFn
  preset: UserPreset
  onRefresh?: () => void
}) {
  const [query, setQuery] = useState('')
  const [role, setRole] = useState<SystemRole | ''>(presetRole(preset.role))
  const [classification, setClassification] = useState<Classification | ''>('')
  const [status, setStatus] = useState<DirectoryStatus | ''>(preset.status === 'deactivated' ? 'Deactivated' : '')
  const [dialog, setDialog] = useState<
    | EditorMode
    | { kind: 'view' | 'reset' | 'deactivate'; userId: string }
    | null
  >(null)
  const [notice, setNotice] = useState('')
  const [dataState, setDataState] = useState<DataState>('loaded')

  const visibleUsers = dataState === 'loaded' ? directory : []
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return visibleUsers.filter((user) => {
      const employee = linkedRecord(user)
      if (role) {
        const r1 = user.role.toLowerCase().replace(/system\s*/, '')
        const r2 = role.toLowerCase().replace(/system\s*/, '')
        if (r1 !== r2) return false
      }
      if (classification && employee?.classification !== classification) return false
      if (status && user.status !== status) return false
      return !term || [user.userId, user.name, user.username].some((value) => value.toLowerCase().includes(term))
    })
  }, [visibleUsers, query, role, classification, status])

  const filtering = Boolean(query || role || classification || status)
  const clearFilters = () => {
    setQuery('')
    setRole('')
    setClassification('')
    setStatus('')
  }
  const selected = dialog && 'userId' in dialog ? directory.find((user) => user.userId === dialog.userId) : undefined

  const saveUser = (draft: Draft) => {
    if (dialog?.kind === 'add') {
      const cleanUser = draft.username.replace(/^@/, '').trim().toLowerCase()
      const nextNumber = directory.reduce((max, user) => Math.max(max, Number(user.userId.split('U')[1]) || 0), 0) + 1
      const created: DirectoryUser = {
        userId: `DEMO-U${String(nextNumber).padStart(3, '0')}`,
        name: draft.name.trim(),
        username: cleanUser,
        role: draft.role as SystemRole,
        status: 'Active',
        employeeId: draft.employeeId || null,
        simulated: true,
      }
      setDirectory((current) => [created, ...current])
      setNotice(`User account created. Login credentials: username "${cleanUser}", password "${cleanUser}".`)
      record('Created user account for', created.name, 'User created with credentials')

      // Sync new user to backend PostgreSQL database
      apiClient.post('/users', {
        name: draft.name.trim(),
        username: cleanUser,
        role: draft.role,
        employeeId: draft.employeeId || null,
        password: cleanUser,
      }).then(() => {
        if (onRefresh) onRefresh()
      }).catch((err) => {
        console.warn('Backend user creation notice:', err)
      })
    } else if (dialog?.kind === 'edit') {
      const before = directory.find((user) => user.userId === dialog.userId)
      setDirectory((current) => current.map((user) => user.userId === dialog.userId ? {
        ...user,
        name: draft.name.trim(),
        username: draft.username.trim().toLowerCase(),
        role: draft.role as SystemRole,
        employeeId: draft.employeeId || null,
        simulated: true,
      } : user))
      setNotice('User changes saved locally for demonstration.')
      record(
        before?.role !== draft.role ? 'Changed a local demonstration user role for' : 'Updated a local demonstration account for',
        draft.name.trim(),
        'User changes saved locally',
      )
    }
    setDialog(null)
  }

  const resetPassword = () => {
    if (!selected) return
    setNotice(`Demo password reset recorded locally for ${selected.name}. No password was generated or sent.`)
    record('Simulated a password reset for', selected.name, 'Demo password reset recorded locally')
    setDialog(null)
  }

  const deactivate = () => {
    if (!selected || selected.username === me) return
    setDirectory((current) => current.map((user) =>
      user.userId === selected.userId ? { ...user, status: 'Deactivated', simulated: true } : user,
    ))
    setNotice(`${selected.name}'s account was deactivated locally. No university account was changed.`)
    record('Deactivated a local demonstration account for', selected.name, 'Demo account deactivated locally')
    setDialog(null)
  }

  return (
    <>
      <div className="grid gap-6 font-sans">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p role="heading" aria-level={2} className="text-xl font-semibold leading-tight">User Management</p>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">Manage system user accounts, assigned roles, and access status.</p>
            <div className="mt-2"><Tag kind="placeholder">Frontend prototype · fictional accounts</Tag></div>
          </div>
          <Button type="button" onClick={() => setDialog({ kind: 'add' })} className="w-full sm:w-auto">
            <Icon name="plus" size={17} /> Add User
          </Button>
        </section>

        {notice && (
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1"><Alert tone="success" title="Local demonstration update">{notice}</Alert></div>
            <Button type="button" variant="link" onClick={() => setNotice('')}>Dismiss</Button>
          </div>
        )}

        <section className="overflow-hidden rounded-card bg-surface elevate" aria-labelledby="directory-title">
          <div className="border-b border-border p-5 sm:p-6">
            <p id="directory-title" role="heading" aria-level={3} className="text-lg font-semibold">User Directory</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5 xl:items-end">
              <TextField
                label="Search"
                icon="search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search users..."
                className="sm:col-span-2 xl:col-span-1"
              />
              <SelectField label="System Role" value={role} onChange={(event) => setRole(event.target.value as SystemRole)} placeholder="All roles">
                {SYSTEM_ROLES.map((item) => <option key={item} value={item}>{item}</option>)}
              </SelectField>
              <SelectField
                label="Employee Classification"
                value={classification}
                onChange={(event) => setClassification(event.target.value as Classification)}
                placeholder="All classifications"
              >
                <option value="Faculty">Faculty</option>
                <option value="Staff">Staff</option>
              </SelectField>
              <SelectField label="Account Status" value={status} onChange={(event) => setStatus(event.target.value as DirectoryStatus)} placeholder="All statuses">
                <option value="Active">Active</option>
                <option value="Deactivated">Deactivated</option>
              </SelectField>
              <Button type="button" variant="secondary" onClick={clearFilters} disabled={!filtering} className="w-full">Clear Filters</Button>
            </div>
            <p aria-live="polite" className="mt-3 text-xs text-text-muted">
              Showing {filtered.length} of {visibleUsers.length} accounts
            </p>
          </div>

          {dataState === 'error' ? (
            <EmptyState
              title="Unable to load users"
              detail="Please try again."
              action={<Button type="button" onClick={() => setDataState('loaded')}>Retry</Button>}
            />
          ) : dataState === 'empty' ? (
            <EmptyState title="No users found" detail="No user accounts are available to display." />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No matching users"
              detail="Try adjusting your search or filters."
              action={<Button type="button" variant="secondary" onClick={clearFilters}>Clear Filters</Button>}
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto xl:block">
                <table className="min-w-6xl w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-canvas text-xs text-text-muted">
                      {['User ID', 'Full Name', 'Username', 'System Role', 'Employee Classification', 'Account Status'].map((heading) => (
                        <th key={heading} scope="col" className="px-4 py-3 font-semibold">{heading}</th>
                      ))}
                      <th scope="col" className="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((user) => {
                      const employee = linkedRecord(user)
                      return (
                        <tr key={user.userId} className={clsx('hover:bg-info-soft/30', user.status === 'Deactivated' && 'opacity-60')}>
                          <td className="whitespace-nowrap px-4 py-4 font-semibold">{user.userId}</td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={user.name} />
                              <div>
                                <p className="font-medium">{user.name}{user.username === me && <span className="ml-1 text-xs font-normal text-text-muted">(you)</span>}</p>
                                {user.simulated && <Tag kind="simulated">Local demo</Tag>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">@{user.username}</td>
                          <td className="px-4 py-4">{user.role}</td>
                          <td className="px-4 py-4 text-text-muted">{employee?.classification ?? 'Not linked'}</td>
                          <td className="px-4 py-4"><StatusBadge status={user.status} /></td>
                          <td className="px-4 py-4">
                            <div className="flex justify-end gap-1 whitespace-nowrap">
                              <Button type="button" variant="link" onClick={() => setDialog({ kind: 'view', userId: user.userId })}>View</Button>
                              <Button type="button" variant="link" onClick={() => setDialog({ kind: 'edit', userId: user.userId })}>Edit</Button>
                              <Button type="button" variant="link" onClick={() => setDialog({ kind: 'reset', userId: user.userId })}>Reset Password</Button>
                              <Button
                                type="button"
                                variant="link"
                                onClick={() => setDialog({ kind: 'deactivate', userId: user.userId })}
                                disabled={user.status === 'Deactivated' || user.username === me}
                                title={user.username === me ? 'You cannot deactivate your own administrator account in this prototype.' : undefined}
                                className="text-danger hover:text-danger"
                              >
                                Deactivate
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-border xl:hidden">
                {filtered.map((user) => {
                  const employee = linkedRecord(user)
                  return (
                    <li key={user.userId} className={clsx('p-5', user.status === 'Deactivated' && 'opacity-60')}>
                      <div className="flex items-start gap-3">
                        <Avatar name={user.name} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">{user.name}</p>
                            <StatusBadge status={user.status} />
                          </div>
                          <p className="mt-1 text-xs text-text-muted">{user.userId} · @{user.username}</p>
                          <p className="mt-2 text-sm">{user.role}</p>
                          <p className="mt-1 text-xs text-text-muted">Employee Classification: {employee?.classification ?? 'Not linked'}</p>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <Button type="button" variant="secondary" onClick={() => setDialog({ kind: 'view', userId: user.userId })} className="h-11">View</Button>
                        <Button type="button" variant="secondary" onClick={() => setDialog({ kind: 'edit', userId: user.userId })} className="h-11">Edit</Button>
                        <Button type="button" variant="secondary" onClick={() => setDialog({ kind: 'reset', userId: user.userId })} className="h-11">Reset</Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setDialog({ kind: 'deactivate', userId: user.userId })}
                          disabled={user.status === 'Deactivated' || user.username === me}
                          className="h-11 text-danger"
                        >
                          Deactivate
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </section>

        <Alert tone="info" title="Account roles and employee records remain separate">
          Administrators manage system accounts and permission roles. HR maintains employee classification, appointment, payroll assignment, and supervisor information. Accounting prepares payroll. No backend authorization is changed by this prototype.
        </Alert>

        <div className="flex flex-col gap-3 rounded-control border border-dashed border-border-strong p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-text-muted"><span className="font-semibold text-text">Prototype only.</span> Preview directory data states.</p>
          <div className="grid shrink-0 grid-cols-3 gap-1 rounded-control bg-canvas p-1" role="group" aria-label="Preview directory state">
            {([['loaded', 'Accounts'], ['empty', 'No accounts'], ['error', 'Load error']] as const).map(([id, label]) => (
              <Button
                key={id}
                type="button"
                variant="secondary"
                aria-pressed={dataState === id}
                onClick={() => { setDataState(id); clearFilters() }}
                className={clsx('h-10 border-0 px-3 shadow-none', dataState === id ? 'bg-surface font-semibold elevate' : 'bg-transparent text-text-muted')}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {dialog?.kind === 'add' && (
        <UserEditor mode={dialog} directory={directory} onClose={() => setDialog(null)} onSave={saveUser} />
      )}
      {selected && dialog?.kind === 'view' && <UserDetails user={selected} onClose={() => setDialog(null)} />}
      {selected && dialog?.kind === 'edit' && (
        <UserEditor key={selected.userId} mode={dialog} directory={directory} onClose={() => setDialog(null)} onSave={saveUser} />
      )}
      {selected && dialog?.kind === 'reset' && (
        <ConfirmationDialog kind="reset" user={selected} onClose={() => setDialog(null)} onConfirm={resetPassword} />
      )}
      {selected && dialog?.kind === 'deactivate' && (
        <ConfirmationDialog kind="deactivate" user={selected} onClose={() => setDialog(null)} onConfirm={deactivate} />
      )}
    </>
  )
}
