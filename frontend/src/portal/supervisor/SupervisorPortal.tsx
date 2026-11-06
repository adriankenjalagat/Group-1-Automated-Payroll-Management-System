import clsx from "clsx"
import { useRef, useState, type Dispatch, type SetStateAction } from "react"
import { Alert, Button, Icon, TextField } from "../../MsuPayroll"
import { Modal, SelectField, Tag } from "../../admin/ui"
import { MyAccount, profileFor } from "../../account/MyAccount"
import type { MockUser } from "../../auth/mockData"
import {
  activeRequirements,
  circumstanceLabels,
  pendingRequirements,
  payrollTypeConfigs,
  type DocumentRequirement,
} from "../newSubmission/config"
import { payrollConfig, type HrEmployee } from "../hr/hrData"
import {
  type SupervisorDecisionEvent,
  type VerificationAttachment,
  type VerificationSubmission,
} from "../hr/DocumentVerification"
import {
  supervisorDemoChecklistBySubmission,
  supervisorDemoRequirements,
  type SupervisorNotification,
} from "./supervisorData"

export type SupervisorQueueTab = "awaiting" | "attention"
export type SupervisorHistoryTab = "all" | "validated" | "returned"
export type SupervisorReviewSection = "employee" | "submission" | "documents" | "attendance" | "history" | "decision"

type SharedProps = {
  submissions: VerificationSubmission[]
  setSubmissions: Dispatch<SetStateAction<VerificationSubmission[]>>
  employees: HrEmployee[]
  user: MockUser
  setNotifications: Dispatch<SetStateAction<SupervisorNotification[]>>
  onSubmissionChanged: (submission: VerificationSubmission) => void
}

const dateTime = new Intl.DateTimeFormat("en-PH", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

function PageHeader({
  title,
  subtitle,
}: {
  title: string
  subtitle: string
}) {
  return (
    <div>
      <p
        id="page-title"
        role="heading"
        aria-level={1}
        tabIndex={-1}
        className="text-2xl font-semibold sm:text-3xl"
      >
        {title}
      </p>
      <p className="mt-2 text-sm text-text-muted">{subtitle}</p>
    </div>
  )
}

export function SupervisorDemoNotice() {
  return (
    <Alert tone="info" title="Demo Data">
      Employee names, documents, attendance concerns, and review activities
      displayed here are fictional and intended for prototype testing.
    </Alert>
  )
}

function SectionHeader({
  title,
  description,
  action,
  onAction,
}: {
  title: string
  description?: string
  action?: string
  onAction?: () => void
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p role="heading" aria-level={2} className="text-lg font-semibold">
          {title}
        </p>
        {description && (
          <p className="mt-1 text-sm text-text-muted">{description}</p>
        )}
      </div>
      {action && onAction && (
        <Button type="button" variant="secondary" onClick={onAction}>
          {action}
        </Button>
      )}
    </div>
  )
}

function DataPoint({
  label,
  value,
  muted,
}: {
  label: string
  value: React.ReactNode
  muted?: boolean
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-text-muted">{label}</dt>
      <dd
        className={clsx(
          "mt-1 break-words text-sm font-medium",
          muted && "text-text-muted",
        )}
      >
        {value}
      </dd>
    </div>
  )
}

function MultilineField({
  label,
  value,
  onChange,
  placeholder,
  error,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  error?: string
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">{label} *</p>
      <div
        role="textbox"
        aria-label={label}
        aria-multiline="true"
        aria-required="true"
        aria-invalid={Boolean(error) || undefined}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={(event) =>
          onChange(
            event.currentTarget.textContent?.replace(/\u00a0/g, " ") ?? "",
          )
        }
        className={clsx(
          "min-h-28 rounded-control border bg-surface p-3.5 text-sm outline-none empty:before:pointer-events-none empty:before:text-text-muted empty:before:content-[attr(data-placeholder)] focus:border-primary",
          error ? "border-danger" : "border-border-strong",
        )}
      >
        {value}
      </div>
      {error && (
        <p className="mt-1.5 text-xs font-medium text-danger">{error}</p>
      )}
    </div>
  )
}

function employeeFor(
  submission: VerificationSubmission,
  employees: HrEmployee[],
) {
  return employees.find(
    (employee) => employee.employeeId === submission.employeeId,
  )
}

function assignedTo(
  submission: VerificationSubmission,
  employees: HrEmployee[],
  supervisor: string,
) {
  const employee = employeeFor(submission, employees)
  return Boolean(employee && employee.supervisor === supervisor)
}

function requirementsFor(submission: VerificationSubmission) {
  if (supervisorDemoChecklistBySubmission[submission.id])
    return supervisorDemoRequirements(
      submission.id,
      submission.circumstances,
    )
  const config = payrollTypeConfigs[submission.payrollTypeId]
  return config ? activeRequirements(config, submission.circumstances) : []
}

function pendingRequirementsFor(submission: VerificationSubmission) {
  const config = payrollTypeConfigs[submission.payrollTypeId]
  return config ? pendingRequirements(config, submission.circumstances) : []
}

function hasChecklistConfiguration(submission: VerificationSubmission) {
  return Boolean(
    supervisorDemoChecklistBySubmission[submission.id] ||
      payrollTypeConfigs[submission.payrollTypeId],
  )
}

function missingRequirements(submission: VerificationSubmission) {
  return requirementsFor(submission).filter(
    (requirement) =>
      !submission.attachments.some(
        (attachment) =>
          attachment.requirementId === requirement.id && attachment.available,
      ),
  )
}

function decisionsFor(submission: VerificationSubmission) {
  return submission.supervisorDecisions ?? []
}

function latestDecision(submission: VerificationSubmission) {
  return [...decisionsFor(submission)].sort((a, b) =>
    b.recordedAt.localeCompare(a.recordedAt),
  )[0]
}

function reviewable(submission: VerificationSubmission) {
  return ["Submitted", "Incomplete", "Late"].includes(submission.status)
}

function hasOpenAttendanceConcern(submission: VerificationSubmission) {
  const concern = submission.attendanceConcern
  return (
    concern.exists &&
    !concern.supervisorVerification &&
    !concern.hrReferral
  )
}

function needsAttention(submission: VerificationSubmission) {
  return (
    reviewable(submission) &&
    (missingRequirements(submission).length > 0 ||
      hasOpenAttendanceConcern(submission) ||
      submission.status === "Late" ||
      !hasChecklistConfiguration(submission))
  )
}

function validationReady(
  submission: VerificationSubmission,
  employees: HrEmployee[],
  supervisor: string,
) {
  return (
    assignedTo(submission, employees, supervisor) &&
    submission.status === "Submitted" &&
    hasChecklistConfiguration(submission) &&
    missingRequirements(submission).length === 0 &&
    !decisionsFor(submission).some(
      (decision) =>
        decision.decision === "Validated" &&
        decision.recordedAt >= submission.submittedAt,
    )
  )
}

function statusTone(status: VerificationSubmission["status"]) {
  return status === "Validated" ||
    status === "Verified" ||
    status === "Transmitted"
    ? "simulated"
    : "placeholder"
}

function AttachmentPreview({
  attachment,
  requirement,
  employeeName,
  submissionId,
  onClose,
}: {
  attachment: VerificationAttachment
  requirement?: DocumentRequirement
  employeeName: string
  submissionId: string
  onClose: () => void
}) {
  const [previous, setPrevious] =
    useState<NonNullable<VerificationAttachment["previousVersions"]>[number] | null>(
      null,
    )
  return (
    <>
      <Modal title="Document Preview" onClose={onClose}>
        <Tag kind="placeholder">Demo attachment metadata</Tag>
        <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4">
          <DataPoint
            label="Document Name"
            value={requirement?.name ?? attachment.documentType}
          />
          <DataPoint label="Filename" value={attachment.filename} />
          <DataPoint label="Employee" value={employeeName} />
          <DataPoint label="Submission ID" value={submissionId} />
          <DataPoint
            label="Checklist Item"
            value={requirement?.name ?? attachment.requirementId}
          />
          <DataPoint
            label="Uploaded By"
            value={attachment.uploadedBy ?? "Not recorded"}
          />
          <DataPoint
            label="Upload Date"
            value={
              attachment.uploadedAt
                ? dateTime.format(new Date(attachment.uploadedAt))
                : "Not recorded"
            }
          />
          <DataPoint
            label="Document Version"
            value={String(attachment.version ?? 1)}
          />
        </dl>
        <div className="mt-4">
          <Alert tone="warning" title="Attachment preview unavailable">
            Fictional demonstration attachment reference. Original file content
            is not available.
          </Alert>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
          {attachment.previousVersions?.length ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setPrevious(attachment.previousVersions?.at(-1) ?? null)
              }
            >
              View Previous Version
            </Button>
          ) : null}
          <Button type="button" variant="secondary" onClick={onClose}>
            Close Preview
          </Button>
        </div>
      </Modal>
      {previous && (
        <Modal
          title="Previous Document Version"
          onClose={() => setPrevious(null)}
        >
          <dl className="grid gap-4 rounded-control bg-canvas p-4">
            <DataPoint label="Filename" value={previous.filename} />
            <DataPoint label="Version" value={String(previous.version)} />
            <DataPoint
              label="Recorded Upload"
              value={
                previous.uploadedAt
                  ? dateTime.format(new Date(previous.uploadedAt))
                  : "Not recorded"
              }
            />
          </dl>
          <Alert tone="info" title="Version retained">
            Earlier attachment metadata is read-only and has not been
            overwritten.
          </Alert>
          <div className="mt-5 flex justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPrevious(null)}
            >
              Close
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}

function DecisionDetails({
  submission,
  employee,
  decision,
  onClose,
}: {
  submission: VerificationSubmission
  employee?: HrEmployee
  decision: SupervisorDecisionEvent
  onClose: () => void
}) {
  return (
    <Modal title="Supervisor Decision Details" onClose={onClose} wide>
      <Tag
        kind={decision.decision === "Validated" ? "simulated" : "placeholder"}
      >
        {decision.decision}
      </Tag>
      <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
        <DataPoint label="Submission ID" value={submission.id} />
        <DataPoint
          label="Employee"
          value={
            employee
              ? `${employee.name} (${employee.employeeId})`
              : submission.employeeId
          }
        />
        <DataPoint
          label="Payroll Type"
          value={
            payrollConfig(submission.payrollTypeId)?.name ??
            submission.payrollTypeId
          }
        />
        <DataPoint label="Payroll Period" value={submission.period} />
        <DataPoint label="Recorded Supervisor" value={decision.supervisor} />
        <DataPoint label="Decision" value={decision.decision} />
        <DataPoint
          label="Decision Date / Time"
          value={dateTime.format(new Date(decision.recordedAt))}
        />
        <DataPoint
          label="Remarks"
          value={decision.remarks ?? "No validation remarks recorded"}
        />
        <DataPoint
          label="Related Checklist Items"
          value={
            decision.referencedChecklistItems?.join(", ") ?? "None recorded"
          }
        />
        <DataPoint
          label="Attendance Concern Reference"
          value={decision.attendanceConcernReference ?? "None recorded"}
        />
        <DataPoint
          label="Current Submission Status"
          value={submission.status}
        />
        <DataPoint
          label="Subsequent HR Action"
          value={
            submission.hrDecision
              ? `${submission.hrDecision.outcome} · ${dateTime.format(
                  new Date(submission.hrDecision.reviewedAt),
                )}`
              : "No later HR decision recorded"
          }
        />
      </dl>
      <div className="mt-5 flex justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  )
}

function ReviewWorkspace({
  submission,
  ...props
}: SharedProps & {
  submission: VerificationSubmission
  onBrowse: () => void
  onHistory: (tab?: SupervisorHistoryTab, decisionId?: string) => void
  onNext: () => void
  initialSection?: SupervisorReviewSection
}) {
  const {
    employees,
    user,
    setSubmissions,
    setNotifications,
    onSubmissionChanged,
    onBrowse,
    onHistory,
    onNext,
    initialSection,
  } = props
  const [section, setSection] = useState<SupervisorReviewSection>(
    initialSection ?? "employee",
  )
  const [attachment, setAttachment] = useState<{
    attachment: VerificationAttachment
    requirement?: DocumentRequirement
  } | null>(null)
  const [concernOpen, setConcernOpen] = useState(false)
  const [concernAction, setConcernAction] = useState<"verify" | "refer" | null>(
    null,
  )
  const [validateOpen, setValidateOpen] = useState(false)
  const [returnOpen, setReturnOpen] = useState(false)
  const [returnStep, setReturnStep] = useState<"edit" | "confirm">("edit")
  const [returnRemarks, setReturnRemarks] = useState("")
  const [returnError, setReturnError] = useState("")
  const [selectedRequirements, setSelectedRequirements] = useState<string[]>([])
  const [attendanceReference, setAttendanceReference] = useState("")
  const [success, setSuccess] = useState<{
    decision: "Validated" | "Returned"
    eventId: string
  } | null>(null)
  const lock = useRef(false)
  const employee = employeeFor(submission, employees)
  const authorized = assignedTo(submission, employees, user.name)
  const checklistConfigured = hasChecklistConfiguration(submission)
  const requirements = requirementsFor(submission)
  const pendingConfirmation = pendingRequirementsFor(submission)
  const missing = missingRequirements(submission)
  const availableCount = requirements.length - missing.length
  const canValidate = validationReady(submission, employees, user.name)
  const canReturn = authorized && reviewable(submission)
  const concern = submission.attendanceConcern

  const commit = (next: VerificationSubmission) => {
    setSubmissions((items) =>
      items.map((item) => (item.id === next.id ? next : item)),
    )
    onSubmissionChanged(next)
    setNotifications((items) =>
      items.map((item) =>
        item.submissionId === next.id ? { ...item, read: true } : item,
      ),
    )
  }

  const verifyConcern = () => {
    if (
      lock.current ||
      !authorized ||
      !concern.exists ||
      !concern.logbookEntry ||
      !concern.logbookEvidenceReference ||
      concern.supervisorVerified
    )
      return
    lock.current = true
    const at = new Date().toISOString()
    commit({
      ...submission,
      attendanceConcern: {
        ...concern,
        supervisorVerified: true,
        hrVerificationRequired: false,
        supervisorVerification: {
          user: user.name,
          at,
          evidenceReference: concern.logbookEvidenceReference,
        },
      },
    })
    setConcernAction(null)
    lock.current = false
  }

  const referConcern = () => {
    if (
      lock.current ||
      !authorized ||
      !concern.exists ||
      concern.logbookEntry ||
      concern.hrReferral
    )
      return
    lock.current = true
    const at = new Date().toISOString()
    commit({
      ...submission,
      attendanceConcern: {
        ...concern,
        hrVerificationRequired: true,
        hrReferral: {
          user: user.name,
          at,
          remarks:
            "No qualifying logbook evidence was available. Referred to HR for authorized follow-up.",
        },
      },
    })
    setConcernAction(null)
    lock.current = false
  }

  const validate = () => {
    if (lock.current || !canValidate) return
    lock.current = true
    const at = new Date().toISOString()
    const event: SupervisorDecisionEvent = {
      id: `${submission.id}-SUP-VALIDATED-${Date.now()}`,
      decision: "Validated",
      supervisor: user.name,
      recordedAt: at,
      previousStatus: submission.status,
      nextStatus: "Validated",
    }
    const next: VerificationSubmission = {
      ...submission,
      status: "Validated",
      supervisorValidation: {
        supervisor: user.name,
        status: "Validated",
        validatedAt: at,
        remarks:
          "Supervisor validated the available configured checklist in the local demonstration.",
      },
      supervisorDecisions: [...decisionsFor(submission), event],
    }
    commit(next)
    setValidateOpen(false)
    setSuccess({ decision: "Validated", eventId: event.id })
  }

  const reviewReturn = () => {
    if (!returnRemarks.trim() || returnRemarks.trim().length < 10) {
      setReturnError("Please enter a reason for returning this submission.")
      return
    }
    setReturnError("")
    setReturnStep("confirm")
  }

  const returnSubmission = () => {
    if (lock.current || !canReturn || !returnRemarks.trim()) return
    lock.current = true
    const at = new Date().toISOString()
    const event: SupervisorDecisionEvent = {
      id: `${submission.id}-SUP-RETURNED-${Date.now()}`,
      decision: "Returned",
      supervisor: user.name,
      recordedAt: at,
      remarks: returnRemarks.trim(),
      referencedChecklistItems: selectedRequirements,
      attendanceConcernReference: attendanceReference || undefined,
      previousStatus: submission.status,
      nextStatus: "Returned",
    }
    const next: VerificationSubmission = {
      ...submission,
      status: "Returned",
      supervisorDecisions: [...decisionsFor(submission), event],
    }
    commit(next)
    setReturnOpen(false)
    setSuccess({ decision: "Returned", eventId: event.id })
  }

  if (!employee)
    return (
      <div className="grid gap-6">
        <PageHeader
          title="Document Verification"
          subtitle="Review employee payroll submissions, attachments, and attendance concerns."
        />
        <Alert tone="danger" title="Submission record not found">
          Submission record not found.
        </Alert>
        <Button type="button" onClick={onBrowse}>
          Browse Pending Submissions
        </Button>
      </div>
    )

  if (!authorized)
    return (
      <div className="grid gap-6">
        <PageHeader
          title="Document Verification"
          subtitle="Review employee payroll submissions, attachments, and attendance concerns."
        />
        <Alert tone="danger" title="Access denied">
          You are not authorized to review this employee submission.
        </Alert>
        <Button type="button" onClick={onBrowse}>
          Browse Pending Submissions
        </Button>
      </div>
    )

  return (
    <>
      <div className="grid gap-6">
        <PageHeader
          title="Submission Review"
          subtitle="Review the selected employee's documents and recorded attendance concerns."
        />
        <div className="flex flex-wrap items-center gap-2">
          <Tag kind="placeholder">Fictional Supervisor Demonstration</Tag>
          <Tag kind={statusTone(submission.status)}>{submission.status}</Tag>
        </div>
        <div
          role="tablist"
          aria-label="Submission review sections"
          className="grid gap-1 rounded-control bg-surface p-1 elevate sm:grid-cols-2 xl:grid-cols-3"
        >
          {([
            ["employee", "Employee Information"],
            ["submission", "Submission Details"],
            ["documents", "Required Documents"],
            ["attendance", "Attendance Concerns"],
            ["history", "Review History"],
            ["decision", "Supervisor Decision"],
          ] as const).map(([id, label]) => (
            <Button
              key={id}
              type="button"
              role="tab"
              aria-selected={section === id}
              variant={section === id ? "primary" : "secondary"}
              className={clsx(
                "border-0 shadow-none",
                section !== id && "bg-transparent text-text-muted",
              )}
              onClick={() => setSection(id)}
            >
              {label}
            </Button>
          ))}
        </div>

        {section === "employee" && (
          <section className="rounded-card bg-surface p-5 elevate">
            <SectionHeader title="Employee Information" />
            <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2 lg:grid-cols-3">
              <DataPoint label="Employee Name" value={employee.name} />
              <DataPoint label="Employee ID" value={employee.employeeId} />
              <DataPoint
                label="Classification"
                value={employee.classification}
              />
              <DataPoint
                label="Employment Type"
                value={employee.employmentType}
              />
              <DataPoint
                label="Assigned Payroll Type"
                value={
                  payrollConfig(submission.payrollTypeId)?.name ??
                  submission.payrollTypeId
                }
              />
              <DataPoint label="Payroll Period" value={submission.period} />
              <DataPoint label="Fund Source" value={employee.fundSource} />
              <DataPoint
                label="Assigned Immediate Supervisor"
                value={employee.supervisor}
              />
            </dl>
          </section>
        )}

        {section === "submission" && (
          <section className="rounded-card bg-surface p-5 elevate">
            <SectionHeader title="Payroll Submission Details" />
            <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2 lg:grid-cols-3">
              <DataPoint label="Submission ID" value={submission.id} />
              <DataPoint
                label="Payroll Type"
                value={
                  payrollConfig(submission.payrollTypeId)?.name ??
                  submission.payrollTypeId
                }
              />
              <DataPoint label="Payroll Period" value={submission.period} />
              <DataPoint
                label="Date Submitted"
                value={dateTime.format(new Date(submission.submittedAt))}
              />
              <DataPoint
                label="Current Submission Status"
                value={submission.status}
              />
              <DataPoint
                label="Applicable Checklist Version"
                value={submission.checklistVersion ?? "Not recorded"}
              />
              <DataPoint
                label="Configured Submission Deadline"
                value={submission.configuredDeadline ?? "No deadline recorded"}
              />
              <DataPoint
                label="Checklist Completion"
                value={
                  checklistConfigured
                    ? `${availableCount} of ${requirements.length} applicable required items available`
                    : "Checklist configuration unavailable"
                }
              />
              <DataPoint
                label="Recorded Circumstances"
                value={
                  submission.circumstances.length
                    ? submission.circumstances
                        .map((item) => circumstanceLabels[item])
                        .join(", ")
                    : "None recorded"
                }
              />
              <DataPoint
                label="Latest Employee Remarks"
                value={submission.employeeRemarks ?? "No remarks recorded"}
              />
              <DataPoint
                label="Previous Return Information"
                value={
                  decisionsFor(submission)
                    .filter((decision) => decision.decision === "Returned")
                    .at(-1)?.remarks ?? "No prior Supervisor return recorded"
                }
              />
            </dl>
            {submission.status === "Late" && (
              <div className="mt-4">
                <Alert tone="warning" title="Late submission">
                  This submission requires processing under the configured
                  late-submission workflow. No grace period or next batch is
                  inferred.
                </Alert>
              </div>
            )}
          </section>
        )}

        {section === "documents" && (
          <section className="rounded-card bg-surface p-5 elevate">
            <SectionHeader
              title="Required Documents"
              description="Review uploaded files against the applicable payroll-type checklist."
            />
            {checklistConfigured ? (
              <>
                <ul className="mt-5 divide-y divide-border rounded-control border border-border">
                  {requirements.map((requirement) => {
                    const file = submission.attachments.find(
                      (item) => item.requirementId === requirement.id,
                    )
                    return (
                      <li
                        key={requirement.id}
                        className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4"
                      >
                        <DataPoint
                          label="Requirement"
                          value={requirement.name}
                        />
                        <DataPoint
                          label="Required / Conditional"
                          value={
                            requirement.applicability === "mandatory"
                              ? "Required"
                              : "Applicable Conditional Item"
                          }
                        />
                        <DataPoint
                          label="Availability / File"
                          value={
                            file?.available
                              ? `Uploaded · ${file.filename}`
                              : "Missing · Required attachment was not provided."
                          }
                        />
                        <div>
                          <DataPoint
                            label="Date Uploaded"
                            value={
                              file?.uploadedAt
                                ? dateTime.format(new Date(file.uploadedAt))
                                : "Not recorded"
                            }
                          />
                          <Button
                            type="button"
                            variant="link"
                            disabled={!file?.available}
                            onClick={() =>
                              file &&
                              setAttachment({ attachment: file, requirement })
                            }
                          >
                            View Document
                          </Button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
                {pendingConfirmation.length > 0 && (
                  <div className="mt-4">
                    <Alert
                      tone="info"
                      title="Requirements awaiting configuration confirmation"
                    >
                      {pendingConfirmation
                        .map((requirement) => requirement.name)
                        .join(", ")}
                      . These items are shown for transparency and are not
                      counted as missing or used to block validation.
                    </Alert>
                  </div>
                )}
                <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2 lg:grid-cols-4">
                  <DataPoint
                    label="Required Items Completed"
                    value={String(availableCount)}
                  />
                  <DataPoint
                    label="Missing Required Items"
                    value={String(missing.length)}
                  />
                  <DataPoint
                    label="Applicable Conditional Items"
                    value={String(
                      requirements.filter(
                        (item) => item.applicability === "conditional",
                      ).length,
                    )}
                  />
                  <DataPoint
                    label="Overall Checklist Readiness"
                    value={missing.length ? "Incomplete" : "Ready for Review"}
                  />
                  <DataPoint
                    label="Pending Configuration Confirmation"
                    value={String(pendingConfirmation.length)}
                  />
                </dl>
                {missing.length > 0 && (
                  <div className="mt-4">
                    <Alert tone="danger" title="Required documents missing">
                      This submission is missing required documents and cannot
                      be validated until the requirements are completed.
                    </Alert>
                  </div>
                )}
              </>
            ) : (
              <div className="mt-5">
                <Alert tone="warning" title="Checklist unavailable">
                  The applicable checklist requirements have not been configured
                  for this payroll type. Validation is unavailable; no universal
                  checklist has been invented.
                </Alert>
              </div>
            )}
          </section>
        )}

        {section === "attendance" && (
          <section className="rounded-card bg-surface p-5 elevate">
            <SectionHeader
              title="Attendance Concerns"
              description="Review missing time entries reported by the employee and their supporting logbook evidence."
            />
            <Alert tone="info" title="Attendance source">
              MyWork Portal remains the attendance source. This review records
              evidence or an HR referral only; it does not edit imported
              attendance data.
            </Alert>
            {concern.exists ? (
              <div className="mt-5 grid gap-4 rounded-control border border-border p-4 sm:grid-cols-2 lg:grid-cols-3">
                <DataPoint
                  label="Concern Reference"
                  value={concern.id ?? "Reference unavailable"}
                />
                <DataPoint
                  label="Attendance Date"
                  value={concern.attendanceDate ?? "Date unavailable"}
                />
                <DataPoint
                  label="Reported Missing Entry"
                  value={concern.missingEntry ?? "Not specified"}
                />
                <DataPoint
                  label="Employee Explanation"
                  value={concern.explanation ?? "No explanation recorded"}
                />
                <DataPoint
                  label="Logbook Evidence"
                  value={
                    concern.logbookEntry
                      ? (concern.logbookEvidenceReference ??
                        "Evidence marked recorded")
                      : "No supporting logbook evidence."
                  }
                />
                <DataPoint
                  label="Verification Information"
                  value={
                    concern.supervisorVerification
                      ? `Verified by ${concern.supervisorVerification.user}`
                      : concern.hrReferral
                        ? `Referred to HR by ${concern.hrReferral.user}`
                        : "No review event recorded"
                  }
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setConcernOpen(true)}
                >
                  View Concern
                </Button>
              </div>
            ) : (
              <p className="mt-5 rounded-control bg-canvas p-6 text-center font-semibold">
                No attendance concern is recorded for this submission.
              </p>
            )}
          </section>
        )}

        {section === "history" && (
          <section className="rounded-card bg-surface p-5 elevate">
            <SectionHeader title="Submission Review History" />
            <ol className="mt-5 grid gap-3">
              <li className="rounded-control border border-border p-4">
                <p className="font-semibold">Employee Submitted</p>
                <p className="mt-1 text-xs text-text-muted">
                  Employee · {dateTime.format(new Date(submission.submittedAt))}
                  {" · "}Status: Submitted
                </p>
              </li>
              {decisionsFor(submission).map((decision) => (
                <li
                  key={decision.id}
                  className="rounded-control border border-border p-4"
                >
                  <p className="font-semibold">
                    Supervisor {decision.decision}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    {decision.supervisor} ·{" "}
                    {dateTime.format(new Date(decision.recordedAt))} · Status:{" "}
                    {decision.nextStatus}
                  </p>
                  {decision.remarks && (
                    <p className="mt-2 text-sm text-text-muted">
                      {decision.remarks}
                    </p>
                  )}
                </li>
              ))}
              {submission.hrDecision && (
                <li className="rounded-control border border-border p-4">
                  <p className="font-semibold">
                    HR {submission.hrDecision.outcome}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    {submission.hrDecision.reviewedBy ?? "HR Office"} ·{" "}
                    {dateTime.format(
                      new Date(submission.hrDecision.reviewedAt),
                    )}{" "}
                    · Status: {submission.status}
                  </p>
                </li>
              )}
            </ol>
          </section>
        )}

        {section === "decision" && (
          <section className="rounded-card bg-surface p-5 elevate">
            <SectionHeader
              title="Supervisor Decision"
              description="After reviewing the required documents and relevant attendance concerns, choose to validate or return the submission."
            />
            {!reviewable(submission) && (
              <div className="mt-4">
                <Alert tone="info" title="Read-only submission">
                  {submission.status === "Validated"
                    ? "This submission has already been validated."
                    : submission.status === "Verified"
                      ? "This submission has already been verified by HR and cannot be validated again."
                      : submission.status === "Transmitted"
                        ? "This submission has already been transmitted."
                        : submission.status === "Returned"
                          ? "This returned submission is awaiting employee correction and resubmission."
                        : "This submission is not awaiting a Supervisor decision."}
                </Alert>
              </div>
            )}
            {!canValidate && reviewable(submission) && (
              <div className="mt-4">
                <Alert tone="warning" title="Validation unavailable">
                  {submission.status === "Late"
                    ? "This submission requires processing under the configured late-submission workflow."
                    : missing.length
                      ? "Required documents are missing. The submission cannot be validated yet."
                      : !checklistConfigured
                        ? "The applicable checklist requirements have not been completed because configuration is unavailable."
                        : "A configured blocking review condition remains."}
                </Alert>
              </div>
            )}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                disabled={!canValidate}
                onClick={() => setValidateOpen(true)}
              >
                Validate Submission
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!canReturn}
                onClick={() => {
                  setReturnStep("edit")
                  setReturnOpen(true)
                }}
              >
                Return Submission
              </Button>
            </div>
          </section>
        )}

        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={onBrowse}>
            Browse Pending Submissions
          </Button>
        </div>
        <Alert tone="warning" title="Frontend authorization prototype">
          Assignment and role checks are enforced in this interface, but
          production authorization and durable document retention require a
          backend.
        </Alert>
      </div>

      {attachment && (
        <AttachmentPreview
          attachment={attachment.attachment}
          requirement={attachment.requirement}
          employeeName={employee.name}
          submissionId={submission.id}
          onClose={() => setAttachment(null)}
        />
      )}

      {concernOpen && concern.exists && (
        <Modal
          title="Missing Time Entry Details"
          onClose={() => setConcernOpen(false)}
          wide
        >
          <dl className="grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
            <DataPoint
              label="Employee"
              value={`${employee.name} (${employee.employeeId})`}
            />
            <DataPoint
              label="Attendance Date"
              value={concern.attendanceDate ?? "Unavailable"}
            />
            <DataPoint
              label="Missing Entry Information"
              value={concern.missingEntry ?? "Not specified"}
            />
            <DataPoint
              label="Employee Explanation"
              value={concern.explanation ?? "No explanation recorded"}
            />
            <DataPoint
              label="Logbook Evidence"
              value={
                concern.logbookEvidenceReference ??
                "No supporting logbook evidence."
              }
            />
            <DataPoint
              label="Attendance Source Reference"
              value={concern.attendanceSourceReference ?? "Unavailable"}
            />
            <DataPoint
              label="Previous Review Information"
              value={
                concern.supervisorVerification
                  ? `Verified ${dateTime.format(
                      new Date(concern.supervisorVerification.at),
                    )}`
                  : concern.hrReferral
                    ? `Referred ${dateTime.format(
                        new Date(concern.hrReferral.at),
                      )}`
                    : "No prior review"
              }
            />
          </dl>
          {!concern.logbookEntry && !concern.hrReferral && (
            <div className="mt-4">
              <Alert tone="warning" title="Logbook evidence required">
                Logbook evidence is required for Supervisor verification. Refer
                this missing time entry to HR.
              </Alert>
            </div>
          )}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            {concern.logbookEntry &&
              !concern.supervisorVerified &&
              concern.logbookEvidenceReference && (
                <Button
                  type="button"
                  onClick={() => setConcernAction("verify")}
                >
                  Verify Logbook-Supported Entry
                </Button>
              )}
            {!concern.logbookEntry && !concern.hrReferral && (
              <Button type="button" onClick={() => setConcernAction("refer")}>
                Refer to HR
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConcernOpen(false)}
            >
              Close
            </Button>
          </div>
        </Modal>
      )}

      {concernAction && (
        <Modal
          title={
            concernAction === "verify"
              ? "Confirm Logbook Verification"
              : "Confirm HR Referral"
          }
          onClose={() => setConcernAction(null)}
        >
          <p className="text-sm text-text-muted">
            {concernAction === "verify"
              ? "Confirm that the reported entry is supported by the recorded fictional logbook evidence. This does not alter raw MyWork attendance or complete HR processing."
              : "No qualifying logbook evidence is available. Preserve this concern for HR follow-up."}
          </p>
          <dl className="mt-4 grid gap-4 rounded-control bg-canvas p-4">
            <DataPoint
              label="Concern"
              value={concern.id ?? "Reference unavailable"}
            />
            <DataPoint
              label="Evidence"
              value={concern.logbookEvidenceReference ?? "Unavailable"}
            />
          </dl>
          <div className="mt-5 flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConcernAction(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={
                concernAction === "verify" ? verifyConcern : referConcern
              }
            >
              {concernAction === "verify"
                ? "Confirm Verification"
                : "Confirm Referral"}
            </Button>
          </div>
        </Modal>
      )}

      {validateOpen && (
        <Modal
          title="Validate Employee Submission?"
          onClose={() => setValidateOpen(false)}
        >
          <p className="text-sm text-text-muted">
            You are about to validate this employee&apos;s payroll submission
            for the fictional HR handoff stage. This isolated demonstration
            does not create or update an HR Portal record.
          </p>
          <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
            <DataPoint label="Employee Name" value={employee.name} />
            <DataPoint label="Employee ID" value={employee.employeeId} />
            <DataPoint label="Submission ID" value={submission.id} />
            <DataPoint
              label="Payroll Type"
              value={
                payrollConfig(submission.payrollTypeId)?.name ??
                submission.payrollTypeId
              }
            />
            <DataPoint label="Payroll Period" value={submission.period} />
            <DataPoint
              label="Required Checklist Completion"
              value={`${availableCount} of ${requirements.length}`}
            />
          </dl>
          <Alert tone="info" title="Separate HR action">
            Supervisor validation does not complete HR verification.
          </Alert>
          <div className="mt-5 flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setValidateOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={validate}>
              Confirm Validation
            </Button>
          </div>
        </Modal>
      )}

      {returnOpen && (
        <Modal
          title={
            returnStep === "edit"
              ? "Return Employee Submission"
              : "Confirm Submission Return"
          }
          onClose={() => setReturnOpen(false)}
          wide
        >
          {returnStep === "edit" ? (
            <>
              <p className="text-sm text-text-muted">
                Explain what the employee must correct or complete before
                resubmitting.
              </p>
              <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
                <DataPoint
                  label="Employee"
                  value={`${employee.name} (${employee.employeeId})`}
                />
                <DataPoint label="Submission ID" value={submission.id} />
                <DataPoint
                  label="Payroll Type"
                  value={
                    payrollConfig(submission.payrollTypeId)?.name ??
                    submission.payrollTypeId
                  }
                />
                <DataPoint label="Payroll Period" value={submission.period} />
                <DataPoint label="Current Status" value={submission.status} />
              </dl>
              {requirements.length > 0 && (
                <div className="mt-5">
                  <p className="text-sm font-medium">
                    Related Checklist Items (Optional)
                  </p>
                  <div className="mt-2 grid gap-2">
                    {requirements.map((requirement) => (
                      <Button
                        key={requirement.id}
                        type="button"
                        variant={
                          selectedRequirements.includes(requirement.name)
                            ? "primary"
                            : "secondary"
                        }
                        aria-pressed={selectedRequirements.includes(
                          requirement.name,
                        )}
                        onClick={() =>
                          setSelectedRequirements((items) =>
                            items.includes(requirement.name)
                              ? items.filter(
                                  (item) => item !== requirement.name,
                                )
                              : [...items, requirement.name],
                          )
                        }
                      >
                        {requirement.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {concern.exists && (
                <SelectField
                  label="Attendance Reference (Optional)"
                  className="mt-5"
                  value={attendanceReference}
                  onChange={(event) =>
                    setAttendanceReference(event.target.value)
                  }
                  placeholder="No attendance reference selected"
                >
                  <option value={concern.id ?? "Attendance Concern"}>
                    {concern.id ?? "Attendance Concern"}
                  </option>
                </SelectField>
              )}
              <div className="mt-5">
                <MultilineField
                  key={`return-${submission.id}`}
                  label="Reason for Return / Remarks"
                  value={returnRemarks}
                  onChange={(value) => {
                    setReturnRemarks(value)
                    setReturnError("")
                  }}
                  placeholder="Specify the missing requirements or corrections needed..."
                  error={returnError}
                />
              </div>
              <div className="mt-5 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setReturnOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={reviewReturn}>
                  Review Return
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-text-muted">
                This isolated demonstration will record the submission as
                Returned and preserve your remarks. Employee Portal delivery
                requires shared backend data.
              </p>
              <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4">
                <DataPoint
                  label="Employee"
                  value={`${employee.name} (${employee.employeeId})`}
                />
                <DataPoint label="Submission ID" value={submission.id} />
                <DataPoint label="Payroll Period" value={submission.period} />
                <DataPoint label="Complete Remarks" value={returnRemarks} />
                <DataPoint
                  label="Related Checklist Items"
                  value={selectedRequirements.join(", ") || "None selected"}
                />
                <DataPoint
                  label="Attendance Reference"
                  value={attendanceReference || "None selected"}
                />
              </dl>
              <div className="mt-5 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setReturnStep("edit")}
                >
                  Back to Edit
                </Button>
                <Button type="button" onClick={returnSubmission}>
                  Confirm Return
                </Button>
              </div>
            </>
          )}
        </Modal>
      )}

      {success && (
        <Modal
          title={
            success.decision === "Validated"
              ? "Submission Validated"
              : "Submission Returned"
          }
          onClose={() => setSuccess(null)}
        >
          <Alert tone="success" title="Supervisor decision recorded">
            {success.decision === "Validated"
              ? "The submission has been validated in this isolated demonstration. A production backend would make it available for HR verification."
              : "The submission has been returned in this isolated demonstration and your remarks were preserved. No Employee Portal record or replacement upload was created."}
          </Alert>
          <div className="mt-5 grid gap-3">
            <Button type="button" onClick={onNext}>
              Review Next Submission
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                onHistory(
                  success.decision === "Validated" ? "validated" : "returned",
                  success.eventId,
                )
              }
            >
              View Validation History
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSuccess(null)}
            >
              Close
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}

export function SupervisorPending({
  submissions,
  employees,
  user,
  initialTab = "awaiting",
  onReview,
}: {
  submissions: VerificationSubmission[]
  employees: HrEmployee[]
  user: MockUser
  initialTab?: SupervisorQueueTab
  onReview: (id: string) => void
}) {
  const [tab, setTab] = useState<SupervisorQueueTab>(initialTab)
  const [query, setQuery] = useState("")
  const [type, setType] = useState("")
  const [period, setPeriod] = useState("")
  const [status, setStatus] = useState("")
  const [classification, setClassification] = useState("")
  const [fund, setFund] = useState("")
  const assigned = submissions.filter((submission) =>
    assignedTo(submission, employees, user.name),
  )
  const queue = assigned.filter((submission) => {
    return tab === "awaiting"
      ? submission.status === "Submitted"
      : needsAttention(submission)
  })
  const filtered = queue.filter((submission) => {
    const employee = employeeFor(submission, employees)
    const normalized = query.trim().toLowerCase()
    return (
      (!normalized ||
        [submission.id, submission.employeeId, employee?.name].some((value) =>
          value?.toLowerCase().includes(normalized),
        )) &&
      (!type || submission.payrollTypeId === type) &&
      (!period || submission.period === period) &&
      (!status || submission.status === status) &&
      (!classification || employee?.classification === classification) &&
      (!fund || employee?.fundSource === fund)
    )
  })
  const types = [
    ...new Set(assigned.map((submission) => submission.payrollTypeId)),
  ]
  const periods = [...new Set(assigned.map((submission) => submission.period))]
  const statuses = [...new Set(assigned.map((submission) => submission.status))]
  const classifications = [
    ...new Set(
      assigned
        .map((submission) => employeeFor(submission, employees)?.classification)
        .filter((value): value is HrEmployee["classification"] =>
          Boolean(value),
        ),
    ),
  ]
  const funds = [
    ...new Set(
      assigned
        .map((submission) => employeeFor(submission, employees)?.fundSource)
        .filter((value): value is HrEmployee["fundSource"] => Boolean(value)),
    ),
  ]
  const clear = () => {
    setQuery("")
    setType("")
    setPeriod("")
    setStatus("")
    setClassification("")
    setFund("")
  }
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Pending Submissions"
        subtitle="Review payroll-document submissions from employees assigned to you."
      />
      <Alert tone="info" title="Supervisor review">
        Check the required documents and relevant attendance concerns before
        validating or returning a submission.
      </Alert>
      <div
        role="tablist"
        aria-label="Pending submission groups"
        className="grid gap-1 rounded-control bg-surface p-1 elevate sm:grid-cols-2"
      >
        <Button
          type="button"
          role="tab"
          aria-selected={tab === "awaiting"}
          variant={tab === "awaiting" ? "primary" : "secondary"}
          onClick={() => setTab("awaiting")}
        >
          Awaiting Review
        </Button>
        <Button
          type="button"
          role="tab"
          aria-selected={tab === "attention"}
          variant={tab === "attention" ? "primary" : "secondary"}
          onClick={() => setTab("attention")}
        >
          Needs Attention
        </Button>
      </div>
      <section className="overflow-hidden rounded-card bg-surface elevate">
        <div className="border-b border-border p-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <TextField
              label="Search Submissions"
              icon="search"
              placeholder="Search employee name, employee ID, or submission ID..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <SelectField
              label="Payroll Type"
              value={type}
              onChange={(event) => setType(event.target.value)}
              placeholder="All represented types"
            >
              {types.map((id) => (
                <option key={id} value={id}>
                  {payrollConfig(id)?.name ?? id}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Payroll Period"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              placeholder="All represented periods"
            >
              {periods.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Submission Status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              placeholder="All applicable statuses"
            >
              {statuses.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Employee Classification"
              value={classification}
              onChange={(event) => setClassification(event.target.value)}
              placeholder="All classifications"
            >
              {classifications.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Fund Source"
              value={fund}
              onChange={(event) => setFund(event.target.value)}
              placeholder="All Funds"
            >
              {funds.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </SelectField>
          </div>
          <div className="mt-4 flex justify-end">
            <Button type="button" variant="secondary" onClick={clear}>
              Clear Filters
            </Button>
          </div>
        </div>
        {filtered.length ? (
          <ul className="max-h-[48rem] divide-y divide-border overflow-y-auto">
            {filtered.map((submission) => {
              const employee = employeeFor(submission, employees)
              const requirements = requirementsFor(submission)
              const missing = missingRequirements(submission)
              const concern = submission.attendanceConcern
              return (
                <li
                  key={submission.id}
                  className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3"
                >
                  <DataPoint label="Submission ID" value={submission.id} />
                  <DataPoint
                    label="Employee Name / ID"
                    value={`${employee?.name ?? submission.employeeId} (${submission.employeeId})`}
                  />
                  <DataPoint
                    label="Payroll Type"
                    value={
                      payrollConfig(submission.payrollTypeId)?.name ??
                      submission.payrollTypeId
                    }
                  />
                  <DataPoint label="Payroll Period" value={submission.period} />
                  <DataPoint
                    label="Submission Date"
                    value={dateTime.format(new Date(submission.submittedAt))}
                  />
                  <DataPoint
                    label="Checklist Completion"
                    value={
                      hasChecklistConfiguration(submission)
                        ? `${requirements.length - missing.length} of ${requirements.length}`
                        : "Configuration unavailable"
                    }
                  />
                  <DataPoint
                    label="Current Status"
                    value={submission.status}
                  />
                  <DataPoint
                    label="Attendance Concern"
                    value={
                      concern.exists
                        ? concern.logbookEntry
                          ? concern.supervisorVerified
                            ? "Resolved with Evidence"
                            : "Requires Logbook Review"
                          : concern.hrReferral
                            ? "Referred to HR"
                            : "Concern Reported"
                        : "None Recorded"
                    }
                  />
                  <div>
                    <p className="mb-1 text-xs font-medium text-text-muted">
                      Actions
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => onReview(submission.id)}
                    >
                      Review Submission
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="p-8 text-center font-semibold">
            {assigned.length
              ? queue.length
                ? "No submissions match your search or filters."
                : "No employee submissions currently require your review."
              : "No employees are currently assigned to this Supervisor in the available records."}
          </p>
        )}
      </section>
    </div>
  )
}

export function SupervisorVerification({
  selectedId,
  onBrowse,
  onHistory,
  onNext,
  initialSection,
  ...props
}: SharedProps & {
  selectedId?: string | null
  onBrowse: () => void
  onHistory: (tab?: SupervisorHistoryTab, decisionId?: string) => void
  onNext: () => void
  initialSection?: SupervisorReviewSection
}) {
  const selected = props.submissions.find(
    (submission) => submission.id === selectedId,
  )
  if (!selected)
    return (
      <div className="grid gap-6">
        <PageHeader
          title="Document Verification"
          subtitle="Review employee payroll submissions, attachments, and attendance concerns."
        />
        {selectedId ? (
          <Alert tone="danger" title="Submission not found">
            Submission record not found.
          </Alert>
        ) : (
          <Alert tone="info" title="No submission selected">
            Select a pending submission to begin reviewing.
          </Alert>
        )}
        <div>
          <Button type="button" onClick={onBrowse}>
            Browse Pending Submissions
          </Button>
        </div>
      </div>
    )
  return (
    <ReviewWorkspace
      {...props}
      submission={selected}
      onBrowse={onBrowse}
      onHistory={onHistory}
      onNext={onNext}
      initialSection={initialSection}
    />
  )
}

export function SupervisorHistory({
  submissions,
  employees,
  user,
  initialTab = "all",
  initialDecisionId,
  onViewSubmission,
}: {
  submissions: VerificationSubmission[]
  employees: HrEmployee[]
  user: MockUser
  initialTab?: SupervisorHistoryTab
  initialDecisionId?: string | null
  onViewSubmission: (id: string) => void
}) {
  const [tab, setTab] = useState<SupervisorHistoryTab>(initialTab)
  const [query, setQuery] = useState("")
  const [type, setType] = useState("")
  const [period, setPeriod] = useState("")
  const [decisionDate, setDecisionDate] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(
    initialDecisionId ?? null,
  )
  const records = submissions.flatMap((submission) =>
    decisionsFor(submission)
      .filter((decision) => decision.supervisor === user.name)
      .map((decision) => ({
        submission,
        decision,
        employee: employeeFor(submission, employees),
      })),
  )
  const filtered = records
    .filter(({ submission, decision, employee }) => {
      const normalized = query.trim().toLowerCase()
      return (
        (tab === "all" ||
          (tab === "validated" && decision.decision === "Validated") ||
          (tab === "returned" && decision.decision === "Returned")) &&
        (!normalized ||
          [submission.id, submission.employeeId, employee?.name].some((value) =>
            value?.toLowerCase().includes(normalized),
          )) &&
        (!type || submission.payrollTypeId === type) &&
        (!period || submission.period === period) &&
        (!decisionDate || decision.recordedAt.slice(0, 10) === decisionDate)
      )
    })
    .sort((a, b) => b.decision.recordedAt.localeCompare(a.decision.recordedAt))
  const selected = records.find((record) => record.decision.id === selectedId)
  const types = [
    ...new Set(records.map((record) => record.submission.payrollTypeId)),
  ]
  const periods = [
    ...new Set(records.map((record) => record.submission.period)),
  ]
  const clear = () => {
    setQuery("")
    setType("")
    setPeriod("")
    setDecisionDate("")
  }
  const hasFilters = Boolean(query || type || period || decisionDate)
  return (
    <>
      <div className="grid gap-6">
        <PageHeader
          title="Validation History"
          subtitle="Review submissions you previously validated or returned."
        />
        <div
          role="tablist"
          aria-label="Supervisor decision history"
          className="grid gap-1 rounded-control bg-surface p-1 elevate sm:grid-cols-3"
        >
          {([
            ["all", "All Decisions"],
            ["validated", "Validated"],
            ["returned", "Returned"],
          ] as const).map(([id, label]) => (
            <Button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              variant={tab === id ? "primary" : "secondary"}
              onClick={() => setTab(id)}
            >
              {label}
            </Button>
          ))}
        </div>
        <section className="overflow-hidden rounded-card bg-surface elevate">
          <div className="border-b border-border p-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <TextField
                label="Search"
                icon="search"
                placeholder="Search employee name, employee ID, or submission ID..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <SelectField
                label="Payroll Type"
                value={type}
                onChange={(event) => setType(event.target.value)}
                placeholder="All represented types"
              >
                {types.map((id) => (
                  <option key={id} value={id}>
                    {payrollConfig(id)?.name ?? id}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Payroll Period"
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                placeholder="All periods"
              >
                {periods.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </SelectField>
              <TextField
                label="Decision Date"
                type="date"
                value={decisionDate}
                onChange={(event) => setDecisionDate(event.target.value)}
              />
            </div>
            <div className="mt-4 flex justify-end">
              <Button type="button" variant="secondary" onClick={clear}>
                Clear Filters
              </Button>
            </div>
          </div>
          {filtered.length ? (
            <ul className="divide-y divide-border">
              {filtered.map(({ submission, decision, employee }) => (
                <li
                  key={decision.id}
                  className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-5"
                >
                  <DataPoint
                    label="Submission / Employee"
                    value={`${submission.id} · ${employee?.name ?? submission.employeeId} (${submission.employeeId})`}
                  />
                  <DataPoint
                    label="Payroll Type / Period"
                    value={`${payrollConfig(submission.payrollTypeId)?.name ?? submission.payrollTypeId} · ${submission.period}`}
                  />
                  <DataPoint
                    label="Supervisor Decision / Date"
                    value={`${decision.decision} · ${dateTime.format(new Date(decision.recordedAt))}`}
                  />
                  <DataPoint
                    label="Current Submission Status"
                    value={submission.status}
                  />
                  <div className="flex flex-col items-start gap-2">
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => onViewSubmission(submission.id)}
                    >
                      View Submission
                    </Button>
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => setSelectedId(decision.id)}
                    >
                      View Decision
                    </Button>
                    {decision.decision === "Returned" && (
                      <Button
                        type="button"
                        variant="link"
                        onClick={() => setSelectedId(decision.id)}
                      >
                        View Remarks
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-8 text-center font-semibold">
              {hasFilters
                ? tab === "validated"
                  ? "No validated submissions match your filters."
                  : tab === "returned"
                    ? "No returned submissions match your filters."
                    : "No submissions match your search or filters."
                : "No Supervisor review decisions have been recorded yet."}
            </p>
          )}
        </section>
      </div>
      {selected && (
        <DecisionDetails
          submission={selected.submission}
          employee={selected.employee}
          decision={selected.decision}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  )
}

export function SupervisorNotifications({
  notifications,
  setNotifications,
  employees,
  onView,
}: {
  notifications: SupervisorNotification[]
  setNotifications: Dispatch<SetStateAction<SupervisorNotification[]>>
  employees: HrEmployee[]
  onView: (id: string, section?: SupervisorReviewSection) => void
}) {
  const [unreadOnly, setUnreadOnly] = useState(false)
  const visible = notifications
    .filter((notification) => !unreadOnly || !notification.read)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const markRead = (id: string) =>
    setNotifications((items) =>
      items.map((item) => (item.id === id ? { ...item, read: true } : item)),
    )
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Notifications"
        subtitle="Updates about employee submissions and review items assigned to you."
      />
      <section className="overflow-hidden rounded-card bg-surface elevate">
        <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:justify-between">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={!unreadOnly ? "primary" : "secondary"}
              onClick={() => setUnreadOnly(false)}
            >
              All Notifications
            </Button>
            <Button
              type="button"
              variant={unreadOnly ? "primary" : "secondary"}
              onClick={() => setUnreadOnly(true)}
            >
              Unread
            </Button>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={!notifications.some((item) => !item.read)}
            onClick={() =>
              setNotifications((items) =>
                items.map((item) => ({ ...item, read: true })),
              )
            }
          >
            Mark All as Read
          </Button>
        </div>
        {visible.length ? (
          <ul className="divide-y divide-border">
            {visible.map((notification) => {
              const employee = employees.find(
                (item) => item.employeeId === notification.employeeId,
              )
              return (
                <li key={notification.id} className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{notification.title}</p>
                        {!notification.read && (
                          <Tag kind="simulated">Unread</Tag>
                        )}
                      </div>
                      <p className="mt-2 text-sm">{notification.description}</p>
                      <p className="mt-2 text-xs text-text-muted">
                        {employee?.name ?? notification.employeeId} (
                        {notification.employeeId}) · {notification.submissionId}{" "}
                        · {dateTime.format(new Date(notification.createdAt))}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!notification.read && (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => markRead(notification.id)}
                        >
                          Mark as Read
                        </Button>
                      )}
                      <Button
                        type="button"
                        onClick={() => {
                          markRead(notification.id)
                          onView(
                            notification.submissionId,
                            notification.targetSection,
                          )
                        }}
                      >
                        {notification.targetSection === "attendance"
                          ? "Review Concern"
                          : "View Submission"}
                      </Button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="p-8 text-center font-semibold">No new notifications.</p>
        )}
      </section>
    </div>
  )
}

function SummaryCard({
  title,
  count,
  action,
  onAction,
}: {
  title: string
  count: number
  action: string
  onAction: () => void
}) {
  return (
    <section className="rounded-card bg-surface p-5 elevate">
      <p className="text-sm font-semibold text-text-muted">{title}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{count}</p>
      <Button type="button" variant="link" className="mt-4" onClick={onAction}>
        {action}
      </Button>
    </section>
  )
}

export function SupervisorDashboardComplete({
  submissions,
  employees,
  user,
  onPending,
  onReview,
  onHistory,
  onNotifications,
}: {
  submissions: VerificationSubmission[]
  employees: HrEmployee[]
  user: MockUser
  onPending: (tab?: SupervisorQueueTab) => void
  onReview: (id: string, section?: SupervisorReviewSection) => void
  onHistory: (tab?: SupervisorHistoryTab, decisionId?: string) => void
  onNotifications: () => void
}) {
  const assigned = submissions.filter((submission) =>
    assignedTo(submission, employees, user.name),
  )
  const pending = assigned.filter(
    (submission) => submission.status === "Submitted",
  )
  const attention = assigned.filter(needsAttention)
  const decisions = assigned
    .flatMap((submission) =>
      decisionsFor(submission)
        .filter((decision) => decision.supervisor === user.name)
        .map((decision) => ({ submission, decision })),
    )
    .sort((a, b) => b.decision.recordedAt.localeCompare(a.decision.recordedAt))
  const validated = decisions.filter(
    ({ decision }) => decision.decision === "Validated",
  )
  const returned = decisions.filter(
    ({ decision }) => decision.decision === "Returned",
  )
  const concerns = pending.filter(hasOpenAttendanceConcern)
  return (
    <div className="grid gap-6">
      <div>
        <PageHeader
          title="Immediate Supervisor Dashboard"
          subtitle="Monitor assigned employee submissions and recent validation activity."
        />
        <p className="mt-5 text-lg font-semibold">Welcome back, {user.name}</p>
        <p className="mt-1 text-sm text-text-muted">
          Immediate Supervisor · Fictional Demonstration Account
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Pending Reviews"
          count={pending.length}
          action="View Pending"
          onAction={() => onPending("awaiting")}
        />
        <SummaryCard
          title="Needs Attention"
          count={attention.length}
          action="Review Issues"
          onAction={() => onPending("attention")}
        />
        <SummaryCard
          title="Validated by You"
          count={validated.length}
          action="View Validations"
          onAction={() => onHistory("validated")}
        />
        <SummaryCard
          title="Returned by You"
          count={returned.length}
          action="View Returns"
          onAction={() => onHistory("returned")}
        />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-card bg-surface p-5 elevate">
          <SectionHeader
            title="Submissions Awaiting Review"
            action="View All"
            onAction={() => onPending("awaiting")}
          />
          {pending.length ? (
            <ul className="mt-5 divide-y divide-border rounded-control border border-border">
              {pending.slice(0, 5).map((submission) => {
                const employee = employeeFor(submission, employees)
                const requirements = requirementsFor(submission)
                const missing = missingRequirements(submission)
                return (
                  <li
                    key={submission.id}
                    className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div>
                      <p className="font-semibold">
                        {employee?.name ?? submission.employeeId}
                      </p>
                      <p className="mt-1 text-sm">
                        {payrollConfig(submission.payrollTypeId)?.name ??
                          submission.payrollTypeId}{" "}
                        · {submission.period}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
                        {hasChecklistConfiguration(submission)
                          ? `${requirements.length - missing.length} of ${requirements.length} checklist items · `
                          : "Checklist unavailable · "}
                        {submission.status}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => onReview(submission.id)}
                    >
                      Review Submission
                    </Button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="mt-5 rounded-control bg-canvas p-6 text-center font-semibold">
              No employee submissions currently require your review.
            </p>
          )}
        </section>
        <section className="rounded-card bg-surface p-5 elevate">
          <SectionHeader title="Attendance Concerns" />
          {concerns.length ? (
            <ul className="mt-5 divide-y divide-border rounded-control border border-border">
              {concerns.slice(0, 5).map((submission) => {
                const employee = employeeFor(submission, employees)
                const concern = submission.attendanceConcern
                return (
                  <li
                    key={submission.id}
                    className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div>
                      <p className="font-semibold">
                        {employee?.name ?? submission.employeeId}
                      </p>
                      <p className="mt-1 text-sm">
                        {concern.attendanceDate ?? "Date unavailable"} ·{" "}
                        {concern.logbookEntry
                          ? concern.supervisorVerified
                            ? "Resolved with Evidence"
                            : "Logbook Evidence Available"
                          : concern.hrReferral
                            ? "Referred to HR"
                            : "No Logbook Evidence"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => onReview(submission.id, "attendance")}
                    >
                      Review Concern
                    </Button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="mt-5 rounded-control bg-canvas p-6 text-center font-semibold">
              No attendance concerns currently require your review.
            </p>
          )}
        </section>
      </div>
      <section className="rounded-card bg-surface p-5 elevate">
        <SectionHeader title="Recent Validation Activity" />
        {decisions.length ? (
          <ul className="mt-5 divide-y divide-border rounded-control border border-border">
            {decisions.slice(0, 5).map(({ submission, decision }) => {
              const employee = employeeFor(submission, employees)
              return (
                <li
                  key={decision.id}
                  className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div>
                    <p className="font-semibold">
                      {employee?.name ?? submission.employeeId} ·{" "}
                      {submission.id}
                    </p>
                    <p className="mt-1 text-sm">
                      {decision.decision} ·{" "}
                      {dateTime.format(new Date(decision.recordedAt))}
                    </p>
                    {decision.remarks && (
                      <p className="mt-1 text-xs text-text-muted">
                        {decision.remarks.slice(0, 100)}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    onClick={() =>
                      onHistory(
                        decision.decision === "Validated"
                          ? "validated"
                          : "returned",
                        decision.id,
                      )
                    }
                  >
                    View Details
                  </Button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-5 rounded-control bg-canvas p-6 text-center font-semibold">
            No Supervisor review decisions have been recorded yet.
          </p>
        )}
      </section>
      <section className="rounded-card bg-surface p-5 elevate">
        <SectionHeader title="Quick Actions" />
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button type="button" onClick={() => onPending("awaiting")}>
            Review Pending Submissions
          </Button>
          <Button type="button" variant="secondary" onClick={() => onHistory()}>
            View Validation History
          </Button>
          <Button type="button" variant="secondary" onClick={onNotifications}>
            View Notifications
          </Button>
        </div>
      </section>
    </div>
  )
}

export function SupervisorMyAccount({
  user,
  onDashboard,
}: {
  user: MockUser
  onDashboard: () => void
}) {
  const profile = profileFor(user, "Immediate Supervisor")
  return (
    <div className="grid gap-6">
      <PageHeader
        title="My Account"
        subtitle="View your account information and manage permitted account settings."
      />
      <Button
        type="button"
        variant="secondary"
        className="w-fit"
        onClick={onDashboard}
      >
        Back to Dashboard
      </Button>
      <section className="rounded-card bg-surface p-5 elevate">
        <dl className="grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2 lg:grid-cols-3">
          <DataPoint label="Full Name" value={profile.name} />
          <DataPoint label="Username" value={profile.username} />
          <DataPoint label="User Reference" value={profile.employeeId} />
          <DataPoint label="Role" value="Immediate Supervisor" />
          <DataPoint label="Account" value="Fictional Demonstration Account" />
          <DataPoint label="Account Status" value="Active — Demo" />
        </dl>
      </section>
      <MyAccount profile={profile} />
      <Alert tone="info" title="Assignment control">
        HR maintains Supervisor assignments. Password changes use the existing
        local demonstration behavior and are not a production authentication
        update.
      </Alert>
    </div>
  )
}

export function SupervisorHeaderBell({
  notifications,
  onOpen,
}: {
  notifications: SupervisorNotification[]
  onOpen: () => void
}) {
  const unread = notifications.filter((item) => !item.read).length
  return (
    <Button
      type="button"
      variant="link"
      className="relative size-10 p-0 no-underline text-text-muted hover:bg-info-soft"
      aria-label={`${unread} unread Supervisor notification${
        unread === 1 ? "" : "s"
      }`}
      onClick={onOpen}
    >
      <Icon name="bell" size={19} />
      {unread > 0 && (
        <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-xs font-semibold leading-4 text-on-primary">
          {unread}
        </span>
      )}
    </Button>
  )
}
