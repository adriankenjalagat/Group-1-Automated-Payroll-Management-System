import clsx from "clsx"
import { useRef, useState, type Dispatch, type SetStateAction } from "react"
import { Alert, Button, Icon, TextField } from "../../MsuPayroll"
import { Modal, SelectField, Tag } from "../../admin/ui"
import { MyAccount, profileFor } from "../../account/MyAccount"
import type { MockUser } from "../../auth/mockData"
import {
  type AccountantDecisionEvent,
  type DvRecord,
  type SupportingDocument,
} from "../accounting/dvData"
import type { AccountantNotification } from "./accountantData"

export type AccountantReviewTab = "pending" | "reviewed" | "returned"
export type AccountantHistoryTab = "all" | "approved" | "returned"

type ReviewProps = {
  records: DvRecord[]
  setRecords: Dispatch<SetStateAction<DvRecord[]>>
  user: MockUser
  initialTab?: AccountantReviewTab
  initialDvId?: string | null
  onHistory: (tab?: AccountantHistoryTab, decisionId?: string) => void
  onPending: () => void
  setNotifications: Dispatch<SetStateAction<AccountantNotification[]>>
}

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
})
const dateTime = new Intl.DateTimeFormat("en-PH", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

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

type PageHeaderProps = {
  title: string
  subtitle: string
}

function PageHeader({ title, subtitle }: PageHeaderProps) {
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

function MultilineField({
  label,
  value,
  onChange,
  placeholder,
  error,
  required,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  error?: string
  required?: boolean
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">
        {label}
        {required ? " *" : ""}
      </p>
      <div
        role="textbox"
        aria-multiline="true"
        aria-label={label}
        aria-required={required}
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

function decisionsFor(record: DvRecord) {
  return record.accountantDecisions ?? []
}

function latestDecision(record: DvRecord) {
  return [...decisionsFor(record)].sort((a, b) =>
    b.recordedAt.localeCompare(a.recordedAt),
  )[0]
}

function pendingForAccountant(record: DvRecord) {
  const routing = record.activeRoutingInstance
  const alreadyDecided =
    routing &&
    decisionsFor(record).some(
      (decision) => decision.routingInstanceId === routing,
    )
  return (
    record.stage === "Awaiting Accountant Review" &&
    record.currentHolder === "Accountant" &&
    record.accountantRouteConfigured &&
    record.forwardedAt &&
    record.checkedAt &&
    record.prerequisites.payrollExists &&
    record.prerequisites.payrollApprovalsComplete &&
    record.prerequisites.budgetDocumentExists &&
    record.prerequisites.budgetApprovalsComplete &&
    record.prerequisites.readyForDvRecorded &&
    !alreadyDecided
  )
}

function approvalReady(record: DvRecord) {
  return (
    pendingForAccountant(record) &&
    record.chancellorRouteConfigured === true &&
    record.amount !== null &&
    record.amount === record.payrollSnapshot.netPay &&
    record.supportingDocuments.every((document) => document.available)
  )
}

function DecisionStatus({ decision }: { decision: AccountantDecisionEvent }) {
  return (
    <Tag kind={decision.action === "Approved" ? "simulated" : "placeholder"}>
      Accountant {decision.action}
    </Tag>
  )
}

function DocumentPreview({
  document,
  onClose,
}: {
  document: SupportingDocument
  onClose: () => void
}) {
  return (
    <Modal title="Supporting Document Reference" onClose={onClose}>
      <Tag kind="placeholder">Read-only demonstration reference</Tag>
      <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4">
        <DataPoint label="Document Name" value={document.name} />
        <DataPoint
          label="Reference"
          value={document.reference ?? "Reference unavailable"}
          muted={!document.reference}
        />
        <DataPoint label="Group" value={document.group} />
        <DataPoint
          label="Recorded Approval Information"
          value={
            document.approvalInformation ??
            "No approval information is recorded."
          }
        />
        <DataPoint
          label="Recorded Completion"
          value={
            document.completedAt
              ? dateTime.format(new Date(document.completedAt))
              : "Not recorded"
          }
          muted={!document.completedAt}
        />
      </dl>
      <Alert tone="info" title="Reference only">
        No original signed PDF is stored in this prototype. Original paper
        documents remain the official records, where required by the documented
        university procedure.
      </Alert>
      <div className="mt-5 flex justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>
          Close Preview
        </Button>
      </div>
    </Modal>
  )
}

function DecisionDetails({
  record,
  decision,
  onClose,
}: {
  record: DvRecord
  decision: AccountantDecisionEvent
  onClose: () => void
}) {
  return (
    <Modal title="Accountant Decision Details" onClose={onClose} wide>
      <DecisionStatus decision={decision} />
      <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
        <DataPoint label="DV Reference" value={record.id} />
        <DataPoint label="Payroll Reference" value={record.payrollId} />
        <DataPoint label="Decision" value={decision.action} />
        <DataPoint label="Accountant User" value={decision.recordedUser} />
        <DataPoint
          label="Decision Date and Time"
          value={dateTime.format(new Date(decision.recordedAt))}
        />
        <DataPoint label="Approval Stage" value="Accountant DV Review" />
        <DataPoint
          label="Recorded Remarks"
          value={decision.remarks || "No optional approval remarks recorded."}
        />
        <DataPoint
          label="Next Office at Decision"
          value={decision.nextHoldingOffice}
        />
        <DataPoint label="Current Workflow Stage" value={record.stage} />
        <DataPoint label="Current Holder" value={record.currentHolder} />
        <DataPoint
          label="Routing Instance"
          value={decision.routingInstanceId}
        />
      </dl>
      <section className="mt-5">
        <SectionHeader title="Related Approval History" />
        <ol className="mt-3 grid gap-2">
          {record.events.map((event) => (
            <li
              key={event.id}
              className="rounded-control border border-border p-3 text-sm"
            >
              <p className="font-medium">{event.action}</p>
              <p className="mt-1 text-xs text-text-muted">
                {event.office} · {dateTime.format(new Date(event.at))}
                {event.user ? ` · ${event.user}` : ""}
              </p>
              {event.remarks && (
                <p className="mt-2 text-text-muted">{event.remarks}</p>
              )}
            </li>
          ))}
        </ol>
      </section>
      <div className="mt-5 flex justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  )
}

function DvDetail({
  record,
  user,
  setRecords,
  onClose,
  onHistory,
  onPending,
  setNotifications,
}: {
  record: DvRecord
  user: MockUser
  setRecords: Dispatch<SetStateAction<DvRecord[]>>
  onClose: () => void
  onHistory: (tab?: AccountantHistoryTab, decisionId?: string) => void
  onPending: () => void
  setNotifications: Dispatch<SetStateAction<AccountantNotification[]>>
}) {
  const [tab, setTab] =
    useState<"information" | "payroll" | "documents" | "history" | "decision">(
      "information",
    )
  const [document, setDocument] = useState<SupportingDocument | null>(null)
  const [approveOpen, setApproveOpen] = useState(false)
  const [approvalRemarks, setApprovalRemarks] = useState("")
  const [returnOpen, setReturnOpen] = useState(false)
  const [returnStep, setReturnStep] = useState<"edit" | "confirm">("edit")
  const [returnRemarks, setReturnRemarks] = useState("")
  const [returnSection, setReturnSection] = useState("")
  const [returnError, setReturnError] = useState("")
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<{
    action: "Approved" | "Returned"
    decisionId: string
  } | null>(null)
  const [saveError, setSaveError] = useState("")
  const decisionLock = useRef(false)
  const pending = pendingForAccountant(record)
  const canApprove = approvalReady(record)
  const difference =
    record.amount === null
      ? null
      : record.amount - record.payrollSnapshot.netPay
  const checks = [
    ["Related payroll record exists", record.prerequisites.payrollExists],
    [
      "Required payroll approvals are recorded",
      record.prerequisites.payrollApprovalsComplete,
    ],
    [
      `Applicable ${record.budgetDocument.type} approval is recorded`,
      record.prerequisites.budgetApprovalsComplete &&
        record.budgetDocument.approved,
    ],
    ["Accounting checked the DV", Boolean(record.checkedAt)],
    ["DV amount matches the confirmed source total", difference === 0],
    [
      "Supporting documents are available",
      record.supportingDocuments.every((item) => item.available),
    ],
    ["Required DV amount is present", record.amount !== null],
    [
      "Current stage is Accountant Review",
      record.stage === "Awaiting Accountant Review" &&
        record.currentHolder === "Accountant",
    ],
  ] as const

  const approve = () => {
    if (saving || decisionLock.current) return
    const currentPending = pendingForAccountant(record)
    if (!currentPending || !approvalReady(record)) {
      setSaveError(
        "The decision could not be recorded. No workflow changes were made.",
      )
      return
    }
    decisionLock.current = true
    setSaving(true)
    const at = new Date().toISOString()
    const routing =
      record.activeRoutingInstance ?? `${record.id}-ACCOUNTANT-ROUTE`
    const decision: AccountantDecisionEvent = {
      id: `${record.id}-ACCOUNTANT-APPROVED-${Date.now()}`,
      dvId: record.id,
      payrollId: record.payrollId,
      routingInstanceId: routing,
      action: "Approved",
      responsibleRole: "Accountant",
      recordedUser: user.name,
      recordedAt: at,
      remarks: approvalRemarks.trim() || undefined,
      priorWorkflowStage: record.stage,
      nextWorkflowStage: "Awaiting Chancellor Review",
      nextHoldingOffice: "Office of the Chancellor",
    }
    setRecords((items) =>
      items.map((item) => {
        if (item.id !== record.id) return item
        if (
          !pendingForAccountant(item) ||
          !approvalReady(item) ||
          decisionsFor(item).some(
            (existing) => existing.routingInstanceId === routing,
          )
        )
          return item
        return {
          ...item,
          stage: "Awaiting Chancellor Review",
          currentHolder: "Office of the Chancellor",
          accountantDecisions: [...decisionsFor(item), decision],
          events: [
            ...item.events,
            {
              id: decision.id,
              at,
              office: "Accountant",
              user: user.name,
              action: "Accountant approved DV",
              remarks:
                approvalRemarks.trim() ||
                "No optional approval remarks recorded.",
            },
          ],
        }
      }),
    )
    setNotifications((items) =>
      items.map((item) =>
        item.relatedDvId === record.id ? { ...item, read: true } : item,
      ),
    )
    setSaving(false)
    setApproveOpen(false)
    setSuccess({ action: "Approved", decisionId: decision.id })
  }

  const reviewReturn = () => {
    if (!returnRemarks.trim() || returnRemarks.trim().length < 10) {
      setReturnError(
        "Please enter a reason for returning this Disbursement Voucher.",
      )
      return
    }
    setReturnError("")
    setReturnStep("confirm")
  }

  const confirmReturn = () => {
    if (saving || decisionLock.current || !returnRemarks.trim()) return
    if (!pendingForAccountant(record)) {
      setSaveError(
        "The decision could not be recorded. No workflow changes were made.",
      )
      return
    }
    decisionLock.current = true
    setSaving(true)
    const at = new Date().toISOString()
    const routing =
      record.activeRoutingInstance ?? `${record.id}-ACCOUNTANT-ROUTE`
    const remarks = returnRemarks.trim()
    const decision: AccountantDecisionEvent = {
      id: `${record.id}-ACCOUNTANT-RETURNED-${Date.now()}`,
      dvId: record.id,
      payrollId: record.payrollId,
      routingInstanceId: routing,
      action: "Returned",
      responsibleRole: "Accountant",
      recordedUser: user.name,
      recordedAt: at,
      remarks,
      priorWorkflowStage: record.stage,
      nextWorkflowStage: "Returned to Accounting",
      nextHoldingOffice: "Accounting Section",
    }
    setRecords((items) =>
      items.map((item) => {
        if (item.id !== record.id) return item
        if (
          !pendingForAccountant(item) ||
          decisionsFor(item).some(
            (existing) => existing.routingInstanceId === routing,
          )
        )
          return item
        return {
          ...item,
          stage: "Returned to Accounting",
          currentHolder: "Accounting Section",
          accountantDecisions: [...decisionsFor(item), decision],
          events: [
            ...item.events,
            {
              id: decision.id,
              at,
              office: "Accountant",
              user: user.name,
              action: "Accountant returned DV to Accounting",
              remarks,
            },
          ],
          returnInfo: {
            office: "Accountant",
            at,
            remarks,
            stage: "Accountant DV Review",
            issueSource:
              returnSection === "Payroll Summary"
                ? "Payroll source"
                : "Accounting DV review",
            recheckAuthorized: true,
          },
        }
      }),
    )
    setNotifications((items) =>
      items.map((item) =>
        item.relatedDvId === record.id ? { ...item, read: true } : item,
      ),
    )
    setSaving(false)
    setReturnOpen(false)
    setSuccess({ action: "Returned", decisionId: decision.id })
  }

  return (
    <>
      <Modal title="Disbursement Voucher Details" onClose={onClose} wide>
        <p className="-mt-3 text-sm text-text-muted">
          Review the voucher, related payroll, supporting documents, and
          approval information.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Tag kind="placeholder">Fictional Workflow Demonstration</Tag>
          <Tag kind={pending ? "simulated" : "placeholder"}>
            {pending ? "Active Accountant Review" : "Read-only Record"}
          </Tag>
        </div>
        {saveError && (
          <div className="mt-4">
            <Alert tone="danger" title="Decision not recorded">
              {saveError}
            </Alert>
          </div>
        )}
        <div
          role="tablist"
          aria-label="DV detail sections"
          className="mt-5 grid gap-1 rounded-control bg-canvas p-1 sm:grid-cols-2"
        >
          {([
            ["information", "DV Information"],
            ["payroll", "Payroll Summary"],
            ["documents", "Supporting Documents"],
            ["history", "Approval History"],
            ["decision", "Accountant Decision"],
          ] as const).map(([id, label]) => (
            <Button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              variant={tab === id ? "primary" : "secondary"}
              className={clsx(
                "border-0 shadow-none",
                tab !== id && "bg-transparent text-text-muted",
              )}
              onClick={() => setTab(id)}
            >
              {label}
            </Button>
          ))}
        </div>

        {tab === "information" && (
          <section className="mt-5">
            <dl className="grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
              <DataPoint label="DV Reference" value={record.id} />
              <DataPoint
                label="Related Payroll Reference"
                value={record.payrollId}
              />
              <DataPoint label="Payroll Type" value={record.payrollTypeName} />
              <DataPoint label="Payroll Period" value={record.period} />
              <DataPoint label="Fund Source" value={record.fund} />
              <DataPoint
                label="DV Amount"
                value={
                  record.amount === null
                    ? "Amount unavailable"
                    : peso.format(record.amount)
                }
                muted={record.amount === null}
              />
              <DataPoint
                label="Receiving / Current Office"
                value={record.currentHolder}
              />
              <DataPoint
                label="Date Forwarded by Accounting"
                value={
                  record.forwardedAt
                    ? dateTime.format(new Date(record.forwardedAt))
                    : "Not recorded"
                }
                muted={!record.forwardedAt}
              />
              <DataPoint
                label="Date Received"
                value={
                  record.forwardedAt
                    ? dateTime.format(new Date(record.forwardedAt))
                    : "Not recorded"
                }
                muted={!record.forwardedAt}
              />
              <DataPoint
                label="Prepared / Checked By"
                value={
                  [record.preparedBy, record.checkedBy]
                    .filter(Boolean)
                    .join(" / ") || "Not recorded"
                }
              />
              <DataPoint
                label="Accounting Check Information"
                value={
                  record.checkedAt
                    ? `Checked ${dateTime.format(new Date(record.checkedAt))}`
                    : "No checked event is recorded"
                }
              />
              <DataPoint label="Current Workflow Stage" value={record.stage} />
              <DataPoint
                label="Related Budget Document"
                value={record.budgetDocument.type}
              />
              <DataPoint
                label="Budget Document Reference"
                value={
                  record.budgetDocument.reference ?? "Reference unavailable"
                }
                muted={!record.budgetDocument.reference}
              />
            </dl>
            <Button
              type="button"
              variant="link"
              className="mt-4"
              onClick={() => setTab("payroll")}
            >
              View Related Payroll Summary
            </Button>
          </section>
        )}

        {tab === "payroll" && (
          <section className="mt-5">
            <SectionHeader
              title="Related Payroll Summary"
              description="Stored fictional approved-payroll snapshot; no computation occurs in this portal."
            />
            <dl className="mt-4 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
              <DataPoint label="Payroll Reference" value={record.payrollId} />
              <DataPoint label="Payroll Type" value={record.payrollTypeName} />
              <DataPoint label="Payroll Period" value={record.period} />
              <DataPoint label="Fund Source" value={record.fund} />
              <DataPoint
                label="Included Employees"
                value={String(record.payrollSnapshot.includedEmployeeCount)}
              />
              <DataPoint
                label="Total Basic Pay"
                value={peso.format(record.payrollSnapshot.basicPay)}
              />
              <DataPoint
                label="Total Other Earnings"
                value={peso.format(record.payrollSnapshot.otherEarnings)}
              />
              <DataPoint
                label="Total Gross Pay"
                value={peso.format(record.payrollSnapshot.grossPay)}
              />
              <DataPoint
                label="Total Deductions"
                value={peso.format(record.payrollSnapshot.deductions)}
              />
              <DataPoint
                label="Total Net Pay"
                value={peso.format(record.payrollSnapshot.netPay)}
              />
              <DataPoint
                label="Applicable Cost Centers"
                value={record.payrollSnapshot.costCenters.join(", ")}
              />
              <DataPoint
                label="Recorded Payroll Approval Information"
                value={record.payrollSnapshot.approvalInformation}
              />
            </dl>
            <div className="mt-4">
              <Alert tone="info" title="Employee rows unavailable">
                This isolated DV fixture retains only an aggregate payroll
                snapshot. Employee-level rows and breakdown controls are not
                shown because no associated row objects are stored.
              </Alert>
            </div>
          </section>
        )}

        {tab === "documents" && (
          <section className="mt-5">
            <SectionHeader
              title="Supporting Documents"
              description="Review the documents associated with this voucher and its completed prerequisite approvals."
            />
            <ul className="mt-4 grid gap-3">
              {record.supportingDocuments.map((item) => (
                <li
                  key={item.id}
                  className="grid gap-3 rounded-control border border-border p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div>
                    <p className="font-semibold">
                      {item.group} — {item.name}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      {item.reference ?? "Reference unavailable"} ·{" "}
                      {item.available ? "Available" : "Missing Information"}
                    </p>
                    {item.approvalInformation && (
                      <p className="mt-2 text-sm text-text-muted">
                        {item.approvalInformation}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!item.available}
                    onClick={() => setDocument(item)}
                  >
                    View Document
                  </Button>
                </li>
              ))}
            </ul>
            <dl className="mt-4 rounded-control bg-canvas p-4">
              <DataPoint
                label="Related Journal Entry Information"
                value={
                  record.journalConfigurationReference
                    ? `${record.journalConfigurationReference} · ${record.journalEntries.length} demonstration entries recorded`
                    : "Journal entry reference unavailable"
                }
                muted={!record.journalConfigurationReference}
              />
            </dl>
            <p className="mt-4 text-xs text-text-muted">
              Original paper documents remain the official records, where
              required by the documented university procedure.
            </p>
            {record.supportingDocuments.some((item) => !item.available) && (
              <div className="mt-4">
                <Alert tone="warning" title="Source document missing">
                  The selected supporting document is not available.
                </Alert>
              </div>
            )}
          </section>
        )}

        {tab === "history" && (
          <section className="mt-5">
            <SectionHeader
              title="Approval History"
              description="Recorded local workflow events for this voucher."
            />
            <ol className="mt-4 grid gap-3">
              {record.events.map((event) => (
                <li
                  key={event.id}
                  className="rounded-control border border-border p-4"
                >
                  <p className="font-semibold">{event.action}</p>
                  <p className="mt-1 text-xs text-text-muted">
                    {event.office} · {dateTime.format(new Date(event.at))}
                    {event.user ? ` · ${event.user}` : ""}
                  </p>
                  {event.remarks && (
                    <p className="mt-2 text-sm text-text-muted">
                      {event.remarks}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}

        {tab === "decision" && (
          <section className="mt-5">
            <SectionHeader
              title="Accountant Decision"
              description="Review the Disbursement Voucher and choose the appropriate action."
            />
            <div className="mt-5">
              <p className="font-semibold">Document Review Checklist</p>
              <p className="mt-1 text-xs text-text-muted">
                Proposed interface review aid only; this is not an official
                university certification checklist.
              </p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {checks.map(([label, available]) => (
                  <li
                    key={label}
                    className="flex items-start gap-3 rounded-control bg-canvas p-3 text-sm"
                  >
                    <span
                      className={clsx(
                        "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
                        available
                          ? "bg-success text-on-primary"
                          : "bg-danger-soft text-danger",
                      )}
                    >
                      <Icon name={available ? "check" : "alert"} size={12} />
                    </span>
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            </div>
            <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-3">
              <DataPoint
                label="Approved Payroll Total"
                value={peso.format(record.payrollSnapshot.netPay)}
              />
              <DataPoint
                label="DV Amount"
                value={
                  record.amount === null
                    ? "Unavailable"
                    : peso.format(record.amount)
                }
              />
              <DataPoint
                label="Difference"
                value={
                  difference === null ? "Unavailable" : peso.format(difference)
                }
              />
            </dl>
            {!canApprove && pending && (
              <div className="mt-4">
                <Alert tone="danger" title="Approval unavailable">
                  Required voucher or supporting information is unavailable.
                  Approval cannot be completed until the issue is addressed.
                </Alert>
              </div>
            )}
            {pending && record.chancellorRouteConfigured !== true && (
              <div className="mt-4">
                <Alert tone="danger" title="Approval route missing">
                  The next approval route to the Office of the Chancellor is not
                  configured.
                </Alert>
              </div>
            )}
            {!pending && (
              <div className="mt-4">
                <Alert tone="info" title="Read-only record">
                  This Disbursement Voucher has already been acted upon and is
                  available for viewing only. This voucher is not currently
                  assigned to the Accountant for review.
                </Alert>
              </div>
            )}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                disabled={!canApprove}
                onClick={() => setApproveOpen(true)}
              >
                Approve DV
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!pending}
                onClick={() => {
                  setReturnStep("edit")
                  setReturnOpen(true)
                }}
              >
                Return DV
              </Button>
            </div>
          </section>
        )}

        <div className="mt-6 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          {pending && tab !== "decision" ? (
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                disabled={!canApprove}
                onClick={() => setApproveOpen(true)}
              >
                Approve DV
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setReturnStep("edit")
                  setReturnOpen(true)
                }}
              >
                Return DV
              </Button>
            </div>
          ) : (
            <span />
          )}
          <Button type="button" variant="secondary" onClick={onClose}>
            Close Details
          </Button>
        </div>
      </Modal>

      {document && (
        <DocumentPreview
          document={document}
          onClose={() => setDocument(null)}
        />
      )}

      {approveOpen && (
        <Modal
          title="Approve Disbursement Voucher?"
          onClose={() => setApproveOpen(false)}
          wide
        >
          <p className="text-sm text-text-muted">
            You are about to approve this Disbursement Voucher. After
            confirmation, it will proceed to the Office of the Chancellor for
            the next required approval.
          </p>
          <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
            <DataPoint label="DV Reference" value={record.id} />
            <DataPoint label="Payroll Reference" value={record.payrollId} />
            <DataPoint label="Payroll Type" value={record.payrollTypeName} />
            <DataPoint label="Payroll Period" value={record.period} />
            <DataPoint label="Fund Source" value={record.fund} />
            <DataPoint
              label="DV Amount"
              value={
                record.amount === null
                  ? "Unavailable"
                  : peso.format(record.amount)
              }
            />
            <DataPoint label="Next Office" value="Office of the Chancellor" />
          </dl>
          <div className="mt-5">
            <MultilineField
              label="Remarks (Optional)"
              value={approvalRemarks}
              onChange={setApprovalRemarks}
              placeholder="Enter any additional review notes..."
            />
          </div>
          <div className="mt-5">
            <Alert tone="warning" title="Recorded action">
              This action will be recorded in the approval history. It does not
              constitute Chancellor approval or payroll release.
            </Alert>
          </div>
          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setApproveOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={approve}>
              {saving ? "Recording Approval..." : "Confirm Approval"}
            </Button>
          </div>
        </Modal>
      )}

      {returnOpen && (
        <Modal
          title={
            returnStep === "edit"
              ? "Return Disbursement Voucher"
              : "Confirm DV Return"
          }
          onClose={() => setReturnOpen(false)}
          wide
        >
          {returnStep === "edit" ? (
            <>
              <p className="text-sm text-text-muted">
                Provide the reason for returning this voucher to the Accounting
                Section.
              </p>
              <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
                <DataPoint label="DV Reference" value={record.id} />
                <DataPoint label="Payroll Reference" value={record.payrollId} />
                <DataPoint
                  label="Payroll Type"
                  value={record.payrollTypeName}
                />
                <DataPoint label="Payroll Period" value={record.period} />
                <DataPoint label="Fund Source" value={record.fund} />
                <DataPoint
                  label="DV Amount"
                  value={
                    record.amount === null
                      ? "Unavailable"
                      : peso.format(record.amount)
                  }
                />
                <DataPoint label="Returning Office" value="Accountant" />
                <DataPoint
                  label="Receiving Office"
                  value="Accounting Section"
                />
              </dl>
              <div className="mt-5 grid gap-4">
                <SelectField
                  label="Relevant Section (Optional)"
                  value={returnSection}
                  onChange={(event) => setReturnSection(event.target.value)}
                  placeholder="Select a section if useful"
                >
                  <option value="Related DV Information">
                    Related DV Information
                  </option>
                  <option value="Payroll Summary">Payroll Summary</option>
                  <option value="Supporting Document">
                    Supporting Document
                  </option>
                </SelectField>
                <MultilineField
                  key={`return-${record.id}`}
                  label="Reason for Return / Remarks"
                  value={returnRemarks}
                  onChange={(value) => {
                    setReturnRemarks(value)
                    setReturnError("")
                  }}
                  placeholder="Explain the issue that Accounting must review or correct..."
                  error={returnError}
                  required
                />
              </div>
              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
                This Disbursement Voucher will be returned to the Accounting
                Section with the remarks provided.
              </p>
              <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
                <DataPoint label="DV Reference" value={record.id} />
                <DataPoint label="Payroll Reference" value={record.payrollId} />
                <DataPoint label="Returning Office" value="Accountant" />
                <DataPoint
                  label="Receiving Office"
                  value="Accounting Section"
                />
                <DataPoint label="Entered Remarks" value={returnRemarks} />
              </dl>
              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setReturnStep("edit")}
                >
                  Back to Edit
                </Button>
                <Button type="button" disabled={saving} onClick={confirmReturn}>
                  {saving ? "Recording Return..." : "Confirm Return"}
                </Button>
              </div>
            </>
          )}
        </Modal>
      )}

      {success && (
        <Modal
          title={success.action === "Approved" ? "DV Approved" : "DV Returned"}
          onClose={() => setSuccess(null)}
        >
          <Alert tone="success" title="Decision recorded">
            {success.action === "Approved"
              ? "The Accountant approval has been recorded in this demonstration. The voucher is now awaiting the Office of the Chancellor's review."
              : "The return has been recorded in this demonstration. The voucher is now assigned to the Accounting Section for review."}
          </Alert>
          <p className="mt-4 text-xs text-text-muted">
            No actual electronic delivery to a university office occurred.
          </p>
          <div className="mt-5 flex flex-col gap-3">
            <Button
              type="button"
              onClick={() =>
                onHistory(
                  success.action === "Approved" ? "approved" : "returned",
                  success.decisionId,
                )
              }
            >
              View Decision History
            </Button>
            <Button type="button" variant="secondary" onClick={onPending}>
              Back to Pending DVs
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}

export function AccountantDvReview({
  records,
  setRecords,
  user,
  initialTab = "pending",
  initialDvId,
  onHistory,
  onPending,
  setNotifications,
}: ReviewProps) {
  const [tab, setTab] = useState<AccountantReviewTab>(initialTab)
  const [query, setQuery] = useState("")
  const [type, setType] = useState("")
  const [period, setPeriod] = useState("")
  const [fund, setFund] = useState("")
  const [forwarded, setForwarded] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(
    initialDvId ?? null,
  )
  const userDecisions = (record: DvRecord) =>
    decisionsFor(record).filter(
      (decision) => decision.recordedUser === user.name,
    )
  const tabRecords = records.filter((record) =>
    tab === "pending"
      ? pendingForAccountant(record)
      : tab === "reviewed"
        ? userDecisions(record).some(
            (decision) => decision.action === "Approved",
          )
        : userDecisions(record).some(
            (decision) => decision.action === "Returned",
          ),
  )
  const filtered = tabRecords.filter(
    (record) =>
      (!query.trim() ||
        [record.id, record.payrollId, record.payrollTypeName].some((value) =>
          value.toLowerCase().includes(query.trim().toLowerCase()),
        )) &&
      (!type || record.payrollTypeId === type) &&
      (!period || record.period === period) &&
      (!fund || record.fund === fund) &&
      (!forwarded || record.forwardedAt?.slice(0, 10) === forwarded),
  )
  const selected = records.find((record) => record.id === selectedId)
  const types = [
    ...new Map(
      tabRecords.map((record) => [
        record.payrollTypeId,
        record.payrollTypeName,
      ]),
    ).entries(),
  ]
  const periods = [...new Set(tabRecords.map((record) => record.period))]
  const clear = () => {
    setQuery("")
    setType("")
    setPeriod("")
    setFund("")
    setForwarded("")
  }
  return (
    <>
      <div className="grid gap-6">
        <PageHeader
          title="Disbursement Voucher Review"
          subtitle="Review Disbursement Vouchers forwarded by the Accounting Section and record your approval decision."
        />
        <Alert tone="info" title="Review eligibility">
          Only checked Disbursement Vouchers forwarded to the Accountant are
          eligible for review.
        </Alert>
        <div
          role="tablist"
          aria-label="Accountant DV review sections"
          className="grid gap-1 rounded-control bg-surface p-1 elevate sm:grid-cols-3"
        >
          {([
            ["pending", "Pending Review"],
            ["reviewed", "Reviewed"],
            ["returned", "Returned"],
          ] as const).map(([id, label]) => (
            <Button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              variant={tab === id ? "primary" : "secondary"}
              className={clsx(
                "border-0 shadow-none",
                tab !== id && "bg-transparent text-text-muted",
              )}
              onClick={() => {
                setTab(id)
                clear()
              }}
            >
              {label}
            </Button>
          ))}
        </div>
        <section className="overflow-hidden rounded-card bg-surface elevate">
          <div className="border-b border-border p-5">
            <SectionHeader
              title={
                tab === "pending"
                  ? "Disbursement Vouchers Pending Review"
                  : tab === "reviewed"
                    ? "Accountant-Approved Vouchers"
                    : "Vouchers Returned by Accountant"
              }
              description={
                tab === "pending"
                  ? `Review vouchers requiring your approval decision. ${tabRecords.length} voucher${
                      tabRecords.length === 1 ? "" : "s"
                    } pending review.`
                  : "Read-only decisions recorded by the current Accountant user."
              }
            />
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <TextField
                label="Search Disbursement Vouchers"
                icon="search"
                placeholder="Search by DV reference, payroll reference, or payroll type..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <SelectField
                label="Payroll Type"
                value={type}
                onChange={(event) => setType(event.target.value)}
                placeholder="All represented payroll types"
              >
                {types.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
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
                label="Fund Source"
                value={fund}
                onChange={(event) => setFund(event.target.value)}
                placeholder="All Funds"
              >
                <option value="F01">F01</option>
                <option value="F05">F05</option>
                <option value="F07">F07</option>
              </SelectField>
              <TextField
                label="Date Forwarded"
                type="date"
                value={forwarded}
                onChange={(event) => setForwarded(event.target.value)}
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
              {filtered.map((record) => (
                <li
                  key={record.id}
                  className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-5"
                >
                  <DataPoint
                    label="DV / Related Payroll"
                    value={`${record.id} · ${record.payrollId}`}
                  />
                  <DataPoint
                    label="Payroll Type / Period"
                    value={`${record.payrollTypeName} · ${record.period}`}
                  />
                  <DataPoint
                    label="Fund / DV Amount"
                    value={`${record.fund} · ${
                      record.amount === null
                        ? "Unavailable"
                        : peso.format(record.amount)
                    }`}
                  />
                  <DataPoint
                    label="Date Received / Current Stage"
                    value={`${
                      record.forwardedAt
                        ? dateTime.format(new Date(record.forwardedAt))
                        : "Not recorded"
                    } · ${record.stage}`}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setSelectedId(record.id)}
                  >
                    {tab === "pending" ? "Review DV" : "View Details"}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-8 text-center">
              <p className="font-semibold">
                {tabRecords.length
                  ? "No Disbursement Vouchers match your search or filters."
                  : tab === "pending"
                    ? "No Disbursement Vouchers are currently awaiting Accountant review."
                    : tab === "reviewed"
                      ? "No Disbursement Vouchers have been approved by this Accountant yet."
                      : "No Disbursement Vouchers have been returned by this Accountant yet."}
              </p>
            </div>
          )}
        </section>
        <Alert tone="warning" title="Frontend role restriction">
          This portal demonstrates role-based controls only. Production
          authorization and durable approval routing require backend
          enforcement.
        </Alert>
        {initialDvId && !selected && (
          <Alert tone="danger" title="Disbursement Voucher not found">
            Disbursement Voucher not found.
          </Alert>
        )}
      </div>
      {selected && (
        <DvDetail
          record={selected}
          user={user}
          setRecords={setRecords}
          onClose={() => setSelectedId(null)}
          onHistory={onHistory}
          onPending={onPending}
          setNotifications={setNotifications}
        />
      )}
    </>
  )
}

export function AccountantDecisionHistory({
  records,
  user,
  initialTab = "all",
  initialDecisionId,
}: {
  records: DvRecord[]
  user: MockUser
  initialTab?: AccountantHistoryTab
  initialDecisionId?: string | null
}) {
  const [tab, setTab] = useState<AccountantHistoryTab>(initialTab)
  const [query, setQuery] = useState("")
  const [type, setType] = useState("")
  const [fund, setFund] = useState("")
  const [decisionDate, setDecisionDate] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(
    initialDecisionId ?? null,
  )
  const [detailDvId, setDetailDvId] = useState<string | null>(null)
  const decisions = records.flatMap((record) =>
    decisionsFor(record)
      .filter((decision) => decision.recordedUser === user.name)
      .map((decision) => ({ record, decision })),
  )
  const filtered = decisions
    .filter(({ record, decision }) => {
      const inTab =
        tab === "all" ||
        (tab === "approved" && decision.action === "Approved") ||
        (tab === "returned" && decision.action === "Returned")
      return (
        inTab &&
        (!query.trim() ||
          [record.id, record.payrollId].some((value) =>
            value.toLowerCase().includes(query.trim().toLowerCase()),
          )) &&
        (!type || record.payrollTypeId === type) &&
        (!fund || record.fund === fund) &&
        (!decisionDate || decision.recordedAt.slice(0, 10) === decisionDate)
      )
    })
    .sort((a, b) => b.decision.recordedAt.localeCompare(a.decision.recordedAt))
  const selected = decisions.find(({ decision }) => decision.id === selectedId)
  const detailRecord = records.find((record) => record.id === detailDvId)
  const types = [
    ...new Map(
      decisions.map(({ record }) => [
        record.payrollTypeId,
        record.payrollTypeName,
      ]),
    ).entries(),
  ]
  const clear = () => {
    setQuery("")
    setType("")
    setFund("")
    setDecisionDate("")
  }
  const hasFilters = Boolean(query || type || fund || decisionDate)
  return (
    <>
      <div className="grid gap-6">
        <PageHeader
          title="Decision History"
          subtitle="View Disbursement Vouchers previously approved or returned by the Accountant."
        />
        <div
          role="tablist"
          aria-label="Accountant decision history filters"
          className="grid gap-1 rounded-control bg-surface p-1 elevate sm:grid-cols-3"
        >
          {([
            ["all", "All Decisions"],
            ["approved", "Approved"],
            ["returned", "Returned"],
          ] as const).map(([id, label]) => (
            <Button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              variant={tab === id ? "primary" : "secondary"}
              className={clsx(
                "border-0 shadow-none",
                tab !== id && "bg-transparent text-text-muted",
              )}
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
                placeholder="Search DV reference or payroll reference..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <SelectField
                label="Payroll Type"
                value={type}
                onChange={(event) => setType(event.target.value)}
                placeholder="All represented types"
              >
                {types.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Fund"
                value={fund}
                onChange={(event) => setFund(event.target.value)}
                placeholder="All Funds"
              >
                <option value="F01">F01</option>
                <option value="F05">F05</option>
                <option value="F07">F07</option>
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
              {filtered.map(({ record, decision }) => (
                <li
                  key={decision.id}
                  className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-5"
                >
                  <DataPoint
                    label="DV / Payroll Reference"
                    value={`${record.id} · ${record.payrollId}`}
                  />
                  <DataPoint
                    label="Payroll Type / Period"
                    value={`${record.payrollTypeName} · ${record.period}`}
                  />
                  <DataPoint
                    label="Fund / Amount"
                    value={`${record.fund} · ${
                      record.amount === null
                        ? "Unavailable"
                        : peso.format(record.amount)
                    }`}
                  />
                  <div>
                    <DataPoint
                      label="Decision / Date"
                      value={`${decision.action} · ${dateTime.format(new Date(decision.recordedAt))}`}
                    />
                    <p className="mt-1 text-xs text-text-muted">
                      Current: {record.stage} · {record.currentHolder}
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-2">
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => setDetailDvId(record.id)}
                    >
                      View Details
                    </Button>
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => setSelectedId(decision.id)}
                    >
                      View Decision
                    </Button>
                    {decision.action === "Returned" && (
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
            <div className="p-8 text-center">
              <p className="font-semibold">
                {hasFilters
                  ? "No Disbursement Vouchers match your search or filters."
                  : tab === "approved"
                    ? "No Disbursement Vouchers have been approved by this Accountant yet."
                    : tab === "returned"
                      ? "No Disbursement Vouchers have been returned by this Accountant yet."
                      : "No Accountant decisions have been recorded yet."}
              </p>
            </div>
          )}
        </section>
        <Alert tone="info" title="Read-only decision history">
          Decisions cannot be edited, deleted, overridden, or relabeled as
          Chancellor approval from this portal.
        </Alert>
      </div>
      {selected && (
        <DecisionDetails
          record={selected.record}
          decision={selected.decision}
          onClose={() => setSelectedId(null)}
        />
      )}
      {detailRecord && (
        <Modal
          title="Disbursement Voucher Details"
          onClose={() => setDetailDvId(null)}
          wide
        >
          <div className="flex flex-wrap gap-2">
            <Tag kind="placeholder">Read-only Accountant history</Tag>
            <Tag kind="placeholder">{detailRecord.fixtureLabel}</Tag>
          </div>
          <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
            <DataPoint label="DV Reference" value={detailRecord.id} />
            <DataPoint
              label="Payroll Reference"
              value={detailRecord.payrollId}
            />
            <DataPoint
              label="Payroll Type / Period"
              value={`${detailRecord.payrollTypeName} · ${detailRecord.period}`}
            />
            <DataPoint
              label="Fund / Amount"
              value={`${detailRecord.fund} · ${
                detailRecord.amount === null
                  ? "Unavailable"
                  : peso.format(detailRecord.amount)
              }`}
            />
            <DataPoint
              label="Current Stage / Holder"
              value={`${detailRecord.stage} · ${detailRecord.currentHolder}`}
            />
            <DataPoint
              label="Budget Document"
              value={`${detailRecord.budgetDocument.type} · ${detailRecord.budgetDocument.reference ?? "Reference unavailable"}`}
            />
            <DataPoint
              label="Payroll Net Total"
              value={peso.format(detailRecord.payrollSnapshot.netPay)}
            />
            <DataPoint
              label="Included Employees / Cost Centers"
              value={`${detailRecord.payrollSnapshot.includedEmployeeCount} · ${detailRecord.payrollSnapshot.costCenters.join(", ")}`}
            />
            <DataPoint
              label="Supporting Documents"
              value={`${detailRecord.supportingDocuments.filter((item) => item.available).length} of ${detailRecord.supportingDocuments.length} available`}
            />
            <DataPoint
              label="Recorded Workflow Events"
              value={String(detailRecord.events.length)}
            />
          </dl>
          <section className="mt-5">
            <SectionHeader title="Recorded Approval History" />
            <ol className="mt-3 grid gap-2">
              {detailRecord.events.map((event) => (
                <li
                  key={event.id}
                  className="rounded-control border border-border p-3 text-sm"
                >
                  <p className="font-medium">{event.action}</p>
                  <p className="mt-1 text-xs text-text-muted">
                    {event.office} · {dateTime.format(new Date(event.at))}
                  </p>
                  {event.remarks && (
                    <p className="mt-2 text-text-muted">{event.remarks}</p>
                  )}
                </li>
              ))}
            </ol>
          </section>
          <div className="mt-5 flex justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDetailDvId(null)}
            >
              Close
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}

export function AccountantNotifications({
  notifications,
  setNotifications,
  onViewDv,
}: {
  notifications: AccountantNotification[]
  setNotifications: Dispatch<SetStateAction<AccountantNotification[]>>
  onViewDv: (dvId: string) => void
}) {
  const [unreadOnly, setUnreadOnly] = useState(false)
  const visible = notifications
    .filter((item) => !unreadOnly || !item.read)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const markRead = (id: string) =>
    setNotifications((items) =>
      items.map((item) => (item.id === id ? { ...item, read: true } : item)),
    )
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Notifications"
        subtitle="Updates about Disbursement Vouchers requiring your attention."
      />
      <section className="overflow-hidden rounded-card bg-surface elevate">
        <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
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
              Filter Unread
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
            {visible.map((item) => (
              <li key={item.id} className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{item.title}</p>
                      {!item.read && <Tag kind="simulated">Unread</Tag>}
                    </div>
                    <p className="mt-2 text-sm">{item.description}</p>
                    <p className="mt-2 text-xs text-text-muted">
                      {item.relatedDvId} · {item.relatedPayrollId} ·{" "}
                      {dateTime.format(new Date(item.createdAt))}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!item.read && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => markRead(item.id)}
                      >
                        Mark as Read
                      </Button>
                    )}
                    <Button
                      type="button"
                      onClick={() => {
                        markRead(item.id)
                        onViewDv(item.relatedDvId)
                      }}
                    >
                      View DV
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-8 text-center font-semibold">
            No new Accountant notifications.
          </p>
        )}
      </section>
    </div>
  )
}

function SummaryCard({
  title,
  count,
  description,
  action,
  onAction,
}: {
  title: string
  count: number
  description: string
  action: string
  onAction: () => void
}) {
  return (
    <section className="rounded-card bg-surface p-5 elevate">
      <p className="text-sm font-semibold text-text-muted">{title}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{count}</p>
      <p className="mt-2 min-h-10 text-sm text-text-muted">{description}</p>
      <Button type="button" variant="link" className="mt-3" onClick={onAction}>
        {action}
      </Button>
    </section>
  )
}

export function AccountantDashboard({
  records,
  user,
  onReview,
  onHistory,
  onNotifications,
}: {
  records: DvRecord[]
  user: MockUser
  onReview: (dvId?: string) => void
  onHistory: (tab?: AccountantHistoryTab, decisionId?: string) => void
  onNotifications: () => void
}) {
  const pending = records.filter(pendingForAccountant)
  const decisions = records
    .flatMap((record) =>
      decisionsFor(record)
        .filter((decision) => decision.recordedUser === user.name)
        .map((decision) => ({ record, decision })),
    )
    .sort((a, b) => b.decision.recordedAt.localeCompare(a.decision.recordedAt))
  const approved = decisions.filter(
    ({ decision }) => decision.action === "Approved",
  )
  const returned = decisions.filter(
    ({ decision }) => decision.action === "Returned",
  )
  return (
    <div className="grid gap-6">
      <div>
        <PageHeader
          title="Accountant Dashboard"
          subtitle="Monitor Disbursement Vouchers awaiting review and your recent approval decisions."
        />
        <p className="mt-5 text-lg font-semibold">Welcome back, {user.name}</p>
      </div>
      <Alert tone="info" title="Accountant responsibility">
        This portal supports DV review decisions only. It does not create or
        compute payroll, prepare budget documents, approve as Chancellor, or
        release payments.
      </Alert>
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          title="Pending DV Reviews"
          count={pending.length}
          description="Disbursement Vouchers requiring your decision."
          action="Review Pending DVs"
          onAction={() => onReview()}
        />
        <SummaryCard
          title="Approved by You"
          count={approved.length}
          description="Vouchers you have approved. Chancellor review remains separate."
          action="View Approvals"
          onAction={() => onHistory("approved")}
        />
        <SummaryCard
          title="Returned by You"
          count={returned.length}
          description="Vouchers returned to Accounting for correction."
          action="View Returns"
          onAction={() => onHistory("returned")}
        />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-card bg-surface p-5 elevate">
          <SectionHeader
            title="Disbursement Vouchers Requiring Review"
            description="Vouchers currently awaiting your approval decision."
            action="View All"
            onAction={() => onReview()}
          />
          {pending.length ? (
            <ul className="mt-5 divide-y divide-border rounded-control border border-border">
              {pending.slice(0, 5).map((record) => (
                <li
                  key={record.id}
                  className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div>
                    <p className="font-semibold">{record.id}</p>
                    <p className="mt-1 text-sm">
                      {record.payrollId} · {record.payrollTypeName}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      {record.period} · {record.fund} ·{" "}
                      {record.amount === null
                        ? "Amount unavailable"
                        : peso.format(record.amount)}
                      {record.forwardedAt
                        ? ` · Received ${dateTime.format(new Date(record.forwardedAt))}`
                        : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => onReview(record.id)}
                  >
                    Review DV
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 rounded-control bg-canvas p-6 text-center font-semibold">
              No Disbursement Vouchers currently require your review.
            </p>
          )}
        </section>
        <section className="rounded-card bg-surface p-5 elevate">
          <SectionHeader
            title="Recent Decisions"
            description="Your recently recorded Disbursement Voucher approvals and returns."
            action="View Decision History"
            onAction={() => onHistory()}
          />
          {decisions.length ? (
            <ul className="mt-5 divide-y divide-border rounded-control border border-border">
              {decisions.slice(0, 5).map(({ record, decision }) => (
                <li
                  key={decision.id}
                  className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{record.id}</p>
                      <DecisionStatus decision={decision} />
                    </div>
                    <p className="mt-1 text-sm">{record.payrollId}</p>
                    <p className="mt-1 text-xs text-text-muted">
                      {dateTime.format(new Date(decision.recordedAt))}
                      {decision.action === "Returned" && decision.remarks
                        ? ` · ${decision.remarks.slice(0, 80)}`
                        : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    onClick={() =>
                      onHistory(
                        decision.action === "Approved"
                          ? "approved"
                          : "returned",
                        decision.id,
                      )
                    }
                  >
                    View Details
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 rounded-control bg-canvas p-6 text-center font-semibold">
              No Accountant decisions have been recorded yet.
            </p>
          )}
        </section>
      </div>
      <section className="rounded-card bg-surface p-5 elevate">
        <SectionHeader
          title="Quick Actions"
          description="Open the Accountant tools used for DV review."
        />
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button type="button" onClick={() => onReview()}>
            Review Pending DVs
          </Button>
          <Button type="button" variant="secondary" onClick={() => onHistory()}>
            View Decision History
          </Button>
          <Button type="button" variant="secondary" onClick={onNotifications}>
            Notifications
          </Button>
        </div>
      </section>
    </div>
  )
}

export function AccountantMyAccount({
  user,
  onDashboard,
}: {
  user: MockUser
  onDashboard: () => void
}) {
  const profile = profileFor(user, "Accountant")
  return (
    <div className="grid gap-6">
      <PageHeader
        title="My Account"
        subtitle="View your account information and manage your account settings."
      />
      <div>
        <Button type="button" variant="secondary" onClick={onDashboard}>
          Back to Dashboard
        </Button>
      </div>
      <section className="rounded-card bg-surface p-5 elevate sm:p-6">
        <SectionHeader
          title="Account Information"
          description="Current fictional Accountant account and read-only access assignment."
        />
        <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2 lg:grid-cols-3">
          <DataPoint label="Full Name" value={profile.name} />
          <DataPoint label="Username" value={profile.username} />
          <DataPoint label="Role" value="Accountant" />
          <DataPoint label="Employee ID" value={profile.employeeId} />
          <DataPoint label="Email" value={profile.email} />
          <DataPoint label="Account Status" value="Active" />
        </dl>
      </section>
      <MyAccount profile={profile} />
      <Alert tone="info" title="Prototype account security">
        Role and approval-route permissions are read-only. Password changes use
        the existing local demonstration behavior and are not persisted by a
        production authentication backend.
      </Alert>
    </div>
  )
}

export function AccountantHeaderBell({
  notifications,
  onOpen,
}: {
  notifications: AccountantNotification[]
  onOpen: () => void
}) {
  const unread = notifications.filter((item) => !item.read).length
  return (
    <Button
      type="button"
      variant="link"
      onClick={onOpen}
      aria-label={`${unread} unread Accountant notification${
        unread === 1 ? "" : "s"
      }`}
      className="relative size-10 p-0 no-underline text-text-muted hover:bg-info-soft hover:text-text"
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
