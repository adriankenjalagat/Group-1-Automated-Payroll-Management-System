import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { Alert, Button, Icon } from '../MsuPayroll'
import { SelectField, Tag } from '../admin/ui'
import { StatusBadge, type Submission } from './MySubmissions'
import { demoFlag } from './demoFlags'

type SubmissionStatusName = Submission['status']
export const STAGES = ['Submitted', 'Validated', 'Verified', 'Transmitted'] as const
type Stage = (typeof STAGES)[number]

const stageDescriptions: Record<Stage, string> = {
  Submitted: 'Your payroll documents have been submitted.',
  Validated: 'Your Immediate Supervisor has validated your submission.',
  Verified: 'The HR Office has verified your submission.',
  Transmitted: 'Your verified submission has been forwarded to Accounting.',
}

type UpdateEvent = {
  id: string
  status: SubmissionStatusName
  actor: string
  /** ISO date or date-time. Absent when the record does not provide one. */
  at?: string
  remarks?: string
}

type ReturnRecord = { by: string; at?: string; remarks: string; affected?: string }

type SubmissionDetail = {
  events: UpdateEvent[]
  documents: string[]
  returned?: ReturnRecord
  missing?: string[]
  revisedPeriod?: string
  incompleteRemarks?: string
}

// Fictional demonstration details keyed by the same submission IDs used in My Submissions.
// Only recorded events are listed; nothing here is a real review activity.
const detailsById: Record<string, SubmissionDetail> = {
  'DEMO-SUB-0005': {
    events: [
      { id: 'e1', status: 'Submitted', actor: 'Employee', at: '2026-11-03' },
      {
        id: 'e2',
        status: 'Returned',
        actor: 'Immediate Supervisor',
        at: '2026-11-05T10:20:00+08:00',
        remarks: 'Sample remark: the reviewer asked for a correction before the submission can continue.',
      },
    ],
    documents: ['Daily Time Record (DTR)'],
    returned: {
      by: 'Immediate Supervisor',
      at: '2026-11-05T10:20:00+08:00',
      remarks: 'Sample remark: the reviewer asked for a correction before the submission can continue.',
    },
  },
  'DEMO-SUB-0004': {
    events: [{ id: 'e1', status: 'Submitted', actor: 'Employee', at: '2026-10-05' }],
    documents: ['Daily Time Record (DTR)'],
  },
  'DEMO-SUB-0003': {
    events: [
      { id: 'e1', status: 'Submitted', actor: 'Employee', at: '2026-09-02' },
      { id: 'e2', status: 'Validated', actor: 'Immediate Supervisor', at: '2026-09-04' },
      { id: 'e3', status: 'Verified', actor: 'HR Office', at: '2026-09-06' },
    ],
    documents: ['Daily Time Record (DTR)'],
  },
  'DEMO-SUB-0002': {
    events: [
      { id: 'e1', status: 'Submitted', actor: 'Employee', at: '2026-08-03' },
      { id: 'e2', status: 'Validated', actor: 'Immediate Supervisor', at: '2026-08-05' },
      { id: 'e3', status: 'Verified', actor: 'HR Office', at: '2026-08-07' },
    ],
    documents: ['Daily Time Record (DTR)'],
  },
  'DEMO-SUB-0001': {
    events: [
      { id: 'e1', status: 'Submitted', actor: 'Employee', at: '2026-07-02' },
      { id: 'e2', status: 'Validated', actor: 'Immediate Supervisor', at: '2026-07-04' },
      { id: 'e3', status: 'Verified', actor: 'HR Office', at: '2026-07-06' },
    ],
    documents: ['Daily Time Record (DTR)'],
  },
}

const dateOnly = new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
const dateTime = new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
function formatWhen(value?: string) {
  if (!value) return 'Date not recorded'
  return value.includes('T') ? dateTime.format(new Date(value)) : dateOnly.format(new Date(`${value}T00:00:00Z`))
}

function detailFor(submission: Submission, previewStatus: string): SubmissionDetail {
  if (previewStatus) {
    // Prototype-only rendering preview. No dates or reviewer identities are invented.
    const status = previewStatus as SubmissionStatusName
    const events: UpdateEvent[] = [{ id: 'p1', status: 'Submitted', actor: 'Employee', at: submission.submittedOn }]
    const reached = STAGES.indexOf(status as Stage)
    if (reached > 0) {
      const actors = ['Employee', 'Immediate Supervisor', 'HR Office', 'HR Office']
      for (let i = 1; i <= reached; i += 1) events.push({ id: `p${i + 1}`, status: STAGES[i], actor: actors[i] })
    }
    if (status === 'Returned') events.push({ id: 'p-return', status, actor: 'Reviewer role not recorded', remarks: submission.remark ?? 'No remarks are recorded for this preview.' })
    if (status === 'Incomplete' || status === 'Late') events.push({ id: 'p-exception', status, actor: 'Reviewing office not recorded' })
    return {
      events,
      documents: ['Daily Time Record (DTR)'],
      returned: status === 'Returned' ? { by: 'Reviewer role not recorded', remarks: submission.remark ?? 'No remarks are recorded for this preview.' } : undefined,
    }
  }
  const base = detailsById[submission.id] ?? {
    events: [{ id: 'e1', status: 'Submitted' as const, actor: 'Employee', at: submission.submittedOn }],
    documents: [],
  }
  // Resubmissions are appended; the earlier events, including the return and its remarks, are never erased.
  const resubmitted = (submission.resubmittedOn ?? []).map((at, index) => ({
    id: `resubmit-${index}`,
    status: 'Submitted' as const,
    actor: 'Employee',
    at,
    remarks: 'Resubmitted after correction.',
  }))
  return { ...base, events: [...base.events, ...resubmitted] }
}

type StageState = 'completed' | 'current' | 'upcoming'
function stageStates(status: SubmissionStatusName, events: UpdateEvent[]): StageState[] {
  const normal = STAGES.indexOf(status as Stage)
  if (normal >= 0) {
    return STAGES.map((_, index) => index < normal ? 'completed' : index === normal ? (status === 'Transmitted' ? 'completed' : 'current') : 'upcoming')
  }
  // Incomplete, Late, and Returned are not sequential stages: show only stages with recorded events.
  const reached = Math.max(0, ...STAGES.map((stage, index) => events.some((event) => event.status === stage) ? index : 0))
  return STAGES.map((_, index) => index <= reached ? 'completed' : 'upcoming')
}

function StateMessage({ icon, title, detail, children }: { icon: 'clipboard' | 'search' | 'alert'; title: string; detail?: string; children?: React.ReactNode }) {
  return (
    <section className="rounded-card bg-surface px-5 py-14 text-center elevate sm:py-16">
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-info-soft text-primary"><Icon name={icon} size={28} /></span>
      <p role="heading" aria-level={2} className="mt-5 text-lg font-semibold">{title}</p>
      {detail && <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-muted">{detail}</p>}
      {children && <div className="mt-6 flex justify-center">{children}</div>}
    </section>
  )
}

function Overview({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-semibold leading-snug">{value}</dd>
    </div>
  )
}

function ProgressTracker({ status, events }: { status: SubmissionStatusName; events: UpdateEvent[] }) {
  const states = stageStates(status, events)
  return (
    <ol aria-label="Verification progress" className="grid md:grid-cols-4 md:gap-4">
      {STAGES.map((stage, index) => {
        const state = states[index]
        const event = events.find((item) => item.status === stage)
        return (
          <li key={stage} aria-current={state === 'current' ? 'step' : undefined} className="flex gap-4 md:block">
            <span className={clsx('mb-3 hidden h-1.5 rounded-full md:block', state === 'upcoming' ? 'bg-border' : 'bg-primary')} aria-hidden="true" />
            <div className="flex flex-col items-center md:hidden" aria-hidden="true">
              <span className={clsx(
                'grid size-8 shrink-0 place-items-center rounded-full border text-xs font-semibold',
                state === 'completed' && 'border-success bg-success text-surface',
                state === 'current' && 'border-primary bg-primary text-on-primary',
                state === 'upcoming' && 'border-border-strong bg-surface text-text-muted',
              )}>{state === 'completed' ? <Icon name="check" size={15} strokeWidth={2.5} /> : index + 1}</span>
              {index < STAGES.length - 1 && <span className={clsx('my-1 w-0.5 flex-1', state === 'completed' ? 'bg-success' : 'bg-border')} />}
            </div>
            <div className="min-w-0 flex-1 pb-6 md:pb-0">
              <div className="flex items-center gap-3">
                <span className={clsx(
                  'hidden size-8 shrink-0 place-items-center rounded-full border text-xs font-semibold md:grid',
                  state === 'completed' && 'border-success bg-success text-surface',
                  state === 'current' && 'border-primary bg-primary text-on-primary',
                  state === 'upcoming' && 'border-border-strong bg-surface text-text-muted',
                )} aria-hidden="true">{state === 'completed' ? <Icon name="check" size={15} strokeWidth={2.5} /> : index + 1}</span>
                <p className={clsx('text-sm font-semibold', state === 'upcoming' && 'text-text-muted')}>
                  {stage}
                  <span className="sr-only">{state === 'completed' ? ' (reached)' : state === 'current' ? ' (current status)' : ' (upcoming)'}</span>
                </p>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-text-muted">{stageDescriptions[stage]}</p>
              {state !== 'upcoming' && event && (
                <p className="mt-2 text-xs font-medium text-text-muted">
                  {event.actor}{event.at ? ` · ${formatWhen(event.at)}` : ''}
                </p>
              )}
              <p className={clsx('mt-2 text-xs font-semibold', state === 'current' ? 'text-primary' : state === 'completed' ? 'text-success' : 'text-text-muted')}>
                {state === 'completed' ? 'Reached' : state === 'current' ? 'Current status' : 'Upcoming'}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export function SubmissionStatus({
  submissions,
  selectedId,
  onBack,
  onOpenDetails,
}: {
  submissions: Submission[]
  selectedId: string | null
  onBack: () => void
  onOpenDetails: (id: string) => void
}) {
  const [mode, setMode] = useState<'records' | 'no-updates' | 'error'>('records')
  const preview = demoFlag('status-preview')
  const [previewStatus, setPreviewStatus] = useState('')
  const submission = submissions.find((item) => item.id === selectedId)
  const base = submission ? detailFor(submission, previewStatus) : undefined
  const detail = useMemo(() => base && mode === 'no-updates' ? { ...base, events: [] } : base, [base, mode])
  const status = (previewStatus || submission?.status) as SubmissionStatusName | undefined

  const header = (
    <div>
      <Button type="button" variant="link" onClick={onBack} className="-ml-1 mb-3"><Icon name="arrowLeft" size={16} /> Back to My Submissions</Button>
      <p id="page-title" role="heading" aria-level={1} tabIndex={-1} className="text-2xl font-semibold leading-tight sm:text-3xl">Submission Status</p>
      <p className="mt-2 text-sm leading-relaxed text-text-muted">Track the review progress of your payroll document submission.</p>
    </div>
  )

  if (!selectedId) {
    return (
      <div className="grid gap-7 font-sans">
        {header}
        <StateMessage icon="clipboard" title="No Submission Selected" detail="Select a submission from My Submissions to view its status.">
          <Button type="button" onClick={onBack}>Go to My Submissions</Button>
        </StateMessage>
      </div>
    )
  }

  if (!submission || !detail || !status) {
    return (
      <div className="grid gap-7 font-sans">
        {header}
        <StateMessage icon="search" title="Submission Not Found" detail="This submission could not be found.">
          <Button type="button" variant="secondary" onClick={onBack}>Back to My Submissions</Button>
        </StateMessage>
      </div>
    )
  }

  // Show the filenames of the latest document version when the record has versions; otherwise the recorded requirement names.
  const latestVersion = submission.versions?.length ? submission.versions.reduce((a, b) => (b.version > a.version ? b : a)) : undefined
  const documents = latestVersion?.files.length ? latestVersion.files : detail.documents

  const exception = status === 'Incomplete' || status === 'Late' || status === 'Returned'

  return (
    <div className="grid gap-7 font-sans">
      {header}

      {mode === 'error' ? (
        <StateMessage icon="alert" title="Unable to load submission details." detail="Please try again.">
          <Button type="button" onClick={() => setMode('records')}>Retry</Button>
        </StateMessage>
      ) : (
        <>
          <section className="rounded-card bg-surface p-5 elevate sm:p-6" aria-labelledby="overview-title">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p id="overview-title" role="heading" aria-level={2} className="text-lg font-semibold">Submission Overview</p>
              {(submission.prototype || previewStatus) && <Tag kind="simulated">{previewStatus ? 'Status preview' : 'Prototype submission'}</Tag>}
            </div>
            <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2 lg:grid-cols-5">
              <Overview label="Submission ID" value={submission.id} />
              <Overview label="Payroll Type" value={submission.payrollType} />
              <Overview label="Payroll Period" value={submission.period} />
              <Overview label="Date Submitted" value={formatWhen(submission.submittedOn)} />
              <Overview label="Current Status" value={<StatusBadge status={status} />} />
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-text-muted">
              Your payroll type comes from your HR-maintained assignment and cannot be changed here. You can only view your own submissions.
            </p>
          </section>

          {status === 'Incomplete' && (
            <Alert tone="warning" title="Incomplete Submission">
              Your submission has missing or incomplete requirements.
              <span className="mt-2 block text-xs text-text-muted">
                {detail.missing?.length ? `Missing: ${detail.missing.join(', ')}.` : 'No missing document names are recorded for this submission.'}
                {detail.incompleteRemarks ? ` Remarks: ${detail.incompleteRemarks}` : ''}
              </span>
            </Alert>
          )}
          {status === 'Returned' && (
            <Alert tone="danger" title="Submission Returned">
              Your submission was returned for correction. Please review the remarks below.
              <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
                <div><dt className="font-semibold">Returned by</dt><dd className="mt-0.5 text-text-muted">{detail.returned?.by ?? 'Not recorded'}</dd></div>
                <div><dt className="font-semibold">Date returned</dt><dd className="mt-0.5 text-text-muted">{formatWhen(detail.returned?.at)}</dd></div>
                <div className="sm:col-span-2"><dt className="font-semibold">Remarks</dt><dd className="mt-0.5 text-text-muted">{detail.returned?.remarks ?? 'No remarks recorded.'}</dd></div>
                <div className="sm:col-span-2"><dt className="font-semibold">Affected document or requirement</dt><dd className="mt-0.5 text-text-muted">{detail.returned?.affected ?? 'Not recorded'}</dd></div>
              </dl>
              <Button type="button" variant="secondary" onClick={() => onOpenDetails(submission.id)} className="mt-4 w-full sm:w-auto">View in My Submissions</Button>
            </Alert>
          )}
          {status === 'Late' && (
            <Alert tone="warning" title="Late Submission">
              Your submission was received after the configured submission deadline.
              <span className="mt-2 block text-xs text-text-muted">
                {detail.revisedPeriod ? `Revised payroll batch or period: ${detail.revisedPeriod}.` : 'No revised payroll batch or period has been recorded.'}
              </span>
            </Alert>
          )}

          <section className="rounded-card bg-surface p-5 elevate sm:p-6" aria-labelledby="progress-title">
            <p id="progress-title" role="heading" aria-level={2} className="text-lg font-semibold">Verification Progress</p>
            <p className="mt-1 text-sm text-text-muted">
              {exception ? 'Incomplete, Late, and Returned are shown as notices above rather than as normal stages.' : 'Normal document-processing stages for this submission.'}
            </p>
            <div className="mt-6"><ProgressTracker status={status} events={detail.events} /></div>
            <p className="mt-5 border-t border-border pt-4 text-xs leading-relaxed text-text-muted">
              Submission status tracks document review and transmission only. It does not mean payroll was approved, paid, or released. Released payslips appear in My Payslips.
            </p>
          </section>

          <section className="overflow-hidden rounded-card bg-surface elevate" aria-labelledby="updates-title">
            <div className="border-b border-border p-5 sm:p-6">
              <p id="updates-title" role="heading" aria-level={2} className="text-lg font-semibold">Submission Updates</p>
              <p className="mt-1 text-sm text-text-muted">Review recorded changes and remarks related to this submission.</p>
            </div>
            {detail.events.length ? (
              <ol className="divide-y divide-border">
                {detail.events.map((event) => (
                  <li key={event.id} className="grid gap-3 p-5 sm:grid-cols-4 sm:px-6">
                    <div><StatusBadge status={event.status} /></div>
                    <p className="text-sm font-medium">{event.actor}</p>
                    <p className="text-sm text-text-muted">{formatWhen(event.at)}</p>
                    <p className="text-sm text-text-muted">{event.remarks ?? 'No remarks'}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="px-5 py-12 text-center"><p className="text-sm font-medium">No status updates are available for this submission.</p></div>
            )}
          </section>

          <section className="rounded-card bg-surface p-5 elevate sm:p-6" aria-labelledby="documents-title">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p id="documents-title" role="heading" aria-level={2} className="text-lg font-semibold">Submitted Documents{latestVersion && latestVersion.version > 1 ? ` (version ${latestVersion.version})` : ''}</p>
              <Button type="button" variant="secondary" onClick={() => onOpenDetails(submission.id)} className="w-full sm:w-auto">View Submission Details <Icon name="arrowRight" size={16} /></Button>
            </div>
            {documents.length ? (
              <ul className="mt-4 grid gap-2">
                {documents.map((name) => <li key={name} className="flex items-center gap-2 rounded-control bg-canvas px-3 py-2.5 text-sm"><Icon name="clipboard" size={16} className="shrink-0 text-text-muted" />{name}</li>)}
              </ul>
            ) : <p className="mt-3 text-sm text-text-muted">No document names are recorded for this prototype submission.</p>}
            <p className="mt-3 text-xs text-text-muted">Documents cannot be edited here. Corrections use the existing submission workflow.</p>
          </section>

          <Alert tone="info" title="Cross-portal updates are not live in this prototype">
            Status information here uses fictional demonstration records. It is prepared for future authorized updates from Immediate Supervisor, HR Document Verification, and HR Transmittals.
          </Alert>

          {preview && <div className="grid gap-4 rounded-control border border-dashed border-border-strong p-4 sm:grid-cols-2">
            <p className="text-xs leading-relaxed text-text-muted sm:col-span-2"><span className="font-semibold text-text">Prototype only.</span> Preview how this page renders other recorded conditions. These controls do not change the submission.</p>
            <SelectField label="Preview status" value={previewStatus} onChange={(event) => setPreviewStatus(event.target.value)} placeholder="Recorded status">
              {['Submitted', 'Incomplete', 'Late', 'Returned', 'Validated', 'Verified', 'Transmitted'].map((item) => <option key={item} value={item}>{item}</option>)}
            </SelectField>
            <SelectField label="Preview data state" value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}>
              <option value="records">Recorded updates</option>
              <option value="no-updates">No updates</option>
              <option value="error">Load error</option>
            </SelectField>
          </div>}
        </>
      )}
    </div>
  )
}
