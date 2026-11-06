import clsx from 'clsx'
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { Alert, Button, Icon } from '../../MsuPayroll'
import { Modal, SelectField, Tag } from '../../admin/ui'
import { demoFlag } from '../demoFlags'
import {
  activeRequirements,
  circumstanceLabels,
  DEMO_TODAY,
  fileRules,
  formatScheduleDate,
  pendingRequirements,
  periodOptions,
  resolveAssignment,
  validateFile,
  type CircumstanceId,
  type DocumentRequirement,
  type EmployeeRecord,
  type ExistingSubmission,
} from './config'

const STEPS = ['Payroll Details', 'Document Requirements', 'Review & Submit'] as const
const NO_PERIOD_MESSAGE = 'Select a payroll period to continue.'

type Draft = {
  period: string
  circumstances: CircumstanceId[]
  files: Record<string, File>
  missingEntries: 'no' | 'yes'
  explanation: string
}

const emptyDraft: Draft = { period: '', circumstances: [], files: {}, missingEntries: 'no', explanation: '' }
const fileSize = (f: File) => `${(f.size / 1024).toFixed(1)} KB`

// ---------- small presentational pieces ----------

function Stepper({ step }: { step: number }) {
  return (
    <ol aria-label="New submission progress" className="grid grid-cols-3 gap-2 sm:gap-4">
      {STEPS.map((label, i) => {
        const state = i < step ? 'done' : i === step ? 'current' : 'upcoming'
        return (
          <li key={label} aria-current={state === 'current' ? 'step' : undefined}>
            <span className={clsx('block h-1.5 rounded-full', state === 'upcoming' ? 'bg-border' : 'bg-primary')} aria-hidden="true" />
            <span className="mt-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
              <span
                className={clsx(
                  'grid size-8 shrink-0 place-items-center rounded-full border text-xs font-semibold',
                  state === 'done' && 'border-success bg-success text-surface',
                  state === 'current' && 'border-primary bg-primary text-on-primary',
                  state === 'upcoming' && 'border-border-strong bg-surface text-text-muted',
                )}
              >
                {state === 'done' ? <Icon name="check" size={15} strokeWidth={2.5} /> : i + 1}
              </span>
              <span className={clsx('text-xs font-semibold leading-snug sm:text-sm', state === 'upcoming' && 'text-text-muted')}>
                {label}
                <span className="sr-only">{state === 'done' ? ' (completed)' : state === 'current' ? ' (current step)' : ' (not started)'}</span>
              </span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function Section({
  title, detail, aside, children,
}: { title: string; detail?: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="py-6 first:pt-0 last:pb-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p role="heading" aria-level={3} className="text-base font-semibold leading-snug">{title}</p>
          {detail && <p className="mt-1 text-sm leading-relaxed text-text-muted">{detail}</p>}
        </div>
        {aside}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function ReadOnlyField({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
        {label}
        <Icon name="lock" size={12} aria-label="Read-only" role="img" />
      </dt>
      <dd className={clsx('mt-1.5 rounded-control border border-border bg-canvas px-3.5 py-3 text-sm font-medium', muted && 'text-text-muted')}>
        {value}
      </dd>
    </div>
  )
}

function Summary({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd className={clsx('mt-0.5 text-sm font-medium', muted && 'text-text-muted')}>{value}</dd>
    </div>
  )
}

// Native controls styled with the project tokens (the kit has no checkbox, radio, or textarea).
function ChoiceOption({
  type, name, label, checked, onChange,
}: { type: 'checkbox' | 'radio'; name: string; label: string; checked: boolean; onChange: () => void }) {
  return (
    <label
      className={clsx(
        'flex min-h-12 cursor-pointer items-center gap-3 rounded-control border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-info-soft',
        checked ? 'border-primary bg-info-soft/60' : 'border-border-strong bg-surface',
      )}
    >
      <input type={type} name={name} checked={checked} onChange={onChange} className="size-5 shrink-0 cursor-pointer accent-primary" />
      {label}
    </label>
  )
}

// ---------- reusable document upload ----------

function DocumentUpload({
  requirement, file, error, showMissing, onSelect, onRemove,
}: {
  requirement: DocumentRequirement
  file?: File
  error?: string
  showMissing: boolean
  onSelect: (file: File) => void
  onRemove: () => void
}) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const missing = !file && showMissing
  const label = requirement.applicability === 'mandatory' ? 'Required' : 'Required for this condition'

  return (
    <div className={clsx('rounded-control border p-4', missing || error ? 'border-danger bg-danger-soft/40' : 'border-border-strong bg-surface')}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p id={`${id}-name`} className="text-sm font-semibold leading-snug">{requirement.name}</p>
          <p className="mt-1 text-sm leading-relaxed text-text-muted">{requirement.description}</p>
        </div>
        <span className="rounded-full border border-dashed border-border-strong px-2.5 py-1 text-xs font-medium leading-none text-text-muted">{label}</span>
      </div>

      {requirement.instructions && (
        <p className="mt-3 flex items-start gap-2 rounded-control bg-info-soft px-3 py-2.5 text-xs leading-relaxed text-text">
          <Icon name="info" size={15} className="mt-0.5 shrink-0 text-primary" />
          {requirement.instructions}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-sm" aria-live="polite">
          {file ? (
            <p className="flex items-center gap-2 font-medium text-success">
              <Icon name="check" size={16} className="shrink-0" />
              <span className="min-w-0 break-all text-text">{file.name}</span>
              <span className="shrink-0 text-xs font-normal text-text-muted">{fileSize(file)} · Ready to submit</span>
            </p>
          ) : missing ? (
            <p className="flex items-center gap-2 font-medium text-danger">
              <Icon name="alert" size={16} className="shrink-0" /> Missing: select a file for {requirement.name}.
            </p>
          ) : (
            <p className="text-text-muted">No file selected</p>
          )}
          {error && <p className="mt-1 flex items-center gap-2 text-xs font-medium text-danger"><Icon name="alert" size={14} />{error}</p>}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="secondary" onClick={() => input.current?.click()} aria-describedby={`${id}-name`} className="h-11 flex-1 sm:flex-none">
            <Icon name={file ? 'pencil' : 'plus'} size={16} />
            {file ? 'Replace file' : 'Select file'}
          </Button>
          {file && (
            <Button type="button" variant="secondary" onClick={onRemove} aria-label={`Remove file for ${requirement.name}`} className="h-11 flex-1 sm:flex-none">
              <Icon name="x" size={16} />
              Remove
            </Button>
          )}
        </div>
        {/* Visually hidden native picker; the buttons above are the accessible controls. */}
        <input
          ref={input}
          type="file"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          accept={fileRules.acceptedExtensions?.join(',')}
          onChange={(e) => {
            const picked = e.target.files?.[0]
            if (picked) onSelect(picked)
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}

function PendingRequirement({ requirement }: { requirement: DocumentRequirement }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-dashed border-border-strong p-4">
      <div>
        <p className="text-sm font-semibold">{requirement.name}</p>
        <p className="mt-1 text-sm text-text-muted">{requirement.description}</p>
      </div>
      <span className="rounded-full border border-dashed border-border-strong px-2.5 py-1 text-xs font-medium leading-none text-text-muted">Pending office confirmation</span>
    </div>
  )
}

// ---------- the form ----------

export type ResubmitTarget = { id: string; period: string; remarks?: string; affected?: string }

export function NewSubmissionForm({
  employee,
  existing,
  resubmit,
  onBack,
  onSubmit,
}: {
  /** The signed-in employee's HR-linked record, or null when HR has not linked one. */
  employee: EmployeeRecord | null
  /** This employee's existing submissions, used to keep duplicate ordinary submissions out. */
  existing: ExistingSubmission[]
  /** When set, the form corrects and resubmits this returned submission instead of creating a new one. */
  resubmit?: ResubmitTarget
  onBack: () => void
  /** Local, simulated submit. Returns the record id so it can be shown on the success screen. */
  onSubmit: (info: { payrollType: string; period: string; files: string[] }) => { id: string }
}) {
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({})
  const [showErrors, setShowErrors] = useState(false)
  const [done, setDone] = useState<{ id: string; payrollType: string; period: string } | null>(null)
  const [confirming, setConfirming] = useState(false)
  const stepTitle = useRef<HTMLParagraphElement>(null)
  const firstRender = useRef(true)

  // Developer/demo testing only: append ?demo=no-assignment to the URL to preview the unassigned state.
  const demoUnassigned = demoFlag('no-assignment')
  const record = employee && (demoUnassigned ? { ...employee, assignedPayrollTypeId: null } : employee)
  const assignment = record ? resolveAssignment(record) : null
  const config = assignment?.status === 'assigned' ? assignment.config : null
  const options = useMemo(() => (config ? periodOptions(config, existing) : []), [config, existing])
  const eligible = resubmit ? options.filter((item) => item.schedule.label === resubmit.period) : options.filter((item) => item.eligible)
  const blocked = options.filter((item) => !item.eligible && item.schedule.label !== resubmit?.period)
  const chosen = options.find((item) => item.schedule.label === draft.period)
  const officeMissing = Boolean(record) && !record?.office

  // Keep a locked period in place when correcting a returned submission.
  useEffect(() => {
    if (resubmit && config && draft.period !== resubmit.period) setDraft((d) => ({ ...d, period: resubmit.period }))
  }, [resubmit, config, draft.period])

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    stepTitle.current?.focus()
  }, [step, done])

  const active = useMemo(() => (config ? activeRequirements(config, draft.circumstances) : []), [config, draft.circumstances])
  const pending = useMemo(() => (config ? pendingRequirements(config, draft.circumstances) : []), [config, draft.circumstances])
  const selectedCount = active.filter((d) => draft.files[d.id]).length
  const missing = active.filter((d) => !draft.files[d.id])
  const complete = missing.length === 0

  const patch = (changes: Partial<Draft>) => setDraft((d) => ({ ...d, ...changes }))
  const go = (next: number) => { setShowErrors(false); setStep(next) }

  const selectFile = (doc: DocumentRequirement, file: File) => {
    const problem = validateFile(file)
    setFileErrors((e) => {
      const { [doc.id]: _removed, ...rest } = e
      return problem ? { ...rest, [doc.id]: problem } : rest
    })
    if (!problem) setDraft((d) => ({ ...d, files: { ...d.files, [doc.id]: file } }))
  }
  const removeFile = (doc: DocumentRequirement) => {
    setDraft((d) => { const { [doc.id]: _removed, ...rest } = d.files; return { ...d, files: rest } })
    setFileErrors((e) => { const { [doc.id]: _removed, ...rest } = e; return rest })
  }
  const toggleCircumstance = (id: CircumstanceId) =>
    patch({ circumstances: draft.circumstances.includes(id) ? draft.circumstances.filter((c) => c !== id) : [...draft.circumstances, id] })

  const next = () => {
    if (step === 0) {
      if (!config || !draft.period || officeMissing) return setShowErrors(true)
      return go(1)
    }
    if (step === 1) {
      if (!complete) return setShowErrors(true)
      return go(2)
    }
  }

  const submit = () => {
    setConfirming(false)
    if (!config || !draft.period || !complete) return setShowErrors(true)
    // Never create a second ordinary submission for the same payroll type and period.
    if (!resubmit && existing.some((item) => item.payrollType === config.name && item.period === draft.period)) return setStep(0)
    const created = onSubmit({
      payrollType: config.name,
      period: draft.period,
      files: active.map((doc) => draft.files[doc.id]?.name).filter((name): name is string => Boolean(name)),
    })
    setDone({ id: created.id, payrollType: config.name, period: draft.period })
  }

  const header = (
    <div>
      <Button type="button" variant="link" onClick={onBack} className="-ml-1 mb-3">
        <Icon name="arrowLeft" size={16} />
        Back to My Submissions
      </Button>
      <p id="page-title" role="heading" aria-level={1} tabIndex={-1} className="text-2xl font-semibold leading-tight sm:text-3xl">{resubmit ? 'Correct & Resubmit' : 'New Submission'}</p>
      <p className="mt-2 text-sm leading-relaxed text-text-muted">
        {resubmit ? 'Review the return remarks, replace the affected documents, and resubmit this submission.' : 'Complete your payroll information and upload the required documents.'}
      </p>
    </div>
  )

  if (!record) {
    return (
      <div className="grid gap-7 font-sans">
        {header}
        <section className="rounded-card bg-surface p-5 elevate sm:p-8">
          <Alert tone="warning" title="No employee record is linked to your account">
            You cannot start a submission yet. Please contact the HR Office so your employee record can be linked.
          </Alert>
        </section>
      </div>
    )
  }

  // ----- success (demonstration only) -----
  if (done) {
    return (
      <div className="grid gap-7 font-sans">
        {header}
        <section className="rounded-card bg-surface p-5 elevate sm:p-8">
          <Tag kind="simulated">Demonstration only</Tag>
          <p ref={stepTitle} tabIndex={-1} role="heading" aria-level={2} className="mt-4 text-xl font-semibold leading-snug">{resubmit ? 'Prototype resubmission recorded' : 'Prototype submission recorded'}</p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
            {resubmit
              ? <>Your existing submission was updated with the status <span className="font-semibold text-text">Submitted</span>. The returned version and its remarks are kept in the history. It is a prototype record only.</>
              : <>This sample submission was added to your My Submissions list with the status <span className="font-semibold text-text">Submitted</span>. It is a prototype record only.</>}
          </p>
          <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-3">
            <Summary label="Submission ID" value={done.id} />
            <Summary label="Payroll Type" value={done.payrollType} />
            <Summary label="Payroll Period" value={done.period} />
          </dl>
          <div className="mt-5">
            <Alert tone="info" title="Not a real submission">
              Nothing was uploaded or sent. No office, supervisor, or HR staff received this, and no notifications were issued.
            </Alert>
          </div>
          <Button type="button" onClick={onBack} className="mt-6 w-full sm:w-auto">
            Back to My Submissions
          </Button>
        </section>
      </div>
    )
  }

  const footer = (
    <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
      {step > 0 ? (
        <Button type="button" variant="secondary" onClick={() => go(step - 1)} className="w-full sm:w-auto">
          <Icon name="arrowLeft" size={16} /> Previous
        </Button>
      ) : <span />}
      {step < 2 ? (
        <Button type="button" onClick={next} disabled={step === 0 && (!config || !draft.period || officeMissing)} className="w-full sm:w-auto">
          Continue <Icon name="arrowRight" size={16} />
        </Button>
      ) : (
        <Button type="button" onClick={() => (complete ? setConfirming(true) : setShowErrors(true))} className="w-full sm:w-auto">
          <Icon name="clipboard" size={18} /> {resubmit ? 'Resubmit Requirements' : 'Submit Requirements'}
        </Button>
      )}
    </div>
  )

  const primaryDocs = active.filter((d) => d.applicability === 'mandatory')
  const activeCircumstances = config ? config.circumstances.filter((c) => draft.circumstances.includes(c)) : []

  return (
    <div className="grid gap-7 font-sans">
      {header}
      <Stepper step={step} />

      <div className="rounded-card bg-surface p-5 elevate sm:p-7">
        <p ref={stepTitle} tabIndex={-1} role="heading" aria-level={2} className="mb-6 text-xl font-semibold leading-snug">
          Step {step + 1}: {STEPS[step]}
        </p>

        {/* ---------------- Step 1 ---------------- */}
        {step === 0 && record && (
          <div className="divide-y divide-border">
            {resubmit && (
              <div className="pb-6">
                <Alert tone="danger" title="This submission was returned for correction">
                  {resubmit.remarks ?? 'No remarks were recorded.'}
                  <span className="mt-2 block text-xs text-text-muted">
                    Affected requirement: {resubmit.affected ?? 'Not recorded. All applicable requirements must be selected again.'} Previous document versions and history are kept.
                  </span>
                </Alert>
              </div>
            )}
            <Section
              title="Employee Information"
              detail="These details come from your HR-maintained record and cannot be changed here."
              aside={<Tag kind="placeholder">Fictional prototype profile</Tag>}
            >
              <dl className="grid gap-4 sm:grid-cols-2">
                <ReadOnlyField label="Employee Name" value={record.name} />
                <ReadOnlyField label="Employee ID" value={record.employeeId} />
                <ReadOnlyField label="Employee Classification" value={record.classification} />
                <ReadOnlyField label="Employment Type" value={record.employmentType} />
                <ReadOnlyField
                  label="Assigned Payroll Type"
                  value={config ? config.name : 'Not assigned'}
                  muted={!config}
                />
                <ReadOnlyField label="Cost Center / Office" value={record.office ?? 'Not yet assigned by HR.'} muted={!record.office} />
                <ReadOnlyField label="Immediate Supervisor" value={record.supervisor ?? 'No Immediate Supervisor is recorded in your HR record.'} muted={!record.supervisor} />
              </dl>
              {officeMissing && (
                <div className="mt-4">
                  <Alert tone="warning" title="Cost Center / Office not assigned">
                    Your submission cannot be processed or routed until HR assigns a Cost Center / Office. Please contact the HR Office.
                  </Alert>
                </div>
              )}
              {assignment?.status === 'unassigned' && (
                <div className="mt-4">
                  <Alert tone="warning" title="Payroll type not assigned">
                    No payroll type has been assigned to your account. Please contact the HR Office for verification.
                  </Alert>
                </div>
              )}
              {assignment?.status === 'unconfigured' && (
                <div className="mt-4">
                  <Alert tone="warning" title="Checklist not configured">
                    The document checklist for your assigned payroll type has not been configured yet. Please contact the HR Office.
                  </Alert>
                </div>
              )}
            </Section>

            {config && (
              <Section title="Payroll Period" detail={resubmit ? 'The period of the submission being corrected.' : 'Choose the payroll period this submission is for.'}>
                {eligible.length === 0 ? (
                  <Alert tone="warning" title="No payroll period available">
                    No payroll period is currently available for submission. Please contact the HR Office or the appropriate office for clarification.
                  </Alert>
                ) : (
                  <SelectField
                    label="Payroll Period (required)"
                    value={draft.period}
                    onChange={(e) => patch({ period: e.target.value })}
                    placeholder="Select a payroll period"
                    disabled={Boolean(resubmit)}
                    hint={draft.period ? undefined : 'Select a payroll period to continue.'}
                    className="max-w-md"
                  >
                    {eligible.map((item) => <option key={item.schedule.label} value={item.schedule.label}>{item.schedule.label}</option>)}
                  </SelectField>
                )}

                {chosen && (
                  <div className="mt-4 rounded-control bg-canvas p-4">
                    <p className="text-sm font-semibold">Submission Schedule</p>
                    {chosen.availability === 'Not configured' ? (
                      <p className="mt-2 text-sm text-text-muted">Submission schedule not yet configured.</p>
                    ) : (
                      <dl className="mt-3 grid gap-4 sm:grid-cols-3">
                        <div><dt className="text-xs font-medium text-text-muted">Submission Opens</dt><dd className="mt-1 text-sm font-medium">{formatScheduleDate(chosen.schedule.opens!)}</dd></div>
                        <div><dt className="text-xs font-medium text-text-muted">Submission Deadline</dt><dd className="mt-1 text-sm font-medium">{formatScheduleDate(chosen.schedule.deadline!)}</dd></div>
                        <div>
                          <dt className="text-xs font-medium text-text-muted">Availability</dt>
                          <dd className="mt-1"><span className={clsx('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', chosen.availability === 'Open' ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning')}>{chosen.availability}</span></dd>
                        </div>
                      </dl>
                    )}
                    <p className="mt-3 text-xs leading-relaxed text-text-muted">
                      Fictional configured schedule that you cannot change. Availability is shown against the prototype date ({formatScheduleDate(DEMO_TODAY)}) and is not a submission status.
                    </p>
                  </div>
                )}

                {!resubmit && blocked.length > 0 && (
                  <p className="mt-4 text-xs leading-relaxed text-text-muted">
                    <span className="font-semibold text-text">Not available for a new submission:</span>{' '}
                    {blocked.map((item) => `${item.schedule.label} (${item.reason})`).join('; ')}.
                  </p>
                )}
              </Section>
            )}
          </div>
        )}

        {/* ---------------- Step 2 ---------------- */}
        {step === 1 && config && (
          <div className="divide-y divide-border">
            <Section title="Document checklist" detail="Your checklist is based on your assigned payroll type and the circumstances you select below.">
              <div role="status" aria-live="polite" className="rounded-control bg-canvas p-4">
                <p className="text-sm font-semibold">
                  {selectedCount} of {active.length} applicable required document{active.length === 1 ? '' : 's'} selected
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border" aria-hidden="true">
                  <div className={clsx('h-full rounded-full', complete ? 'bg-success' : 'bg-primary')} style={{ width: `${active.length ? (selectedCount / active.length) * 100 : 0}%` }} />
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-text-muted">
                Accepted file types and the maximum file size will be confirmed by the authorized office, so none are enforced yet. Files stay in your browser for this prototype and are not uploaded anywhere.
              </p>
            </Section>

            <Section title="Primary Document">
              <div className="grid gap-4">
                {primaryDocs.map((doc) => (
                  <DocumentUpload
                    key={doc.id}
                    requirement={doc}
                    file={draft.files[doc.id]}
                    error={fileErrors[doc.id]}
                    showMissing={showErrors}
                    onSelect={(f) => selectFile(doc, f)}
                    onRemove={() => removeFile(doc)}
                  />
                ))}
              </div>
            </Section>

            <Section title="Additional Supporting Documents" detail="Indicate which circumstances apply to the selected payroll period.">
              <fieldset>
                <legend className="sr-only">Circumstances that apply to this payroll period</legend>
                <div className="grid gap-3 sm:grid-cols-3">
                  {config.circumstances.map((c) => (
                    <ChoiceOption
                      key={c}
                      type="checkbox"
                      name="circumstance"
                      label={circumstanceLabels[c]}
                      checked={draft.circumstances.includes(c)}
                      onChange={() => toggleCircumstance(c)}
                    />
                  ))}
                </div>
              </fieldset>
              <p className="mt-3 text-xs leading-relaxed text-text-muted">
                These describe the payroll period only. They do not confirm that you are entitled to any leave or benefit; that follows the authorized office's configuration.
              </p>

              {activeCircumstances.length > 0 && (
                <div className="mt-5 grid gap-5">
                  {activeCircumstances.map((c) => (
                    <div key={c}>
                      <p className="mb-3 text-sm font-semibold">{circumstanceLabels[c]}</p>
                      <div className="grid gap-4">
                        {active.filter((d) => d.trigger === c).map((doc) => (
                          <DocumentUpload
                            key={doc.id}
                            requirement={doc}
                            file={draft.files[doc.id]}
                            error={fileErrors[doc.id]}
                            showMissing={showErrors}
                            onSelect={(f) => selectFile(doc, f)}
                            onRemove={() => removeFile(doc)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {pending.length > 0 && (
              <Section title="Requirements pending office confirmation" detail="These are not counted as missing while the office confirms them.">
                <div className="grid gap-3">{pending.map((doc) => <PendingRequirement key={doc.id} requirement={doc} />)}</div>
              </Section>
            )}

            <Section title="Attendance Record Concern" aside={<Tag kind="placeholder">Optional</Tag>}>
              <fieldset>
                <legend className="text-sm font-medium">Are there missing time entries in your attendance or service record?</legend>
                <div className="mt-3 grid max-w-sm grid-cols-2 gap-3">
                  <ChoiceOption type="radio" name="missing-entries" label="No" checked={draft.missingEntries === 'no'} onChange={() => patch({ missingEntries: 'no' })} />
                  <ChoiceOption type="radio" name="missing-entries" label="Yes" checked={draft.missingEntries === 'yes'} onChange={() => patch({ missingEntries: 'yes' })} />
                </div>
              </fieldset>
              {draft.missingEntries === 'yes' && (
                <div className="mt-4 grid gap-4">
                  <Alert tone="info" title="Missing time entries need verification">
                    Supervisor verification is permitted when supported by a corresponding logbook entry; otherwise HR verification is needed. Your answer does not approve or correct any entry.
                  </Alert>
                  <div>
                    <label htmlFor="missing-explanation" className="mb-1.5 block text-sm font-medium">Explanation (optional)</label>
                    <textarea
                      id="missing-explanation"
                      rows={4}
                      value={draft.explanation}
                      onChange={(e) => patch({ explanation: e.target.value })}
                      className="w-full resize-y rounded-control border border-border-strong bg-surface px-3.5 py-3 text-base text-text placeholder:text-text-muted/70 hover:border-primary sm:text-sm"
                      placeholder="Describe the missing entries, if you wish."
                    />
                  </div>
                </div>
              )}
            </Section>

            {showErrors && !complete && (
              <div className="pt-6">
                <Alert tone="danger" title="Select all required documents to continue">
                  Still missing: {missing.map((d) => d.name).join(', ')}.
                </Alert>
              </div>
            )}
          </div>
        )}

        {/* ---------------- Step 3 ---------------- */}
        {step === 2 && config && (
          <div className="divide-y divide-border">
            <Section
              title="Payroll Information"
              aside={<Button type="button" variant="link" onClick={() => go(0)}>Edit<span className="sr-only"> payroll information</span></Button>}
            >
              <dl className="grid gap-4 sm:grid-cols-2">
                <Summary label="Employee Name" value={record.name} />
                <Summary label="Employee ID" value={record.employeeId} />
                <Summary label="Employee Classification" value={record.classification} />
                <Summary label="Employment Type" value={record.employmentType} />
                <Summary label="Assigned Payroll Type" value={config.name} />
                <Summary label="Cost Center / Office" value={record.office ?? 'Not yet assigned by HR.'} muted={!record.office} />
                <Summary label="Immediate Supervisor" value={record.supervisor ?? 'No Immediate Supervisor is recorded in your HR record.'} muted={!record.supervisor} />
                <Summary label="Payroll Period" value={draft.period} />
                {activeCircumstances.length > 0 && <Summary label="Circumstances indicated" value={activeCircumstances.map((c) => circumstanceLabels[c]).join(', ')} />}
              </dl>
            </Section>

            <Section
              title="Document Summary"
              aside={<Button type="button" variant="link" onClick={() => go(1)}>Edit<span className="sr-only"> documents</span></Button>}
            >
              <ul className="divide-y divide-border rounded-control border border-border">
                {active.map((doc) => {
                  const file = draft.files[doc.id]
                  return (
                    <li key={doc.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <div>
                        <p className="text-sm font-semibold">{doc.name}</p>
                        <p className="mt-0.5 text-xs text-text-muted">{doc.applicability === 'mandatory' ? 'Primary required document' : `Required for ${circumstanceLabels[doc.trigger!]}`}</p>
                      </div>
                      {file ? (
                        <p className="flex items-center gap-2 text-sm font-medium"><Icon name="check" size={16} className="shrink-0 text-success" /><span className="break-all">{file.name}</span></p>
                      ) : (
                        <p className="flex items-center gap-2 text-sm font-medium text-danger"><Icon name="alert" size={16} className="shrink-0" />Missing</p>
                      )}
                    </li>
                  )
                })}
              </ul>
              {!complete && (
                <div className="mt-4">
                  <Alert tone="danger" title="Required files are missing">
                    Go back to add: {missing.map((d) => d.name).join(', ')}.
                  </Alert>
                </div>
              )}
            </Section>

            {draft.missingEntries === 'yes' && (
              <Section title="Attendance Concerns" aside={<Button type="button" variant="link" onClick={() => go(1)}>Edit<span className="sr-only"> attendance concerns</span></Button>}>
                <dl className="grid gap-4">
                  <Summary label="Missing time entries reported" value="Yes. Verification is needed." />
                  <Summary label="Explanation" value={draft.explanation.trim() || 'No explanation provided'} muted={!draft.explanation.trim()} />
                </dl>
              </Section>
            )}

            <div className="pt-6">
              <Alert tone="info">
                Please review your information and ensure your documents follow the university's existing approval and signature requirements.
              </Alert>
              {showErrors && !complete && (
                <p role="alert" className="mt-3 text-sm font-medium text-danger">Add the missing required files before submitting.</p>
              )}
            </div>
          </div>
        )}

        {footer}
      </div>

      {confirming && (
        <Modal title={resubmit ? 'Resubmit your requirements?' : 'Submit your requirements?'} onClose={() => setConfirming(false)}>
          <p className="text-sm leading-relaxed text-text-muted text-pretty">
            {resubmit
              ? `Your corrected documents will be added as a new version of this ${draft.period} submission. The returned version and its remarks are kept.`
              : `You are submitting ${selectedCount} document${selectedCount === 1 ? '' : 's'} for ${draft.period} under ${config?.name}. You cannot submit this payroll period again afterwards.`}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-text-muted">Prototype only: nothing is uploaded or sent to any office.</p>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setConfirming(false)} className="h-11! px-5!">Review again</Button>
            <Button type="button" onClick={submit} className="h-11! px-5!">{resubmit ? 'Confirm and resubmit' : 'Confirm and submit'}</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
