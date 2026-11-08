import clsx from "clsx"
import { useMemo, useState, type Dispatch, type SetStateAction } from "react"
import { Alert, Button, Icon, TextField, type IconName } from "../../MsuPayroll"
import { Modal, SelectField, Tag } from "../../admin/ui"
import { demoFlag } from "../demoFlags"
import { Pagination, usePaged } from "./ui"
import {
  activeRequirements,
  circumstanceLabels,
  payrollTypeConfigs,
  pendingRequirements,
  type CircumstanceId,
  type DocumentRequirement,
} from "../newSubmission/config"
import {
  currentAssignment,
  payrollConfig,
  type EmployeeClassification,
  type HrEmployee,
} from "./hrData"

const STATUSES = [
  "Submitted",
  "Incomplete",
  "Late",
  "Returned",
  "Validated",
  "Verified",
  "Transmitted",
] as const
export type VerificationStatus = typeof STATUSES[number]

export type VerificationAttachment = {
  requirementId: string
  filename: string
  documentType: string
  available: boolean
  previewAvailable: boolean
  uploadedAt?: string
  uploadedBy?: string
  version?: number
  previousVersions?: {
    version: number
    filename: string
    uploadedAt?: string
  }[]
}

type SupervisorValidation = {
  supervisor: string
  status: "Validated"
  validatedAt?: string
  remarks?: string
}

export type AttendanceConcern = {
  exists: boolean
  explanation?: string
  logbookEntry: boolean
  supervisorVerified: boolean
  hrVerificationRequired: boolean
  id?: string
  attendanceDate?: string
  missingEntry?: string
  reportedBy?: string
  reportedAt?: string
  logbookEvidenceReference?: string
  attendanceSourceReference?: string
  supervisorVerification?: {
    user: string
    at: string
    evidenceReference: string
  }
  hrReferral?: {
    user: string
    at: string
    remarks: string
  }
}

export type SupervisorDecisionEvent = {
  id: string
  decision: "Validated" | "Returned"
  supervisor: string
  recordedAt: string
  remarks?: string
  referencedChecklistItems?: string[]
  attendanceConcernReference?: string
  previousStatus: VerificationStatus
  nextStatus: VerificationStatus
}

type HrDecision = {
  outcome: "Verified" | "Returned"
  reviewedAt: string
  /** Fictional HR user who recorded the local decision, when known. */
  reviewedBy?: string
  remarks?: string
  affectedRequirement?: string
}

export type VerificationSubmission = {
  id: string
  employeeId: string
  payrollTypeId: string
  period: string
  submittedAt: string
  status: VerificationStatus
  circumstances: CircumstanceId[]
  attachments: VerificationAttachment[]
  supervisorValidation: SupervisorValidation
  attendanceConcern: AttendanceConcern
  hrDecision?: HrDecision
  checklistVersion?: string
  employeeRemarks?: string
  configuredDeadline?: string
  supervisorDecisions?: SupervisorDecisionEvent[]
  resubmittedAt?: string
}

export const initialVerificationSubmissions: VerificationSubmission[] = []

type DataState = "loaded" | "empty" | "error"
type Tab = "verify" | "reviewed"

const dateTime = new Intl.DateTimeFormat("en-PH", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
})
const tableDate = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "2-digit",
})
const tableTime = new Intl.DateTimeFormat("en-PH", {
  hour: "numeric",
  minute: "2-digit",
})

function StatusBadge({ status }: { status: VerificationStatus }) {
  const styles: Record<
    VerificationStatus,
    {
      icon: IconName
      tone: string
    }
  > = {
    Submitted: { icon: "clipboard", tone: "bg-info-soft text-primary" },
    Incomplete: { icon: "alert", tone: "bg-warning-soft text-warning" },
    Late: { icon: "clock", tone: "bg-warning-soft text-warning" },
    Returned: { icon: "arrowLeft", tone: "bg-danger-soft text-danger" },
    Validated: { icon: "check", tone: "bg-primary/10 text-primary" },
    Verified: { icon: "shield", tone: "bg-success-soft text-success" },
    Transmitted: { icon: "arrowRight", tone: "bg-success-soft text-success" },
  }
  const style = styles[status]
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        style.tone,
      )}
    >
      <Icon name={style.icon} size={13} />
      {status}
    </span>
  )
}

function DataPoint({
  label,
  value,
  muted,
}: {
  label: string
  value: string
  muted?: boolean
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-text-muted">{label}</dt>
      <dd
        className={clsx(
          "mt-1 text-sm font-medium leading-snug",
          muted && "text-text-muted",
        )}
      >
        {value}
      </dd>
    </div>
  )
}

function configurationFor(submission: VerificationSubmission) {
  // Shared source: this is the same Permanent Staff checklist configuration used by Employee New Submission.
  return payrollTypeConfigs[submission.payrollTypeId]
}

function applicableRequirements(submission: VerificationSubmission) {
  const config = configurationFor(submission)
  return config ? activeRequirements(config, submission.circumstances) : []
}

function pendingChecklistRequirements(submission: VerificationSubmission) {
  const config = configurationFor(submission)
  return config ? pendingRequirements(config, submission.circumstances) : []
}

function attachmentFor(
  submission: VerificationSubmission,
  requirementId: string,
) {
  return submission.attachments.find(
    (attachment) => attachment.requirementId === requirementId,
  )
}

function DocumentPreview({
  requirement,
  attachment,
  onClose,
}: {
  requirement: DocumentRequirement
  attachment: VerificationAttachment
  onClose: () => void
}) {
  return (
    <Modal title="Document Preview" onClose={onClose}>
      <Tag kind="placeholder">Safe fictional metadata</Tag>
      <dl className="mt-5 grid gap-4">
        <DataPoint label="Document" value={requirement.name} />
        <DataPoint label="Filename" value={attachment.filename} />
        <DataPoint label="Document Type" value={attachment.documentType} />
      </dl>
      <div className="mt-5">
        {attachment.previewAvailable ? (
          <Alert tone="info" title="Prototype metadata preview">
            The fictional attachment is marked available. Official document
            contents are not generated or displayed in this prototype.
          </Alert>
        ) : (
          <Alert tone="warning" title="Preview unavailable">
            The attachment metadata is available, but this fictional file does
            not have a supported preview.
          </Alert>
        )}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-text-muted">
        Read-only. HR cannot edit, replace, or re-upload employee files from
        this workspace.
      </p>
      <div className="mt-5 flex justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  )
}

function ReturnDialog({
  submission,
  employee,
  requirements,
  onClose,
  onConfirm,
}: {
  submission: VerificationSubmission
  employee: HrEmployee
  requirements: DocumentRequirement[]
  onClose: () => void
  onConfirm: (remarks: string, affected: string) => void
}) {
  const [remarks, setRemarks] = useState("")
  const [affected, setAffected] = useState("")
  const [error, setError] = useState("")
  const confirm = () => {
    if (!remarks.trim()) {
      setError(
        "Enter return remarks before returning the submission. Remarks cannot be blank.",
      )
      return
    }
    onConfirm(remarks.trim(), affected)
  }
  return (
    <Modal title="Return Submission" onClose={onClose}>
      <dl className="grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
        <DataPoint
          label="Employee Name"
          value={`${employee.name} (${employee.employeeId})`}
        />
        <DataPoint label="Submission ID" value={submission.id} />
        <div>
          <dt className="text-xs font-medium text-text-muted">
            Current Status
          </dt>
          <dd className="mt-1">
            <StatusBadge status={submission.status} />
          </dd>
        </div>
      </dl>
      <div className="mt-5 grid gap-4">
        <SelectField
          label="Affected Requirement / Document (optional)"
          value={affected}
          onChange={(event) => setAffected(event.target.value)}
          placeholder="Not specified"
        >
          {requirements.map((item) => (
            <option key={item.id} value={item.name}>
              {item.name}
            </option>
          ))}
        </SelectField>
        <div>
          <label
            htmlFor="return-remarks"
            className="mb-1.5 block text-sm font-medium"
          >
            Return Remarks{" "}
            <span className="text-danger" aria-hidden="true">
              *
            </span>
          </label>
          <textarea
            id="return-remarks"
            rows={4}
            value={remarks}
            onChange={(event) => {
              setRemarks(event.target.value)
              setError("")
            }}
            aria-invalid={Boolean(error) || undefined}
            placeholder="Explain what the employee needs to address."
            className={clsx(
              "w-full resize-y rounded-control border bg-surface px-3.5 py-3 text-base text-text placeholder:text-text-muted/70 sm:text-sm",
              error
                ? "border-danger"
                : "border-border-strong hover:border-primary",
            )}
          />
          {error && (
            <p
              role="alert"
              className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-danger"
            >
              <Icon name="alert" size={14} /> {error}
            </p>
          )}
        </div>
      </div>
      <div className="mt-4">
        <Alert tone="info" title="Prototype return only">
          This stores a local demonstration remark and changes the local status
          only. It does not send a notification.
        </Alert>
      </div>
      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" onClick={confirm}>
          Confirm Return
        </Button>
      </div>
    </Modal>
  )
}

function VerifyDialog({
  submission,
  employee,
  onClose,
  onConfirm,
}: {
  submission: VerificationSubmission
  employee: HrEmployee
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <Modal title="Confirm Verification" onClose={onClose}>
      <dl className="grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
        <DataPoint label="Employee Name" value={employee.name} />
        <DataPoint label="Submission ID" value={submission.id} />
        <DataPoint
          label="Payroll Type"
          value={
            payrollConfig(submission.payrollTypeId)?.name ??
            submission.payrollTypeId
          }
        />
        <DataPoint label="Payroll Period" value={submission.period} />
      </dl>
      <p className="mt-4 text-sm leading-relaxed">
        Confirm that this submission has been reviewed and meets the applicable
        requirements.
      </p>
      <p className="mt-2 text-xs leading-relaxed text-text-muted">
        Prototype only: this changes the local status from Validated to Verified
        and keeps the supervisor validation. It does not transmit the submission
        to Accounting.
      </p>
      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" onClick={onConfirm}>
          Confirm Verification
        </Button>
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
  detail?: string
  action?: React.ReactNode
}) {
  return (
    <div className="border-t border-border px-5 py-14 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-info-soft text-primary">
        <Icon name="clipboard" size={24} />
      </span>
      <p className="mt-4 font-semibold">{title}</p>
      {detail && <p className="mt-1 text-sm text-text-muted">{detail}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}

function ReviewWorkspace({
  submission,
  employee,
  onBack,
  onReturn,
  onVerify,
  onOpenAttendance,
}: {
  submission: VerificationSubmission
  employee: HrEmployee
  onBack: () => void
  onReturn: (remarks: string, affected: string) => void
  onVerify: () => void
  onOpenAttendance?: () => void
}) {
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [action, setAction] = useState<"return" | "verify" | null>(null)
  const [actionError, setActionError] = useState("")
  const assignment = currentAssignment(employee)
  const assignmentConfig = payrollConfig(assignment?.payrollTypeId)
  const config = configurationFor(submission)
  const requirements = applicableRequirements(submission)
  const pending = pendingChecklistRequirements(submission)
  const missing = requirements.filter(
    (requirement) => !attachmentFor(submission, requirement.id)?.available,
  )
  const checklistConfigured = Boolean(config)
  const complete = checklistConfigured && missing.length === 0
  const selectedRequirement = requirements.find(
    (requirement) => requirement.id === documentId,
  )
  const selectedAttachment = documentId
    ? attachmentFor(submission, documentId)
    : undefined

  const requestVerify = () => {
    setActionError("")
    if (submission.status !== "Validated") {
      setActionError(
        "Only submissions currently marked Validated are eligible for HR verification.",
      )
      return
    }
    if (!checklistConfigured) {
      setActionError(
        "Document requirements have not been configured for this payroll type.",
      )
      return
    }
    if (!complete) {
      setActionError(
        `Missing required documents: ${missing.map((item) => item.name).join(", ")}.`,
      )
      return
    }
    if (submission.attendanceConcern.hrVerificationRequired) {
      setActionError(
        "The attendance concern still requires HR verification before this submission can be verified.",
      )
      return
    }
    setAction("verify")
  }

  return (
    <>
      <div className="grid gap-6 font-sans">
        <div>
          <Button
            type="button"
            variant="link"
            onClick={onBack}
            className="-ml-1 mb-3"
          >
            <Icon name="arrowLeft" size={16} /> Back to Document Verification
          </Button>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p
                id="page-title"
                role="heading"
                aria-level={1}
                tabIndex={-1}
                className="text-2xl font-semibold leading-tight sm:text-3xl"
              >
                Review Submission
              </p>
              <p className="mt-2 text-sm text-text-muted">
                {submission.id}
              </p>
            </div>
            <StatusBadge status={submission.status} />
          </div>
        </div>

        <section className="rounded-card bg-surface p-5 elevate sm:p-6">
          <p role="heading" aria-level={2} className="text-lg font-semibold">
            Submission Information
          </p>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DataPoint label="Submission ID" value={submission.id} />
            <DataPoint label="Employee Name" value={employee.name} />
            <DataPoint label="Employee ID" value={employee.employeeId} />
            <DataPoint
              label="Employee Classification"
              value={employee.classification}
            />
            <DataPoint
              label="Employment Type"
              value={employee.employmentType}
            />
            <DataPoint
              label="Assigned Payroll Type"
              value={assignmentConfig?.name ?? "No payroll type assigned"}
              muted={!assignmentConfig}
            />
            <DataPoint label="Payroll Period" value={submission.period} />
            <DataPoint
              label="Date Submitted"
              value={dateTime.format(new Date(submission.submittedAt))}
            />
            <DataPoint label="Cost Center / Office" value={employee.office} />
            <DataPoint
              label="Immediate Supervisor"
              value={employee.supervisor || "Not provided"}
              muted={!employee.supervisor}
            />
            <div>
              <dt className="text-xs font-medium text-text-muted">
                Current Status
              </dt>
              <dd className="mt-1">
                <StatusBadge status={submission.status} />
              </dd>
            </div>
          </dl>
          {assignment?.payrollTypeId !== submission.payrollTypeId && (
            <div className="mt-4">
              <Alert tone="warning" title="Payroll assignment mismatch">
                The submission payroll type does not match the employee's
                current HR-maintained assignment. Review before taking action.
              </Alert>
            </div>
          )}
        </section>

        <section className="rounded-card bg-surface p-5 elevate sm:p-6">
          <p role="heading" aria-level={2} className="text-lg font-semibold">
            Supervisor Validation
          </p>
          <p className="mt-1 text-sm text-text-muted">
            Recorded supervisor information is read-only and distinct from HR
            verification.
          </p>
          <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
            <DataPoint
              label="Immediate Supervisor"
              value={
                submission.supervisorValidation.supervisor || "Not provided"
              }
              muted={!submission.supervisorValidation.supervisor}
            />
            <DataPoint
              label="Validation Status"
              value={submission.supervisorValidation.status}
            />
            <DataPoint
              label="Validation Date & Time"
              value={
                submission.supervisorValidation.validatedAt
                  ? dateTime.format(
                      new Date(submission.supervisorValidation.validatedAt),
                    )
                  : "Not available"
              }
              muted={!submission.supervisorValidation.validatedAt}
            />
            <DataPoint
              label="Supervisor Remarks"
              value={
                submission.supervisorValidation.remarks || "No remarks provided"
              }
              muted={!submission.supervisorValidation.remarks}
            />
          </dl>
        </section>

        <section className="overflow-hidden rounded-card bg-surface elevate">
          <div className="border-b border-border p-5 sm:p-6">
            <p role="heading" aria-level={2} className="text-lg font-semibold">
              Document Requirements
            </p>
            <p className="mt-1 text-sm text-text-muted">
              Applicable checklist from the employee's assigned payroll
              configuration and recorded circumstances.
            </p>
          </div>
          {!checklistConfigured ? (
            <EmptyState
              title="Document requirements have not been configured for this payroll type."
              detail="The unresolved checklist cannot be treated as an officially complete requirement set."
            />
          ) : requirements.length === 0 ? (
            <EmptyState title="No uploaded documents are available for this submission." />
          ) : (
            <>
              <div className="border-b border-border bg-info-soft/50 px-5 py-3 text-xs leading-relaxed text-text sm:px-6">
                Shared configuration source: Employee New Submission checklist
                for {config.name}. Only confirmed, applicable requirements count
                toward completeness.
              </div>
              {submission.attachments.length === 0 && (
                <div className="border-b border-border p-5 sm:px-6">
                  <Alert
                    tone="warning"
                    title="No uploaded documents are available for this submission."
                  >
                    Applicable confirmed requirements remain listed below as
                    missing.
                  </Alert>
                </div>
              )}
              <ul className="divide-y divide-border">
                {requirements.map((requirement) => {
                  const attachment = attachmentFor(submission, requirement.id)
                  return (
                    <li
                      key={requirement.id}
                      className="grid gap-4 p-5 sm:px-6 lg:grid-cols-5 lg:items-center"
                    >
                      <div className="lg:col-span-2">
                        <p className="text-sm font-semibold">
                          {requirement.name}
                        </p>
                        <p className="mt-1 text-xs text-text-muted">
                          {requirement.description}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-text-muted">
                          Requirement Type
                        </p>
                        <p className="mt-1 text-sm font-medium">
                          {requirement.applicability === "mandatory"
                            ? "Confirmed Mandatory"
                            : "Confirmed Conditional"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-text-muted">
                          Trigger / File Availability
                        </p>
                        <p className="mt-1 text-sm font-medium">
                          {requirement.trigger
                            ? circumstanceLabels[requirement.trigger]
                            : "Not applicable"}
                        </p>
                        <p
                          className={clsx(
                            "mt-1 text-xs font-semibold",
                            attachment?.available
                              ? "text-success"
                              : "text-danger",
                          )}
                        >
                          {attachment?.available
                            ? "Available"
                            : "Missing required file"}
                        </p>
                        {attachment?.available && (
                          <p className="mt-1 break-all text-xs text-text-muted">
                            {attachment.filename}
                          </p>
                        )}
                      </div>
                      <div className="lg:text-right">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setDocumentId(requirement.id)}
                          disabled={!attachment?.available}
                          className="h-11 w-full lg:w-auto"
                        >
                          <Icon name="eye" size={16} />{" "}
                          {attachment?.available ? "View File" : "Unavailable"}
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
              {pending.length > 0 && (
                <div className="border-t border-border p-5 sm:px-6">
                  <Alert
                    tone="warning"
                    title="Requirements pending confirmation"
                  >
                    {pending.map((item) => item.name).join(", ")}. These items
                    are visible for context and are not counted as missing
                    mandatory files.
                  </Alert>
                </div>
              )}
            </>
          )}
        </section>

        {submission.attendanceConcern.exists && (
          <section className="rounded-card bg-surface p-5 elevate sm:p-6">
            <p role="heading" aria-level={2} className="text-lg font-semibold">
              Attendance Record Concern
            </p>
            <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
              <DataPoint label="Concern Recorded" value="Yes" />
              <DataPoint
                label="Employee Explanation"
                value={
                  submission.attendanceConcern.explanation ||
                  "No explanation provided"
                }
                muted={!submission.attendanceConcern.explanation}
              />
              <DataPoint
                label="Supporting Logbook Entry"
                value={
                  submission.attendanceConcern.logbookEntry
                    ? "Recorded"
                    : "Not recorded"
                }
              />
              <DataPoint
                label="Supervisor Verification"
                value={
                  submission.attendanceConcern.supervisorVerified
                    ? "Recorded"
                    : "Not recorded"
                }
              />
              <DataPoint
                label="HR Verification Still Required"
                value={
                  submission.attendanceConcern.hrVerificationRequired
                    ? "Yes"
                    : "No"
                }
              />
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-text-muted">
              Supervisor verification is permitted only when supported by a
              corresponding logbook entry; otherwise HR verification is needed.
              No attendance correction is performed here.
            </p>
            {onOpenAttendance &&
              submission.attendanceConcern.hrVerificationRequired && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onOpenAttendance}
                  className="mt-4 w-full sm:w-auto"
                >
                  Open Attendance Concerns <Icon name="arrowRight" size={16} />
                </Button>
              )}
          </section>
        )}

        {submission.hrDecision && (
          <section className="rounded-card bg-surface p-5 elevate sm:p-6">
            <p role="heading" aria-level={2} className="text-lg font-semibold">
              Recorded HR Review
            </p>
            <dl className="mt-4 grid gap-4 sm:grid-cols-3">
              <DataPoint
                label="Outcome"
                value={submission.hrDecision.outcome}
              />
              <DataPoint
                label="Review Date"
                value={dateTime.format(
                  new Date(submission.hrDecision.reviewedAt),
                )}
              />
              <DataPoint
                label="Remarks"
                value={submission.hrDecision.remarks || "No remarks recorded"}
                muted={!submission.hrDecision.remarks}
              />
              {submission.hrDecision.reviewedBy && (
                <DataPoint
                  label="Reviewed By"
                  value={submission.hrDecision.reviewedBy}
                />
              )}
              {submission.hrDecision.affectedRequirement && (
                <DataPoint
                  label="Affected Requirement"
                  value={submission.hrDecision.affectedRequirement}
                />
              )}
            </dl>
            <p className="mt-4 text-xs text-text-muted">
              Historical decisions are read-only in this iteration.
            </p>
          </section>
        )}

        <section
          className="rounded-card bg-surface p-5 elevate sm:p-6"
          aria-labelledby="review-history-title"
        >
          <p
            id="review-history-title"
            role="heading"
            aria-level={2}
            className="text-lg font-semibold"
          >
            Review History
          </p>
          <ol className="mt-4 grid gap-3">
            {[
              {
                id: "submitted",
                label: "Employee Submission",
                actor: employee.name,
                at: submission.submittedAt,
                detail: `Submitted for ${submission.period}.`,
              },
              {
                id: "validated",
                label: "Supervisor Validation",
                actor: submission.supervisorValidation.supervisor,
                at: submission.supervisorValidation.validatedAt,
                detail:
                  submission.supervisorValidation.remarks ??
                  "No remarks provided.",
              },
              ...(submission.hrDecision
                ? [
                    {
                      id: "hr",
                      label: `HR Review: ${submission.hrDecision.outcome}`,
                      actor: submission.hrDecision.reviewedBy ?? "HR Office",
                      at: submission.hrDecision.reviewedAt,
                      detail:
                        submission.hrDecision.remarks ?? "No remarks recorded.",
                    },
                  ]
                : []),
            ].map((event) => (
              <li key={event.id} className="rounded-control bg-canvas p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{event.label}</p>
                  <p className="text-xs text-text-muted">
                    {event.at
                      ? dateTime.format(new Date(event.at))
                      : "Date not recorded"}
                  </p>
                </div>
                <p className="mt-1 text-xs text-text-muted">
                  {event.actor || "Not recorded"}
                </p>
                <p className="mt-2 text-sm leading-relaxed">{event.detail}</p>
              </li>
            ))}
          </ol>
        </section>

        {submission.status === "Validated" && (
          <section className="rounded-card bg-surface p-5 elevate sm:p-6">
            <p role="heading" aria-level={2} className="text-lg font-semibold">
              HR Review Actions
            </p>
            <p className="mt-1 text-sm text-text-muted">
              Return the submission with remarks or verify it after reviewing
              confirmed applicable requirements.
            </p>
            {(!checklistConfigured || pending.length > 0) && (
              <div className="mt-4">
                <Alert
                  tone="warning"
                  title="Checklist scope is not fully confirmed"
                >
                  Do not treat an unresolved category checklist as an officially
                  complete university requirement set.
                </Alert>
              </div>
            )}
            {actionError && (
              <div className="mt-4">
                <Alert tone="danger" title="Verification cannot continue">
                  {actionError}
                </Alert>
              </div>
            )}
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setActionError("")
                  setAction("return")
                }}
              >
                Return with Remarks
              </Button>
              <Button type="button" onClick={requestVerify}>
                <Icon name="shield" size={17} /> Verify Submission
              </Button>
            </div>
          </section>
        )}
      </div>

      {selectedRequirement && selectedAttachment && (
        <DocumentPreview
          requirement={selectedRequirement}
          attachment={selectedAttachment}
          onClose={() => setDocumentId(null)}
        />
      )}
      {action === "return" && (
        <ReturnDialog
          submission={submission}
          employee={employee}
          requirements={requirements}
          onClose={() => setAction(null)}
          onConfirm={(remarks, affected) => {
            onReturn(remarks, affected)
            setAction(null)
          }}
        />
      )}
      {action === "verify" && (
        <VerifyDialog
          submission={submission}
          employee={employee}
          onClose={() => setAction(null)}
          onConfirm={() => {
            onVerify()
            setAction(null)
          }}
        />
      )}
    </>
  )
}

export function DocumentVerification({
  employees,
  submissions,
  setSubmissions,
  initialTab = "verify",
  reviewer,
  onNavigate,
  /** Fictional HR user recorded on local review decisions. */
}: {
  employees: HrEmployee[]
  submissions: VerificationSubmission[]
  setSubmissions: Dispatch<SetStateAction<VerificationSubmission[]>>
  initialTab?: Tab
  reviewer?: string
  onNavigate?: (page: string, tab?: string) => void
}) {
  const [tab, setTab] = useState<Tab>(initialTab)
  const [query, setQuery] = useState("")
  const [classification, setClassification] = useState("")
  const [payrollType, setPayrollType] = useState("")
  const [period, setPeriod] = useState("")
  const [status, setStatus] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [notice, setNotice] = useState("")
  const [dataState, setDataState] = useState<DataState>("loaded")

  const selected = submissions.find((item) => item.id === selectedId)
  const selectedEmployee = selected
    ? employees.find((employee) => employee.employeeId === selected.employeeId)
    : undefined

  const records = dataState === "loaded" ? submissions : []
  const tabRecords = records.filter((item) =>
    tab === "verify"
      ? item.status === "Validated"
      : ["Verified", "Returned", "Transmitted"].includes(item.status),
  )
  const payrollTypes = useMemo(
    () =>
      [
        ...new Set(
          records.map(
            (item) =>
              payrollConfig(item.payrollTypeId)?.name ?? item.payrollTypeId,
          ),
        ),
      ].sort(),
    [records],
  )
  const periods = useMemo(
    () => [...new Set(records.map((item) => item.period))].sort().reverse(),
    [records],
  )
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return tabRecords
      .filter((submission) => {
        const employee = employees.find(
          (item) => item.employeeId === submission.employeeId,
        )
        const payrollName =
          payrollConfig(submission.payrollTypeId)?.name ??
          submission.payrollTypeId
        if (!employee) return false
        if (classification && employee.classification !== classification)
          return false
        if (payrollType && payrollName !== payrollType) return false
        if (period && submission.period !== period) return false
        if (status && submission.status !== status) return false
        return (
          !term ||
          [submission.id, employee.employeeId, employee.name].some((value) =>
            value.toLowerCase().includes(term),
          )
        )
      })
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
  }, [
    tabRecords,
    employees,
    query,
    classification,
    payrollType,
    period,
    status,
  ])

  const paging = usePaged(
    filtered,
    6,
    `${tab}|${query}|${classification}|${payrollType}|${period}|${status}`,
  )
  const filtering = Boolean(
    query || classification || payrollType || period || status,
  )
  const clearFilters = () => {
    setQuery("")
    setClassification("")
    setPayrollType("")
    setPeriod("")
    setStatus("")
  }
  const openTab = (next: Tab) => {
    setTab(next)
    clearFilters()
  }
  const updateDecision = (
    outcome: "Verified" | "Returned",
    remarks?: string,
    affectedRequirement?: string,
  ) => {
    if (!selected || selected.status !== "Validated") return
    setSubmissions((items) =>
      items.map((item) =>
        item.id === selected.id && item.status === "Validated"
          ? {
              ...item,
              status: outcome,
              hrDecision: {
                outcome,
                reviewedAt: new Date().toISOString(),
                reviewedBy: reviewer,
                remarks,
                affectedRequirement: affectedRequirement || undefined,
              },
            }
          : item,
      ),
    )
    setNotice(
      outcome === "Verified"
        ? "Submission marked Verified in the prototype. It was not transmitted to Accounting."
        : "Submission returned in the prototype with remarks. No notification was sent.",
    )
    setSelectedId(null)
    setTab("reviewed")
  }

  if (selected && selectedEmployee) {
    return (
      <ReviewWorkspace
        submission={selected}
        employee={selectedEmployee}
        onBack={() => setSelectedId(null)}
        onReturn={(remarks, affected) =>
          updateDecision("Returned", remarks, affected)
        }
        onVerify={() => updateDecision("Verified")}
        onOpenAttendance={
          onNavigate ? () => onNavigate("attendance", "concerns") : undefined
        }
      />
    )
  }

  return (
    <div className="grid gap-6 font-sans">
      <div>
        <p
          id="page-title"
          role="heading"
          aria-level={1}
          tabIndex={-1}
          className="text-2xl font-semibold leading-tight sm:text-3xl"
        >
          Document Verification
        </p>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          Review and verify payroll document submissions validated by Immediate
          Supervisors.
        </p>
        <div className="mt-2">
          <Tag kind="placeholder">
            Prototype · fictional submissions and files
          </Tag>
        </div>
      </div>

      {notice && (
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <Alert tone="success" title="Update Successful">
              {notice}
            </Alert>
          </div>
          <Button type="button" variant="link" onClick={() => setNotice("")}>
            Dismiss
          </Button>
        </div>
      )}

      <section
        className="overflow-hidden rounded-card bg-surface elevate"
        aria-labelledby="verification-queue-title"
      >
        <div className="border-b border-border p-5 sm:p-6">
          <div
            role="tablist"
            aria-label="Verification views"
            className="grid max-w-md grid-cols-2 gap-1 rounded-control bg-canvas p-1"
          >
            <Button
              type="button"
              variant={tab === "verify" ? "primary" : "secondary"}
              role="tab"
              aria-selected={tab === "verify"}
              onClick={() => openTab("verify")}
              className={clsx(
                "h-10 border-0 shadow-none",
                tab !== "verify" && "bg-transparent text-text-muted",
              )}
            >
              To Verify{" "}
              <span className="rounded-full bg-deep/10 px-1.5 py-0.5 text-xs">
                {records.filter((item) => item.status === "Validated").length}
              </span>
            </Button>
            <Button
              type="button"
              variant={tab === "reviewed" ? "primary" : "secondary"}
              role="tab"
              aria-selected={tab === "reviewed"}
              onClick={() => openTab("reviewed")}
              className={clsx(
                "h-10 border-0 shadow-none",
                tab !== "reviewed" && "bg-transparent text-text-muted",
              )}
            >
              Reviewed{" "}
              <span className="rounded-full bg-deep/10 px-1.5 py-0.5 text-xs">
                {
                  records.filter((item) =>
                    ["Verified", "Returned", "Transmitted"].includes(
                      item.status,
                    ),
                  ).length
                }
              </span>
            </Button>
          </div>
          <div className="mt-5">
            <p
              id="verification-queue-title"
              role="heading"
              aria-level={2}
              className="text-lg font-semibold"
            >
              {tab === "verify"
                ? "Submissions Awaiting Verification"
                : "Verification History"}
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <TextField
                label="Search"
                icon="search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search submissions..."
                className="sm:col-span-2"
              />
              <SelectField
                label="Employee Classification"
                value={classification}
                onChange={(event) => setClassification(event.target.value)}
                placeholder="All classifications"
              >
                <option value="Faculty">Faculty</option>
                <option value="Staff">Staff</option>
              </SelectField>
              <SelectField
                label="Payroll Type"
                value={payrollType}
                onChange={(event) => setPayrollType(event.target.value)}
                placeholder="All payroll types"
              >
                {payrollTypes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Payroll Period"
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                placeholder="All periods"
              >
                {periods.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Submission Status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                placeholder="All statuses"
              >
                {STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </SelectField>
              <Button
                type="button"
                variant="secondary"
                onClick={clearFilters}
                disabled={!filtering}
                className="w-full xl:col-start-3"
              >
                Clear Filters
              </Button>
            </div>
            <p aria-live="polite" className="mt-3 text-xs text-text-muted">
              Showing {filtered.length} of {tabRecords.length} submissions
            </p>
          </div>
        </div>

        {dataState === "error" ? (
          <EmptyState
            title="Unable to load submissions"
            detail="Please try again."
            action={
              <Button type="button" onClick={() => setDataState("loaded")}>
                Retry
              </Button>
            }
          />
        ) : tabRecords.length === 0 && !filtering ? (
          <EmptyState
            title={
              tab === "verify"
                ? "No Submissions Awaiting Verification"
                : "No reviewed submissions"
            }
            detail={
              tab === "verify"
                ? "There are no submissions awaiting HR verification."
                : "Reviewed submissions will appear here."
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No matching submissions"
            detail="Try adjusting your search or filters."
            action={
              <Button type="button" variant="secondary" onClick={clearFilters}>
                Clear Filters
              </Button>
            }
          />
        ) : (
          <>
            <div className="hidden xl:block">
              <table className="w-full table-fixed text-left text-xs">
                <colgroup>
                  <col className="w-[12%]" />
                  <col className="w-[14%]" />
                  <col className="w-[8%]" />
                  <col className="w-[20%]" />
                  <col className="w-[10%]" />
                  <col className="w-[14%]" />
                  <col className="w-[10%]" />
                  <col className="w-[12%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-border bg-canvas text-xs text-text-muted">
                    {[
                      "Submission ID",
                      "Employee",
                      "Class.",
                      "Payroll Type",
                      "Period",
                      tab === "reviewed" ? "HR Review Date" : "Date Submitted",
                      "Status",
                    ].map((heading) => (
                      <th
                        key={heading}
                        scope="col"
                        className="px-2 py-3 font-semibold leading-snug"
                      >
                        {heading}
                      </th>
                    ))}
                    <th
                      scope="col"
                      className="px-2 py-3 text-right font-semibold"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paging.visible.map((submission) => {
                    const employee = employees.find(
                      (item) => item.employeeId === submission.employeeId,
                    )!
                    return (
                      <tr key={submission.id} className="hover:bg-info-soft/30">
                        <td className="break-words px-2 py-3 font-semibold leading-snug">
                          {submission.id}
                        </td>
                        <td className="px-2 py-3">
                          <p className="font-semibold leading-snug">
                            {employee.name}
                          </p>
                          <p className="mt-0.5 text-text-muted">
                            {employee.employeeId}
                          </p>
                        </td>
                        <td className="px-2 py-3">{employee.classification}</td>
                        <td className="break-words px-2 py-3 leading-snug">
                          {payrollConfig(submission.payrollTypeId)?.name ??
                            submission.payrollTypeId}
                        </td>
                        <td className="px-2 py-3 leading-snug">
                          {submission.period}
                        </td>
                        <td className="px-2 py-3 text-text-muted">
                          {(() => {
                            const value =
                              tab === "reviewed" && submission.hrDecision
                                ? submission.hrDecision.reviewedAt
                                : submission.submittedAt
                            const date = new Date(value)
                            return (
                              <>
                                <span className="block">
                                  {tableDate.format(date)}
                                </span>
                                <span className="mt-0.5 block">
                                  {tableTime.format(date)}
                                </span>
                              </>
                            )
                          })()}
                        </td>
                        <td className="px-2 py-3">
                          <StatusBadge status={submission.status} />
                        </td>
                        <td className="px-2 py-3 text-right">
                          <Button
                            type="button"
                            variant="link"
                            onClick={() => setSelectedId(submission.id)}
                            aria-label={`${
                              tab === "verify"
                                ? "Review Submission"
                                : "View Details"
                            } ${submission.id}`}
                            className="whitespace-nowrap text-xs"
                          >
                            {tab === "verify" ? "Review" : "Details"}
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-border xl:hidden">
              {paging.visible.map((submission) => {
                const employee = employees.find(
                  (item) => item.employeeId === submission.employeeId,
                )!
                return (
                  <li key={submission.id} className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-semibold">{submission.id}</p>
                      <StatusBadge status={submission.status} />
                    </div>
                    <p className="mt-3 text-sm font-semibold">
                      {employee.name}{" "}
                      <span className="font-normal text-text-muted">
                        · {employee.employeeId}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      {employee.classification} · {submission.period}
                    </p>
                    <p className="mt-2 text-sm">
                      {payrollConfig(submission.payrollTypeId)?.name ??
                        submission.payrollTypeId}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      {tab === "reviewed" && submission.hrDecision
                        ? `HR reviewed ${dateTime.format(new Date(submission.hrDecision.reviewedAt))}`
                        : `Submitted ${dateTime.format(new Date(submission.submittedAt))}`}
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setSelectedId(submission.id)}
                      className="mt-4 w-full"
                    >
                      {tab === "verify" ? "Review Submission" : "View Details"}{" "}
                      <Icon name="arrowRight" size={16} />
                    </Button>
                  </li>
                )
              })}
            </ul>
            <Pagination
              page={paging.page}
              pages={paging.pages}
              total={paging.total}
              size={paging.size}
              onPage={paging.setPage}
            />
          </>
        )}
      </section>

      

      {demoFlag("states") && (
        <div className="flex flex-col gap-3 rounded-control border border-dashed border-border-strong p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-text-muted">
            <span className="font-semibold text-text">Prototype only.</span>{" "}
            Preview submission loading states.
          </p>
          <div
            className="grid shrink-0 grid-cols-3 gap-1 rounded-control bg-canvas p-1"
            role="group"
            aria-label="Preview submission data state"
          >
            {([
              ["loaded", "Records"],
              ["empty", "No records"],
              ["error", "Load error"],
            ] as const).map(([id, label]) => (
              <Button
                key={id}
                type="button"
                variant="secondary"
                aria-pressed={dataState === id}
                onClick={() => {
                  setDataState(id)
                  clearFilters()
                }}
                className={clsx(
                  "h-10 border-0 px-3 shadow-none",
                  dataState === id
                    ? "bg-surface font-semibold elevate"
                    : "bg-transparent text-text-muted",
                )}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
