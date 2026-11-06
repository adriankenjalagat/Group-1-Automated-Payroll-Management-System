import clsx from 'clsx'
import { useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { Alert, Button, Icon, TextField } from '../../MsuPayroll'
import { Modal, SelectField, Tag } from '../../admin/ui'
import { demoFlag } from '../demoFlags'
import { Pagination, usePaged } from './ui'
import {
  currentAssignment,
  employmentStatusOptions,
  employmentTypeOptions,
  fundOptions,
  officeOptions,
  payBasisOptions,
  payrollConfig,
  payrollConfigurationRefs,
  supervisorOptions,
  systemAccountRefs,
  type EmployeeClassification,
  type EmploymentStatus,
  type FundSource,
  type HrEmployee,
  type PayBasis,
} from './hrData'

type DataState = 'loaded' | 'empty' | 'error'
type Dialog =
  | { kind: 'add' }
  | { kind: 'view' | 'edit' | 'assignment' | 'history'; employeeId: string }
  | null

const dateFormat = new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
const formatDate = (value: string) => value ? dateFormat.format(new Date(`${value}T00:00:00Z`)) : 'Not provided'

function EmploymentStatusBadge({ status }: { status: EmploymentStatus }) {
  const tone = status === 'Active'
    ? 'bg-success-soft text-success'
    : status === 'Resigned'
      ? 'bg-danger-soft text-danger'
      : 'bg-warning-soft text-warning'
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', tone)}>
      <span className={clsx('size-1.5 rounded-full', status === 'Active' ? 'bg-success' : status === 'Resigned' ? 'bg-danger' : 'bg-warning')} aria-hidden="true" />
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

function ReviewConfirmation({
  checked,
  onChange,
  children,
}: {
  checked: boolean
  onChange: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      aria-pressed={checked}
      onClick={onChange}
      className={clsx(
        'h-auto min-h-12 w-full justify-start gap-3 px-3 py-3 text-left shadow-none',
        checked && 'border-primary bg-info-soft text-text',
      )}
    >
      <span className={clsx(
        'grid size-5 shrink-0 place-items-center rounded border',
        checked ? 'border-primary bg-primary text-on-primary' : 'border-border-strong bg-surface text-transparent',
      )}>
        <Icon name="check" size={13} strokeWidth={2.5} />
      </span>
      <span className="font-normal leading-relaxed">{children}</span>
    </Button>
  )
}

function AccountReference({ employeeId }: { employeeId: string }) {
  const account = systemAccountRefs.find((item) => item.employeeId.toLowerCase() === employeeId.trim().toLowerCase())
  if (!account) {
    return (
      <div className="rounded-control border border-dashed border-border-strong p-4 text-center">
        <Icon name="link" size={22} className="mx-auto text-text-muted" />
        <p className="mt-2 text-sm font-medium">No system account is linked to this employee record.</p>
        <p className="mt-1 text-xs text-text-muted">HR cannot create credentials or change system roles from this page.</p>
      </div>
    )
  }
  return (
    <dl className="grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-3">
      <DataPoint label="Linked Username" value={`@${account.username}`} />
      <DataPoint label="System Role" value={account.role} />
      <DataPoint label="Account Status" value={account.status} />
    </dl>
  )
}

function HistoryList({ employee }: { employee: HrEmployee }) {
  const visibleHistory = employee.history
    .filter((item) => !/position|promotion/i.test(item.changeType))
    .map((item) => /appointment created/i.test(item.changeType)
      ? { ...item, newValue: `${employee.employmentType} appointment` }
      : item)
  if (!visibleHistory.length) {
    return (
      <div className="rounded-control border border-dashed border-border-strong p-4 text-center">
        <p className="text-sm font-medium">No appointment history available</p>
        <p className="mt-1 text-xs text-text-muted">Effective-dated changes will appear here.</p>
      </div>
    )
  }
  return (
    <div className="overflow-hidden rounded-control border border-border">
      <div className="hidden grid-cols-4 gap-4 border-b border-border bg-canvas px-4 py-2 text-xs font-semibold text-text-muted sm:grid">
        <span>Effective Date</span><span>Type of Change</span><span>Previous Value</span><span>New Value</span>
      </div>
      <ul className="divide-y divide-border">
        {[...visibleHistory].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate)).map((item) => (
          <li key={item.id} className="grid gap-3 p-4 sm:grid-cols-4">
            <div><p className="text-xs text-text-muted sm:sr-only">Effective Date</p><p className="text-sm font-medium">{formatDate(item.effectiveDate)}</p></div>
            <div><p className="text-xs text-text-muted sm:sr-only">Type of Change</p><p className="text-sm font-medium">{item.changeType}</p></div>
            <div><p className="text-xs text-text-muted sm:sr-only">Previous Value</p><p className="text-sm">{item.previousValue}</p></div>
            <div>
              <p className="text-xs text-text-muted sm:sr-only">New Value</p>
              <p className="text-sm">{item.newValue}</p>
              {item.notes && <p className="mt-1 text-xs leading-relaxed text-text-muted">{item.notes}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function EmployeeDetails({
  employee,
  onClose,
  onEdit,
  onAssign,
  onHistory,
}: {
  employee: HrEmployee
  onClose: () => void
  onEdit: () => void
  onAssign: () => void
  onHistory: () => void
}) {
  const assignment = currentAssignment(employee)
  const config = payrollConfig(assignment?.payrollTypeId)
  return (
    <Modal title="Employee Details" onClose={onClose} wide>
      <Tag kind="placeholder">Fictional employee record</Tag>
      <section className="mt-5">
        <p role="heading" aria-level={3} className="text-sm font-semibold">Employee Profile</p>
        <dl className="mt-3 grid gap-4 rounded-control border border-border p-4 sm:grid-cols-2">
          <DataPoint label="Employee ID" value={employee.employeeId} />
          <DataPoint label="Full Name" value={employee.name} />
          <DataPoint label="Classification" value={employee.classification} />
          <DataPoint label="Employment Type" value={employee.employmentType} />
        </dl>
      </section>

      <section className="mt-5">
        <p role="heading" aria-level={3} className="text-sm font-semibold">Employment Information</p>
        <dl className="mt-3 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
          <DataPoint label="Cost Center / Office" value={employee.office} />
          <DataPoint label="Immediate Supervisor" value={employee.supervisor || 'Not assigned'} muted={!employee.supervisor} />
          <DataPoint label="Appointment Start" value={formatDate(employee.appointmentStart)} />
          <DataPoint label="Appointment End" value={formatDate(employee.appointmentEnd)} muted={!employee.appointmentEnd} />
          <DataPoint label="Employment Status" value={employee.employmentStatus} />
          <DataPoint label="Fund Source" value={employee.fundSource} />
          <DataPoint label="Pay Basis" value={employee.payBasis} />
          <DataPoint label="Applicable Rate" value={employee.applicableRate || 'Not provided in prototype'} muted={!employee.applicableRate} />
          <DataPoint label="Allowance Eligibility" value="Not configured in this prototype" muted />
        </dl>
      </section>

      <section className="mt-5">
        <p role="heading" aria-level={3} className="text-sm font-semibold">Payroll Assignment</p>
        {assignment && config ? (
          <dl className="mt-3 grid gap-4 rounded-control border border-border p-4 sm:grid-cols-2">
            <DataPoint label="Assigned Payroll Type" value={config.name} />
            <DataPoint label="Assignment Status" value="HR-verified demonstration assignment" />
            <DataPoint label="Effective Date" value={formatDate(assignment.effectiveDate)} />
            <DataPoint label="Applicable Fund" value={assignment.fundSource ?? employee.fundSource} />
            <DataPoint label="Configuration Status" value={config.status} />
            {assignment.notes && <DataPoint label="Supporting Reference / Notes" value={assignment.notes} />}
          </dl>
        ) : (
          <div className="mt-3 rounded-control border border-dashed border-border-strong p-4">
            <p className="text-sm font-semibold">No payroll type assigned</p>
            <p className="mt-1 text-sm text-text-muted">Assign a payroll type after verifying the employee's appointment information.</p>
          </div>
        )}
        {employee.assignments.some((item) => item.status === 'Previous') && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Previous Assignments</p>
            <ul className="mt-2 grid gap-2">
              {employee.assignments.filter((item) => item.status === 'Previous').map((item) => (
                <li key={item.id} className="rounded-control bg-canvas p-3 text-sm">
                  <p className="font-medium">{payrollConfig(item.payrollTypeId)?.name ?? item.payrollTypeId}</p>
                  <p className="mt-1 text-xs text-text-muted">{formatDate(item.effectiveDate)} to {formatDate(item.endDate ?? '')}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="mt-5">
        <p role="heading" aria-level={3} className="mb-3 text-sm font-semibold">Appointment History</p>
        <HistoryList employee={employee} />
      </section>

      <section className="mt-5">
        <p role="heading" aria-level={3} className="mb-3 text-sm font-semibold">Linked System Account</p>
        <AccountReference employeeId={employee.employeeId} />
      </section>
      <div className="mt-5 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:flex-wrap sm:justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
        <Button type="button" variant="secondary" onClick={onHistory}>View Appointment History</Button>
        <Button type="button" variant="secondary" onClick={onAssign}>Manage Payroll Assignment</Button>
        <Button type="button" onClick={onEdit}>Edit Record</Button>
      </div>
    </Modal>
  )
}

function HistoryDialog({ employee, onClose }: { employee: HrEmployee; onClose: () => void }) {
  return (
    <Modal title="Appointment History" onClose={onClose} wide>
      <dl className="grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-3">
        <DataPoint label="Employee" value={`${employee.name} (${employee.employeeId})`} />
        <DataPoint label="Classification" value={employee.classification} />
        <DataPoint label="Employment Type" value={employee.employmentType} />
      </dl>
      <div className="mt-5"><HistoryList employee={employee} /></div>
      <p className="mt-3 text-xs text-text-muted">History entries are read-only. Only changes recorded in the demonstration data are listed.</p>
      <div className="mt-5 flex justify-end"><Button type="button" variant="secondary" onClick={onClose}>Close</Button></div>
    </Modal>
  )
}

type EmployeeDraft = {
  employeeId: string
  name: string
  position: string
  classification: EmployeeClassification | ''
  employmentType: string
  office: string
  supervisor: string
  employmentStatus: EmploymentStatus | ''
  appointmentStart: string
  appointmentEnd: string
  fundSource: FundSource | ''
  payBasis: PayBasis | ''
  applicableRate: string
  payrollTypeId: string
  assignmentReviewed: boolean
  effectiveDate: string
}

const blankDraft: EmployeeDraft = {
  employeeId: '',
  name: '',
  position: '',
  classification: '',
  employmentType: '',
  office: '',
  supervisor: '',
  employmentStatus: 'Active',
  appointmentStart: '',
  appointmentEnd: '',
  fundSource: '',
  payBasis: '',
  applicableRate: '',
  payrollTypeId: '',
  assignmentReviewed: false,
  effectiveDate: '',
}

function EmployeeForm({
  employee,
  employees,
  onClose,
  onSave,
}: {
  employee?: HrEmployee
  employees: HrEmployee[]
  onClose: () => void
  onSave: (draft: EmployeeDraft) => void
}) {
  const existingAssignment = employee ? currentAssignment(employee) : undefined
  const [draft, setDraft] = useState<EmployeeDraft>(() => employee ? {
    employeeId: employee.employeeId,
    name: employee.name,
    position: employee.position,
    classification: employee.classification,
    employmentType: employee.employmentType,
    office: employee.office,
    supervisor: employee.supervisor,
    employmentStatus: employee.employmentStatus,
    appointmentStart: employee.appointmentStart,
    appointmentEnd: employee.appointmentEnd,
    fundSource: employee.fundSource,
    payBasis: employee.payBasis,
    applicableRate: employee.applicableRate,
    payrollTypeId: existingAssignment?.payrollTypeId ?? '',
    assignmentReviewed: true,
    effectiveDate: '',
  } : blankDraft)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [initial] = useState(draft)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)
  const close = () => (dirty ? setConfirmDiscard(true) : onClose())
  const set = <K extends keyof EmployeeDraft>(key: K, value: EmployeeDraft[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const account = systemAccountRefs.find((item) => item.employeeId.toLowerCase() === draft.employeeId.trim().toLowerCase())
  const configuredPayrolls = payrollConfigurationRefs.filter((item) =>
    item.classification === draft.classification && item.status === 'Configured for demonstration',
  )

  const changedAppointment = employee && [
    employee.position !== draft.position,
    employee.classification !== draft.classification,
    employee.employmentType !== draft.employmentType,
    employee.office !== draft.office,
    employee.supervisor !== draft.supervisor,
    employee.employmentStatus !== draft.employmentStatus,
    employee.appointmentStart !== draft.appointmentStart,
    employee.appointmentEnd !== draft.appointmentEnd,
    employee.fundSource !== draft.fundSource,
    employee.payBasis !== draft.payBasis,
    employee.applicableRate !== draft.applicableRate,
  ].some(Boolean)

  const diffs = employee ? ([
    ['Employee Classification', employee.classification, draft.classification],
    ['Employment Type', employee.employmentType, draft.employmentType],
    ['Cost Center / Office', employee.office || 'Not assigned', draft.office || 'Not assigned'],
    ['Immediate Supervisor', employee.supervisor || 'Not assigned', draft.supervisor || 'Not assigned'],
    ['Employment Status', employee.employmentStatus, draft.employmentStatus],
    ['Appointment Start', employee.appointmentStart || 'Not provided', draft.appointmentStart || 'Not provided'],
    ['Appointment End', employee.appointmentEnd || 'Not provided', draft.appointmentEnd || 'Not provided'],
    ['Fund Source', employee.fundSource, draft.fundSource],
    ['Pay Basis', employee.payBasis, draft.payBasis],
    ['Applicable Rate', employee.applicableRate || 'Not provided', draft.applicableRate || 'Not provided'],
  ] as const).filter(([, previous, next]) => previous !== next) : []

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (saving) return
    const next: Record<string, string> = {}
    if (!draft.employeeId.trim()) next.employeeId = 'Enter an employee ID.'
    else if (!employee && employees.some((item) => item.employeeId.toLowerCase() === draft.employeeId.trim().toLowerCase())) {
      next.employeeId = 'This employee ID already exists in the demonstration directory.'
    }
    if (!draft.name.trim()) next.name = 'Enter a full name.'
    if (!draft.classification) next.classification = 'Select Faculty or Staff.'
    if (!draft.employmentType) next.employmentType = 'Select an employment type.'
    if (!draft.employmentStatus) next.employmentStatus = 'Select an employment status.'
    if (!draft.appointmentStart) next.appointmentStart = 'Enter the appointment start date.'
    if (draft.appointmentStart && draft.appointmentEnd && draft.appointmentEnd < draft.appointmentStart) next.appointmentEnd = 'The end date cannot be earlier than the start date.'
    if (!draft.fundSource) next.fundSource = 'Select a fund source.'
    if (!draft.payBasis) next.payBasis = 'Select a pay basis.'
    if (!employee && draft.payrollTypeId && !draft.assignmentReviewed) next.assignmentReviewed = 'Confirm that the assignment was reviewed.'
    if (changedAppointment && !draft.effectiveDate) next.effectiveDate = 'Enter an effective date for appointment changes.'
    setErrors(next)
    if (!Object.keys(next).length) { setSaving(true); onSave(draft) }
  }

  return (
    <>
    <Modal title={employee ? 'Edit Employee Record' : 'Add Employee Record'} onClose={close} wide>
      <form onSubmit={submit} noValidate className="grid gap-5">
        <section>
          <p role="heading" aria-level={3} className="text-sm font-semibold">Basic Information</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {employee ? (
              <div>
                <p className="text-sm font-medium">Employee ID</p>
                <p className="mt-1.5 rounded-control border border-border bg-canvas px-3.5 py-3 text-sm font-medium">{employee.employeeId}</p>
              </div>
            ) : (
              <TextField label="Employee ID" value={draft.employeeId} onChange={(event) => set('employeeId', event.target.value)} error={errors.employeeId} />
            )}
            <TextField label="Full Name" value={draft.name} onChange={(event) => set('name', event.target.value)} error={errors.name} />
            <SelectField label="Employee Classification" value={draft.classification} onChange={(event) => set('classification', event.target.value as EmployeeClassification)} placeholder="Select classification" error={errors.classification}>
              <option value="Faculty">Faculty</option><option value="Staff">Staff</option>
            </SelectField>
            <SelectField label="Employment Type" value={draft.employmentType} onChange={(event) => set('employmentType', event.target.value)} placeholder="Select employment type" error={errors.employmentType} hint="Labels are HR-maintained references; Regular and Permanent are not treated as interchangeable.">
              {employmentTypeOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </SelectField>
          </div>
        </section>

        <section className="border-t border-border pt-5">
          <p role="heading" aria-level={3} className="text-sm font-semibold">Employment Assignment</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <SelectField label="Cost Center / Office" value={draft.office} onChange={(event) => set('office', event.target.value)} placeholder="Not assigned" error={errors.office} hint="Leave unassigned if the Cost Center is not yet confirmed. Employees cannot submit requirements until one is assigned.">
              {officeOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </SelectField>
            <SelectField label="Immediate Supervisor" value={draft.supervisor} onChange={(event) => set('supervisor', event.target.value)} placeholder="Not assigned" hint="Fictional reference records only; this does not establish an official assignment.">
              {supervisorOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </SelectField>
            <SelectField
              label="Employment Status"
              value={draft.employmentStatus}
              onChange={(event) => set('employmentStatus', event.target.value as EmploymentStatus)}
              placeholder="Select status"
              error={errors.employmentStatus}
              hint="Prototype reference labels; exact HR terminology requires office confirmation."
            >
              {employmentStatusOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </SelectField>
            <TextField label="Appointment Start Date" type="date" value={draft.appointmentStart} onChange={(event) => set('appointmentStart', event.target.value)} error={errors.appointmentStart} />
            <TextField label="Appointment End Date (when applicable)" type="date" value={draft.appointmentEnd} onChange={(event) => set('appointmentEnd', event.target.value)} error={errors.appointmentEnd} />
            {employee && <TextField label="Effective Date for Changes" type="date" value={draft.effectiveDate} onChange={(event) => set('effectiveDate', event.target.value)} error={errors.effectiveDate} />}
          </div>
          {changedAppointment && <p className="mt-3 text-xs text-warning">Appointment changes may affect the employee's payroll assignment. Existing payroll and history records will not be rewritten.</p>}
          {diffs.length > 0 && (
            <div className="mt-4 overflow-hidden rounded-control border border-border">
              <p className="border-b border-border bg-canvas px-3 py-2 text-xs font-semibold text-text-muted">Pending changes (recorded in appointment history on save)</p>
              <ul className="divide-y divide-border">
                {diffs.map(([field, previous, now]) => (
                  <li key={field} className="grid gap-1 px-3 py-2 text-xs sm:grid-cols-3"><span className="font-semibold">{field}</span><span className="text-text-muted">Previous: {previous}</span><span>New: {now}</span></li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="border-t border-border pt-5">
          <p role="heading" aria-level={3} className="text-sm font-semibold">Payroll Information</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <SelectField label="Fund Source" value={draft.fundSource} onChange={(event) => set('fundSource', event.target.value as FundSource)} placeholder="Select fund source" error={errors.fundSource}>
              {fundOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </SelectField>
            <SelectField label="Pay Basis" value={draft.payBasis} onChange={(event) => set('payBasis', event.target.value as PayBasis)} placeholder="Select pay basis" error={errors.payBasis}>
              {payBasisOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </SelectField>
            <TextField label="Applicable Rate (optional)" value={draft.applicableRate} onChange={(event) => set('applicableRate', event.target.value)} placeholder="Not provided in this prototype" />
            {!employee && (
              <SelectField label="Assigned Payroll Type (optional)" value={draft.payrollTypeId} onChange={(event) => set('payrollTypeId', event.target.value)} placeholder="Not Assigned" hint="Classification matching is descriptive only; HR must review the actual appointment.">
                {configuredPayrolls.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </SelectField>
            )}
          </div>
          {!employee && draft.payrollTypeId && (
            <div className="mt-4">
              <ReviewConfirmation checked={draft.assignmentReviewed} onChange={() => set('assignmentReviewed', !draft.assignmentReviewed)}>
                I reviewed this fictional payroll assignment against the employee's appointment information.
              </ReviewConfirmation>
            </div>
          )}
          {errors.assignmentReviewed && <p className="mt-2 text-xs font-medium text-danger">{errors.assignmentReviewed}</p>}
        </section>

        <section className="border-t border-border pt-5">
          <p role="heading" aria-level={3} className="mb-3 text-sm font-semibold">Account Link</p>
          {account ? (
            <dl className="grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-3">
              <DataPoint label="Linked Username" value={`@${account.username}`} />
              <DataPoint label="System Role" value={account.role} />
              <DataPoint label="Account Status" value={account.status} />
            </dl>
          ) : <AccountReference employeeId={draft.employeeId} />}
        </section>
        <Alert tone="info" title="Local fictional employee data">
          Saving updates this prototype session only. HR records do not create accounts, change roles, or update a university database.
        </Alert>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={close}>Cancel</Button>
          <Button type="submit" disabled={saving}>{employee ? 'Save Changes' : 'Save Employee'}</Button>
        </div>
      </form>
    </Modal>
    {confirmDiscard && (
      <Modal title="Discard unsaved changes?" onClose={() => setConfirmDiscard(false)}>
        <p className="text-sm text-text-muted">Your edits have not been saved. Discarding closes the form without changing the record.</p>
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => setConfirmDiscard(false)}>Keep Editing</Button>
          <Button type="button" onClick={onClose}>Discard Changes</Button>
        </div>
      </Modal>
    )}
    </>
  )
}

function AssignmentManager({
  employee,
  onClose,
  onAssign,
}: {
  employee: HrEmployee
  onClose: () => void
  onAssign: (payrollTypeId: string, effectiveDate: string, fundSource: FundSource, notes: string) => void
}) {
  const current = currentAssignment(employee)
  const currentConfig = payrollConfig(current?.payrollTypeId)
  const available = payrollConfigurationRefs.filter((item) => item.classification === employee.classification)
  const selectable = available.filter((item) => item.status === 'Configured for demonstration' && item.id !== current?.payrollTypeId)
  const pending = available.filter((item) => item.status === 'Pending configuration confirmation')
  const [payrollTypeId, setPayrollTypeId] = useState('')
  const [effectiveDate, setEffectiveDate] = useState('')
  const [fundSource, setFundSource] = useState<FundSource | ''>(employee.fundSource)
  const [notes, setNotes] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const chosen = payrollConfig(payrollTypeId)
  // Descriptive check only: a payroll type that does not mention the employee's employment type needs a second look.
  const typeMismatch = Boolean(chosen) && !chosen!.name.toLowerCase().includes(employee.employmentType.toLowerCase())

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const next: Record<string, string> = {}
    if (!payrollTypeId) next.payrollTypeId = 'Select an available payroll configuration.'
    if (!fundSource) next.fundSource = 'Select the applicable fund source.'
    if (!effectiveDate) next.effectiveDate = 'Enter the assignment effective date.'
    else if (current && effectiveDate < current.effectiveDate) next.effectiveDate = 'The effective date cannot be earlier than the current assignment’s effective date.'
    setErrors(next)
    if (!Object.keys(next).length) setConfirming(true)
  }

  const confirmAssignment = () => {
    if (saved) return
    setSaved(true)
    onAssign(payrollTypeId, effectiveDate, fundSource as FundSource, notes.trim())
  }

  return (
    <Modal title="Manage Payroll Assignment" onClose={onClose} wide>
      <Tag kind="placeholder">Local demonstration assignment</Tag>
      <dl className="mt-4 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-3">
        <DataPoint label="Employee" value={`${employee.name} (${employee.employeeId})`} />
        <DataPoint label="Classification" value={employee.classification} />
        <DataPoint label="Employment Type" value={employee.employmentType} />
      </dl>

      <section className="mt-5">
        <p role="heading" aria-level={3} className="text-sm font-semibold">Current Assignment</p>
        {current && currentConfig ? (
          <div className="mt-3 rounded-control border border-border p-4">
            <p className="font-semibold">{currentConfig.name}</p>
            <p className="mt-1 text-xs text-text-muted">Effective {formatDate(current.effectiveDate)} · {currentConfig.status}</p>
          </div>
        ) : (
          <div className="mt-3 rounded-control border border-dashed border-border-strong p-4">
            <p className="text-sm font-semibold">No payroll type assigned</p>
            <p className="mt-1 text-sm text-text-muted">Assign a payroll type after verifying the employee's appointment information.</p>
          </div>
        )}
      </section>

      <section className="mt-5">
        <p role="heading" aria-level={3} className="text-sm font-semibold">{current ? 'Change Assignment' : 'Assign Payroll Type'}</p>
        {selectable.length ? (
          <form onSubmit={submit} noValidate className="mt-3 grid gap-4">
            <SelectField label="Available Payroll Configuration" value={payrollTypeId} onChange={(event) => setPayrollTypeId(event.target.value)} placeholder="Select configuration" error={errors.payrollTypeId}>
              {selectable.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </SelectField>
            <p className="-mt-2 text-xs leading-relaxed text-text-muted">
              Matching classification is descriptive only. This selection does not establish eligibility without HR appointment verification.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="Fund Source" value={fundSource} onChange={(event) => setFundSource(event.target.value as FundSource)} placeholder="Select fund source" error={errors.fundSource} hint="Prefilled from the employee record. The fund is not inferred from classification.">
                {fundOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </SelectField>
              <TextField label="Effective Date" type="date" value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} error={errors.effectiveDate} />
            </div>
            <TextField label="Assignment Notes / Supporting Reference (optional)" value={notes} onChange={(event) => setNotes(event.target.value)} />
            {typeMismatch && (
              <Alert tone="warning" title="Check the appointment before assigning">
                This payroll type does not mention the employee’s employment type ({employee.employmentType}). Assign it only if the verified appointment supports it.
              </Alert>
            )}
            <Alert tone="warning" title="Assignment affects future submissions">
              A verified assignment will eventually determine which payroll configuration and document checklist the Employee Portal loads. This prototype does not update the Employee Portal.
            </Alert>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
              <Button type="submit">Save Assignment</Button>
            </div>
          </form>
        ) : (
          <div className="mt-3 rounded-control border border-dashed border-border-strong p-4">
            <p className="text-sm font-semibold">No applicable payroll configuration available</p>
            <p className="mt-1 text-sm text-text-muted">Please review the configured payroll types and confirm the employee's eligibility.</p>
            <div className="mt-4"><Button type="button" variant="secondary" onClick={onClose}>Close</Button></div>
          </div>
        )}
      </section>

      {pending.length > 0 && (
        <section className="mt-5 border-t border-border pt-5">
          <p role="heading" aria-level={3} className="text-sm font-semibold">Configurations Pending Confirmation</p>
          <p className="mt-1 text-xs leading-relaxed text-text-muted">
            These references are visible for planning but cannot be selected as an approved assignment.
          </p>
          <ul className="mt-3 grid gap-2">
            {pending.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-dashed border-border-strong p-3">
                <span className="text-sm font-medium">{item.name}</span>
                <span className="rounded-full bg-warning-soft px-2.5 py-1 text-xs font-semibold text-warning">Pending configuration confirmation</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-5 border-t border-border pt-5">
        <p role="heading" aria-level={3} className="mb-3 text-sm font-semibold">Assignment History</p>
        {employee.assignments.length ? (
          <ul className="grid gap-2">
            {[...employee.assignments].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate)).map((item) => (
              <li key={item.id} className="rounded-control bg-canvas p-3 text-sm">
                <p className="font-medium">{payrollConfig(item.payrollTypeId)?.name ?? item.payrollTypeId}</p>
                <p className="mt-1 text-xs text-text-muted">{item.status} · Effective {formatDate(item.effectiveDate)}{item.endDate ? ` · Ended ${formatDate(item.endDate)}` : ''}</p>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-text-muted">No assignment history available.</p>}
      </section>
      {confirming && (
        <Modal title="Confirm Payroll Assignment" onClose={() => { if (!saved) setConfirming(false) }}>
          <dl className="grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
            <DataPoint label="Employee" value={`${employee.name} (${employee.employeeId})`} />
            <DataPoint label="Effective Date" value={formatDate(effectiveDate)} />
            <DataPoint label="Previous Assignment" value={currentConfig?.name ?? 'No payroll assignment'} muted={!currentConfig} />
            <DataPoint label="New Assignment" value={chosen?.name ?? ''} />
            <DataPoint label="Fund Source" value={fundSource || ''} />
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-text-muted">The previous assignment is kept in history and no earlier payroll record is changed. This updates the local demonstration only.</p>
          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setConfirming(false)} disabled={saved}>Back</Button>
            <Button type="button" onClick={confirmAssignment} disabled={saved}>Confirm Assignment</Button>
          </div>
        </Modal>
      )}
    </Modal>
  )
}

function EmptyState({ title, detail, action }: { title: string; detail?: string; action?: React.ReactNode }) {
  return (
    <div className="border-t border-border px-5 py-14 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-info-soft text-primary"><Icon name="users" size={24} /></span>
      <p className="mt-4 font-semibold">{title}</p>
      {detail && <p className="mt-1 text-sm text-text-muted">{detail}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}

export function EmployeeRecords({
  employees,
  setEmployees,
}: {
  employees: HrEmployee[]
  setEmployees: Dispatch<SetStateAction<HrEmployee[]>>
}) {
  const [query, setQuery] = useState('')
  const [classification, setClassification] = useState('')
  const [employmentType, setEmploymentType] = useState('')
  const [payrollType, setPayrollType] = useState('')
  const [office, setOffice] = useState('')
  const [employmentStatus, setEmploymentStatus] = useState('')
  const [fundFilter, setFundFilter] = useState('')
  const [dialog, setDialog] = useState<Dialog>(null)
  const [notice, setNotice] = useState('')
  const [dataState, setDataState] = useState<DataState>('loaded')

  const displayed = dataState === 'loaded' ? employees : []
  const employmentTypes = useMemo(() => [...new Set(employees.map((item) => item.employmentType))].sort(), [employees])
  const offices = useMemo(() => [...new Set(employees.map((item) => item.office).filter(Boolean))].sort(), [employees])
  const payrollTypes = useMemo(() => [...new Set(employees.map((item) => payrollConfig(currentAssignment(item)?.payrollTypeId)?.name).filter(Boolean))] as string[], [employees])
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return displayed.filter((employee) => {
      const assignmentName = payrollConfig(currentAssignment(employee)?.payrollTypeId)?.name ?? 'Not Assigned'
      if (classification && employee.classification !== classification) return false
      if (employmentType && employee.employmentType !== employmentType) return false
      if (payrollType && assignmentName !== payrollType) return false
      if (office && office !== 'Not assigned' && employee.office !== office) return false
      if (employmentStatus && employee.employmentStatus !== employmentStatus) return false
      if (fundFilter && employee.fundSource !== fundFilter) return false
      if (office && office === 'Not assigned' && employee.office) return false
      return !term || [
        employee.employeeId,
        employee.name,
        employee.office,
        assignmentName,
      ].some((value) => value.toLowerCase().includes(term))
    }).sort((a, b) => a.employeeId.localeCompare(b.employeeId))
  }, [displayed, query, classification, employmentType, payrollType, office, employmentStatus, fundFilter])
  const paging = usePaged(filtered, 6, `${query}|${classification}|${employmentType}|${payrollType}|${office}|${employmentStatus}|${fundFilter}`)

  const filtering = Boolean(query || classification || employmentType || payrollType || office || employmentStatus || fundFilter)
  const clearFilters = () => {
    setQuery('')
    setClassification('')
    setEmploymentType('')
    setPayrollType('')
    setOffice('')
    setEmploymentStatus('')
    setFundFilter('')
  }
  const selected = dialog && 'employeeId' in dialog ? employees.find((item) => item.employeeId === dialog.employeeId) : undefined

  const saveEmployee = (draft: EmployeeDraft) => {
    if (dialog?.kind === 'add') {
      const assignment = draft.payrollTypeId ? [{
        id: `DEMO-ASG-${Date.now()}`,
        payrollTypeId: draft.payrollTypeId,
        effectiveDate: draft.appointmentStart,
        status: 'Active' as const,
        verificationNote: 'HR-reviewed local demonstration assignment.',
      }] : []
      const created: HrEmployee = {
        employeeId: draft.employeeId.trim().toUpperCase(),
        name: draft.name.trim(),
        classification: draft.classification as EmployeeClassification,
        employmentType: draft.employmentType,
        position: draft.position.trim(),
        office: draft.office,
        supervisor: draft.supervisor,
        employmentStatus: draft.employmentStatus as EmploymentStatus,
        appointmentStart: draft.appointmentStart,
        appointmentEnd: draft.appointmentEnd,
        fundSource: draft.fundSource as FundSource,
        payBasis: draft.payBasis as PayBasis,
        applicableRate: draft.applicableRate.trim(),
        assignments: assignment,
        history: [{
          id: `DEMO-HIST-${Date.now()}`,
          effectiveDate: draft.appointmentStart,
          changeType: 'Appointment created',
          previousValue: 'No employee record',
          newValue: `${draft.employmentType} appointment`,
          notes: 'Local fictional employee record.',
        }],
        simulated: true,
      }
      setEmployees((current) => [...current, created])
      setNotice('Employee record added in the demonstration. No university database was updated.')
    } else if (dialog?.kind === 'edit' && selected) {
      const changes = [
        ['Employee Classification', selected.classification, draft.classification],
        ['Employment Type', selected.employmentType, draft.employmentType],
        ['Cost Center reassignment', selected.office || 'Not assigned', draft.office || 'Not assigned'],
        ['Immediate Supervisor', selected.supervisor || 'Not assigned', draft.supervisor || 'Not assigned'],
        ['Employment status change', selected.employmentStatus, draft.employmentStatus],
        ['Appointment Start', selected.appointmentStart, draft.appointmentStart],
        ['Appointment End', selected.appointmentEnd || 'Not provided', draft.appointmentEnd || 'Not provided'],
        ['Fund Source', selected.fundSource, draft.fundSource],
        ['Pay Basis', selected.payBasis, draft.payBasis],
        ['Applicable Rate', selected.applicableRate || 'Not provided', draft.applicableRate || 'Not provided'],
      ].filter(([, previous, next]) => previous !== next)
      const history = changes.map(([changeType, previousValue, newValue], index) => ({
        id: `DEMO-HIST-${Date.now()}-${index}`,
        effectiveDate: draft.effectiveDate,
        changeType,
        previousValue,
        newValue,
        notes: 'Local fictional appointment update; prior values retained.',
      }))
      setEmployees((current) => current.map((item) => item.employeeId === selected.employeeId ? {
        ...item,
        name: draft.name.trim(),
        classification: draft.classification as EmployeeClassification,
        employmentType: draft.employmentType,
        position: draft.position.trim(),
        office: draft.office,
        supervisor: draft.supervisor,
        employmentStatus: draft.employmentStatus as EmploymentStatus,
        appointmentStart: draft.appointmentStart,
        appointmentEnd: draft.appointmentEnd,
        fundSource: draft.fundSource as FundSource,
        payBasis: draft.payBasis as PayBasis,
        applicableRate: draft.applicableRate.trim(),
        history: [...item.history, ...history],
        simulated: true,
      } : item))
      setNotice('Employee record updated in the demonstration, with effective-dated history.')
    }
    setDialog(null)
  }

  const assignPayroll = (payrollTypeId: string, effectiveDate: string, fundSource: FundSource, notes: string) => {
    if (!selected) return
    const previous = currentAssignment(selected)
    const previousName = payrollConfig(previous?.payrollTypeId)?.name ?? 'No payroll assignment'
    const nextName = payrollConfig(payrollTypeId)?.name ?? payrollTypeId
    setEmployees((current) => current.map((employee) => employee.employeeId === selected.employeeId ? {
      ...employee,
      assignments: [
        ...employee.assignments.map((assignment) => assignment.status === 'Active'
          ? { ...assignment, status: 'Previous' as const, endDate: effectiveDate }
          : assignment),
        {
          id: `DEMO-ASG-${Date.now()}`,
          payrollTypeId,
          effectiveDate,
          status: 'Active' as const,
          verificationNote: 'HR-reviewed local demonstration assignment.',
          fundSource,
          notes: notes || undefined,
        },
      ],
      fundSource,
      history: [
        ...employee.history,
        {
          id: `DEMO-HIST-ASG-${Date.now()}`,
          effectiveDate,
          changeType: 'Payroll group change',
          previousValue: previousName,
          newValue: nextName,
          notes: 'Explicit local HR assignment; no prior payroll record was rewritten.',
        },
        ...(fundSource !== employee.fundSource ? [{
          id: `DEMO-HIST-FUND-${Date.now()}`,
          effectiveDate,
          changeType: 'Fund Source',
          previousValue: employee.fundSource,
          newValue: fundSource,
          notes: 'Recorded with the payroll assignment.',
        }] : []),
      ],
      simulated: true,
    } : employee))
    setNotice('Payroll assignment updated in the demonstration. The previous assignment is kept in history.')
    setDialog(null)
  }

  return (
    <>
      <div className="grid gap-6 font-sans">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p id="page-title" role="heading" aria-level={1} tabIndex={-1} className="text-2xl font-semibold leading-tight sm:text-3xl">Employee Records</p>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">Manage employee information, appointment records, and payroll assignments.</p>
            <div className="mt-2"><Tag kind="placeholder">Prototype · fictional employee data</Tag></div>
          </div>
          <Button type="button" onClick={() => setDialog({ kind: 'add' })} className="w-full sm:w-auto"><Icon name="plus" size={17} /> Add Employee</Button>
        </section>

        {notice && (
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1"><Alert tone="success" title="Local demonstration update">{notice}</Alert></div>
            <Button type="button" variant="link" onClick={() => setNotice('')}>Dismiss</Button>
          </div>
        )}

        <section className="overflow-hidden rounded-card bg-surface elevate" aria-labelledby="employee-directory-title">
          <div className="border-b border-border p-5 sm:p-6">
            <p id="employee-directory-title" role="heading" aria-level={2} className="text-lg font-semibold">Employee Directory</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <TextField label="Search" icon="search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by employee name or ID..." className="sm:col-span-2" />
              <SelectField label="Employee Classification" value={classification} onChange={(event) => setClassification(event.target.value)} placeholder="All classifications">
                <option value="Faculty">Faculty</option><option value="Staff">Staff</option>
              </SelectField>
              <SelectField label="Employment Type" value={employmentType} onChange={(event) => setEmploymentType(event.target.value)} placeholder="All employment types">
                {employmentTypes.map((item) => <option key={item} value={item}>{item}</option>)}
              </SelectField>
              <SelectField label="Assigned Payroll Type" value={payrollType} onChange={(event) => setPayrollType(event.target.value)} placeholder="All payroll types">
                {payrollTypes.map((item) => <option key={item} value={item}>{item}</option>)}
                <option value="Not Assigned">Not Assigned</option>
              </SelectField>
              <SelectField label="Cost Center" value={office} onChange={(event) => setOffice(event.target.value)} placeholder="All offices">
                {offices.map((item) => <option key={item} value={item}>{item}</option>)}
                <option value="Not assigned">Not assigned</option>
              </SelectField>
              <SelectField label="Employment Status" value={employmentStatus} onChange={(event) => setEmploymentStatus(event.target.value)} placeholder="All statuses">
                {employmentStatusOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </SelectField>
              <SelectField label="Fund Source" value={fundFilter} onChange={(event) => setFundFilter(event.target.value)} placeholder="All funds">
                {fundOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </SelectField>
              <Button type="button" variant="secondary" onClick={clearFilters} disabled={!filtering} className="w-full self-end">Clear Filters</Button>
            </div>
            <p aria-live="polite" className="mt-3 text-xs text-text-muted">Showing {filtered.length} of {displayed.length} employee records · Sorted by Employee ID</p>
          </div>

          {dataState === 'error' ? (
            <EmptyState title="Unable to load employee records" detail="Please try again." action={<Button type="button" onClick={() => setDataState('loaded')}>Retry</Button>} />
          ) : dataState === 'empty' ? (
            <EmptyState title="No employee records available" />
          ) : filtered.length === 0 ? (
            <EmptyState title="No matching employees" detail="Try adjusting your search or filters." action={<Button type="button" variant="secondary" onClick={clearFilters}>Clear Filters</Button>} />
          ) : (
            <>
              <div className="hidden xl:block">
                <table className="w-full table-fixed text-left text-xs">
                  <colgroup>
                    <col className="w-[13%]" />
                    <col className="w-[8%]" />
                    <col className="w-[12%]" />
                    <col className="w-[20%]" />
                    <col className="w-[17%]" />
                    <col className="w-[11%]" />
                    <col className="w-[19%]" />
                  </colgroup>
                  <thead><tr className="border-b border-border bg-canvas text-xs text-text-muted">
                    {['Employee', 'Classification', 'Employment Type', 'Assigned Payroll Type', 'Cost Center / Office', 'Employment Status'].map((heading) => <th key={heading} scope="col" className="px-2 py-3 font-semibold leading-snug">{heading === 'Classification' ? <>Class.<span className="sr-only">ification</span></> : heading}</th>)}
                    <th scope="col" className="px-2 py-3 text-right font-semibold">Actions</th>
                  </tr></thead>
                  <tbody className="divide-y divide-border">
                    {paging.visible.map((employee) => {
                      const assignmentName = payrollConfig(currentAssignment(employee)?.payrollTypeId)?.name
                      return (
                        <tr key={employee.employeeId} className={clsx('hover:bg-info-soft/30', employee.employmentStatus !== 'Active' && 'opacity-70')}>
                          <td className="px-2 py-3"><p className="font-semibold leading-snug">{employee.name}</p><p className="mt-0.5 text-text-muted">{employee.employeeId}</p>{employee.simulated && <span className="mt-1 block"><Tag kind="simulated">Local</Tag></span>}</td>
                          <td className="px-2 py-3">{employee.classification}</td>
                          <td className="break-words px-2 py-3 leading-snug">{employee.employmentType}</td>
                          <td className="break-words px-2 py-3 leading-snug">{assignmentName ?? <span className="font-medium text-warning">Not Assigned</span>}</td>
                          <td className="break-words px-2 py-3 leading-snug">{employee.office || <span className="text-text-muted">Not assigned</span>}</td>
                          <td className="px-2 py-3"><EmploymentStatusBadge status={employee.employmentStatus} /></td>
                          <td className="px-2 py-3"><div className="flex flex-wrap justify-end gap-x-2 gap-y-0.5">
                            <Button type="button" variant="link" onClick={() => setDialog({ kind: 'view', employeeId: employee.employeeId })} aria-label={`View Details for ${employee.name}`} className="text-xs">View</Button>
                            <Button type="button" variant="link" onClick={() => setDialog({ kind: 'edit', employeeId: employee.employeeId })} aria-label={`Edit Record for ${employee.name}`} className="text-xs">Edit</Button>
                            <Button type="button" variant="link" onClick={() => setDialog({ kind: 'assignment', employeeId: employee.employeeId })} aria-label={`Manage Payroll Assignment for ${employee.name}`} className="text-xs">Assign</Button>
                            <Button type="button" variant="link" onClick={() => setDialog({ kind: 'history', employeeId: employee.employeeId })} aria-label={`View Appointment History for ${employee.name}`} className="text-xs">History</Button>
                          </div></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <ul className="divide-y divide-border xl:hidden">
                {paging.visible.map((employee) => {
                  const assignmentName = payrollConfig(currentAssignment(employee)?.payrollTypeId)?.name
                  return (
                    <li key={employee.employeeId} className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div><p className="font-semibold">{employee.name}</p><p className="mt-1 text-xs text-text-muted">{employee.employeeId} · {employee.classification} · {employee.employmentType}</p></div>
                        <EmploymentStatusBadge status={employee.employmentStatus} />
                      </div>
                      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                        <DataPoint label="Cost Center / Office" value={employee.office || 'Not assigned'} muted={!employee.office} />
                        <div className="sm:col-span-2"><DataPoint label="Assigned Payroll Type" value={assignmentName ?? 'Not Assigned'} muted={!assignmentName} /></div>
                      </dl>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <Button type="button" variant="secondary" onClick={() => setDialog({ kind: 'view', employeeId: employee.employeeId })} className="h-11">View Details</Button>
                        <Button type="button" variant="secondary" onClick={() => setDialog({ kind: 'edit', employeeId: employee.employeeId })} className="h-11">Edit Record</Button>
                        <Button type="button" variant="secondary" onClick={() => setDialog({ kind: 'assignment', employeeId: employee.employeeId })} className="h-11">Manage Assignment</Button>
                        <Button type="button" variant="secondary" onClick={() => setDialog({ kind: 'history', employeeId: employee.employeeId })} className="h-11">Appointment History</Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
              <Pagination page={paging.page} pages={paging.pages} total={paging.total} size={paging.size} onPage={paging.setPage} />
            </>
          )}
        </section>

        <Alert tone="info" title="Prepared for future integration">
          HR-maintained classification, appointment, payroll assignment, Cost Center, supervisor, and effective-date data can later drive Employee New Submission and Accounting payroll preparation. No backend connection is active.
        </Alert>

        {demoFlag('states') && <div className="flex flex-col gap-3 rounded-control border border-dashed border-border-strong p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-text-muted"><span className="font-semibold text-text">Prototype only.</span> Preview employee-directory data states.</p>
          <div className="grid shrink-0 grid-cols-3 gap-1 rounded-control bg-canvas p-1" role="group" aria-label="Preview employee data state">
            {([['loaded', 'Records'], ['empty', 'No records'], ['error', 'Load error']] as const).map(([id, label]) => (
              <Button key={id} type="button" variant="secondary" aria-pressed={dataState === id} onClick={() => { setDataState(id); clearFilters() }} className={clsx('h-10 border-0 px-3 shadow-none', dataState === id ? 'bg-surface font-semibold elevate' : 'bg-transparent text-text-muted')}>{label}</Button>
            ))}
          </div>
        </div>}
      </div>

      {dialog?.kind === 'add' && <EmployeeForm employees={employees} onClose={() => setDialog(null)} onSave={saveEmployee} />}
      {selected && dialog?.kind === 'view' && (
        <EmployeeDetails
          employee={selected}
          onClose={() => setDialog(null)}
          onEdit={() => setDialog({ kind: 'edit', employeeId: selected.employeeId })}
          onAssign={() => setDialog({ kind: 'assignment', employeeId: selected.employeeId })}
          onHistory={() => setDialog({ kind: 'history', employeeId: selected.employeeId })}
        />
      )}
      {selected && dialog?.kind === 'history' && <HistoryDialog employee={selected} onClose={() => setDialog(null)} />}
      {selected && dialog?.kind === 'edit' && <EmployeeForm key={selected.employeeId} employee={selected} employees={employees} onClose={() => setDialog(null)} onSave={saveEmployee} />}
      {selected && dialog?.kind === 'assignment' && <AssignmentManager key={`${selected.employeeId}-${currentAssignment(selected)?.id ?? 'none'}`} employee={selected} onClose={() => setDialog(null)} onAssign={assignPayroll} />}
    </>
  )
}
