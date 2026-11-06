import clsx from "clsx"
import {
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react"
import { MyAccount, profileFor } from "../../account/MyAccount"
import { Alert, Button, Icon, TextField } from "../../MsuPayroll"
import { Modal, SelectField, Tag } from "../../admin/ui"
import type { MockUser } from "../../auth/mockData"
import {
  applyCostCenterDecision,
  demoCostCenterAlpha,
  type CostCenterApprovalRequest,
  type CostCenterDecision,
  type CostCenterDecisionKind,
  type CostCenterDocumentType,
  type CostCenterEmployeePay,
  type CostCenterNotification,
  type CostCenterSupportingDocument,
} from "./costCenterData"

export type CostCenterPendingTab = "all" | "payroll" | "budget"
export type CostCenterHistoryTab = "all" | "approved" | "returned"
type ReviewSection =
  | "summary"
  | "employees"
  | "documents"
  | "progress"
  | "decision"

type SharedProps = {
  requests: CostCenterApprovalRequest[]
  setRequests: Dispatch<SetStateAction<CostCenterApprovalRequest[]>>
  history: CostCenterDecision[]
  setHistory: Dispatch<SetStateAction<CostCenterDecision[]>>
  notifications: CostCenterNotification[]
  setNotifications: Dispatch<SetStateAction<CostCenterNotification[]>>
  user: MockUser
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

function SectionTitle({
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

function DemoNotice() {
  return (
    <Alert tone="info" title="Demo Data">
      Cost Centers, documents, employees, amounts, and decisions shown here are
      fictional and intended for prototype testing.
    </Alert>
  )
}

function AssignmentNotice() {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-control bg-surface p-4 elevate">
      <Tag kind="placeholder">Fictional Assignment</Tag>
      <p className="text-sm font-semibold">
        Assigned Cost Center: {demoCostCenterAlpha.name}
      </p>
      <p className="text-xs text-text-muted">({demoCostCenterAlpha.id})</p>
    </div>
  )
}

function StatusTag({ request }: { request: CostCenterApprovalRequest }) {
  const label =
    request.state === "Pending"
      ? request.documentType === "Payroll"
        ? "Payroll Approval Pending"
        : `${request.documentType} Approval Pending`
      : request.state
  return (
    <Tag kind={request.state === "Approved" ? "simulated" : "placeholder"}>
      {label}
    </Tag>
  )
}

function MultilineField({
  label,
  value,
  placeholder,
  onChange,
  required,
  error,
}: {
  label: string
  value: string
  placeholder: string
  onChange: (value: string) => void
  required?: boolean
  error?: string
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">
        {label}
        {required ? " *" : ""}
      </p>
      <div
        role="textbox"
        aria-label={label}
        aria-multiline="true"
        aria-required={required || undefined}
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
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  )
}

function isAuthorized(request: CostCenterApprovalRequest, user: MockUser) {
  return (
    user.roles.includes("Cost Center Signatory") &&
    user.accountId === request.assignedSignatoryAccountId &&
    request.costCenterId === demoCostCenterAlpha.id
  )
}

function pendingFor(request: CostCenterApprovalRequest, user: MockUser) {
  return isAuthorized(request, user) && request.state === "Pending"
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

export function CostCenterDashboard({
  requests,
  history,
  user,
  onPending,
  onReview,
  onHistory,
}: {
  requests: CostCenterApprovalRequest[]
  history: CostCenterDecision[]
  user: MockUser
  onPending: (tab?: CostCenterPendingTab) => void
  onReview: (id: string) => void
  onHistory: (tab?: CostCenterHistoryTab, decisionId?: string) => void
}) {
  const pending = requests.filter((request) => pendingFor(request, user))
  const payroll = pending.filter((request) => request.documentType === "Payroll")
  const budget = pending.filter((request) => request.documentType !== "Payroll")
  const mine = history
    .filter((decision) => decision.actorAccountId === user.accountId)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Cost Center Signatories Dashboard"
        subtitle="Monitor payroll and budget documents requiring your Cost Center's approval."
      />
      <DemoNotice />
      <AssignmentNotice />
      <p className="text-lg font-semibold">Welcome back, {user.name}</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Pending Payroll Approvals"
          count={payroll.length}
          action="Review Payrolls"
          onAction={() => onPending("payroll")}
        />
        <SummaryCard
          title="Pending ORAS/BURAS Approvals"
          count={budget.length}
          action="Review Budget Documents"
          onAction={() => onPending("budget")}
        />
        <SummaryCard
          title="Approved by You"
          count={mine.filter((item) => item.action === "Approved").length}
          action="View Approvals"
          onAction={() => onHistory("approved")}
        />
        <SummaryCard
          title="Returned by You"
          count={mine.filter((item) => item.action === "Returned").length}
          action="View Returns"
          onAction={() => onHistory("returned")}
        />
      </div>
      <section className="rounded-card bg-surface p-5 elevate">
        <SectionTitle
          title="Documents Awaiting Your Decision"
          action="View All"
          onAction={() => onPending("all")}
        />
        {pending.length ? (
          <ul className="mt-5 divide-y divide-border rounded-control border border-border">
            {pending.slice(0, 5).map((request) => (
              <li
                key={request.id}
                className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4"
              >
                <DataPoint
                  label="Document"
                  value={`${request.documentReference} · ${request.documentType}`}
                />
                <DataPoint
                  label="Related Payroll / Period"
                  value={`${request.relatedPayroll} · ${request.payrollPeriod}`}
                />
                <DataPoint
                  label="Fund / Relevant Amount"
                  value={`${request.fund} · ${peso.format(request.amount)}`}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onReview(request.id)}
                >
                  Review Document
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 rounded-control bg-canvas p-6 text-center font-semibold">
            No documents currently require your approval.
          </p>
        )}
      </section>
      <section className="rounded-card bg-surface p-5 elevate">
        <SectionTitle title="Recent Decisions" />
        {mine.length ? (
          <ul className="mt-5 divide-y divide-border rounded-control border border-border">
            {mine.slice(0, 5).map((decision) => (
              <li
                key={decision.id}
                className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4"
              >
                <DataPoint
                  label="Document / Decision"
                  value={`${decision.documentReference} · ${decision.action}`}
                />
                <DataPoint
                  label="Recorded"
                  value={dateTime.format(new Date(decision.recordedAt))}
                />
                <DataPoint
                  label="Remarks Preview"
                  value={decision.remarks ?? "No remarks recorded"}
                />
                <Button
                  type="button"
                  variant="link"
                  onClick={() =>
                    onHistory(
                      decision.action === "Approved" ? "approved" : "returned",
                      decision.id,
                    )
                  }
                >
                  View Decision
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 text-sm text-text-muted">
            No approval decisions have been recorded yet.
          </p>
        )}
      </section>
      <Alert tone="warning" title="Frontend authorization prototype">
        Production Cost Center authorization and durable workflow routing
        require secure backend enforcement.
      </Alert>
    </div>
  )
}

export function CostCenterPending({
  requests,
  user,
  initialTab,
  onReview,
}: {
  requests: CostCenterApprovalRequest[]
  user: MockUser
  initialTab: CostCenterPendingTab
  onReview: (id: string) => void
}) {
  const [tab, setTab] = useState(initialTab)
  const [query, setQuery] = useState("")
  const [documentType, setDocumentType] = useState("")
  const [payrollType, setPayrollType] = useState("")
  const [period, setPeriod] = useState("")
  const [fund, setFund] = useState("")
  const [page, setPage] = useState(1)
  const all = requests.filter((request) => pendingFor(request, user))
  const tabbed = all.filter(
    (request) =>
      tab === "all" ||
      (tab === "payroll" && request.documentType === "Payroll") ||
      (tab === "budget" && request.documentType !== "Payroll"),
  )
  const filtered = tabbed.filter((request) => {
    const q = query.trim().toLowerCase()
    return (
      (!q ||
        [
          request.documentReference,
          request.relatedPayroll,
          request.documentType,
          request.payrollType,
        ].some((value) => value.toLowerCase().includes(q))) &&
      (!documentType || request.documentType === documentType) &&
      (!payrollType || request.payrollType === payrollType) &&
      (!period || request.payrollPeriod === period) &&
      (!fund || request.fund === fund)
    )
  })
  const pageSize = 5
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize)
  const clear = () => {
    setQuery("")
    setDocumentType("")
    setPayrollType("")
    setPeriod("")
    setFund("")
    setPage(1)
  }
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Pending Approvals"
        subtitle="Review payroll and budget documents awaiting a decision from your assigned Cost Center."
      />
      <DemoNotice />
      <AssignmentNotice />
      <div
        role="tablist"
        aria-label="Pending approval types"
        className="grid gap-1 rounded-control bg-surface p-1 elevate sm:grid-cols-3"
      >
        {([
          ["all", "All Pending"],
          ["payroll", "Payroll Approvals"],
          ["budget", "ORAS/BURAS Approvals"],
        ] as const).map(([id, label]) => (
          <Button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            variant={tab === id ? "primary" : "secondary"}
            onClick={() => {
              setTab(id)
              setPage(1)
            }}
          >
            {label}
          </Button>
        ))}
      </div>
      <section className="overflow-hidden rounded-card bg-surface elevate">
        <div className="grid gap-4 border-b border-border p-5 sm:grid-cols-2 xl:grid-cols-3">
          <TextField
            label="Search Approvals"
            icon="search"
            placeholder="Search payroll or document reference..."
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
          />
          <SelectField
            label="Document Type"
            value={documentType}
            onChange={(event) => setDocumentType(event.target.value)}
            placeholder="All Documents"
          >
            <option value="Payroll">Payroll</option>
            <option value="ORAS">ORAS</option>
            <option value="BURAS">BURAS</option>
          </SelectField>
          <SelectField
            label="Payroll Type"
            value={payrollType}
            onChange={(event) => setPayrollType(event.target.value)}
            placeholder="All represented types"
          >
            {[...new Set(all.map((item) => item.payrollType))].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Payroll Period"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            placeholder="All represented periods"
          >
            {[...new Set(all.map((item) => item.payrollPeriod))].map((value) => (
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
          <div className="flex items-end">
            <Button type="button" variant="secondary" onClick={clear}>
              Clear Filters
            </Button>
          </div>
        </div>
        {visible.length ? (
          <ul className="max-h-screen divide-y divide-border overflow-y-auto">
            {visible.map((request) => (
              <li
                key={request.id}
                className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3"
              >
                <DataPoint
                  label="Document Reference / Type"
                  value={`${request.documentReference} · ${request.documentType}`}
                />
                <DataPoint
                  label="Related Payroll"
                  value={request.relatedPayroll}
                />
                <DataPoint
                  label="Payroll Type / Period"
                  value={`${request.payrollType} · ${request.payrollPeriod}`}
                />
                <DataPoint
                  label="Fund / Cost Center"
                  value={`${request.fund} · ${request.costCenterName}`}
                />
                <DataPoint
                  label="Amount / Date Received"
                  value={`${peso.format(request.amount)} · ${dateTime.format(
                    new Date(request.receivedAt),
                  )}`}
                />
                <div>
                  <p className="mb-2 text-xs font-medium text-text-muted">
                    Status / Action
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusTag request={request} />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => onReview(request.id)}
                    >
                      Review Document
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-8 text-center">
            <p className="font-semibold">
              {all.length
                ? "No documents match your search or filters."
                : "No documents currently require your approval."}
            </p>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-border p-4">
          <Button
            type="button"
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            Previous
          </Button>
          <p className="text-sm text-text-muted">
            Page {page} of {pages}
          </p>
          <Button
            type="button"
            variant="secondary"
            disabled={page >= pages}
            onClick={() => setPage((value) => Math.min(pages, value + 1))}
          >
            Next
          </Button>
        </div>
      </section>
    </div>
  )
}

function DocumentPreview({
  document,
  request,
  onClose,
}: {
  document: CostCenterSupportingDocument
  request: CostCenterApprovalRequest
  onClose: () => void
}) {
  return (
    <Modal title="Supporting Document" onClose={onClose}>
      <Tag kind="placeholder">Fictional document metadata</Tag>
      <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4">
        <DataPoint label="Document Name" value={document.name} />
        <DataPoint label="Document Type" value={document.type} />
        <DataPoint label="Document Reference" value={document.reference} />
        <DataPoint
          label="Related Approval Request"
          value={request.documentReference}
        />
        <DataPoint
          label="Availability"
          value={document.available ? "Metadata available" : "Unavailable"}
        />
      </dl>
      <div className="mt-4">
        <Alert tone="warning" title="Preview unavailable">
          Fictional demonstration document. An original file preview is not
          available.
        </Alert>
      </div>
      <div className="mt-5 flex justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>
          Close Preview
        </Button>
      </div>
    </Modal>
  )
}

function PayBreakdown({
  employee,
  onClose,
}: {
  employee: CostCenterEmployeePay
  onClose: () => void
}) {
  return (
    <Modal title="Read-only Pay Breakdown" onClose={onClose}>
      <dl className="grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
        <DataPoint
          label="Employee"
          value={`${employee.name} (${employee.employeeId})`}
        />
        <DataPoint label="Pay Basis" value={employee.payBasis} />
        <DataPoint
          label="Basic Pay"
          value={
            employee.basicPay === null
              ? "Not available"
              : peso.format(employee.basicPay)
          }
        />
        <DataPoint
          label="Other Earnings"
          value={
            employee.otherEarnings === null
              ? "Not available"
              : peso.format(employee.otherEarnings)
          }
        />
        <DataPoint label="Gross Pay" value={peso.format(employee.grossPay)} />
        <DataPoint
          label="Deductions"
          value={peso.format(employee.deductions)}
        />
        <DataPoint label="Net Pay" value={peso.format(employee.netPay)} />
      </dl>
      {!employee.breakdownAvailable && (
        <div className="mt-4">
          <Alert tone="info" title="Breakdown unavailable">
            Detailed computation information is not available for this record.
          </Alert>
        </div>
      )}
      <div className="mt-5 flex justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  )
}

export function CostCenterReview({
  selectedId,
  onBrowse,
  onHistory,
  ...props
}: SharedProps & {
  selectedId: string | null
  onBrowse: () => void
  onHistory: (tab?: CostCenterHistoryTab, decisionId?: string) => void
}) {
  const {
    requests,
    setRequests,
    history,
    setHistory,
    notifications,
    setNotifications,
    user,
  } = props
  const request = requests.find((item) => item.id === selectedId)
  const [section, setSection] = useState<ReviewSection>("summary")
  const [document, setDocument] =
    useState<CostCenterSupportingDocument | null>(null)
  const [employee, setEmployee] = useState<CostCenterEmployeePay | null>(null)
  const [approveOpen, setApproveOpen] = useState(false)
  const [approvalRemarks, setApprovalRemarks] = useState("")
  const [returnOpen, setReturnOpen] = useState(false)
  const [returnStep, setReturnStep] = useState<"edit" | "confirm">("edit")
  const [returnRemarks, setReturnRemarks] = useState("")
  const [returnError, setReturnError] = useState("")
  const [decisionError, setDecisionError] = useState("")
  const [success, setSuccess] = useState<{
    action: CostCenterDecisionKind
    decisionId: string
    message: string
  } | null>(null)
  const lock = useRef(false)

  if (!request) {
    return (
      <div className="grid gap-6">
        <PageHeader
          title="Document Review"
          subtitle="Review the payroll or ORAS/BURAS summary for your Cost Center and record your decision."
        />
        <DemoNotice />
        <Alert tone="info" title="No document selected">
          Select a document from Pending Approvals to begin reviewing.
        </Alert>
        <div>
          <Button type="button" onClick={onBrowse}>
            Browse Pending Approvals
          </Button>
        </div>
      </div>
    )
  }

  if (!isAuthorized(request, user)) {
    return (
      <div className="grid gap-6">
        <PageHeader
          title="Document Review"
          subtitle="Review the payroll or ORAS/BURAS summary for your Cost Center and record your decision."
        />
        <Alert tone="danger" title="Unauthorized Cost Center">
          You are not authorized to review this Cost Center&apos;s document.
        </Alert>
        <div>
          <Button type="button" onClick={onBrowse}>
            Browse Pending Approvals
          </Button>
        </div>
      </div>
    )
  }

  const hasRequiredInfo =
    Boolean(request.documentReference && request.relatedPayroll) &&
    Number.isFinite(request.amount) &&
    request.supportingDocuments.length > 0 &&
    (request.documentType === "Payroll" ||
      request.previousPayrollApprovalComplete)
  const eligible = request.state === "Pending" && hasRequiredInfo
  const approvedCount = request.completedCostCenterIds.length
  const pendingCount = Math.max(
    0,
    request.requiredCostCenterIds.length - approvedCount,
  )
  const returnDestination =
    request.documentType === "Payroll" ? "Accounting Section" : "Budget Office"

  const recordDecision = (
    action: CostCenterDecisionKind,
    remarks?: string,
  ) => {
    if (lock.current) return
    const current = requests.find((item) => item.id === request.id)
    if (
      !current ||
      !isAuthorized(current, user) ||
      current.routingInstanceId !== request.routingInstanceId
    ) {
      setDecisionError(
        "The decision could not be recorded. No status changes were made.",
      )
      return
    }
    const result = applyCostCenterDecision({
      request: current,
      actor: {
        accountId: user.accountId ?? user.username,
        name: user.name,
      },
      action,
      remarks,
      recordedAt: new Date().toISOString(),
    })
    if (!result.ok) {
      if (action === "Returned" && !remarks?.trim())
        setReturnError(result.error)
      else setDecisionError(result.error)
      return
    }
    lock.current = true
    setRequests((items) =>
      items.map((item) =>
        item.id === current.id ? result.request : item,
      ),
    )
    setHistory((items) => [...items, result.decision])
    setNotifications((items) =>
      items.map((item) =>
        item.requestId === current.id ? { ...item, read: true } : item,
      ),
    )
    setApproveOpen(false)
    setReturnOpen(false)
    setDecisionError("")
    setSuccess({
      action,
      decisionId: result.decision.id,
      message: result.message,
    })
  }

  const reviewReturn = () => {
    if (!returnRemarks.trim()) {
      setReturnError("Please enter a reason for returning this document.")
      return
    }
    setReturnError("")
    setReturnStep("confirm")
  }

  return (
    <>
      <div className="grid gap-6">
        <PageHeader
          title="Document Review"
          subtitle="Review the payroll or ORAS/BURAS summary for your Cost Center and record your decision."
        />
        <DemoNotice />
        <div className="flex flex-wrap items-center gap-2">
          <StatusTag request={request} />
          <Tag kind="placeholder">{request.costCenterName}</Tag>
        </div>
        <section className="rounded-card bg-surface p-5 elevate">
          <dl className="grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2 xl:grid-cols-3">
            <DataPoint
              label="Document Reference"
              value={request.documentReference}
            />
            <DataPoint label="Document Type" value={request.documentType} />
            <DataPoint
              label="Related Payroll Reference"
              value={request.relatedPayroll}
            />
            <DataPoint label="Payroll Period" value={request.payrollPeriod} />
            <DataPoint label="Payroll Type" value={request.payrollType} />
            <DataPoint label="Fund Source" value={request.fund} />
            <DataPoint
              label="Assigned Cost Center"
              value={request.costCenterName}
            />
            <DataPoint
              label="Current Approval Stage"
              value={request.approvalStage}
            />
            <DataPoint
              label="Date Received"
              value={dateTime.format(new Date(request.receivedAt))}
            />
          </dl>
        </section>
        <div
          role="tablist"
          aria-label="Document review sections"
          className="grid gap-1 rounded-control bg-surface p-1 elevate sm:grid-cols-2 xl:grid-cols-5"
        >
          {([
            ["summary", "Document Summary"],
            ["employees", "Cost Center Payroll Summary"],
            ["documents", "Supporting Documents"],
            ["progress", "Approval Progress"],
            ["decision", "Signatory Decision"],
          ] as const).map(([id, label]) => (
            <Button
              key={id}
              type="button"
              role="tab"
              aria-selected={section === id}
              variant={section === id ? "primary" : "secondary"}
              onClick={() => setSection(id)}
            >
              {label}
            </Button>
          ))}
        </div>
        {section === "summary" && (
          <section className="rounded-card bg-surface p-5 elevate">
            <SectionTitle
              title={
                request.documentType === "Payroll"
                  ? "Payroll Document Summary"
                  : "Budget Document Summary"
              }
            />
            <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2 xl:grid-cols-3">
              <DataPoint
                label={
                  request.documentType === "Payroll"
                    ? "Payroll Reference"
                    : `${request.documentType} Reference`
                }
                value={request.documentReference}
              />
              <DataPoint
                label="Related Payroll"
                value={request.relatedPayroll}
              />
              <DataPoint label="Payroll Type" value={request.payrollType} />
              <DataPoint label="Payroll Period" value={request.payrollPeriod} />
              <DataPoint label="Fund Source" value={request.fund} />
              <DataPoint
                label="Assigned Cost Center"
                value={request.costCenterName}
              />
              {request.documentType === "Payroll" ? (
                <>
                  <DataPoint
                    label="Number of Employees"
                    value={String(request.employees.length)}
                  />
                  <DataPoint
                    label="Basic Pay"
                    value={
                      request.basicPay === null
                        ? "Not available"
                        : peso.format(request.basicPay)
                    }
                  />
                  <DataPoint
                    label="Other Earnings"
                    value={
                      request.otherEarnings === null
                        ? "Not available"
                        : peso.format(request.otherEarnings)
                    }
                  />
                  <DataPoint
                    label="Gross Pay"
                    value={
                      request.grossPay === null
                        ? "Not available"
                        : peso.format(request.grossPay)
                    }
                  />
                  <DataPoint
                    label="Deductions"
                    value={
                      request.deductions === null
                        ? "Not available"
                        : peso.format(request.deductions)
                    }
                  />
                  <DataPoint
                    label="Net Pay"
                    value={
                      request.netPay === null
                        ? "Not available"
                        : peso.format(request.netPay)
                    }
                  />
                </>
              ) : (
                <>
                  <DataPoint
                    label="Budget Document Amount"
                    value={peso.format(request.amount)}
                  />
                  <DataPoint
                    label="Prepared By"
                    value={request.preparedBy ?? "Not recorded"}
                  />
                  <DataPoint
                    label="Date Prepared"
                    value={
                      request.preparedAt
                        ? dateTime.format(new Date(request.preparedAt))
                        : "Not recorded"
                    }
                  />
                  <DataPoint
                    label="Previous Payroll Approval"
                    value={
                      request.previousPayrollApprovalComplete
                        ? "Completed in fictional prior-stage record"
                        : "Not recorded"
                    }
                  />
                </>
              )}
              <DataPoint
                label="Current Approval Stage"
                value={request.approvalStage}
              />
            </dl>
            <p className="mt-4 text-xs text-text-muted">
              Amounts are recorded fictional snapshots. This portal does not
              calculate salaries, deductions, or official obligation amounts.
            </p>
          </section>
        )}
        {section === "employees" && (
          <section className="rounded-card bg-surface p-5 elevate">
            <SectionTitle
              title="Payroll Details for Your Cost Center"
              description="Employee payroll information associated with your assigned Cost Center."
            />
            <ul className="mt-5 divide-y divide-border rounded-control border border-border">
              {request.employees.map((item) => (
                <li
                  key={item.employeeId}
                  className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3"
                >
                  <DataPoint
                    label="Employee ID / Name"
                    value={`${item.employeeId} · ${item.name}`}
                  />
                  <DataPoint
                    label="Pay Basis / Basic Pay"
                    value={`${item.payBasis} · ${
                      item.basicPay === null
                        ? "Not available"
                        : peso.format(item.basicPay)
                    }`}
                  />
                  <DataPoint
                    label="Other Earnings / Gross Pay"
                    value={`${
                      item.otherEarnings === null
                        ? "Not available"
                        : peso.format(item.otherEarnings)
                    } · ${peso.format(item.grossPay)}`}
                  />
                  <DataPoint
                    label="Deductions / Net Pay"
                    value={`${peso.format(item.deductions)} · ${peso.format(item.netPay)}`}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setEmployee(item)}
                  >
                    View Pay Breakdown
                  </Button>
                </li>
              ))}
            </ul>
            <Alert tone="info" title="Cost Center privacy">
              Only employee snapshots assigned to {request.costCenterName} are
              displayed. No Beta employee roster is available to this account.
            </Alert>
          </section>
        )}
        {section === "documents" && (
          <section className="rounded-card bg-surface p-5 elevate">
            <SectionTitle title="Supporting Documents" />
            <ul className="mt-5 divide-y divide-border rounded-control border border-border">
              {request.supportingDocuments.map((item) => (
                <li
                  key={item.id}
                  className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5"
                >
                  <DataPoint label="Document Name" value={item.name} />
                  <DataPoint label="Document Type" value={item.type} />
                  <DataPoint
                    label="Document Reference"
                    value={item.reference}
                  />
                  <DataPoint
                    label="Availability"
                    value={item.available ? "Metadata available" : "Unavailable"}
                  />
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
          </section>
        )}
        {section === "progress" && (
          <section className="rounded-card bg-surface p-5 elevate">
            <SectionTitle title="Approval Progress" />
            <p className="mt-5 text-xl font-semibold">
              {approvedCount} of {request.requiredCostCenterIds.length} required
              Cost Centers approved
            </p>
            <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2 xl:grid-cols-3">
              <DataPoint
                label="Current Document Stage"
                value={request.approvalStage}
              />
              <DataPoint
                label="Current Holding Office or Signatory"
                value={request.currentHoldingOffice}
              />
              <DataPoint
                label="Required Cost Center Count"
                value={String(request.requiredCostCenterIds.length)}
              />
              <DataPoint
                label="Approved Cost Center Count"
                value={String(approvedCount)}
              />
              <DataPoint
                label="Pending Cost Center Count"
                value={String(pendingCount)}
              />
              <DataPoint
                label="Return Information"
                value={
                  request.returnInfo
                    ? `${request.returnInfo.destination} · ${request.returnInfo.remarks}`
                    : "No return recorded for this routing instance"
                }
              />
            </dl>
            <p className="mt-4 text-xs text-text-muted">
              Aggregate progress only. Other Cost Centers&apos; employee and
              salary details are not disclosed.
            </p>
          </section>
        )}
        {section === "decision" && (
          <section className="rounded-card bg-surface p-5 elevate">
            <SectionTitle
              title="Signatory Decision"
              description="After reviewing the document, choose the appropriate action."
            />
            {!eligible && (
              <div className="mt-4">
                <Alert
                  tone={hasRequiredInfo ? "info" : "danger"}
                  title={
                    !hasRequiredInfo
                      ? "Missing Information"
                      : request.state === "Approved"
                      ? "Already Decided"
                      : "Wrong Current Stage"
                  }
                >
                  {!hasRequiredInfo
                    ? "Required document information is unavailable. Approval cannot be completed."
                    : request.state === "Approved"
                    ? "A decision has already been recorded for this approval request."
                    : "This document is not currently awaiting your decision."}
                </Alert>
              </div>
            )}
            {decisionError && (
              <div className="mt-4">
                <Alert tone="danger" title="Decision Failed">
                  {decisionError}
                </Alert>
              </div>
            )}
            {request.state === "Returned" && (
              <div className="mt-4">
                <Alert tone="warning" title="Reapproval route requires configuration">
                  Prior approval and return events are preserved. The policy for
                  which Cost Centers must reapprove a corrected version remains
                  TBD, so no prior approval is automatically reapplied.
                </Alert>
              </div>
            )}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                disabled={!eligible}
                onClick={() => setApproveOpen(true)}
              >
                Approve
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!eligible}
                onClick={() => {
                  setReturnStep("edit")
                  setReturnOpen(true)
                }}
              >
                Return
              </Button>
            </div>
          </section>
        )}
        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={onBrowse}>
            Back to Pending Approvals
          </Button>
        </div>
      </div>
      {document && (
        <DocumentPreview
          document={document}
          request={request}
          onClose={() => setDocument(null)}
        />
      )}
      {employee && (
        <PayBreakdown employee={employee} onClose={() => setEmployee(null)} />
      )}
      {approveOpen && (
        <Modal title="Approve Document?" onClose={() => setApproveOpen(false)}>
          <p className="text-sm text-text-muted">
            You are about to approve this document for your assigned Cost
            Center. Your decision will be recorded in approval history.
          </p>
          <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
            <DataPoint
              label="Document Reference"
              value={request.documentReference}
            />
            <DataPoint label="Document Type" value={request.documentType} />
            <DataPoint
              label="Related Payroll"
              value={request.relatedPayroll}
            />
            <DataPoint label="Payroll Period" value={request.payrollPeriod} />
            <DataPoint label="Fund Source" value={request.fund} />
            <DataPoint
              label="Assigned Cost Center"
              value={request.costCenterName}
            />
            <DataPoint
              label="Relevant Amount"
              value={peso.format(request.amount)}
            />
          </dl>
          <div className="mt-5">
            <MultilineField
              key={`approve-${request.id}`}
              label="Remarks (Optional)"
              value={approvalRemarks}
              placeholder="Enter any review notes..."
              onChange={setApprovalRemarks}
            />
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setApproveOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => recordDecision("Approved", approvalRemarks)}
            >
              Confirm Approval
            </Button>
          </div>
        </Modal>
      )}
      {returnOpen && (
        <Modal
          title={
            returnStep === "edit"
              ? "Return Document"
              : "Confirm Document Return"
          }
          onClose={() => setReturnOpen(false)}
          wide
        >
          {returnStep === "edit" ? (
            <>
              <p className="text-sm text-text-muted">
                Provide a reason for returning the document to its preparer.
              </p>
              <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
                <DataPoint
                  label="Document Reference"
                  value={request.documentReference}
                />
                <DataPoint label="Document Type" value={request.documentType} />
                <DataPoint
                  label="Related Payroll"
                  value={request.relatedPayroll}
                />
                <DataPoint
                  label="Payroll Period"
                  value={request.payrollPeriod}
                />
                <DataPoint label="Fund" value={request.fund} />
                <DataPoint
                  label="Assigned Cost Center"
                  value={request.costCenterName}
                />
                <DataPoint
                  label="Receiving Office"
                  value={returnDestination}
                />
              </dl>
              <div className="mt-5">
                <MultilineField
                  key={`return-${request.id}`}
                  label="Reason for Return / Remarks"
                  value={returnRemarks}
                  placeholder="Describe what needs correction or clarification..."
                  onChange={(value) => {
                    setReturnRemarks(value)
                    setReturnError("")
                  }}
                  required
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
                This document will be returned to its preparer with your
                remarks.
              </p>
              <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4">
                <DataPoint
                  label="Document Reference"
                  value={request.documentReference}
                />
                <DataPoint label="Document Type" value={request.documentType} />
                <DataPoint
                  label="Returning Cost Center"
                  value={request.costCenterName}
                />
                <DataPoint
                  label="Receiving Office"
                  value={returnDestination}
                />
                <DataPoint label="Entered Remarks" value={returnRemarks} />
              </dl>
              <div className="mt-5 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setReturnStep("edit")}
                >
                  Back to Edit
                </Button>
                <Button
                  type="button"
                  onClick={() => recordDecision("Returned", returnRemarks)}
                >
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
            success.action === "Approved"
              ? "Approval Recorded"
              : request.documentType === "Payroll"
                ? "Payroll Returned"
                : "Budget Document Returned"
          }
          onClose={() => setSuccess(null)}
        >
          <Alert tone="success" title="Decision recorded">
            {success.message}
          </Alert>
          <div className="mt-5 grid gap-3">
            <Button type="button" onClick={onBrowse}>
              Back to Pending Approvals
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                onHistory(
                  success.action === "Approved" ? "approved" : "returned",
                  success.decisionId,
                )
              }
            >
              View Approval History
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}

function DecisionDialog({
  decision,
  onClose,
}: {
  decision: CostCenterDecision
  onClose: () => void
}) {
  return (
    <Modal title="Approval Decision Details" onClose={onClose} wide>
      <Tag kind={decision.action === "Approved" ? "simulated" : "placeholder"}>
        {decision.action}
      </Tag>
      <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
        <DataPoint label="Decision Reference" value={decision.id} />
        <DataPoint
          label="Document Reference"
          value={decision.documentReference}
        />
        <DataPoint
          label="Related Payroll"
          value={decision.relatedPayroll}
        />
        <DataPoint label="Document Type" value={decision.documentType} />
        <DataPoint
          label="Assigned Cost Center"
          value={decision.costCenterName}
        />
        <DataPoint label="Signatory" value={decision.actorName} />
        <DataPoint label="Decision" value={decision.action} />
        <DataPoint
          label="Date and Time"
          value={dateTime.format(new Date(decision.recordedAt))}
        />
        <DataPoint
          label="Remarks"
          value={decision.remarks ?? "No remarks recorded"}
        />
        <DataPoint
          label="Stage at Time of Decision"
          value={decision.stageAtDecision}
        />
        <DataPoint
          label="Current Document Stage"
          value={decision.currentStage}
        />
        <DataPoint
          label="Return Destination"
          value={decision.returnDestination ?? "Not applicable"}
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

export function CostCenterHistory({
  history,
  user,
  initialTab,
  initialDecisionId,
}: {
  history: CostCenterDecision[]
  user: MockUser
  initialTab: CostCenterHistoryTab
  initialDecisionId?: string
}) {
  const [tab, setTab] = useState(initialTab)
  const [query, setQuery] = useState("")
  const [documentType, setDocumentType] = useState("")
  const [period, setPeriod] = useState("")
  const [fund, setFund] = useState("")
  const [decisionFilter, setDecisionFilter] = useState("")
  const [decisionDate, setDecisionDate] = useState("")
  const [selected, setSelected] = useState<string | null>(
    initialDecisionId ?? null,
  )
  const mine = history.filter(
    (decision) =>
      decision.actorAccountId === user.accountId &&
      decision.costCenterId === demoCostCenterAlpha.id,
  )
  const filtered = mine
    .filter((decision) => {
      const q = query.trim().toLowerCase()
      return (
        (tab === "all" ||
          (tab === "approved" && decision.action === "Approved") ||
          (tab === "returned" && decision.action === "Returned")) &&
        (!q ||
          [decision.documentReference, decision.relatedPayroll].some((value) =>
            value.toLowerCase().includes(q),
          )) &&
        (!documentType || decision.documentType === documentType) &&
        (!period || decision.payrollPeriod === period) &&
        (!fund || decision.fund === fund) &&
        (!decisionFilter || decision.action === decisionFilter) &&
        (!decisionDate || decision.recordedAt.slice(0, 10) === decisionDate)
      )
    })
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
  const current = mine.find((decision) => decision.id === selected)
  const clear = () => {
    setQuery("")
    setDocumentType("")
    setPeriod("")
    setFund("")
    setDecisionFilter("")
    setDecisionDate("")
  }
  return (
    <>
      <div className="grid gap-6">
        <PageHeader
          title="Approval History"
          subtitle="View payroll and budget-document decisions recorded for your assigned Cost Center."
        />
        <DemoNotice />
        <AssignmentNotice />
        <div
          role="tablist"
          aria-label="Approval decision types"
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
              onClick={() => setTab(id)}
            >
              {label}
            </Button>
          ))}
        </div>
        <section className="overflow-hidden rounded-card bg-surface elevate">
          <div className="grid gap-4 border-b border-border p-5 sm:grid-cols-2 xl:grid-cols-3">
            <TextField
              label="Search"
              icon="search"
              placeholder="Search document or payroll reference..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <SelectField
              label="Document Type"
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value)}
              placeholder="All Documents"
            >
              <option value="Payroll">Payroll</option>
              <option value="ORAS">ORAS</option>
              <option value="BURAS">BURAS</option>
            </SelectField>
            <SelectField
              label="Payroll Period"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              placeholder="All periods"
            >
              {[...new Set(mine.map((item) => item.payrollPeriod))].map(
                (value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ),
              )}
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
            <SelectField
              label="Decision"
              value={decisionFilter}
              onChange={(event) => setDecisionFilter(event.target.value)}
              placeholder="All Decisions"
            >
              <option value="Approved">Approved</option>
              <option value="Returned">Returned</option>
            </SelectField>
            <TextField
              label="Decision Date"
              type="date"
              value={decisionDate}
              onChange={(event) => setDecisionDate(event.target.value)}
            />
            <Button type="button" variant="secondary" onClick={clear}>
              Clear Filters
            </Button>
          </div>
          {filtered.length ? (
            <ul className="divide-y divide-border">
              {filtered.map((decision) => (
                <li
                  key={decision.id}
                  className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3"
                >
                  <DataPoint
                    label="Document / Type"
                    value={`${decision.documentReference} · ${decision.documentType}`}
                  />
                  <DataPoint
                    label="Related Payroll / Period"
                    value={`${decision.relatedPayroll} · ${decision.payrollPeriod}`}
                  />
                  <DataPoint
                    label="Fund / Cost Center"
                    value={`${decision.fund} · ${decision.costCenterName}`}
                  />
                  <DataPoint
                    label="Decision / Date"
                    value={`${decision.action} · ${dateTime.format(
                      new Date(decision.recordedAt),
                    )}`}
                  />
                  <DataPoint
                    label="Current Document Stage"
                    value={decision.currentStage}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => setSelected(decision.id)}
                    >
                      View Decision
                    </Button>
                    {decision.action === "Returned" && (
                      <Button
                        type="button"
                        variant="link"
                        onClick={() => setSelected(decision.id)}
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
              No approval decisions have been recorded yet.
            </p>
          )}
        </section>
      </div>
      {current && (
        <DecisionDialog decision={current} onClose={() => setSelected(null)} />
      )}
    </>
  )
}

export function CostCenterNotifications({
  notifications,
  setNotifications,
  user,
  onReview,
}: {
  notifications: CostCenterNotification[]
  setNotifications: Dispatch<SetStateAction<CostCenterNotification[]>>
  user: MockUser
  onReview: (id: string) => void
}) {
  const [unreadOnly, setUnreadOnly] = useState(false)
  const mine = notifications
    .filter(
      (item) =>
        item.recipientAccountId === user.accountId &&
        item.costCenterId === demoCostCenterAlpha.id &&
        (!unreadOnly || !item.read),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const markRead = (id: string) =>
    setNotifications((items) =>
      items.map((item) => (item.id === id ? { ...item, read: true } : item)),
    )
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Notifications"
        subtitle="Updates about payroll and budget documents requiring your review."
      />
      <DemoNotice />
      <AssignmentNotice />
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
            disabled={!notifications.some(
              (item) =>
                item.recipientAccountId === user.accountId && !item.read,
            )}
            onClick={() =>
              setNotifications((items) =>
                items.map((item) =>
                  item.recipientAccountId === user.accountId
                    ? { ...item, read: true }
                    : item,
                ),
              )
            }
          >
            Mark All as Read
          </Button>
        </div>
        {mine.length ? (
          <ul className="divide-y divide-border">
            {mine.map((notification) => (
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
                      {notification.documentReference} ·{" "}
                      {notification.documentType} ·{" "}
                      {notification.costCenterName} ·{" "}
                      {dateTime.format(new Date(notification.createdAt))}
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
                        onReview(notification.requestId)
                      }}
                    >
                      Review Document
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-8 text-center font-semibold">
            No new notifications.
          </p>
        )}
      </section>
    </div>
  )
}

export function CostCenterMyAccount({
  user,
  onDashboard,
}: {
  user: MockUser
  onDashboard: () => void
}) {
  const profile = {
    ...profileFor(user, "Cost Center Signatory"),
    employeeId: "Not recorded",
  }
  return (
    <div className="grid gap-6">
      <PageHeader
        title="My Account"
        subtitle="View your account information and manage your password."
      />
      <DemoNotice />
      <Button
        type="button"
        variant="secondary"
        className="w-fit"
        onClick={onDashboard}
      >
        Back to Dashboard
      </Button>
      <section className="rounded-card bg-surface p-5 elevate">
        <dl className="grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2 xl:grid-cols-3">
          <DataPoint label="Name" value={profile.name} />
          <DataPoint label="Username" value={profile.username} />
          <DataPoint label="Role" value="Cost Center Signatory" />
          <DataPoint
            label="Assigned Cost Center"
            value={`${demoCostCenterAlpha.name} (${demoCostCenterAlpha.id})`}
          />
          <DataPoint label="Employee ID" value={profile.employeeId} />
          <DataPoint label="Email" value={profile.email} />
          <DataPoint label="Account Status" value="Active" />
        </dl>
      </section>
      <MyAccount profile={profile} />
      <Alert tone="info" title="Read-only assignment">
        Role and Cost Center assignment are read-only. Production account and
        assignment changes require authorized backend administration.
      </Alert>
    </div>
  )
}

export function CostCenterHeaderBell({
  notifications,
  user,
  onOpen,
}: {
  notifications: CostCenterNotification[]
  user: MockUser
  onOpen: () => void
}) {
  const unread = notifications.filter(
    (item) => item.recipientAccountId === user.accountId && !item.read,
  ).length
  return (
    <Button
      type="button"
      variant="link"
      className="relative size-10 p-0 no-underline text-text-muted hover:bg-info-soft"
      aria-label={`${unread} unread Cost Center notification${unread === 1 ? "" : "s"}`}
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
