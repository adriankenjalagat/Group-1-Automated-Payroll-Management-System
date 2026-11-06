import clsx from 'clsx'
import { useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { Alert, Button, Icon, TextField } from '../../MsuPayroll'
import { Modal, SelectField, Tag } from '../../admin/ui'
import { demoFlag } from '../demoFlags'
import { Pagination, usePaged } from './ui'
import type { HrEmployee } from './hrData'
import {
  type ApprovedRecord,
  type ApprovedRecordType,
  type AttendanceConcern,
  type AttendanceModuleState,
  type AttendanceRecord,
  type AttendanceSource,
} from './attendanceData'

type Tab = 'attendance' | 'concerns' | 'approved'
type DataState = 'loaded' | 'empty' | 'error'

const dateFormat = new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
const formatDate = (value: string) => value ? dateFormat.format(new Date(`${value}T00:00:00Z`)) : 'Not recorded'

function DataPoint({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium text-text-muted">{label}</dt>
      <dd className={clsx('mt-1 text-sm font-medium leading-snug', muted && 'text-text-muted')}>{value}</dd>
    </div>
  )
}

function ReviewIndicator({ indicator }: { indicator: AttendanceRecord['reviewIndicator'] }) {
  const tone = indicator === 'Available'
    ? 'bg-success-soft text-success'
    : indicator === 'Protected Record'
      ? 'bg-danger-soft text-danger'
      : 'bg-warning-soft text-warning'
  return <span className={clsx('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', tone)}>{indicator}</span>
}

function ConfirmCheck({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <Button
      type="button"
      variant="secondary"
      aria-pressed={checked}
      onClick={onChange}
      className={clsx('h-auto min-h-12 w-full justify-start gap-3 px-3 py-3 text-left shadow-none', checked && 'border-primary bg-info-soft text-text')}
    >
      <span className={clsx('grid size-5 shrink-0 place-items-center rounded border', checked ? 'border-primary bg-primary text-on-primary' : 'border-border-strong bg-surface text-transparent')}>
        <Icon name="check" size={13} strokeWidth={2.5} />
      </span>
      <span className="font-normal leading-relaxed">{children}</span>
    </Button>
  )
}

function EmptyState({ title, detail, action }: { title: string; detail?: string; action?: React.ReactNode }) {
  return (
    <div className="border-t border-border px-5 py-14 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-info-soft text-primary"><Icon name="clock" size={24} /></span>
      <p className="mt-4 font-semibold">{title}</p>
      {detail && <p className="mt-1 text-sm text-text-muted">{detail}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}

function AttendanceDetails({
  record,
  employee,
  approvedRecords,
  onClose,
}: {
  record: AttendanceRecord
  employee: HrEmployee
  approvedRecords: ApprovedRecord[]
  onClose: () => void
}) {
  const related = approvedRecords.filter((item) => item.employeeId === employee.employeeId)
  const missing = record.entries.filter((entry) => !entry.timeIn || !entry.timeOut).length
  return (
    <Modal title="Attendance Details" onClose={onClose} wide>
      <Tag kind="placeholder">Fictional attendance record</Tag>
      <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-3">
        <DataPoint label="Employee" value={employee.name} />
        <DataPoint label="Employee ID" value={employee.employeeId} />
        <DataPoint label="Classification" value={employee.classification} />
        <DataPoint label="Employment Type" value={employee.employmentType} />
        <DataPoint label="Payroll Period" value={record.period} />
        <DataPoint label="Attendance Source" value={record.source} />
      </dl>

      <section className="mt-5">
        <p role="heading" aria-level={3} className="text-sm font-semibold">Daily Attendance Entries</p>
        <div className="mt-3 overflow-hidden rounded-control border border-border">
          <div className="grid grid-cols-4 gap-3 border-b border-border bg-canvas px-3 py-2 text-xs font-semibold text-text-muted">
            <span>Date</span><span>Time In</span><span>Time Out</span><span>Source</span>
          </div>
          <ul className="divide-y divide-border">
            {record.entries.map((entry) => (
              <li key={entry.id} className="grid grid-cols-4 gap-3 px-3 py-3 text-xs">
                <span>{formatDate(entry.date)}</span>
                <span className={!entry.timeIn ? 'font-medium text-danger' : ''}>{entry.timeIn || 'Missing'}</span>
                <span className={!entry.timeOut ? 'font-medium text-danger' : ''}>{entry.timeOut || 'Missing'}</span>
                <span className="text-text-muted">{entry.source}{entry.verification === 'Pending HR verification' && <span className="mt-0.5 block font-medium text-warning">Pending HR verification</span>}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-5">
        <p role="heading" aria-level={3} className="text-sm font-semibold">Recorded Attendance Summary</p>
        <dl className="mt-3 grid grid-cols-2 gap-4 rounded-control border border-border p-4 sm:grid-cols-4">
          <DataPoint label="Missing Time Entries" value={String(missing)} />
          <DataPoint label="Recorded Late Arrivals" value={String(record.recordedLateArrivals)} />
          <DataPoint label="Recorded Absences" value={String(record.recordedAbsences)} />
          <DataPoint label="Recorded Undertime" value={String(record.recordedUndertime)} />
        </dl>
        <p className="mt-3 text-xs leading-relaxed text-text-muted">
          These are recorded fictional values. Work schedules and grace rules are not configured, so this interface does not calculate attendance penalties or payroll amounts.
        </p>
      </section>

      <section className="mt-5">
        <p role="heading" aria-level={3} className="text-sm font-semibold">Related Approved Leave / Travel / CTO</p>
        {related.length ? (
          <ul className="mt-3 grid gap-2">
            {related.map((item) => (
              <li key={item.id} className="rounded-control bg-canvas p-3 text-sm">
                <p className="font-medium">{item.type}{item.leaveType ? ` · ${item.leaveType}` : ''}</p>
                <p className="mt-1 text-xs text-text-muted">{formatDate(item.startDate)} to {formatDate(item.endDate)}{item.reference ? ` · ${item.reference}` : ''}</p>
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-sm text-text-muted">No related approved records are available.</p>}
      </section>

      <section className="mt-5">
        <p role="heading" aria-level={3} className="text-sm font-semibold">Review Notes</p>
        <p className="mt-2 rounded-control border border-border p-3 text-sm leading-relaxed">{record.reviewNotes}</p>
      </section>
      <div className="mt-5 flex justify-end"><Button type="button" variant="secondary" onClick={onClose}>Close</Button></div>
    </Modal>
  )
}

type ImportRow = {
  employeeId: string
  date: string
  timeIn: string
  timeOut: string
  valid: boolean
  error: string
  overlaps: boolean
}

const validImportRows: ImportRow[] = [
  { employeeId: 'EMP-001', date: '2026-11-03', timeIn: '08:00', timeOut: '17:00', valid: true, error: '', overlaps: true },
  { employeeId: 'EMP-004', date: '2026-11-04', timeIn: '07:59', timeOut: '17:02', valid: true, error: '', overlaps: false },
]
const invalidImportRows: ImportRow[] = [
  { employeeId: 'EMP-001', date: '2026-11-08', timeIn: '08:03', timeOut: '', valid: false, error: 'Missing required Time Out value.', overlaps: false },
  { employeeId: 'EMP-999', date: '11/09/26', timeIn: '25:00', timeOut: '17:00', valid: false, error: 'Unknown Employee ID, invalid prototype date, and invalid time format.', overlaps: false },
]

function ImportWorkflow({
  state,
  setState,
  employees,
  onClose,
  onDone,
}: {
  state: AttendanceModuleState
  setState: Dispatch<SetStateAction<AttendanceModuleState>>
  employees: HrEmployee[]
  onClose: () => void
  onDone: (message: string) => void
}) {
  const [step, setStep] = useState(0)
  const [file, setFile] = useState('')
  const [overlapConfirmed, setOverlapConfirmed] = useState(false)
  const rows = file === 'valid' ? validImportRows : file === 'invalid' ? invalidImportRows : []
  const invalid = rows.some((row) => !row.valid)
  const overlap = rows.some((row) => row.overlaps)

  const confirm = () => {
    setState((current) => {
      let attendanceRecords = current.attendanceRecords.map((record) => ({ ...record, entries: [...record.entries] }))
      rows.filter((row) => row.valid).forEach((row) => {
        const existingRecord = attendanceRecords.find((record) => record.employeeId === row.employeeId && record.period === 'November 2026')
        if (existingRecord) {
          const oldEntry = existingRecord.entries.find((entry) => entry.date === row.date)
          if (oldEntry) {
            existingRecord.entries = existingRecord.entries.map((entry) => entry.id === oldEntry.id ? {
              ...entry,
              timeIn: row.timeIn,
              timeOut: row.timeOut,
              source: 'MyWork Demonstration Import',
              history: [
                ...entry.history,
                ...(entry.timeIn !== row.timeIn ? [{
                  id: `IMPORT-HISTORY-IN-${Date.now()}`,
                  changedAt: new Date().toISOString(),
                  field: 'Time In' as const,
                  previousValue: entry.timeIn || 'Missing',
                  newValue: row.timeIn,
                  reason: 'Explicitly confirmed fictional overlapping import.',
                }] : []),
                ...(entry.timeOut !== row.timeOut ? [{
                  id: `IMPORT-HISTORY-OUT-${Date.now()}`,
                  changedAt: new Date().toISOString(),
                  field: 'Time Out' as const,
                  previousValue: entry.timeOut || 'Missing',
                  newValue: row.timeOut,
                  reason: 'Explicitly confirmed fictional overlapping import.',
                }] : []),
              ],
            } : entry)
          } else {
            existingRecord.entries = [...existingRecord.entries, {
              id: `IMPORTED-ENTRY-${Date.now()}-${row.employeeId}`,
              date: row.date,
              timeIn: row.timeIn,
              timeOut: row.timeOut,
              source: 'MyWork Demonstration Import',
              history: [],
            }]
          }
          existingRecord.source = 'MyWork Demonstration Import'
          existingRecord.reviewNotes = 'Updated through a confirmed fictional demonstration import.'
        } else if (employees.some((employee) => employee.employeeId === row.employeeId)) {
          attendanceRecords = [...attendanceRecords, {
            id: `DEMO-ATT-IMPORTED-${Date.now()}-${row.employeeId}`,
            employeeId: row.employeeId,
            period: 'November 2026',
            source: 'MyWork Demonstration Import',
            entries: [{
              id: `IMPORTED-ENTRY-${Date.now()}-${row.employeeId}`,
              date: row.date,
              timeIn: row.timeIn,
              timeOut: row.timeOut,
              source: 'MyWork Demonstration Import',
              history: [],
            }],
            recordedLateArrivals: 0,
            recordedAbsences: 0,
            recordedUndertime: 0,
            reviewIndicator: 'Available',
            reviewNotes: 'Created through a fictional demonstration import.',
            includedInApprovedPayroll: false,
          }]
        }
      })
      return { ...current, attendanceRecords }
    })
    onDone('Fictional attendance import confirmed locally. No MyWork service or university database was updated.')
    onClose()
  }

  return (
    <Modal title="Import DTR" onClose={onClose} wide>
      <Tag kind="placeholder">Fictional demonstration import · not an official MyWork format</Tag>
      <div className="mt-5 grid grid-cols-3 gap-2">
        {['Select File', 'Validate & Preview', 'Confirm Import'].map((label, index) => (
          <div key={label}>
            <span className={clsx('block h-1.5 rounded-full', index <= step ? 'bg-primary' : 'bg-border')} />
            <p className={clsx('mt-2 text-xs font-semibold', index > step && 'text-text-muted')}>{index + 1}. {label}</p>
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="mt-6">
          <SelectField
            label="Demonstration Attendance File"
            value={file}
            onChange={(event) => { setFile(event.target.value); setOverlapConfirmed(false) }}
            placeholder="Select a fictional file"
            hint="The official MyWork export format and template remain TBD. These options use a prototype-only schema."
          >
            <option value="valid">DEMO_MyWork_Nov2026_Valid.prototype</option>
            <option value="invalid">DEMO_MyWork_Nov2026_Invalid.prototype</option>
          </SelectField>
          {file && (
            <dl className="mt-4 grid gap-3 rounded-control bg-canvas p-4 sm:grid-cols-2">
              <DataPoint label="Selected Filename" value={file === 'valid' ? 'DEMO_MyWork_Nov2026_Valid.prototype' : 'DEMO_MyWork_Nov2026_Invalid.prototype'} />
              <DataPoint label="File Information" value={`${rows.length} fictional data rows · Prototype schema`} />
            </dl>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="mt-6">
          {invalid && <Alert tone="danger" title="The selected attendance file contains information that needs correction.">Choose a valid demonstration file to continue. Invalid rows are never silently accepted.</Alert>}
          {overlap && (
            <div className="mt-3">
              <Alert tone="warning" title="Overlapping attendance record">
                EMP-001 already has an entry for November 3, 2026. Confirm replacement before continuing; previous values will be retained in local history.
              </Alert>
            </div>
          )}
          <div className="mt-4 overflow-hidden rounded-control border border-border">
            <div className="hidden grid-cols-7 gap-2 border-b border-border bg-canvas px-3 py-2 text-xs font-semibold text-text-muted sm:grid">
              <span>Row</span><span>Employee ID</span><span>Date</span><span>Time In</span><span>Time Out</span><span>Result</span><span>Error Reason</span>
            </div>
            <ul className="divide-y divide-border">
              {rows.map((row, index) => (
                <li key={`${row.employeeId}-${index}`} className="grid gap-2 p-3 text-xs sm:grid-cols-7">
                  <span>Row {index + 1}</span><span>{row.employeeId}</span><span>{row.date}</span><span>{row.timeIn || 'Missing'}</span><span>{row.timeOut || 'Missing'}</span>
                  <span className={row.valid ? 'font-semibold text-success' : 'font-semibold text-danger'}>{row.valid ? row.overlaps ? 'Valid · Overlap' : 'Valid' : 'Invalid'}</span>
                  <span className="text-text-muted">{row.error || '—'}</span>
                </li>
              ))}
            </ul>
          </div>
          {overlap && !invalid && (
            <div className="mt-4">
              <ConfirmCheck checked={overlapConfirmed} onChange={() => setOverlapConfirmed((value) => !value)}>
                Replace the overlapping fictional entry and preserve its previous values in local demonstration history.
              </ConfirmCheck>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="mt-6">
          <dl className="grid grid-cols-2 gap-4 rounded-control bg-canvas p-4 sm:grid-cols-4">
            <DataPoint label="Total Available Rows" value={String(rows.length)} />
            <DataPoint label="Valid Rows" value={String(rows.filter((row) => row.valid).length)} />
            <DataPoint label="Invalid Rows" value={String(rows.filter((row) => !row.valid).length)} />
            <DataPoint label="Overlapping Records" value={String(rows.filter((row) => row.overlaps).length)} />
          </dl>
          <p className="mt-3 text-sm"><span className="text-text-muted">Selected import action: </span><span className="font-medium">{overlap ? 'Import valid rows and replace the confirmed overlapping entry' : 'Import valid rows'}</span></p>
          <div className="mt-4">
            <Alert tone="info" title="Ready for local demonstration import">
              {rows.length} valid rows will update the November 2026 attendance dataset. {overlap ? 'One overlapping entry will be replaced with history retained.' : 'No overlaps were found.'}
            </Alert>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-text-muted">No actual MyWork data is imported, no backend is called, and no immutable audit entry is created.</p>
        </div>
      )}

      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-between">
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          {step > 0 && <Button type="button" variant="secondary" onClick={() => setStep((value) => value - 1)}>Back</Button>}
        </div>
        {step < 2 ? (
          <Button type="button" onClick={() => setStep((value) => value + 1)} disabled={!file || (step === 1 && (invalid || (overlap && !overlapConfirmed)))}>Continue</Button>
        ) : (
          <Button type="button" onClick={confirm}>Confirm Import</Button>
        )}
      </div>
    </Modal>
  )
}

function ConcernWorkspace({
  concern,
  record,
  employee,
  onBack,
  onCorrect,
}: {
  concern: AttendanceConcern
  record: AttendanceRecord
  employee: HrEmployee
  onBack: () => void
  onCorrect: (value: string, reason: string, reference: string) => void
}) {
  const entry = record.entries.find((item) => item.date === concern.date)
  const previousValue = concern.missingField === 'Time In' ? entry?.timeIn : entry?.timeOut
  const [correctedValue, setCorrectedValue] = useState('')
  const [reason, setReason] = useState('')
  const [reference, setReference] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const submit = () => {
    const next: Record<string, string> = {}
    if (!previousValue && !correctedValue) next.correctedValue = 'Enter the corrected attendance value.'
    if (!reason.trim()) next.reason = previousValue && !correctedValue ? 'Enter the basis for verifying the recorded value.' : 'Enter a reason for the correction.'
    if (!confirmed) next.confirmed = 'Confirm this local demonstration correction.'
    setErrors(next)
    if (!Object.keys(next).length) onCorrect(correctedValue, reason.trim(), reference.trim())
  }

  return (
    <div className="grid gap-6 font-sans">
      <div>
        <Button type="button" variant="link" onClick={onBack} className="-ml-1 mb-3"><Icon name="arrowLeft" size={16} /> Back to Attendance Concerns</Button>
        <p id="page-title" role="heading" aria-level={1} tabIndex={-1} className="text-2xl font-semibold leading-tight sm:text-3xl">Review Attendance Concern</p>
        <p className="mt-2 text-sm text-text-muted">{concern.id} · Fictional demonstration concern</p>
      </div>

      <section className="rounded-card bg-surface p-5 elevate sm:p-6">
        <p role="heading" aria-level={2} className="text-lg font-semibold">Concern Information</p>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DataPoint label="Employee" value={employee.name} />
          <DataPoint label="Employee ID" value={employee.employeeId} />
          <DataPoint label="Payroll Period" value={concern.period} />
          <DataPoint label="Attendance Date" value={formatDate(concern.date)} />
          <DataPoint label="Concern" value={concern.concern} />
          <DataPoint label={concern.concern.startsWith('Missing') ? 'Missing Time Entry' : 'Time Entry To Verify'} value={concern.missingField} />
          <DataPoint label="Recorded Time In" value={entry?.timeIn || 'Missing'} muted={!entry?.timeIn} />
          <DataPoint label="Recorded Time Out" value={entry?.timeOut || 'Missing'} muted={!entry?.timeOut} />
          <DataPoint label="Employee Explanation" value={concern.employeeExplanation || 'Not provided'} muted={!concern.employeeExplanation} />
          <DataPoint label="Logbook Reference" value={concern.logbookReference || 'Not available'} muted={!concern.logbookReference} />
          <DataPoint label="Supervisor Verification" value={concern.supervisorVerification || 'Not recorded'} muted={!concern.supervisorVerification} />
          <DataPoint label="Previous Review Notes" value={concern.previousReviewNotes || 'None'} muted={!concern.previousReviewNotes} />
        </dl>
      </section>

      {concern.includedInApprovedPayroll || record.includedInApprovedPayroll ? (
        <Alert tone="danger" title="Read-only approved-payroll record">
          This attendance information is marked as incorporated into an approved payroll. It cannot be corrected in this prototype, and the original record is preserved.
        </Alert>
      ) : concern.hrVerification ? (
        <section className="rounded-card bg-surface p-5 elevate sm:p-6">
          <p role="heading" aria-level={2} className="text-lg font-semibold">Recorded HR Verification / Correction</p>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <DataPoint label="Previous Value" value={entry?.history.filter((item) => item.field === concern.missingField).at(-1)?.previousValue ?? (previousValue || 'Missing')} />
            <DataPoint label="Corrected Value" value={concern.hrVerification.correctedValue} />
            <DataPoint label="Reason" value={concern.hrVerification.reason} />
            <DataPoint label="Supporting Reference" value={concern.hrVerification.reference || 'Not provided'} muted={!concern.hrVerification.reference} />
          </dl>
          <p className="mt-4 text-xs text-text-muted">Recorded locally for demonstration. This is not a real authorized university correction.</p>
        </section>
      ) : (
        <section className="rounded-card bg-surface p-5 elevate sm:p-6">
          <p role="heading" aria-level={2} className="text-lg font-semibold">Record HR Verification / Correction</p>
          <div className="mt-4">
            {concern.logbookReference && concern.supervisorVerification ? (
              <Alert tone="info" title="Supervisor verification evidence recorded">A supporting logbook reference and fictional supervisor verification are available. HR must still deliberately record any correction.</Alert>
            ) : (
              <Alert tone="warning" title="HR verification required">No complete logbook-supported supervisor verification is available. An employee explanation alone does not verify the entry.</Alert>
            )}
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-control bg-canvas p-4">
              <p className="text-xs text-text-muted">Previous Value</p>
              <p className="mt-1 text-sm font-semibold">{previousValue || 'Missing'}</p>
            </div>
            <TextField label={previousValue ? 'Corrected Attendance Value (leave blank to verify the recorded value)' : 'Corrected Attendance Value'} type="time" value={correctedValue} onChange={(event) => setCorrectedValue(event.target.value)} error={errors.correctedValue} />
            <TextField label={previousValue && !correctedValue ? 'Verification Basis / Reason' : 'Reason for Correction'} value={reason} onChange={(event) => setReason(event.target.value)} error={errors.reason} />
            <TextField label="Verification Basis / Reference (optional)" value={reference} onChange={(event) => setReference(event.target.value)} />
          </div>
          <div className="mt-4">
            <ConfirmCheck checked={confirmed} onChange={() => setConfirmed((value) => !value)}>
              Confirm this local demonstration correction and preserve the previous value in history.
            </ConfirmCheck>
            {errors.confirmed && <p className="mt-2 text-xs font-medium text-danger">{errors.confirmed}</p>}
          </div>
          <div className="mt-5 flex justify-end"><Button type="button" onClick={submit}>Record HR Verification / Correction</Button></div>
        </section>
      )}
    </div>
  )
}

type ApprovedDraft = {
  employeeId: string
  type: ApprovedRecordType | ''
  leaveType: string
  startDate: string
  endDate: string
  reference: string
  notes: string
  correctionReason: string
}

function ApprovedRecordForm({
  employees,
  record,
  onClose,
  onSave,
}: {
  employees: HrEmployee[]
  record?: ApprovedRecord
  onClose: () => void
  onSave: (draft: ApprovedDraft) => void
}) {
  const [draft, setDraft] = useState<ApprovedDraft>({
    employeeId: record?.employeeId ?? '',
    type: record?.type ?? '',
    leaveType: record?.leaveType ?? '',
    startDate: record?.startDate ?? '',
    endDate: record?.endDate ?? '',
    reference: record?.reference ?? '',
    notes: record?.notes ?? '',
    correctionReason: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = <K extends keyof ApprovedDraft>(key: K, value: ApprovedDraft[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const next: Record<string, string> = {}
    if (!draft.employeeId) next.employeeId = 'Select an existing employee.'
    if (!draft.type) next.type = 'Select a record type.'
    if (draft.type === 'Approved Leave' && !draft.leaveType.trim()) next.leaveType = 'Enter the approved leave type.'
    if (!draft.startDate) next.startDate = 'Enter the start date.'
    if (!draft.endDate) next.endDate = 'Enter the end date.'
    if (draft.startDate && draft.endDate && draft.startDate > draft.endDate) next.endDate = 'End date must be on or after the start date.'
    if (record && !draft.correctionReason.trim()) next.correctionReason = 'Enter a reason for this correction.'
    setErrors(next)
    if (!Object.keys(next).length) onSave(draft)
  }
  const referenceLabel = draft.type === 'Approved Official Travel'
    ? 'Approved Travel Supporting Reference'
    : draft.type === 'Approved Compensatory Time-Off (CTO)'
      ? 'Approved CTO Supporting Reference'
      : 'Approved Document / Supporting Reference'
  return (
    <Modal title={record ? 'Edit Approved Record' : 'Add Approved Record'} onClose={onClose} wide>
      <form onSubmit={submit} noValidate className="grid gap-4">
        <SelectField label="Employee" value={draft.employeeId} onChange={(event) => set('employeeId', event.target.value)} placeholder="Select employee" error={errors.employeeId} disabled={Boolean(record)}>
          {employees.map((employee) => <option key={employee.employeeId} value={employee.employeeId}>{employee.employeeId} · {employee.name}</option>)}
        </SelectField>
        <SelectField label="Record Type" value={draft.type} onChange={(event) => set('type', event.target.value as ApprovedRecordType)} placeholder="Select record type" error={errors.type}>
          <option value="Approved Leave">Approved Leave</option>
          <option value="Approved Official Travel">Approved Official Travel</option>
          <option value="Approved Compensatory Time-Off (CTO)">Approved Compensatory Time-Off (CTO)</option>
        </SelectField>
        {draft.type === 'Approved Leave' && <TextField label="Leave Type" value={draft.leaveType} onChange={(event) => set('leaveType', event.target.value)} error={errors.leaveType} placeholder="Use the approved record's leave type" />}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Start Date" type="date" value={draft.startDate} onChange={(event) => set('startDate', event.target.value)} error={errors.startDate} />
          <TextField label="End Date" type="date" value={draft.endDate} onChange={(event) => set('endDate', event.target.value)} error={errors.endDate} />
        </div>
        <TextField label={referenceLabel} value={draft.reference} onChange={(event) => set('reference', event.target.value)} placeholder="Optional fictional approval reference" />
        <TextField label="Notes (optional)" value={draft.notes} onChange={(event) => set('notes', event.target.value)} />
        {record && <TextField label="Correction Reason" value={draft.correctionReason} onChange={(event) => set('correctionReason', event.target.value)} error={errors.correctionReason} />}
        <Alert tone="info" title="Already-approved information only">
          This records an existing fictional approval. It does not approve leave, issue a Travel Order, calculate leave pay, or convert CTO into salary.
        </Alert>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save Record</Button>
        </div>
      </form>
    </Modal>
  )
}

function ApprovedRecordDetails({
  record,
  employee,
  onClose,
}: {
  record: ApprovedRecord
  employee: HrEmployee
  onClose: () => void
}) {
  return (
    <Modal title="Approved Record Details" onClose={onClose} wide>
      {record.includedInApprovedPayroll && (
        <Alert tone="warning" title="Read-only approved-payroll record">
          This fictional record is marked as incorporated into an approved payroll and cannot be corrected.
        </Alert>
      )}
      <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
        <DataPoint label="Employee" value={`${employee.name} (${employee.employeeId})`} />
        <DataPoint label="Record Type" value={record.type} />
        {record.leaveType && <DataPoint label="Leave Type" value={record.leaveType} />}
        <DataPoint label="Start Date" value={formatDate(record.startDate)} />
        <DataPoint label="End Date" value={formatDate(record.endDate)} />
        <DataPoint label="Approval Reference" value={record.reference || 'Not provided'} muted={!record.reference} />
        <DataPoint label="Notes" value={record.notes || 'No notes provided'} muted={!record.notes} />
      </dl>
      <section className="mt-5">
        <p role="heading" aria-level={3} className="text-sm font-semibold">Record History</p>
        {record.history.length ? (
          <ul className="mt-3 grid gap-2">
            {record.history.map((item) => (
              <li key={item.id} className="rounded-control border border-border p-3 text-sm">
                <p className="font-medium">{item.previousValue} → {item.newValue}</p>
                <p className="mt-1 text-xs text-text-muted">{dateFormat.format(new Date(item.changedAt))} · {item.reason}</p>
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-sm text-text-muted">No corrections have been recorded.</p>}
      </section>
      <div className="mt-5 flex justify-end"><Button type="button" variant="secondary" onClick={onClose}>Close</Button></div>
    </Modal>
  )
}

const periodLabel = (date: string) => new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))

type ManualDraft = {
  employeeId: string
  date: string
  timeIn: string
  timeOut: string
  explanation: string
  verification: 'Pending HR verification' | 'Supervisor signature on file' | 'HR verified'
}

function ManualEntryForm({
  employees,
  state,
  onClose,
  onSave,
}: {
  employees: HrEmployee[]
  state: AttendanceModuleState
  onClose: () => void
  onSave: (draft: ManualDraft) => void
}) {
  const [draft, setDraft] = useState<ManualDraft>({ employeeId: '', date: '', timeIn: '', timeOut: '', explanation: '', verification: 'Pending HR verification' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const dirty = Boolean(draft.employeeId || draft.date || draft.timeIn || draft.timeOut || draft.explanation)
  const set = <K extends keyof ManualDraft>(key: K, value: ManualDraft[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const label = draft.date ? periodLabel(draft.date) : ''
  const locked = state.attendanceRecords.some((record) => record.employeeId === draft.employeeId && record.period === label && record.includedInApprovedPayroll)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const next: Record<string, string> = {}
    if (!draft.employeeId) next.employeeId = 'Select an existing employee.'
    if (!draft.date) next.date = 'Enter the attendance date.'
    if (!draft.timeIn && !draft.timeOut) next.timeIn = 'Enter a Time In, a Time Out, or both.'
    if (draft.timeIn && draft.timeOut && draft.timeOut <= draft.timeIn) next.timeOut = 'Time Out must be later than Time In.'
    if (!draft.explanation.trim()) next.explanation = 'Enter an explanation or supporting reference.'
    if (draft.employeeId && draft.date && state.attendanceRecords.some((record) => record.employeeId === draft.employeeId && record.entries.some((entry) => entry.date === draft.date))) {
      next.date = 'An attendance entry already exists for this employee and date. Use Review Concern or Import DTR to change it.'
    }
    if (locked) next.date = 'This employee’s attendance for the period is part of an approved payroll and is locked.'
    setErrors(next)
    if (!Object.keys(next).length) onSave(draft)
  }

  const close = () => (dirty ? setConfirmDiscard(true) : onClose())

  return (
    <>
      <Modal title="Add Manual Attendance Entry" onClose={close} wide>
        <form onSubmit={submit} noValidate className="grid gap-4">
          <p className="-mt-2 text-sm text-text-muted">Record an attendance entry that is not in an imported file. Manual entries need HR verification or a supervisor signature before payroll use.</p>
          <SelectField label="Employee" value={draft.employeeId} onChange={(event) => set('employeeId', event.target.value)} placeholder="Select employee" error={errors.employeeId}>
            {employees.map((employee) => <option key={employee.employeeId} value={employee.employeeId}>{employee.employeeId} · {employee.name}</option>)}
          </SelectField>
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField label="Attendance Date" type="date" value={draft.date} onChange={(event) => set('date', event.target.value)} error={errors.date} />
            <TextField label="Time In" type="time" value={draft.timeIn} onChange={(event) => set('timeIn', event.target.value)} error={errors.timeIn} />
            <TextField label="Time Out" type="time" value={draft.timeOut} onChange={(event) => set('timeOut', event.target.value)} error={errors.timeOut} />
          </div>
          <div className="rounded-control bg-canvas p-3 text-sm"><span className="text-text-muted">Related Payroll Period: </span><span className="font-medium">{label || 'Set by the attendance date'}</span></div>
          <TextField label="Explanation / Supporting Reference" value={draft.explanation} onChange={(event) => set('explanation', event.target.value)} error={errors.explanation} />
          <SelectField label="Verification Information" value={draft.verification} onChange={(event) => set('verification', event.target.value as ManualDraft['verification'])} hint="Only choose a verified option when that verification already exists. Pending entries are not used for payroll.">
            <option value="Pending HR verification">Pending HR verification</option>
            <option value="Supervisor signature on file">Supervisor signature on file</option>
            <option value="HR verified">HR verified</option>
          </SelectField>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={close}>Cancel</Button>
            <Button type="submit">Save Entry</Button>
          </div>
        </form>
      </Modal>
      {confirmDiscard && (
        <Modal title="Discard this entry?" onClose={() => setConfirmDiscard(false)}>
          <p className="text-sm text-text-muted">You have unsaved changes. Discarding closes the form without saving.</p>
          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setConfirmDiscard(false)}>Keep Editing</Button>
            <Button type="button" onClick={onClose}>Discard Changes</Button>
          </div>
        </Modal>
      )}
    </>
  )
}

export function AttendanceLeave({
  employees,
  state,
  setState,
  initialTab = 'attendance',
}: {
  employees: HrEmployee[]
  state: AttendanceModuleState
  setState: Dispatch<SetStateAction<AttendanceModuleState>>
  initialTab?: Tab
}) {
  const [tab, setTab] = useState<Tab>(initialTab)
  const [manualOpen, setManualOpen] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [query, setQuery] = useState('')
  const [classification, setClassification] = useState('')
  const [period, setPeriod] = useState('')
  const [source, setSource] = useState('')
  const [concernType, setConcernType] = useState('')
  const [approvedType, setApprovedType] = useState('')
  const [attendanceId, setAttendanceId] = useState<string | null>(null)
  const [concernId, setConcernId] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [approvedEditor, setApprovedEditor] = useState<{ recordId?: string } | null>(null)
  const [approvedViewId, setApprovedViewId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [dataState, setDataState] = useState<DataState>('loaded')

  const records = dataState === 'loaded' ? state.attendanceRecords : []
  const concerns = dataState === 'loaded' ? state.concerns : []
  const approvedRecords = dataState === 'loaded' ? state.approvedRecords : []
  const periods = useMemo(() => [...new Set(state.attendanceRecords.map((record) => record.period))].sort().reverse(), [state.attendanceRecords])
  const selectedAttendance = state.attendanceRecords.find((record) => record.id === attendanceId)
  const selectedAttendanceEmployee = selectedAttendance ? employees.find((employee) => employee.employeeId === selectedAttendance.employeeId) : undefined
  const selectedConcern = state.concerns.find((item) => item.id === concernId)
  const selectedConcernRecord = selectedConcern ? state.attendanceRecords.find((record) => record.id === selectedConcern.attendanceRecordId) : undefined
  const selectedConcernEmployee = selectedConcern ? employees.find((employee) => employee.employeeId === selectedConcern.employeeId) : undefined
  const editApproved = approvedEditor?.recordId ? state.approvedRecords.find((record) => record.id === approvedEditor.recordId) : undefined
  const viewApproved = approvedViewId ? state.approvedRecords.find((record) => record.id === approvedViewId) : undefined
  const viewApprovedEmployee = viewApproved ? employees.find((employee) => employee.employeeId === viewApproved.employeeId) : undefined

  const attendanceFiltered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return records.filter((record) => {
      const employee = employees.find((item) => item.employeeId === record.employeeId)
      if (!employee) return false
      if (classification && employee.classification !== classification) return false
      if (period && record.period !== period) return false
      if (source && record.source !== source) return false
      return !term || [employee.name, employee.employeeId].some((value) => value.toLowerCase().includes(term))
    })
  }, [records, employees, query, classification, period, source])

  const concernFiltered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return concerns.filter((concern) => {
      const employee = employees.find((item) => item.employeeId === concern.employeeId)
      if (!employee) return false
      if (period && concern.period !== period) return false
      if (concernType && concern.concern !== concernType) return false
      return !term || [employee.name, employee.employeeId, concern.concern].some((value) => value.toLowerCase().includes(term))
    })
  }, [concerns, employees, query, period, concernType])

  const approvedFiltered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return approvedRecords.filter((record) => {
      const employee = employees.find((item) => item.employeeId === record.employeeId)
      if (!employee) return false
      if (approvedType && record.type !== approvedType) return false
      if (dateFrom && record.endDate < dateFrom) return false
      if (dateTo && record.startDate > dateTo) return false
      return !term || [employee.name, employee.employeeId, record.reference ?? ''].some((value) => value.toLowerCase().includes(term))
    })
  }, [approvedRecords, employees, query, approvedType, dateFrom, dateTo])

  const resetKey = `${tab}|${query}|${classification}|${period}|${source}|${concernType}|${approvedType}|${dateFrom}|${dateTo}`
  const attendancePaging = usePaged(attendanceFiltered, 6, resetKey)
  const concernPaging = usePaged(concernFiltered, 6, resetKey)
  const approvedPaging = usePaged(approvedFiltered, 6, resetKey)
  const clearFilters = () => {
    setQuery('')
    setClassification('')
    setPeriod('')
    setSource('')
    setConcernType('')
    setApprovedType('')
    setDateFrom('')
    setDateTo('')
  }
  const switchTab = (next: Tab) => {
    setTab(next)
    clearFilters()
  }
  const filtering = Boolean(query || classification || period || source || concernType || approvedType || dateFrom || dateTo)

  const correctConcern = (value: string, reason: string, reference: string) => {
    if (!selectedConcern || !selectedConcernRecord) return
    if (selectedConcern.hrVerification || selectedConcern.includedInApprovedPayroll || selectedConcernRecord.includedInApprovedPayroll) return
    const field = selectedConcern.missingField === 'Time In' ? 'timeIn' : 'timeOut'
    const now = new Date().toISOString()
    setState((current) => ({
      ...current,
      concerns: current.concerns.map((concern) => concern.id === selectedConcern.id ? {
        ...concern,
        hrVerification: {
          correctedValue: value || (selectedConcernRecord.entries.find((entry) => entry.date === selectedConcern.date)?.[field] ?? ''),
          reason,
          reference: reference || undefined,
          reviewedAt: now,
        },
        previousReviewNotes: 'HR verification recorded locally; previous attendance value retained in history.',
      } : concern),
      attendanceRecords: current.attendanceRecords.map((record) => {
        if (record.id !== selectedConcernRecord.id) return record
        const entries = record.entries.map((entry) => entry.date === selectedConcern.date ? {
          ...entry,
          [field]: value || entry[field],
          verification: 'Verified' as const,
          history: value && value !== entry[field] ? [...entry.history, {
            id: `DEMO-CORRECTION-${Date.now()}`,
            changedAt: now,
            field: selectedConcern.missingField,
            previousValue: entry[field] || 'Missing',
            newValue: value,
            reason,
            reference: reference || undefined,
          }] : entry.history,
        } : entry)
        const stillOpen = current.concerns.some((concern) => concern.attendanceRecordId === record.id && concern.id !== selectedConcern.id && !concern.hrVerification)
        return {
          ...record,
          entries,
          reviewIndicator: stillOpen ? record.reviewIndicator : 'Available' as const,
          reviewNotes: 'Attendance concern verified or corrected locally for demonstration; previous value retained.',
        }
      }),
    }))
    setNotice('Attendance record updated in the demonstration. The previous value is kept in local history.')
    setConcernId(null)
  }

  const saveManual = (draft: ManualDraft) => {
    const label = periodLabel(draft.date)
    const verified = draft.verification !== 'Pending HR verification'
    const now = Date.now()
    const entry = {
      id: `MANUAL-ENTRY-${now}`,
      date: draft.date,
      timeIn: draft.timeIn,
      timeOut: draft.timeOut,
      source: 'Manual Record' as const,
      verification: verified ? ('Verified' as const) : ('Pending HR verification' as const),
      history: [],
    }
    setState((current) => {
      const existing = current.attendanceRecords.find((record) => record.employeeId === draft.employeeId && record.period === label)
      const recordId = existing?.id ?? `DEMO-ATT-MANUAL-${now}`
      const attendanceRecords = existing
        ? current.attendanceRecords.map((record) => record.id === existing.id ? {
          ...record,
          entries: [...record.entries, entry],
          reviewIndicator: verified ? record.reviewIndicator : ('Has Concerns' as const),
          reviewNotes: verified ? record.reviewNotes : 'Manual entry requires HR verification before payroll use.',
        } : record)
        : [...current.attendanceRecords, {
          id: recordId,
          employeeId: draft.employeeId,
          period: label,
          source: 'Manual Record' as const,
          entries: [entry],
          recordedLateArrivals: 0,
          recordedAbsences: 0,
          recordedUndertime: 0,
          reviewIndicator: verified ? ('Available' as const) : ('Has Concerns' as const),
          reviewNotes: verified ? 'Manual entry recorded with verification information.' : 'Manual entry requires HR verification before payroll use.',
          includedInApprovedPayroll: false,
        }]
      const concerns = verified ? current.concerns : [...current.concerns, {
        id: `DEMO-CONCERN-MANUAL-${now}`,
        attendanceRecordId: recordId,
        employeeId: draft.employeeId,
        period: label,
        date: draft.date,
        concern: !draft.timeIn ? 'Missing Time In' as const : !draft.timeOut ? 'Missing Time Out' as const : 'Attendance Entry Requiring Verification' as const,
        missingField: !draft.timeIn ? 'Time In' as const : 'Time Out' as const,
        employeeExplanation: draft.explanation,
        previousReviewNotes: 'Manual entry saved without verification. HR verification is required before payroll use.',
        includedInApprovedPayroll: false,
      }]
      return { ...current, attendanceRecords, concerns }
    })
    setNotice(verified
      ? 'Manual attendance entry saved in the demonstration with the recorded verification information.'
      : 'Manual attendance entry saved as pending HR verification. It is not verified and is not used for payroll.')
    setManualOpen(false)
  }

  const saveApproved = (draft: ApprovedDraft) => {
    if (editApproved) {
      const previous = `${editApproved.type}: ${editApproved.startDate} to ${editApproved.endDate}`
      const next = `${draft.type}: ${draft.startDate} to ${draft.endDate}`
      setState((current) => ({
        ...current,
        approvedRecords: current.approvedRecords.map((record) => record.id === editApproved.id ? {
          ...record,
          type: draft.type as ApprovedRecordType,
          leaveType: draft.type === 'Approved Leave' ? draft.leaveType.trim() : undefined,
          startDate: draft.startDate,
          endDate: draft.endDate,
          reference: draft.reference.trim() || undefined,
          notes: draft.notes.trim() || undefined,
          history: [...record.history, {
            id: `DEMO-APPROVED-HISTORY-${Date.now()}`,
            changedAt: new Date().toISOString(),
            previousValue: previous,
            newValue: next,
            reason: draft.correctionReason.trim(),
          }],
        } : record),
      }))
      setNotice('Approved record corrected locally with the original values preserved in history.')
    } else {
      setState((current) => ({
        ...current,
        approvedRecords: [...current.approvedRecords, {
          id: `DEMO-APPROVED-${Date.now()}`,
          employeeId: draft.employeeId,
          type: draft.type as ApprovedRecordType,
          leaveType: draft.type === 'Approved Leave' ? draft.leaveType.trim() : undefined,
          startDate: draft.startDate,
          endDate: draft.endDate,
          reference: draft.reference.trim() || undefined,
          notes: draft.notes.trim() || undefined,
          history: [],
          includedInApprovedPayroll: false,
        }],
      }))
      setNotice('Already-approved information recorded locally. No leave or travel approval was issued.')
    }
    setApprovedEditor(null)
  }

  if (selectedConcern && selectedConcernRecord && selectedConcernEmployee) {
    return <ConcernWorkspace concern={selectedConcern} record={selectedConcernRecord} employee={selectedConcernEmployee} onBack={() => setConcernId(null)} onCorrect={correctConcern} />
  }

  return (
    <>
      <div className="grid gap-6 font-sans">
        <div>
          <p id="page-title" role="heading" aria-level={1} tabIndex={-1} className="text-2xl font-semibold leading-tight sm:text-3xl">Attendance &amp; Leave</p>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">Review employee attendance, resolve attendance concerns, and record approved leave and travel.</p>
          <div className="mt-2"><Tag kind="placeholder">Prototype · fictional attendance information</Tag></div>
        </div>

        {notice && (
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1"><Alert tone="success" title="Local demonstration update">{notice}</Alert></div>
            <Button type="button" variant="link" onClick={() => setNotice('')}>Dismiss</Button>
          </div>
        )}

        <section className="overflow-hidden rounded-card bg-surface elevate">
          <div className="border-b border-border p-5 sm:p-6">
            <div role="tablist" aria-label="Attendance and leave views" className="grid gap-1 rounded-control bg-canvas p-1 sm:grid-cols-3">
              {([
                ['attendance', 'Attendance Records'],
                ['concerns', 'Attendance Concerns'],
                ['approved', 'Approved Leave & Travel'],
              ] as const).map(([id, label]) => (
                <Button key={id} type="button" variant={tab === id ? 'primary' : 'secondary'} role="tab" aria-selected={tab === id} onClick={() => switchTab(id)} className={clsx('h-11 border-0 shadow-none', tab !== id && 'bg-transparent text-text-muted')}>{label}</Button>
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p role="heading" aria-level={2} className="text-lg font-semibold">
                  {tab === 'attendance' ? 'Attendance Records' : tab === 'concerns' ? 'Attendance Concerns' : 'Approved Leave & Travel'}
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  {tab === 'attendance'
                    ? 'Review available employee attendance information.'
                    : tab === 'concerns'
                      ? 'Review missing time entries and attendance information requiring verification.'
                      : 'Maintain records of approved leave, official travel, and compensatory time-off.'}
                </p>
              </div>
              {tab === 'attendance' && <div className="flex flex-col gap-2 sm:flex-row"><Button type="button" variant="secondary" onClick={() => setManualOpen(true)}><Icon name="plus" size={17} /> Add Manual Entry</Button><Button type="button" onClick={() => setImportOpen(true)}><Icon name="plus" size={17} /> Import DTR</Button></div>}
              {tab === 'concerns' && <Button type="button" variant="secondary" onClick={() => setManualOpen(true)}><Icon name="plus" size={17} /> Add Manual Entry</Button>}
              {tab === 'approved' && <Button type="button" onClick={() => setApprovedEditor({})}><Icon name="plus" size={17} /> Add Approved Record</Button>}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <TextField label="Search" icon="search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tab === 'attendance' ? 'Search employees...' : 'Search records...'} className="sm:col-span-2" />
              {tab === 'attendance' && <>
                <SelectField label="Employee Classification" value={classification} onChange={(event) => setClassification(event.target.value)} placeholder="All classifications"><option value="Faculty">Faculty</option><option value="Staff">Staff</option></SelectField>
                <SelectField label="Payroll Period" value={period} onChange={(event) => setPeriod(event.target.value)} placeholder="All periods">{periods.map((item) => <option key={item} value={item}>{item}</option>)}</SelectField>
                <SelectField label="Attendance Source" value={source} onChange={(event) => setSource(event.target.value)} placeholder="All sources"><option value="MyWork Demonstration Import">MyWork Demonstration Import</option><option value="Manual Record">Manual Record</option></SelectField>
              </>}
              {tab === 'concerns' && <>
                <SelectField label="Payroll Period" value={period} onChange={(event) => setPeriod(event.target.value)} placeholder="All periods">{periods.map((item) => <option key={item} value={item}>{item}</option>)}</SelectField>
                <SelectField label="Concern Type" value={concernType} onChange={(event) => setConcernType(event.target.value)} placeholder="All concern types"><option value="Missing Time In">Missing Time In</option><option value="Missing Time Out">Missing Time Out</option><option value="Attendance Entry Requiring Verification">Attendance Entry Requiring Verification</option></SelectField>
              </>}
              {tab === 'approved' && <><TextField label="From Date" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /><TextField label="To Date" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></>}
              {tab === 'approved' && <SelectField label="Record Type" value={approvedType} onChange={(event) => setApprovedType(event.target.value)} placeholder="All record types"><option value="Approved Leave">Approved Leave</option><option value="Approved Official Travel">Approved Official Travel</option><option value="Approved Compensatory Time-Off (CTO)">Approved Compensatory Time-Off (CTO)</option></SelectField>}
              <Button type="button" variant="secondary" onClick={clearFilters} disabled={!filtering} className="w-full self-end">Clear Filters</Button>
            </div>
          </div>

          {dataState === 'error' ? (
            <EmptyState title="Unable to load attendance information. Please try again." action={<Button type="button" onClick={() => setDataState('loaded')}>Retry</Button>} />
          ) : tab === 'attendance' ? (
            attendanceFiltered.length ? (
              <>
                <div className="hidden xl:block">
                  <table className="w-full table-fixed text-left text-xs">
                    <colgroup><col className="w-[19%]" /><col className="w-[9%]" /><col className="w-[12%]" /><col className="w-[15%]" /><col className="w-[24%]" /><col className="w-[13%]" /><col className="w-[8%]" /></colgroup>
                    <thead><tr className="border-b border-border bg-canvas text-text-muted">{['Employee', 'Class.', 'Payroll Period', 'Attendance Source', 'Attendance Summary', 'Review Indicator'].map((heading) => <th key={heading} className="px-3 py-3 font-semibold">{heading}</th>)}<th className="px-3 py-3 text-right font-semibold">Actions</th></tr></thead>
                    <tbody className="divide-y divide-border">{attendancePaging.visible.map((record) => {
                      const employee = employees.find((item) => item.employeeId === record.employeeId)!
                      const missing = record.entries.filter((entry) => !entry.timeIn || !entry.timeOut).length
                      return <tr key={record.id} className="hover:bg-info-soft/30">
                        <td className="px-3 py-3"><p className="font-semibold">{employee.name}</p><p className="mt-0.5 text-text-muted">{employee.employeeId}</p></td>
                        <td className="px-3 py-3">{employee.classification}</td>
                        <td className="px-3 py-3">{record.period}</td>
                        <td className="break-words px-3 py-3">{record.source}</td>
                        <td className="px-3 py-3 leading-relaxed">{record.entries.length} daily entries · {missing} missing · {record.recordedLateArrivals} recorded late · {record.recordedAbsences} recorded absences</td>
                        <td className="px-3 py-3"><ReviewIndicator indicator={record.reviewIndicator} /></td>
                        <td className="px-3 py-3 text-right"><Button type="button" variant="link" onClick={() => setAttendanceId(record.id)} className="whitespace-nowrap text-xs">View</Button></td>
                      </tr>
                    })}</tbody>
                  </table>
                </div>
                <ul className="divide-y divide-border xl:hidden">{attendancePaging.visible.map((record) => {
                  const employee = employees.find((item) => item.employeeId === record.employeeId)!
                  return <li key={record.id} className="p-5"><div className="flex justify-between gap-3"><div><p className="font-semibold">{employee.name}</p><p className="text-xs text-text-muted">{employee.employeeId} · {employee.classification}</p></div><ReviewIndicator indicator={record.reviewIndicator} /></div><p className="mt-3 text-sm">{record.period} · {record.source}</p><p className="mt-1 text-xs text-text-muted">{record.entries.length} daily entries · {record.recordedLateArrivals} recorded late · {record.recordedAbsences} recorded absences</p><Button type="button" variant="secondary" onClick={() => setAttendanceId(record.id)} className="mt-4 w-full">View Attendance</Button></li>
                })}</ul>
              <Pagination page={attendancePaging.page} pages={attendancePaging.pages} total={attendancePaging.total} size={attendancePaging.size} onPage={attendancePaging.setPage} />
              </>
            ) : <EmptyState title={filtering ? 'No matching attendance records.' : 'No attendance records available for the selected period.'} detail={filtering ? 'Try adjusting your search or filters.' : undefined} action={filtering ? <Button type="button" variant="secondary" onClick={clearFilters}>Clear Filters</Button> : undefined} />
          ) : tab === 'concerns' ? (
            concernFiltered.length ? (
              <>
                <div className="hidden xl:block"><table className="w-full table-fixed text-left text-xs"><colgroup><col className="w-[20%]" /><col className="w-[13%]" /><col className="w-[13%]" /><col className="w-[20%]" /><col className="w-[24%]" /><col className="w-[10%]" /></colgroup><thead><tr className="border-b border-border bg-canvas text-text-muted">{['Employee', 'Payroll Period', 'Attendance Date', 'Concern', 'Verification Information'].map((heading) => <th key={heading} className="px-3 py-3 font-semibold">{heading}</th>)}<th className="px-3 py-3 text-right font-semibold">Actions</th></tr></thead><tbody className="divide-y divide-border">{concernPaging.visible.map((concern) => { const employee = employees.find((item) => item.employeeId === concern.employeeId)!; return <tr key={concern.id} className="hover:bg-info-soft/30"><td className="px-3 py-3"><p className="font-semibold">{employee.name}</p><p className="text-text-muted">{employee.employeeId}</p></td><td className="px-3 py-3">{concern.period}</td><td className="px-3 py-3">{formatDate(concern.date)}</td><td className="px-3 py-3 font-medium">{concern.concern}</td><td className="px-3 py-3 leading-relaxed">{concern.includedInApprovedPayroll ? 'Protected approved-payroll record' : concern.hrVerification ? 'HR correction recorded' : concern.logbookReference && concern.supervisorVerification ? 'Logbook and supervisor verification recorded' : 'HR verification required'}</td><td className="px-3 py-3 text-right"><Button type="button" variant="link" onClick={() => setConcernId(concern.id)} className="whitespace-nowrap text-xs">Review</Button></td></tr> })}</tbody></table></div>
                <ul className="divide-y divide-border xl:hidden">{concernPaging.visible.map((concern) => { const employee = employees.find((item) => item.employeeId === concern.employeeId)!; return <li key={concern.id} className="p-5"><p className="font-semibold">{employee.name} <span className="font-normal text-text-muted">· {employee.employeeId}</span></p><p className="mt-2 text-sm">{concern.concern} · {formatDate(concern.date)}</p><p className="mt-1 text-xs text-text-muted">{concern.period}</p><Button type="button" variant="secondary" onClick={() => setConcernId(concern.id)} className="mt-4 w-full">Review Concern</Button></li> })}</ul>
              <Pagination page={concernPaging.page} pages={concernPaging.pages} total={concernPaging.total} size={concernPaging.size} onPage={concernPaging.setPage} />
              </>
            ) : <EmptyState title={filtering ? 'No matching attendance records.' : 'No attendance concerns require review.'} detail={filtering ? 'Try adjusting your search or filters.' : undefined} action={filtering ? <Button type="button" variant="secondary" onClick={clearFilters}>Clear Filters</Button> : undefined} />
          ) : approvedFiltered.length ? (
            <>
              <div className="hidden xl:block"><table className="w-full table-fixed text-left text-xs"><colgroup><col className="w-[24%]" /><col className="w-[22%]" /><col className="w-[14%]" /><col className="w-[14%]" /><col className="w-[16%]" /><col className="w-[10%]" /></colgroup><thead><tr className="border-b border-border bg-canvas text-text-muted">{['Employee', 'Record Type', 'Start Date', 'End Date', 'Approval Reference'].map((heading) => <th key={heading} className="px-3 py-3 font-semibold">{heading}</th>)}<th className="px-3 py-3 text-right font-semibold">Actions</th></tr></thead><tbody className="divide-y divide-border">{approvedPaging.visible.map((record) => { const employee = employees.find((item) => item.employeeId === record.employeeId)!; return <tr key={record.id} className={clsx(record.includedInApprovedPayroll && 'opacity-70')}><td className="px-3 py-3"><p className="font-semibold">{employee.name}</p><p className="text-text-muted">{employee.employeeId}</p></td><td className="px-3 py-3">{record.type}{record.leaveType ? <p className="mt-1 text-text-muted">{record.leaveType}</p> : null}{record.includedInApprovedPayroll && <p className="mt-1 font-medium text-danger">Protected record</p>}</td><td className="px-3 py-3">{formatDate(record.startDate)}</td><td className="px-3 py-3">{formatDate(record.endDate)}</td><td className="break-words px-3 py-3">{record.reference || 'Not provided'}</td><td className="px-3 py-3 text-right"><div className="flex justify-end gap-1"><Button type="button" variant="link" onClick={() => setApprovedViewId(record.id)} className="text-xs">View</Button><Button type="button" variant="link" onClick={() => setApprovedEditor({ recordId: record.id })} disabled={record.includedInApprovedPayroll} className="text-xs">Edit</Button></div></td></tr> })}</tbody></table></div>
              <ul className="divide-y divide-border xl:hidden">{approvedPaging.visible.map((record) => { const employee = employees.find((item) => item.employeeId === record.employeeId)!; return <li key={record.id} className="p-5"><p className="font-semibold">{employee.name} <span className="font-normal text-text-muted">· {employee.employeeId}</span></p><p className="mt-2 text-sm">{record.type}</p><p className="mt-1 text-xs text-text-muted">{formatDate(record.startDate)} to {formatDate(record.endDate)}{record.reference ? ` · ${record.reference}` : ''}</p>{record.includedInApprovedPayroll && <p className="mt-2 text-xs font-medium text-danger">Protected approved-payroll record</p>}<div className="mt-4 grid grid-cols-2 gap-2"><Button type="button" variant="secondary" onClick={() => setApprovedViewId(record.id)} className="w-full">View Details</Button><Button type="button" variant="secondary" onClick={() => setApprovedEditor({ recordId: record.id })} disabled={record.includedInApprovedPayroll} className="w-full">Edit Record</Button></div></li> })}</ul>
            <Pagination page={approvedPaging.page} pages={approvedPaging.pages} total={approvedPaging.total} size={approvedPaging.size} onPage={approvedPaging.setPage} />
            </>
          ) : <EmptyState title={filtering ? 'No matching attendance records.' : 'No approved leave or travel records available.'} detail={filtering ? 'Try adjusting your search or filters.' : undefined} action={filtering ? <Button type="button" variant="secondary" onClick={clearFilters}>Clear Filters</Button> : undefined} />}
        </section>

        <Alert tone="info" title="Attendance information for future payroll integration">
          This module maintains fictional attendance and approved-record information only. It does not compute salary, deductions, payroll drafts, or submission workflow statuses.
        </Alert>

        {demoFlag('states') && <div className="flex flex-col gap-3 rounded-control border border-dashed border-border-strong p-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-text-muted"><span className="font-semibold text-text">Prototype only.</span> Preview attendance data states.</p><div className="grid shrink-0 grid-cols-3 gap-1 rounded-control bg-canvas p-1" role="group" aria-label="Preview attendance data state">{([['loaded', 'Records'], ['empty', 'No records'], ['error', 'Load error']] as const).map(([id, label]) => <Button key={id} type="button" variant="secondary" aria-pressed={dataState === id} onClick={() => { setDataState(id); clearFilters() }} className={clsx('h-10 border-0 px-3 shadow-none', dataState === id ? 'bg-surface font-semibold elevate' : 'bg-transparent text-text-muted')}>{label}</Button>)}</div></div>}
      </div>

      {selectedAttendance && selectedAttendanceEmployee && <AttendanceDetails record={selectedAttendance} employee={selectedAttendanceEmployee} approvedRecords={state.approvedRecords} onClose={() => setAttendanceId(null)} />}
      {manualOpen && <ManualEntryForm employees={employees} state={state} onClose={() => setManualOpen(false)} onSave={saveManual} />}
      {importOpen && <ImportWorkflow state={state} setState={setState} employees={employees} onClose={() => setImportOpen(false)} onDone={setNotice} />}
      {approvedEditor && <ApprovedRecordForm key={approvedEditor.recordId ?? 'new'} employees={employees} record={editApproved} onClose={() => setApprovedEditor(null)} onSave={saveApproved} />}
      {viewApproved && viewApprovedEmployee && <ApprovedRecordDetails record={viewApproved} employee={viewApprovedEmployee} onClose={() => setApprovedViewId(null)} />}
    </>
  )
}
