import clsx from 'clsx'
import { useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { Alert, Button, Icon, TextField } from '../../MsuPayroll'
import { Modal, SelectField, Tag } from '../../admin/ui'
import { activeRequirements, payrollTypeConfigs, type DocumentRequirement } from '../newSubmission/config'
import { Pagination, usePaged } from './ui'
import { currentAssignment, payrollConfig, type HrEmployee } from './hrData'
import type { VerificationSubmission } from './DocumentVerification'

type Tab = 'ready' | 'history'
type DataState = 'loaded' | 'empty' | 'error'

type AttachmentSnapshot = {
  requirementId: string
  filename: string
  available: boolean
  previewAvailable: boolean
}

export type TransmittalEmployeeSnapshot = {
  employeeId: string
  employeeName: string
  submissionId: string
  payrollTypeId: string
  payrollTypeName: string
  payrollPeriod: string
  fund: string
  statusAtIssuance?: 'Verified'
  submittedAt?: string
  supervisorValidatedAt?: string
  hrVerifiedAt?: string
  attachments?: AttachmentSnapshot[]
}

export type TransmittalRecord = {
  id: string
  issuedAt: string
  issuedBy: string
  receivingOffice?: 'Accounting Section'
  payrollTypeId: string
  payrollTypeName: string
  payrollPeriod: string
  fund: string
  included: TransmittalEmployeeSnapshot[]
}

export const initialTransmittals: TransmittalRecord[] = [
  {
    id: 'DEMO-TRN-001',
    issuedAt: '2026-10-10T14:30:00+08:00',
    issuedBy: 'Fictional HR User',
    receivingOffice: 'Accounting Section',
    payrollTypeId: 'permanent-staff',
    payrollTypeName: 'Payroll for Permanent Staff Employees',
    payrollPeriod: 'September 2026',
    fund: 'F01',
    included: [{
      employeeId: 'EMP-001',
      employeeName: 'Alex Rivera',
      submissionId: 'DEMO-HR-HIST-001',
      payrollTypeId: 'permanent-staff',
      payrollTypeName: 'Payroll for Permanent Staff Employees',
      payrollPeriod: 'September 2026',
      fund: 'F01',
      statusAtIssuance: 'Verified',
    }],
  },
]

const dateTime = new Intl.DateTimeFormat('en-PH', {
  year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
})

function DataPoint({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium text-text-muted">{label}</dt>
      <dd className={clsx('mt-1 text-sm font-medium leading-snug break-words', muted && 'text-text-muted')}>{value}</dd>
    </div>
  )
}

function StatusBadge({ status }: { status: 'Verified' | 'Transmitted' }) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
      status === 'Verified' ? 'bg-success-soft text-success' : 'bg-info-soft text-primary',
    )}>
      <Icon name={status === 'Verified' ? 'shield' : 'arrowRight'} size={13} /> {status}
    </span>
  )
}

function SelectionControl({ selected, label, onChange }: { selected: boolean; label: string; onChange: () => void }) {
  return (
    <Button
      type="button"
      variant="secondary"
      aria-pressed={selected}
      aria-label={label}
      onClick={onChange}
      className={clsx(
        'size-9 shrink-0 rounded-control border p-0 shadow-none',
        selected ? 'border-primary bg-primary text-on-primary' : 'border-border-strong bg-surface text-text-muted',
      )}
    >
      <Icon name="check" size={15} strokeWidth={2.5} />
    </Button>
  )
}

function EmptyState({ title, detail, action }: { title: string; detail?: string; action?: React.ReactNode }) {
  return (
    <div className="border-t border-border px-5 py-14 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-info-soft text-primary"><Icon name="link" size={24} /></span>
      <p className="mt-4 font-semibold">{title}</p>
      {detail && <p className="mt-1 text-sm text-text-muted">{detail}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}

type EligibleRecord = {
  submission: VerificationSubmission
  employee: HrEmployee
  payrollTypeName: string
  fund: HrEmployee['fundSource']
  issue: string
}

function groupKey(record: EligibleRecord) {
  return `${record.submission.payrollTypeId}|${record.submission.period}|${record.fund}`
}

function validationFor(records: EligibleRecord[], selectedIds: string[], transmittedIds: Set<string>) {
  const first = records[0]
  const missing = selectedIds.filter((id) => !records.some((record) => record.submission.id === id))
  const duplicate = new Set(selectedIds).size !== selectedIds.length
  const invalidStatus = records.some((record) => record.submission.status !== 'Verified')
  const alreadyTransmitted = records.some((record) => transmittedIds.has(record.submission.id))
  const missingInformation = records.some((record) => Boolean(record.issue))
  const typeMismatch = records.some((record) => record.submission.payrollTypeId !== first?.submission.payrollTypeId)
  const periodMismatch = records.some((record) => record.submission.period !== first?.submission.period)
  const fundMismatch = records.some((record) => record.fund !== first?.fund)
  const errors = [
    missing.length ? 'One or more selected submissions no longer exist. Please review your selection.' : '',
    invalidStatus ? 'Only Verified submissions can be included in an electronic transmittal.' : '',
    alreadyTransmitted ? 'This submission has already been included in an issued transmittal.' : '',
    missingInformation ? 'One or more selected submissions are missing required payroll information. Please review their HR records before preparing the transmittal.' : '',
    typeMismatch ? 'Selected submissions belong to different payroll types. Please review your selection.' : '',
    periodMismatch ? 'Selected submissions belong to different payroll periods.' : '',
    fundMismatch ? 'Selected submissions have different fund sources.' : '',
    duplicate ? 'A duplicate submission is included in the selection.' : '',
  ].filter(Boolean)
  return { valid: selectedIds.length > 0 && errors.length === 0, errors, typeMismatch, periodMismatch, fundMismatch, duplicate, invalidStatus, alreadyTransmitted, missingInformation }
}

function DocumentPreview({ requirement, filename, previewAvailable, onClose }: { requirement: DocumentRequirement; filename: string; previewAvailable: boolean; onClose: () => void }) {
  return (
    <Modal title="Document Preview" onClose={onClose}>
      <Tag kind="placeholder">Read-only fictional attachment reference</Tag>
      <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4">
        <DataPoint label="Document" value={requirement.name} />
        <DataPoint label="Filename" value={filename} />
      </dl>
      <div className="mt-4">
        <Alert tone={previewAvailable ? 'info' : 'warning'} title={previewAvailable ? 'Prototype preview available' : 'File preview unavailable'}>
          {previewAvailable
            ? 'The file reference is available. Official document contents are not generated or edited in this prototype.'
            : 'The attachment reference exists, but this fictional file has no supported preview.'}
        </Alert>
      </div>
      <div className="mt-5 flex justify-end"><Button type="button" variant="secondary" onClick={onClose}>Close Preview</Button></div>
    </Modal>
  )
}

function SubmissionView({ record, onClose }: { record: EligibleRecord; onClose: () => void }) {
  const { submission, employee } = record
  const [documentId, setDocumentId] = useState<string | null>(null)
  const configuration = payrollTypeConfigs[submission.payrollTypeId]
  const requirements = configuration ? activeRequirements(configuration, submission.circumstances) : []
  const attachment = documentId ? submission.attachments.find((item) => item.requirementId === documentId) : undefined
  const requirement = requirements.find((item) => item.id === documentId)
  return (
    <>
      <Modal title="Submission Details" onClose={onClose} wide>
        <Tag kind="placeholder">Read-only verified submission</Tag>
        <section className="mt-5">
          <p role="heading" aria-level={3} className="text-sm font-semibold">Employee Information</p>
          <dl className="mt-3 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
            <DataPoint label="Employee Name" value={employee.name} />
            <DataPoint label="Employee ID" value={employee.employeeId} />
            <DataPoint label="Employee Classification" value={employee.classification} />
            <DataPoint label="Employment Type" value={employee.employmentType} />
            <DataPoint label="Cost Center / Office" value={employee.office || 'Not assigned'} muted={!employee.office} />
          </dl>
        </section>
        <section className="mt-5">
          <p role="heading" aria-level={3} className="text-sm font-semibold">Payroll &amp; Submission Information</p>
          <dl className="mt-3 grid gap-4 rounded-control border border-border p-4 sm:grid-cols-2">
            <DataPoint label="Assigned Payroll Type" value={record.payrollTypeName} />
            <DataPoint label="Payroll Period" value={submission.period} />
            <DataPoint label="Fund Source" value={record.fund} />
            <DataPoint label="Submission ID" value={submission.id} />
            <DataPoint label="Date Submitted" value={dateTime.format(new Date(submission.submittedAt))} />
            <div><dt className="text-xs font-medium text-text-muted">Current Status</dt><dd className="mt-1"><StatusBadge status={submission.status === 'Transmitted' ? 'Transmitted' : 'Verified'} /></dd></div>
            <DataPoint label="Supervisor Validation" value={`${submission.supervisorValidation.supervisor || 'Not recorded'}${submission.supervisorValidation.validatedAt ? ` · ${dateTime.format(new Date(submission.supervisorValidation.validatedAt))}` : ''}`} />
            <DataPoint label="HR Verification" value={submission.hrDecision ? `${submission.hrDecision.reviewedBy ?? 'HR Office'} · ${dateTime.format(new Date(submission.hrDecision.reviewedAt))}` : 'Not recorded'} muted={!submission.hrDecision} />
            <DataPoint label="Review Remarks" value={submission.hrDecision?.remarks || submission.supervisorValidation.remarks || 'No remarks recorded'} muted={!submission.hrDecision?.remarks && !submission.supervisorValidation.remarks} />
          </dl>
        </section>
        <section className="mt-5">
          <p role="heading" aria-level={3} className="text-sm font-semibold">Document Information</p>
          {!configuration ? (
            <p className="mt-2 rounded-control border border-dashed border-border-strong p-4 text-sm text-text-muted">Document requirements have not been configured for this payroll type.</p>
          ) : requirements.length ? (
            <ul className="mt-3 divide-y divide-border rounded-control border border-border">
              {requirements.map((item) => {
                const file = submission.attachments.find((attachmentItem) => attachmentItem.requirementId === item.id)
                return (
                  <li key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{item.name}</p>
                      <p className="mt-1 text-xs text-text-muted">{item.applicability === 'mandatory' ? 'Confirmed mandatory requirement' : 'Confirmed conditional requirement'}</p>
                      <p className={clsx('mt-1 break-all text-xs', file?.available ? 'text-text-muted' : 'font-medium text-warning')}>{file?.available ? file.filename : 'No available attachment reference'}</p>
                    </div>
                    <Button type="button" variant="secondary" onClick={() => setDocumentId(item.id)} disabled={!file?.available} className="h-10 w-full sm:w-auto"><Icon name="eye" size={15} /> View Document</Button>
                  </li>
                )
              })}
            </ul>
          ) : <p className="mt-2 text-sm text-text-muted">No applicable configured document requirements are recorded.</p>}
        </section>
        <div className="mt-5 flex justify-end"><Button type="button" variant="secondary" onClick={onClose}>Close</Button></div>
      </Modal>
      {requirement && attachment && <DocumentPreview requirement={requirement} filename={attachment.filename} previewAvailable={attachment.previewAvailable} onClose={() => setDocumentId(null)} />}
    </>
  )
}

function ConfirmIssue({ records, onClose, onConfirm, issuing }: { records: EligibleRecord[]; onClose: () => void; onConfirm: () => void; issuing: boolean }) {
  const first = records[0]
  const employeeCount = new Set(records.map((record) => record.employee.employeeId)).size
  return (
    <Modal title="Confirm Electronic Transmittal" onClose={() => { if (!issuing) onClose() }}>
      <p className="text-sm leading-relaxed">You are about to issue an electronic transmittal containing the selected verified employee payroll submissions.</p>
      <dl className="mt-4 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
        <DataPoint label="Payroll Type" value={first.payrollTypeName} />
        <DataPoint label="Payroll Period" value={first.submission.period} />
        <DataPoint label="Fund Source" value={first.fund} />
        <DataPoint label="Receiving Office" value="Accounting Section" />
        <DataPoint label="Number of Employees" value={String(employeeCount)} />
        <DataPoint label="Number of Submissions" value={String(records.length)} />
      </dl>
      <div className="mt-4"><Alert tone="warning" title="Statuses change after confirmation">After issuance, the included submissions will be marked Transmitted and removed from the Ready for Transmittal queue.</Alert></div>
      <p className="mt-3 text-xs leading-relaxed text-text-muted">Prototype only. No record is delivered to a real Accounting backend.</p>
      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onClose} disabled={issuing}>Cancel</Button>
        <Button type="button" onClick={onConfirm} loading={issuing}>{issuing ? 'Recording…' : 'Confirm Transmittal'}</Button>
      </div>
    </Modal>
  )
}

function PrepareWorkspace({ records, validation, issuedBy, onBack, onCancel, onIssue }: { records: EligibleRecord[]; validation: ReturnType<typeof validationFor>; issuedBy: string; onBack: () => void; onCancel: () => void; onIssue: () => void }) {
  const first = records[0]
  const employeeCount = new Set(records.map((record) => record.employee.employeeId)).size
  const checks = [
    ['All included submissions are HR Verified.', !validation.invalidStatus],
    ['No included submissions were already transmitted.', !validation.alreadyTransmitted],
    ['Payroll Type is consistent.', !validation.typeMismatch],
    ['Payroll Period is consistent.', !validation.periodMismatch],
    ['Fund Source is consistent.', !validation.fundMismatch],
    ['No duplicate submission is included.', !validation.duplicate],
  ] as const
  return (
    <div className="grid gap-6 font-sans">
      <div>
        <Button type="button" variant="link" onClick={onBack} className="-ml-1 mb-3"><Icon name="arrowLeft" size={16} /> Back to Selection</Button>
        <p id="page-title" role="heading" aria-level={1} tabIndex={-1} className="text-2xl font-semibold leading-tight sm:text-3xl">Prepare Electronic Transmittal</p>
        <p className="mt-2 text-sm text-text-muted">Review the payroll details and employee submissions before issuing the electronic transmittal.</p>
      </div>
      <section className="rounded-card bg-surface p-5 elevate sm:p-6">
        <p role="heading" aria-level={2} className="text-lg font-semibold">Transmittal Information</p>
        <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2 lg:grid-cols-4">
          <DataPoint label="Payroll Type" value={first?.payrollTypeName ?? 'Not available'} />
          <DataPoint label="Payroll Period" value={first?.submission.period ?? 'Not available'} />
          <DataPoint label="Fund Source" value={first?.fund ?? 'Not available'} />
          <DataPoint label="Total Employees" value={String(employeeCount)} />
          <DataPoint label="Total Submissions" value={String(records.length)} />
          <DataPoint label="Receiving Office" value="Accounting Section" />
          <DataPoint label="Prepared By" value={issuedBy} />
        </dl>
      </section>
      <section className="overflow-hidden rounded-card bg-surface elevate">
        <div className="border-b border-border p-5 sm:p-6"><p role="heading" aria-level={2} className="text-lg font-semibold">Included Employee Submissions</p><p className="mt-1 text-sm text-text-muted">Review all employees included in this electronic transmittal.</p></div>
        <div className="hidden xl:block"><table className="w-full table-fixed text-left text-xs"><colgroup><col className="w-[11%]" /><col className="w-[14%]" /><col className="w-[14%]" /><col className="w-[25%]" /><col className="w-[13%]" /><col className="w-[9%]" /><col className="w-[14%]" /></colgroup><thead><tr className="border-b border-border bg-canvas text-text-muted">{['Employee ID', 'Employee Name', 'Submission ID', 'Payroll Type', 'Payroll Period', 'Fund', 'Status'].map((item) => <th key={item} className="px-3 py-3 font-semibold">{item}</th>)}</tr></thead><tbody className="divide-y divide-border">{records.map((record) => <tr key={record.submission.id}><td className="px-3 py-3">{record.employee.employeeId}</td><td className="px-3 py-3 font-semibold">{record.employee.name}</td><td className="break-words px-3 py-3">{record.submission.id}</td><td className="break-words px-3 py-3">{record.payrollTypeName}</td><td className="px-3 py-3">{record.submission.period}</td><td className="px-3 py-3">{record.fund}</td><td className="px-3 py-3"><StatusBadge status="Verified" /></td></tr>)}</tbody></table></div>
        <ul className="divide-y divide-border xl:hidden">{records.map((record) => <li key={record.submission.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">{record.employee.name}</p><p className="text-xs text-text-muted">{record.employee.employeeId} · {record.submission.id}</p></div><StatusBadge status="Verified" /></div><p className="mt-2 text-sm">{record.payrollTypeName}</p><p className="mt-1 text-xs text-text-muted">{record.submission.period} · {record.fund}</p></li>)}</ul>
      </section>
      <section className="rounded-card bg-surface p-5 elevate sm:p-6">
        <p role="heading" aria-level={2} className="text-lg font-semibold">Transmittal Validation</p>
        <ul className="mt-4 grid gap-2 text-sm">{checks.map(([label, passed]) => <li key={label} className={clsx('flex items-start gap-2', passed ? 'text-text' : 'text-danger')}><Icon name={passed ? 'check' : 'alert'} size={16} className={clsx('mt-0.5 shrink-0', passed ? 'text-success' : 'text-danger')} />{label}</li>)}</ul>
        {!validation.valid && <div className="mt-4"><Alert tone="danger" title="Transmittal validation failed">{validation.errors.join(' ')}</Alert></div>}
      </section>
      <Alert tone="info" title="Important notice">An electronic transmittal records the verified submissions being forwarded to Accounting. It does not replace the official paper documents or complete payroll computation.</Alert>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button><Button type="button" variant="secondary" onClick={onBack}>Back to Selection</Button><Button type="button" onClick={onIssue} disabled={!validation.valid}>Issue Transmittal</Button></div>
    </div>
  )
}

function SuccessDialog({ onView, onHistory, onClose }: { onView: () => void; onHistory: () => void; onClose: () => void }) {
  return (
    <Modal title="Transmittal Recorded" onClose={onClose}>
      <Alert tone="success" title="Local prototype issuance complete">The electronic transmittal has been recorded in this demonstration. The included submissions are now marked Transmitted.</Alert>
      <p className="mt-4 text-sm text-text-muted">Actual delivery to the Accounting Section requires production system integration.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3"><Button type="button" variant="secondary" onClick={onClose}>Close</Button><Button type="button" variant="secondary" onClick={onHistory}>Go to History</Button><Button type="button" onClick={onView}>View Transmittal</Button></div>
    </Modal>
  )
}

function TransmittalDetails({ record, linkedSubmissions, onViewSubmission, onClose }: { record: TransmittalRecord; linkedSubmissions: VerificationSubmission[]; onViewSubmission: (id: string) => void; onClose: () => void }) {
  return (
    <Modal title="Electronic Transmittal Details" onClose={onClose} wide>
      <p className="-mt-2 text-sm text-text-muted">Read-only record of the selected electronic transmittal.</p>
      <section className="mt-5"><p role="heading" aria-level={3} className="text-sm font-semibold">Transmittal Information</p><dl className="mt-3 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2"><DataPoint label="Transmittal ID" value={record.id} /><DataPoint label="Date Issued" value={dateTime.format(new Date(record.issuedAt))} /><DataPoint label="Prepared / Issued By" value={record.issuedBy} /><DataPoint label="Receiving Office" value={record.receivingOffice ?? 'Accounting Section'} /><DataPoint label="Payroll Type" value={record.payrollTypeName} /><DataPoint label="Payroll Period" value={record.payrollPeriod} /><DataPoint label="Fund Source" value={record.fund} /><DataPoint label="Total Employees" value={String(new Set(record.included.map((item) => item.employeeId)).size)} /><DataPoint label="Total Submissions" value={String(record.included.length)} /></dl></section>
      <section className="mt-5"><p role="heading" aria-level={3} className="text-sm font-semibold">Employee List &amp; Document References</p><ul className="mt-3 divide-y divide-border rounded-control border border-border">{record.included.map((item) => <li key={item.submissionId} className="p-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><DataPoint label="Employee" value={`${item.employeeId} · ${item.employeeName}`} /><DataPoint label="Submission ID" value={item.submissionId} /><DataPoint label="Payroll Group" value={`${item.payrollTypeName} · ${item.payrollPeriod} · ${item.fund}`} /><div><dt className="text-xs font-medium text-text-muted">Status at Issuance</dt><dd className="mt-1"><StatusBadge status={item.statusAtIssuance ?? 'Verified'} /></dd></div></div>{item.attachments?.length ? <p className="mt-3 text-xs text-text-muted break-all">Document references: {item.attachments.map((attachment) => attachment.filename).join(', ')}</p> : null}<Button type="button" variant="link" onClick={() => onViewSubmission(item.submissionId)} disabled={!linkedSubmissions.some((submission) => submission.id === item.submissionId)} className="mt-2">View Submission</Button></li>)}</ul></section>
      <section className="mt-5"><p role="heading" aria-level={3} className="text-sm font-semibold">Verification History</p><ul className="mt-3 grid gap-2">{record.included.map((item) => <li key={item.submissionId} className="rounded-control bg-canvas p-3 text-sm"><p className="font-medium">{item.employeeName} · {item.submissionId}</p><p className="mt-1 text-xs text-text-muted">Supervisor Validation: {item.supervisorValidatedAt ? dateTime.format(new Date(item.supervisorValidatedAt)) : 'Not recorded'} · HR Verification: {item.hrVerifiedAt ? dateTime.format(new Date(item.hrVerifiedAt)) : 'Not recorded'} · Transmittal Issuance: {dateTime.format(new Date(record.issuedAt))}</p></li>)}</ul></section>
      <p className="mt-5 text-xs text-text-muted">This snapshot is preserved as issued and cannot be edited or deleted.</p>
      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button type="button" variant="secondary" onClick={onClose}>Close</Button><Button type="button" onClick={onClose}>Back to History</Button></div>
    </Modal>
  )
}

export function Transmittals({ employees, submissions, setSubmissions, transmittals, setTransmittals, issuedBy }: { employees: HrEmployee[]; submissions: VerificationSubmission[]; setSubmissions: Dispatch<SetStateAction<VerificationSubmission[]>>; transmittals: TransmittalRecord[]; setTransmittals: Dispatch<SetStateAction<TransmittalRecord[]>>; issuedBy: string }) {
  const [tab, setTab] = useState<Tab>('ready')
  const [query, setQuery] = useState('')
  const [payrollType, setPayrollType] = useState('')
  const [period, setPeriod] = useState('')
  const [fund, setFund] = useState('')
  const [classification, setClassification] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [preparing, setPreparing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [issuing, setIssuing] = useState(false)
  const [selectionError, setSelectionError] = useState<string[]>([])
  const [detailId, setDetailId] = useState<string | null>(null)
  const [viewSubmissionId, setViewSubmissionId] = useState<string | null>(null)
  const [successId, setSuccessId] = useState<string | null>(null)
  const [dataState, setDataState] = useState<DataState>('loaded')

  const transmittedIds = useMemo(() => new Set(transmittals.flatMap((record) => record.included.map((item) => item.submissionId))), [transmittals])
  const verifiedRecords = useMemo<EligibleRecord[]>(() => submissions.filter((submission) => submission.status === 'Verified' && !transmittedIds.has(submission.id)).map((submission) => {
    const employee = employees.find((item) => item.employeeId === submission.employeeId)
    if (!employee) return null
    const assignment = currentAssignment(employee)
    const config = payrollConfig(submission.payrollTypeId)
    const issue = !assignment ? 'No current HR payroll assignment.' : assignment.payrollTypeId !== submission.payrollTypeId ? 'Submission payroll type conflicts with the current HR assignment.' : !config ? 'Payroll configuration reference is unavailable.' : !employee.fundSource ? 'Fund source is not recorded.' : ''
    return { submission, employee, payrollTypeName: config?.name ?? submission.payrollTypeId, fund: employee.fundSource, issue }
  }).filter((item): item is EligibleRecord => Boolean(item)), [submissions, employees, transmittedIds])
  const readyRecords = dataState === 'loaded' ? verifiedRecords : []
  const historyRecords = dataState === 'loaded' ? transmittals : []
  const payrollTypes = useMemo(() => [...new Set((tab === 'ready' ? readyRecords.map((item) => item.payrollTypeName) : historyRecords.map((item) => item.payrollTypeName)))].sort(), [tab, readyRecords, historyRecords])
  const periods = useMemo(() => [...new Set(tab === 'ready' ? readyRecords.map((item) => item.submission.period) : historyRecords.map((item) => item.payrollPeriod))].sort().reverse(), [tab, readyRecords, historyRecords])
  const funds = useMemo(() => [...new Set(tab === 'ready' ? readyRecords.map((item) => item.fund) : historyRecords.map((item) => item.fund))].sort(), [tab, readyRecords, historyRecords])
  const readyFiltered = useMemo(() => { const term = query.trim().toLowerCase(); return readyRecords.filter((record) => (!payrollType || record.payrollTypeName === payrollType) && (!period || record.submission.period === period) && (!fund || record.fund === fund) && (!classification || record.employee.classification === classification) && (!term || [record.submission.id, record.employee.name, record.employee.employeeId].some((value) => value.toLowerCase().includes(term)))).sort((a, b) => b.submission.submittedAt.localeCompare(a.submission.submittedAt)) }, [readyRecords, query, payrollType, period, fund, classification])
  const historyFiltered = useMemo(() => { const term = query.trim().toLowerCase(); return historyRecords.filter((record) => (!payrollType || record.payrollTypeName === payrollType) && (!period || record.payrollPeriod === period) && (!fund || record.fund === fund) && (!dateFrom || record.issuedAt.slice(0, 10) >= dateFrom) && (!dateTo || record.issuedAt.slice(0, 10) <= dateTo) && (!term || [record.id, record.payrollTypeName, ...record.included.flatMap((item) => [item.employeeName, item.employeeId, item.submissionId])].some((value) => value.toLowerCase().includes(term)))).sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)) }, [historyRecords, query, payrollType, period, fund, dateFrom, dateTo])
  const filtering = Boolean(query || payrollType || period || fund || classification || dateFrom || dateTo)
  const resetKey = `${tab}|${query}|${payrollType}|${period}|${fund}|${classification}|${dateFrom}|${dateTo}`
  const readyPaging = usePaged(readyFiltered, 6, resetKey)
  const historyPaging = usePaged(historyFiltered, 6, resetKey)
  const selectedRecords = verifiedRecords.filter((record) => selectedIds.includes(record.submission.id))
  const validation = validationFor(selectedRecords, selectedIds, transmittedIds)
  const pageIds = readyPaging.visible.map((record) => record.submission.id)
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id))
  const clearFilters = () => { setQuery(''); setPayrollType(''); setPeriod(''); setFund(''); setClassification(''); setDateFrom(''); setDateTo('') }
  const switchTab = (next: Tab) => { setTab(next); setSelectionError([]); clearFilters() }
  const toggle = (id: string) => { setSelectionError([]); setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]) }
  const togglePage = () => { setSelectionError([]); setSelectedIds((current) => allPageSelected ? current.filter((id) => !pageIds.includes(id)) : [...new Set([...current, ...pageIds])]) }
  const prepare = () => { const checked = validationFor(selectedRecords, selectedIds, transmittedIds); if (!checked.valid) return setSelectionError(checked.errors.length ? checked.errors : ['Select at least one verified submission to continue.']); setSelectionError([]); setPreparing(true) }

  const issue = () => {
    if (issuing) return
    const currentRecords = submissions.filter((submission) => selectedIds.includes(submission.id))
    const revalidated = validationFor(selectedRecords.filter((record) => currentRecords.some((submission) => submission.id === record.submission.id && submission.status === 'Verified')), selectedIds, transmittedIds)
    if (!revalidated.valid) { setConfirming(false); setSelectionError(revalidated.errors.length ? revalidated.errors : ['The demonstration transmittal could not be recorded. No submission statuses were changed.']); setPreparing(false); return }
    setIssuing(true)
    const first = selectedRecords[0]
    const issuedAt = new Date().toISOString()
    const id = `DEMO-TR-${Date.now()}`
    const record: TransmittalRecord = { id, issuedAt, issuedBy, receivingOffice: 'Accounting Section', payrollTypeId: first.submission.payrollTypeId, payrollTypeName: first.payrollTypeName, payrollPeriod: first.submission.period, fund: first.fund, included: selectedRecords.map((item) => ({ employeeId: item.employee.employeeId, employeeName: item.employee.name, submissionId: item.submission.id, payrollTypeId: item.submission.payrollTypeId, payrollTypeName: item.payrollTypeName, payrollPeriod: item.submission.period, fund: item.fund, statusAtIssuance: 'Verified', submittedAt: item.submission.submittedAt, supervisorValidatedAt: item.submission.supervisorValidation.validatedAt, hrVerifiedAt: item.submission.hrDecision?.reviewedAt, attachments: item.submission.attachments.map((attachment) => ({ requirementId: attachment.requirementId, filename: attachment.filename, available: attachment.available, previewAvailable: attachment.previewAvailable })) })) }
    const ids = new Set(selectedIds)
    setTransmittals((current) => [record, ...current])
    setSubmissions((current) => current.map((submission) => ids.has(submission.id) && submission.status === 'Verified' ? { ...submission, status: 'Transmitted' } : submission))
    setSelectedIds([]); setIssuing(false); setConfirming(false); setPreparing(false); setSuccessId(id)
  }

  const linkedSubmissionRecord = (id: string) => { const submission = submissions.find((item) => item.id === id); const employee = submission && employees.find((item) => item.employeeId === submission.employeeId); if (!submission || !employee) return undefined; return { submission, employee, payrollTypeName: payrollConfig(submission.payrollTypeId)?.name ?? submission.payrollTypeId, fund: employee.fundSource, issue: '' } satisfies EligibleRecord }
  const detail = transmittals.find((record) => record.id === detailId)

  if (preparing && selectedRecords.length) return <><PrepareWorkspace records={selectedRecords} validation={validation} issuedBy={issuedBy} onBack={() => setPreparing(false)} onCancel={() => { setPreparing(false); setSelectedIds([]) }} onIssue={() => setConfirming(true)} />{confirming && <ConfirmIssue records={selectedRecords} onClose={() => setConfirming(false)} onConfirm={issue} issuing={issuing} />}</>

  return (
    <>
      <div className="grid gap-6 font-sans">
        <div><p id="page-title" role="heading" aria-level={1} tabIndex={-1} className="text-2xl font-semibold leading-tight sm:text-3xl">Transmittals</p><p className="mt-2 text-sm leading-relaxed text-text-muted">Prepare and track electronic transmittals of verified payroll submissions to the Accounting Section.</p><div className="mt-4"><Alert tone="info" title="Verified submissions only">Only HR-verified submissions are eligible for electronic transmittal. Original paper documents remain the official records.</Alert></div></div>
        <section className="overflow-hidden rounded-card bg-surface elevate">
          <div className="border-b border-border p-5 sm:p-6">
            <div role="tablist" aria-label="Transmittal views" className="grid max-w-lg grid-cols-2 gap-1 rounded-control bg-canvas p-1"><Button type="button" variant={tab === 'ready' ? 'primary' : 'secondary'} role="tab" aria-selected={tab === 'ready'} onClick={() => switchTab('ready')} className={clsx('h-11 border-0 shadow-none', tab !== 'ready' && 'bg-transparent text-text-muted')}>Ready for Transmittal <span className="rounded-full bg-deep/10 px-1.5 py-0.5 text-xs">{readyRecords.length}</span></Button><Button type="button" variant={tab === 'history' ? 'primary' : 'secondary'} role="tab" aria-selected={tab === 'history'} onClick={() => switchTab('history')} className={clsx('h-11 border-0 shadow-none', tab !== 'history' && 'bg-transparent text-text-muted')}>Transmittal History <span className="rounded-full bg-deep/10 px-1.5 py-0.5 text-xs">{historyRecords.length}</span></Button></div>
            <div className="mt-5"><p role="heading" aria-level={2} className="text-lg font-semibold">{tab === 'ready' ? 'Verified Submissions' : 'Transmittal History'}</p><p className="mt-1 text-sm text-text-muted">{tab === 'ready' ? 'Select verified employee submissions to prepare an electronic transmittal.' : 'View electronic transmittals previously issued by the HR Office.'}</p><p className="mt-2 text-xs font-medium text-text-muted">{tab === 'ready' ? `${readyFiltered.length} verified submission${readyFiltered.length === 1 ? '' : 's'} available` : `${historyFiltered.length} transmittal record${historyFiltered.length === 1 ? '' : 's'}`}</p></div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><TextField label={tab === 'ready' ? 'Search Submissions' : 'Search History'} icon="search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tab === 'ready' ? 'Search by employee name, employee ID, or submission ID...' : 'Search by transmittal ID, payroll type, or employee...'} className="sm:col-span-2" /><SelectField label="Payroll Type" value={payrollType} onChange={(event) => setPayrollType(event.target.value)} placeholder="All Payroll Types">{payrollTypes.map((item) => <option key={item} value={item}>{item}</option>)}</SelectField><SelectField label="Payroll Period" value={period} onChange={(event) => setPeriod(event.target.value)} placeholder="All Payroll Periods">{periods.map((item) => <option key={item} value={item}>{item}</option>)}</SelectField><SelectField label="Fund Source" value={fund} onChange={(event) => setFund(event.target.value)} placeholder="All Funds">{funds.map((item) => <option key={item} value={item}>{item}</option>)}</SelectField>{tab === 'ready' ? <SelectField label="Employee Classification" value={classification} onChange={(event) => setClassification(event.target.value)} placeholder="All Classifications"><option value="Faculty">Faculty</option><option value="Staff">Staff</option></SelectField> : <><TextField label="Date Issued From" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /><TextField label="Date Issued To" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></>}<Button type="button" variant="secondary" onClick={clearFilters} disabled={!filtering} className="w-full self-end">Clear Filters</Button></div>
          </div>
          {dataState === 'error' ? <EmptyState title="Unable to load transmittal records." detail="Please try again." /> : tab === 'ready' ? readyFiltered.length ? <>
            {selectedIds.length > 0 && <div className="flex flex-col gap-3 border-b border-border bg-info-soft/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">Selected Submissions: {selectedIds.length}</p><p className="mt-0.5 text-xs text-text-muted">Review the selected submissions before preparing an electronic transmittal.</p></div><div className="flex flex-col gap-2 sm:flex-row"><Button type="button" variant="secondary" onClick={() => { setSelectedIds([]); setSelectionError([]) }}>Clear Selection</Button><Button type="button" onClick={prepare}>Prepare Transmittal</Button></div></div>}
            {selectionError.length > 0 && <div className="border-b border-border p-5"><Alert tone="danger" title="Selection cannot be prepared"><ul className="grid gap-1">{selectionError.map((error) => <li key={error}>{error}</li>)}</ul></Alert></div>}
            {!selectedIds.length && <div className="flex flex-col gap-3 border-b border-border px-5 py-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-text-muted">Select at least one verified submission to continue.</p><Button type="button" disabled>Prepare Transmittal</Button></div>}
            <div className="hidden xl:block"><table className="w-full table-fixed text-left text-xs"><colgroup><col className="w-[6%]" /><col className="w-[13%]" /><col className="w-[16%]" /><col className="w-[24%]" /><col className="w-[12%]" /><col className="w-[9%]" /><col className="w-[11%]" /><col className="w-[9%]" /></colgroup><thead><tr className="border-b border-border bg-canvas text-text-muted"><th className="px-2 py-3"><SelectionControl selected={allPageSelected} label={allPageSelected ? 'Deselect all visible submissions' : 'Select all visible submissions'} onChange={togglePage} /></th>{['Submission ID', 'Employee', 'Payroll Type', 'Payroll Period', 'Fund', 'Status'].map((heading) => <th key={heading} className="px-2 py-3 font-semibold">{heading}</th>)}<th className="px-2 py-3 text-right font-semibold">Actions</th></tr></thead><tbody className="divide-y divide-border">{readyPaging.visible.map((record) => <tr key={record.submission.id} className={clsx(selectedIds.includes(record.submission.id) && 'bg-info-soft/50')}><td className="px-2 py-3"><SelectionControl selected={selectedIds.includes(record.submission.id)} label={`${selectedIds.includes(record.submission.id) ? 'Deselect' : 'Select'} ${record.submission.id}`} onChange={() => toggle(record.submission.id)} /></td><td className="break-words px-2 py-3 font-semibold">{record.submission.id}</td><td className="px-2 py-3"><p className="font-semibold">{record.employee.name}</p><p className="text-text-muted">{record.employee.employeeId}</p></td><td className="break-words px-2 py-3">{record.payrollTypeName}{record.issue && <p className="mt-1 font-medium text-warning">{record.issue}</p>}</td><td className="px-2 py-3">{record.submission.period}</td><td className="px-2 py-3">{record.fund}</td><td className="px-2 py-3"><StatusBadge status="Verified" /></td><td className="px-2 py-3 text-right"><Button type="button" variant="link" onClick={() => setViewSubmissionId(record.submission.id)} aria-label={`View Submission ${record.submission.id}`} className="text-xs">View Submission</Button></td></tr>)}</tbody></table></div>
            <ul className="divide-y divide-border xl:hidden">{readyPaging.visible.map((record) => <li key={record.submission.id} className={clsx('p-5', selectedIds.includes(record.submission.id) && 'bg-info-soft/50')}><div className="flex items-start gap-3"><SelectionControl selected={selectedIds.includes(record.submission.id)} label={`${selectedIds.includes(record.submission.id) ? 'Deselect' : 'Select'} ${record.submission.id}`} onChange={() => toggle(record.submission.id)} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">{record.employee.name}</p><p className="text-xs text-text-muted">{record.employee.employeeId} · {record.submission.id}</p></div><StatusBadge status="Verified" /></div><p className="mt-2 text-sm">{record.payrollTypeName}</p><p className="mt-1 text-xs text-text-muted">{record.submission.period} · {record.fund}</p>{record.issue && <p className="mt-2 text-xs font-medium text-warning">{record.issue}</p>}<Button type="button" variant="secondary" onClick={() => setViewSubmissionId(record.submission.id)} className="mt-3 h-10 w-full sm:w-auto">View Submission</Button></div></div></li>)}</ul><Pagination page={readyPaging.page} pages={readyPaging.pages} total={readyPaging.total} size={readyPaging.size} onPage={readyPaging.setPage} />
          </> : <EmptyState title={filtering ? 'No submissions match your search or filters.' : 'No verified submissions are currently available for transmittal.'} action={filtering ? <Button type="button" variant="secondary" onClick={clearFilters}>Clear Filters</Button> : undefined} /> : historyFiltered.length ? <><div className="hidden xl:block"><table className="w-full table-fixed text-left text-xs"><colgroup><col className="w-[15%]" /><col className="w-[17%]" /><col className="w-[25%]" /><col className="w-[14%]" /><col className="w-[10%]" /><col className="w-[10%]" /><col className="w-[9%]" /></colgroup><thead><tr className="border-b border-border bg-canvas text-text-muted">{['Transmittal ID', 'Date Issued', 'Payroll Type', 'Payroll Period', 'Fund', 'Employees Included'].map((heading) => <th key={heading} className="px-3 py-3 font-semibold">{heading}</th>)}<th className="px-3 py-3 text-right font-semibold">Actions</th></tr></thead><tbody className="divide-y divide-border">{historyPaging.visible.map((record) => <tr key={record.id}><td className="break-all px-3 py-3 font-semibold">{record.id}</td><td className="px-3 py-3">{dateTime.format(new Date(record.issuedAt))}</td><td className="break-words px-3 py-3">{record.payrollTypeName}</td><td className="px-3 py-3">{record.payrollPeriod}</td><td className="px-3 py-3">{record.fund}</td><td className="px-3 py-3">{new Set(record.included.map((item) => item.employeeId)).size}</td><td className="px-3 py-3 text-right"><Button type="button" variant="link" onClick={() => setDetailId(record.id)} className="text-xs">View Details</Button></td></tr>)}</tbody></table></div><ul className="divide-y divide-border xl:hidden">{historyPaging.visible.map((record) => <li key={record.id} className="p-5"><p className="font-semibold break-all">{record.id}</p><p className="mt-2 text-sm">{record.payrollTypeName}</p><p className="mt-1 text-xs text-text-muted">{dateTime.format(new Date(record.issuedAt))} · {record.payrollPeriod} · {record.fund} · {new Set(record.included.map((item) => item.employeeId)).size} employee{new Set(record.included.map((item) => item.employeeId)).size === 1 ? '' : 's'}</p><Button type="button" variant="secondary" onClick={() => setDetailId(record.id)} className="mt-4 w-full">View Details</Button></li>)}</ul><Pagination page={historyPaging.page} pages={historyPaging.pages} total={historyPaging.total} size={historyPaging.size} onPage={historyPaging.setPage} /></> : <EmptyState title={filtering ? 'No transmittals match your search or filters.' : 'No electronic transmittals have been issued yet.'} action={filtering ? <Button type="button" variant="secondary" onClick={clearFilters}>Clear Filters</Button> : undefined} />}
        </section>
      </div>
      {detailId && !detail && <Modal title="Transmittal record not found" onClose={() => setDetailId(null)}><p className="text-sm text-text-muted">Transmittal record not found.</p><div className="mt-5 flex justify-end"><Button type="button" onClick={() => { setDetailId(null); setTab('history') }}>Back to History</Button></div></Modal>}
      {detail && <TransmittalDetails record={detail} linkedSubmissions={submissions} onViewSubmission={(id) => setViewSubmissionId(id)} onClose={() => setDetailId(null)} />}
      {viewSubmissionId && linkedSubmissionRecord(viewSubmissionId) && <SubmissionView record={linkedSubmissionRecord(viewSubmissionId)!} onClose={() => setViewSubmissionId(null)} />}
      {successId && <SuccessDialog onView={() => { setSuccessId(null); setTab('history'); setDetailId(successId) }} onHistory={() => { setSuccessId(null); setTab('history') }} onClose={() => { setSuccessId(null); setTab('ready') }} />}
    </>
  )
}
