import clsx from "clsx"
import { useRef, useState, type Dispatch, type SetStateAction } from "react"
import { Alert, Button, Icon, TextField } from "../../MsuPayroll"
import { Modal, SelectField, Tag, usePopover } from "../../admin/ui"
import type { MockUser } from "../../auth/mockData"
import {
  COST_CENTER_SIGNATORY_ACCOUNT_ID,
  demoCostCenterAlpha,
  type CostCenterApprovalRequest,
  type CostCenterDecision,
  type CostCenterNotification,
} from "../costCenter/costCenterData"
import {
  documentTypeForFund,
  type BudgetApprovedPayroll,
  type BudgetDocument,
  type BudgetDocumentEvent,
  type BudgetDocumentRevision,
  type BudgetNotification,
} from "./budgetData"

export type BudgetApprovedTab = "awaiting" | "progress" | "all"
export type BudgetTrackingTab = "all" | "awaiting" | "returned" | "completed"
export type BudgetHistoryTab = "all" | "draft" | "forwarded" | "returned" | "completed"

type BudgetSharedProps = {
  payrolls: BudgetApprovedPayroll[]
  documents: BudgetDocument[]
  setDocuments: Dispatch<SetStateAction<BudgetDocument[]>>
  costCenterRequests: CostCenterApprovalRequest[]
  setCostCenterRequests: Dispatch<SetStateAction<CostCenterApprovalRequest[]>>
  costCenterHistory: CostCenterDecision[]
  costCenterNotifications: CostCenterNotification[]
  setCostCenterNotifications: Dispatch<SetStateAction<CostCenterNotification[]>>
  notifications: BudgetNotification[]
  setNotifications: Dispatch<SetStateAction<BudgetNotification[]>>
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
      <p className="mt-2 text-sm leading-relaxed text-text-muted">{subtitle}</p>
    </div>
  )
}

function DemoNotice() {
  return (
    <Alert tone="info" title="Fictional Demonstration Data">
      Payrolls, budget documents, employees, amounts, routes, and decisions on
      these screens are isolated prototype fixtures, not authenticated
      university transactions.
    </Alert>
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
          "mt-1 break-words text-sm font-medium leading-snug",
          muted && "text-text-muted",
        )}
      >
        {value}
      </dd>
    </div>
  )
}

function StatusTag({ stage }: { stage: string }) {
  const kind =
    stage === "Ready for DV" || stage === "Completed"
      ? "simulated"
      : "placeholder"
  return <Tag kind={kind}>{stage}</Tag>
}

function MultilineField({
  label,
  value,
  onChange,
  placeholder,
  error,
  required,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  error?: string
  required?: boolean
  disabled?: boolean
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
        aria-disabled={disabled || undefined}
        contentEditable={!disabled}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={(event) =>
          onChange(
            event.currentTarget.textContent?.replace(/\u00a0/g, " ") ?? "",
          )
        }
        className={clsx(
          "min-h-28 rounded-control border bg-surface p-3.5 text-sm outline-none empty:before:pointer-events-none empty:before:text-text-muted empty:before:content-[attr(data-placeholder)] focus:border-primary",
          disabled && "cursor-not-allowed bg-canvas text-text-muted",
          error ? "border-danger" : "border-border-strong",
        )}
      >
        {value}
      </div>
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  )
}

function payrollEligible(payroll: BudgetApprovedPayroll) {
  return (
    !payroll.superseded &&
    Boolean(documentTypeForFund(payroll.fund)) &&
    payroll.requiredCostCenters.length > 0 &&
    payroll.requiredCostCenters.every((center) =>
      payroll.approvalEvents.some(
        (event) =>
          event.costCenterId === center.id && event.action === "Approved",
      ),
    )
  )
}

function documentForPayroll(payrollId: string, documents: BudgetDocument[]) {
  return documents.find((document) => document.payrollId === payrollId)
}

function completedCostCenters(
  document: BudgetDocument,
  requests: CostCenterApprovalRequest[],
) {
  return new Set(
    requests
      .filter(
        (request) =>
          request.documentReference === document.reference &&
          request.routingInstanceId === document.routingInstanceId &&
          request.state === "Approved",
      )
      .map((request) => request.costCenterId),
  )
}

function PayrollPreview({
  payroll,
  onClose,
  onPrepare,
}: {
  payroll: BudgetApprovedPayroll
  onClose: () => void
  onPrepare: () => void
}) {
  const type = documentTypeForFund(payroll.fund)
  return (
    <Modal title="Approved Payroll Details" onClose={onClose} wide>
      <div className="flex flex-wrap gap-2">
        <Tag kind="placeholder">Fictional Demonstration Data</Tag>
        <StatusTag stage="Cost Center payroll approvals complete" />
      </div>
      <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
        <DataPoint label="Payroll Reference" value={payroll.reference} />
        <DataPoint label="Payroll Type" value={payroll.payrollType} />
        <DataPoint label="Payroll Period" value={payroll.payrollPeriod} />
        <DataPoint label="Fund Source" value={payroll.fund} />
        <DataPoint
          label="Included Employees"
          value={String(payroll.employees.length)}
        />
        <DataPoint
          label="Cost Centers Included"
          value={payroll.requiredCostCenters
            .map((center) => center.name)
            .join(", ")}
        />
        <DataPoint label="Current Payroll Stage" value={payroll.currentStage} />
        <DataPoint
          label="Payroll Approval Completed"
          value={dateTime.format(new Date(payroll.approvedAt))}
        />
      </dl>
      <p role="heading" aria-level={3} className="mt-6 text-base font-semibold">
        Financial Summary
      </p>
      <dl className="mt-3 grid gap-4 rounded-control border border-border p-4 sm:grid-cols-3">
        <DataPoint label="Gross Pay" value={peso.format(payroll.gross)} />
        <DataPoint
          label="Total Deductions"
          value={peso.format(payroll.deductions)}
        />
        <DataPoint label="Net Pay" value={peso.format(payroll.net)} />
      </dl>
      <p role="heading" aria-level={3} className="mt-6 text-base font-semibold">
        Employee Payroll Snapshot
      </p>
      <ul className="mt-3 divide-y divide-border rounded-control border border-border">
        {payroll.employees.map((employee) => (
          <li
            key={employee.employeeId}
            className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            <DataPoint
              label="Employee"
              value={`${employee.employeeId} · ${employee.name}`}
            />
            <DataPoint label="Cost Center" value={employee.costCenterName} />
            <DataPoint label="Pay Basis" value={employee.payBasis} />
            <DataPoint
              label="Gross Pay"
              value={peso.format(employee.grossPay)}
            />
            <DataPoint
              label="Deductions"
              value={peso.format(employee.deductions)}
            />
            <DataPoint label="Net Pay" value={peso.format(employee.netPay)} />
          </li>
        ))}
      </ul>
      <p role="heading" aria-level={3} className="mt-6 text-base font-semibold">
        Payroll Approval Summary
      </p>
      <ul className="mt-3 grid gap-2">
        {payroll.approvalEvents.map((event) => (
          <li key={event.id} className="rounded-control bg-canvas p-3 text-sm">
            <span className="font-semibold">{event.costCenterName}</span> ·{" "}
            {event.action} · {dateTime.format(new Date(event.recordedAt))}
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
        <Button type="button" onClick={onPrepare} disabled={!type}>
          Prepare {type ?? "ORAS/BURAS"}
        </Button>
      </div>
    </Modal>
  )
}

export function BudgetApprovedPayrolls({
  payrolls,
  documents,
  initialTab = "awaiting",
  onPrepare,
  onTrack,
}: {
  payrolls: BudgetApprovedPayroll[]
  documents: BudgetDocument[]
  initialTab?: BudgetApprovedTab
  onPrepare: (payrollId: string, documentId?: string) => void
  onTrack: (documentId: string) => void
}) {
  const [tab, setTab] = useState<BudgetApprovedTab>(initialTab)
  const [query, setQuery] = useState("")
  const [payrollType, setPayrollType] = useState("")
  const [period, setPeriod] = useState("")
  const [fund, setFund] = useState("")
  const [costCenter, setCostCenter] = useState("")
  const [state, setState] = useState("")
  const [preview, setPreview] = useState<BudgetApprovedPayroll | null>(null)
  const eligible = payrolls.filter(payrollEligible)
  const rows = eligible.filter((payroll) => {
    const document = documentForPayroll(payroll.id, documents)
    const documentState = document?.stage ?? "Awaiting Preparation"
    const tabMatch =
      tab === "all" ||
      (tab === "awaiting" && !document) ||
      (tab === "progress" &&
        (document?.stage === "Draft" ||
          document?.stage === "Returned to Budget Office"))
    const q = query.trim().toLowerCase()
    return (
      tabMatch &&
      (!q ||
        [payroll.reference, payroll.payrollType, payroll.payrollPeriod].some(
          (value) => value.toLowerCase().includes(q),
        )) &&
      (!payrollType || payroll.payrollType === payrollType) &&
      (!period || payroll.payrollPeriod === period) &&
      (!fund || payroll.fund === fund) &&
      (!costCenter ||
        payroll.requiredCostCenters.some(
          (center) => center.id === costCenter,
        )) &&
      (!state || documentState === state)
    )
  })
  const counts = {
    awaiting: eligible.filter(
      (payroll) => !documentForPayroll(payroll.id, documents),
    ).length,
    drafts: documents.filter(
      (document) =>
        document.stage === "Draft" ||
        document.stage === "Returned to Budget Office",
    ).length,
    forwarded: documents.filter(
      (document) => document.stage === "Awaiting Cost Center Approval",
    ).length,
  }
  const clear = () => {
    setQuery("")
    setPayrollType("")
    setPeriod("")
    setFund("")
    setCostCenter("")
    setState("")
  }
  return (
    <>
      <div className="grid gap-6">
        <PageHeader
          title="Approved Payrolls"
          subtitle="View payrolls that completed the required Cost Center approvals and are available for budget-document processing."
        />
        <Alert tone="info" title="Budget-stage eligibility">
          Payrolls shown here completed Cost Center payroll approval. They have
          not necessarily completed ORAS/BURAS, DV, or payment processing.
        </Alert>
        <DemoNotice />
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["Awaiting Document Preparation", counts.awaiting],
            ["Document Drafts in Progress", counts.drafts],
            [
              "Already Forwarded for Budget-Document Approval",
              counts.forwarded,
            ],
          ].map(([label, count]) => (
            <section
              key={String(label)}
              className="rounded-card bg-surface p-5 elevate"
            >
              <p className="text-xs font-medium text-text-muted">{label}</p>
              <p className="mt-2 text-2xl font-bold tabular-nums">{count}</p>
            </section>
          ))}
        </div>
        <section className="overflow-hidden rounded-card bg-surface elevate">
          <div className="border-b border-border p-5">
            <div
              role="tablist"
              aria-label="Approved payroll views"
              className="grid gap-1 rounded-control bg-canvas p-1 sm:grid-cols-3"
            >
              {([
                ["awaiting", "Awaiting Preparation"],
                ["progress", "In Progress"],
                ["all", "All Eligible Payrolls"],
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
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <TextField
                label="Search Approved Payrolls"
                icon="search"
                placeholder="Search payroll reference or payroll type..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <SelectField
                label="Payroll Type"
                value={payrollType}
                onChange={(event) => setPayrollType(event.target.value)}
                placeholder="All payroll types"
              >
                {[...new Set(eligible.map((item) => item.payrollType))].map(
                  (value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ),
                )}
              </SelectField>
              <SelectField
                label="Payroll Period"
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                placeholder="All periods"
              >
                {[...new Set(eligible.map((item) => item.payrollPeriod))].map(
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
                placeholder="All funds"
              >
                <option value="F01">F01</option>
                <option value="F05">F05</option>
                <option value="F07">F07</option>
              </SelectField>
              <SelectField
                label="Cost Center"
                value={costCenter}
                onChange={(event) => setCostCenter(event.target.value)}
                placeholder="All cost centers"
              >
                {[
                  ...new Map(
                    eligible
                      .flatMap((item) => item.requiredCostCenters)
                      .map((center) => [center.id, center.name]),
                  ).entries(),
                ].map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Budget Document State"
                value={state}
                onChange={(event) => setState(event.target.value)}
                placeholder="All states"
              >
                <option value="Awaiting Preparation">
                  Awaiting Preparation
                </option>
                <option value="Draft">Draft</option>
                <option value="Returned to Budget Office">
                  Returned to Budget Office
                </option>
                <option value="Awaiting Cost Center Approval">
                  Awaiting Cost Center Approval
                </option>
                <option value="Ready for DV">Ready for DV</option>
              </SelectField>
              <div className="flex items-end">
                <Button type="button" variant="secondary" onClick={clear}>
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>
          {rows.length ? (
            <ul className="divide-y divide-border">
              {rows.map((payroll) => {
                const document = documentForPayroll(payroll.id, documents)
                const type = documentTypeForFund(payroll.fund)
                return (
                  <li
                    key={payroll.id}
                    className="grid gap-4 p-5 lg:grid-cols-3"
                  >
                    <DataPoint
                      label="Payroll Reference / Type"
                      value={`${payroll.reference} · ${payroll.payrollType}`}
                    />
                    <DataPoint
                      label="Period / Fund"
                      value={`${payroll.payrollPeriod} · ${payroll.fund}`}
                    />
                    <DataPoint
                      label="Employees / Cost Centers"
                      value={`${payroll.employees.length} · ${payroll.requiredCostCenters.map((center) => center.name).join(", ")}`}
                    />
                    <DataPoint
                      label="Approved Gross / Deductions / Net"
                      value={`${peso.format(payroll.gross)} · ${peso.format(payroll.deductions)} · ${peso.format(payroll.net)}`}
                    />
                    <DataPoint
                      label="Budget Document"
                      value={`${type ?? "Fund Configuration Required"} · ${document?.stage ?? "Awaiting Preparation"}`}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setPreview(payroll)}
                      >
                        View Payroll
                      </Button>
                      {!document ? (
                        <Button
                          type="button"
                          disabled={!type}
                          onClick={() => onPrepare(payroll.id)}
                        >
                          Prepare {type ?? "Document"}
                        </Button>
                      ) : document.stage === "Draft" ? (
                        <Button
                          type="button"
                          onClick={() => onPrepare(payroll.id, document.id)}
                        >
                          Continue Draft
                        </Button>
                      ) : document.stage === "Returned to Budget Office" ? (
                        <Button
                          type="button"
                          onClick={() => onPrepare(payroll.id, document.id)}
                        >
                          Review Return
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={() => onTrack(document.id)}
                        >
                          Track Approval
                        </Button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="p-8 text-center font-semibold">
              No payrolls are currently available for Budget document
              preparation.
            </p>
          )}
        </section>
      </div>
      {preview && (
        <PayrollPreview
          payroll={preview}
          onClose={() => setPreview(null)}
          onPrepare={() => {
            const document = documentForPayroll(preview.id, documents)
            setPreview(null)
            onPrepare(preview.id, document?.id)
          }}
        />
      )}
    </>
  )
}

type DraftValues = {
  reference: string
  amount: string
  particulars: string
  notes: string
  correction: string
  support: string
}

function makeReference(type: "ORAS" | "BURAS", documents: BudgetDocument[]) {
  const numbers = documents
    .map((document) => Number(document.reference.match(/(\d+)$/)?.[1]))
    .filter(Number.isFinite)
  return `DEMO-BUD-${type}-${Math.max(700, ...numbers) + 1}`
}

export function BudgetPreparation({
  payrolls,
  documents,
  setDocuments,
  costCenterRequests,
  setCostCenterRequests,
  setCostCenterNotifications,
  notifications,
  setNotifications,
  user,
  selectedPayrollId,
  selectedDocumentId,
  onBrowse,
  onTrack,
  onHistory,
}: BudgetSharedProps & {
  selectedPayrollId: string | null
  selectedDocumentId: string | null
  onBrowse: () => void
  onTrack: (documentId: string) => void
  onHistory: (documentId?: string) => void
}) {
  const payroll = payrolls.find((item) => item.id === selectedPayrollId)
  const existing =
    documents.find((item) => item.id === selectedDocumentId) ??
    (payroll ? documentForPayroll(payroll.id, documents) : undefined)
  const type = payroll ? documentTypeForFund(payroll.fund) : null
  const returned = existing?.stage === "Returned to Budget Office"
  const initial: DraftValues = {
    reference:
      existing?.reference ?? (type ? makeReference(type, documents) : ""),
    amount: existing ? existing.amount.toFixed(2) : "",
    particulars: existing?.particulars ?? "",
    notes: existing?.notes ?? "",
    correction: "",
    support: existing?.supportReferences.join(", ") ?? "",
  }
  const [values, setValues] = useState(initial)
  const [saved, setSaved] = useState(initial)
  const [errors, setErrors] =
    useState<Partial<Record<keyof DraftValues, string>>>({})
  const [message, setMessage] = useState("")
  const [preview, setPreview] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [success, setSuccess] = useState<BudgetDocument | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [revisionOpen, setRevisionOpen] = useState(!returned)
  const lock = useRef(false)

  if (!payroll) {
    return (
      <div className="grid gap-6">
        <PageHeader
          title="ORAS/BURAS Preparation"
          subtitle="Prepare and review the applicable budget document from an approved payroll."
        />
        <DemoNotice />
        <Alert tone="info" title="No approved payroll selected">
          Select an approved payroll to prepare its budget document.
        </Alert>
        <div>
          <Button type="button" onClick={onBrowse}>
            Browse Approved Payrolls
          </Button>
        </div>
      </div>
    )
  }

  const locked =
    existing?.stage === "Awaiting Cost Center Approval" ||
    existing?.stage === "Ready for DV"
  const formLocked = locked || (returned && !revisionOpen)
  const changed = JSON.stringify(values) !== JSON.stringify(saved)
  const amount = Number(values.amount)
  const routeConfigured =
    payroll.requiredCostCenters.length > 0 &&
    payroll.requiredCostCenters.every((center) => center.routeConfigured)
  const validate = (forForward: boolean) => {
    const next: Partial<Record<keyof DraftValues, string>> = {}
    if (!values.reference.trim())
      next.reference = "Enter a budget document reference."
    else if (
      documents.some(
        (document) =>
          document.id !== existing?.id &&
          document.reference.toLowerCase() ===
            values.reference.trim().toLowerCase(),
      )
    )
      next.reference =
        "An active budget document already exists with this reference."
    if (!values.amount.trim())
      next.amount = "Enter the proposed budget document amount."
    else if (
      !/^\d+(\.\d{1,2})?$/.test(values.amount) ||
      !Number.isFinite(amount) ||
      amount <= 0
    )
      next.amount =
        "Enter a valid positive amount using up to two decimal places."
    if (forForward && !values.particulars.trim())
      next.particulars =
        "Complete the required demonstration fields before forwarding."
    if (returned && !values.correction.trim())
      next.correction = "Enter a meaningful correction explanation."
    if (!payrollEligible(payroll))
      setMessage(
        "This payroll has not completed all required Cost Center approvals.",
      )
    else if (type !== documentTypeForFund(payroll.fund))
      setMessage(
        "The selected fund does not match the required budget document type.",
      )
    else if (payroll.superseded)
      setMessage(
        "The approved payroll source has changed. Review the current eligible payroll before continuing.",
      )
    else if (!user.roles.includes("Budget Office"))
      setMessage("This account does not have Budget Office permissions.")
    else if (forForward && !routeConfigured)
      setMessage("Required Cost Center approval routing is not configured.")
    else setMessage("")
    setErrors(next)
    return (
      Object.keys(next).length === 0 &&
      payrollEligible(payroll) &&
      routeConfigured
    )
  }

  const persist = (forward = false) => {
    if (lock.current || locked || !type || !validate(forward)) return null
    lock.current = true
    const now = new Date().toISOString()
    const id = existing?.id ?? `DEMO-BUD-DOC-${Date.now()}`
    const revision = returned
      ? (existing?.revision ?? 0) + 1
      : (existing?.revision ?? 1)
    const supportReferences = [
      ...new Set([
        `${payroll.reference}-${payroll.snapshotVersion}`,
        ...values.support
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        ...(selectedFile ? [`Local browser file: ${selectedFile.name}`] : []),
      ]),
    ]
    const revisionRecord: BudgetDocumentRevision = {
      id: `${id}-R${revision}`,
      revision,
      amount,
      particulars: values.particulars.trim(),
      notes: values.notes.trim(),
      correctionExplanation: values.correction.trim() || undefined,
      updatedBy: user.name,
      updatedAt: now,
      relatedReturnEventId: returned
        ? existing?.returnInfo?.eventId
        : undefined,
    }
    const saveEvent: BudgetDocumentEvent = {
      id: `${id}-${forward ? "FORWARDED" : "SAVED"}-${now}`,
      action: forward
        ? "Budget document marked for approval"
        : returned
          ? "Revised draft saved"
          : "Budget document draft saved",
      actor: user.name,
      office: "Budget Office",
      recordedAt: now,
      remarks: values.correction.trim() || undefined,
      revision,
    }
    const routingInstanceId = forward
      ? `${id}-ROUTE-R${revision}-${Date.now()}`
      : existing?.routingInstanceId
    const next: BudgetDocument = {
      id,
      reference: values.reference.trim(),
      type,
      payrollId: payroll.id,
      payrollReference: payroll.reference,
      sourceSnapshotVersion: payroll.snapshotVersion,
      fund: payroll.fund,
      amount,
      particulars: values.particulars.trim(),
      notes: values.notes.trim(),
      supportReferences,
      preparedBy: existing?.preparedBy ?? user.name,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      revision,
      stage: forward ? "Awaiting Cost Center Approval" : "Draft",
      currentHolder: forward
        ? payroll.requiredCostCenters.map((center) => center.name).join(", ")
        : "Budget Office",
      requiredCostCenterIds: payroll.requiredCostCenters.map(
        (center) => center.id,
      ),
      routingInstanceId,
      revisions: [
        ...(existing?.revisions ?? []),
        ...(existing?.revisions.some((item) => item.revision === revision)
          ? []
          : [revisionRecord]),
      ],
      events: [...(existing?.events ?? []), saveEvent],
      returnInfo: existing?.returnInfo,
      demo: true,
    }
    setDocuments((items) => {
      const found = items.some((item) => item.id === id)
      return found
        ? items.map((item) => (item.id === id ? next : item))
        : [...items, next]
    })
    setSaved(values)
    setMessage(
      forward
        ? "Budget document forwarded for Cost Center approval."
        : returned
          ? "Budget document revision saved."
          : "Budget document draft saved.",
    )
    if (forward && routingInstanceId) {
      const requests: CostCenterApprovalRequest[] =
        payroll.requiredCostCenters.map((center) => ({
          id: `${routingInstanceId}-${center.id}`,
          documentReference: next.reference,
          documentType: type,
          relatedPayroll: payroll.reference,
          payrollType: payroll.payrollType,
          payrollPeriod: payroll.payrollPeriod,
          fund: payroll.fund,
          costCenterId: center.id,
          costCenterName: center.name,
          assignedSignatoryAccountId:
            center.id === demoCostCenterAlpha.id
              ? COST_CENTER_SIGNATORY_ACCOUNT_ID
              : "DEMO-CC-BETA-ROUTE-NOT-CONFIGURED",
          approvalStage: `Pending Cost Center ${type} Approval`,
          routingInstanceId,
          state: "Pending",
          receivedAt: now,
          amount,
          basicPay: null,
          otherEarnings: null,
          grossPay: payroll.gross,
          deductions: payroll.deductions,
          netPay: payroll.net,
          employees: payroll.employees
            .filter((employee) => employee.costCenterId === center.id)
            .map((employee) => ({
              employeeId: employee.employeeId,
              name: employee.name,
              payBasis: employee.payBasis,
              basicPay: null,
              otherEarnings: null,
              grossPay: employee.grossPay,
              deductions: employee.deductions,
              netPay: employee.netPay,
              breakdownAvailable: false,
            })),
          supportingDocuments: supportReferences.map((reference, index) => ({
            id: `${id}-SUPPORT-${index + 1}`,
            name:
              index === 0
                ? "Approved Payroll Snapshot"
                : "Supporting Reference",
            type: "Recorded prototype reference",
            reference,
            available: true,
          })),
          requiredCostCenterIds: next.requiredCostCenterIds,
          completedCostCenterIds: [],
          currentHoldingOffice: center.name,
          preparedBy: user.name,
          preparedAt: now,
          previousPayrollApprovalComplete: true,
          decisions: [],
          demo: true,
        }))
      setCostCenterRequests((items) => [
        ...items.filter(
          (request) =>
            !(
              request.documentReference === next.reference &&
              request.state === "Pending"
            ),
        ),
        ...requests,
      ])
      setCostCenterNotifications((items) => [
        ...items,
        ...requests
          .filter(
            (request) =>
              request.assignedSignatoryAccountId ===
              COST_CENTER_SIGNATORY_ACCOUNT_ID,
          )
          .filter(
            (request) => !items.some((item) => item.requestId === request.id),
          )
          .map((request) => ({
            id: `${request.id}-NOTICE`,
            recipientAccountId: request.assignedSignatoryAccountId,
            requestId: request.id,
            title: `New ${type} Approval Request`,
            description: `${type} ${next.reference} is awaiting ${request.costCenterName} review.`,
            documentReference: next.reference,
            documentType: type,
            costCenterId: request.costCenterId,
            costCenterName: request.costCenterName,
            createdAt: now,
            read: false,
          })),
      ])
      setNotifications((items) => [
        ...items,
        {
          id: `${id}-FORWARDED-NOTICE-${now}`,
          eventReference: `${id}-FORWARDED-R${revision}`,
          title: `${type} Forwarded for Cost Center Approval`,
          description: `${type} ${next.reference} was forwarded to the required Cost Centers.`,
          payrollId: payroll.id,
          documentId: id,
          createdAt: now,
          read: false,
          action: "tracking",
        },
      ])
      setSuccess(next)
    }
    lock.current = false
    return next
  }

  return (
    <>
      <div className="grid gap-6">
        <PageHeader
          title={
            returned
              ? "Revise Returned Budget Document"
              : "ORAS/BURAS Preparation"
          }
          subtitle={
            returned
              ? "Review the return remarks, make authorized corrections, and prepare the document for resubmission."
              : "Prepare and review the applicable budget document from an approved payroll."
          }
        />
        <DemoNotice />
        <div className="grid gap-2 rounded-card bg-surface p-4 elevate sm:grid-cols-4">
          {[
            "Select Payroll",
            "Prepare Document",
            "Review",
            "Mark for Approval",
          ].map((label, index) => (
            <div
              key={label}
              className="flex items-center gap-2 text-sm font-medium"
            >
              <span className="grid size-7 place-items-center rounded-full bg-accent text-on-accent">
                {index + 1}
              </span>
              {label}
            </div>
          ))}
        </div>
        {returned && existing?.returnInfo && (
          <div className="grid gap-3">
            <Alert tone="warning" title="This document was returned">
              {existing.returnInfo.remarks} —{" "}
              {existing.returnInfo.costCenterName},{" "}
              {dateTime.format(new Date(existing.returnInfo.recordedAt))}
            </Alert>
            <dl className="grid gap-4 rounded-control border border-border bg-surface p-4 sm:grid-cols-2 xl:grid-cols-3">
              <DataPoint
                label="Original Document Reference"
                value={existing.reference}
              />
              <DataPoint
                label="Linked Approved Payroll"
                value={existing.payrollReference}
              />
              <DataPoint
                label="Current Revision"
                value={String(existing.revision)}
              />
              <DataPoint
                label="Original Proposed Amount"
                value={peso.format(
                  existing.revisions[0]?.amount ?? existing.amount,
                )}
              />
              <DataPoint
                label="Original Particulars"
                value={
                  existing.revisions[0]?.particulars ?? existing.particulars
                }
              />
              <DataPoint
                label="Returning Cost Center"
                value={existing.returnInfo.costCenterName}
              />
              <DataPoint
                label="Recorded Signatory"
                value={existing.returnInfo.actor}
              />
              <DataPoint
                label="Return Date"
                value={dateTime.format(
                  new Date(existing.returnInfo.recordedAt),
                )}
              />
              <DataPoint
                label="Current Workflow Stage"
                value={existing.stage}
              />
              <DataPoint
                label="Return Remarks"
                value={existing.returnInfo.remarks}
              />
            </dl>
            <Alert tone="info" title="Provisional reapproval assumption">
              This fictional route requires a new current-revision decision from
              each required Cost Center. The official scope of repeat approvals
              remains TBD.
            </Alert>
            {!revisionOpen && (
              <div>
                <Button type="button" onClick={() => setRevisionOpen(true)}>
                  Revise Document
                </Button>
              </div>
            )}
          </div>
        )}
        {locked && (
          <Alert tone="warning" title="Document locked">
            This document is currently under approval and cannot be edited.
          </Alert>
        )}
        {message && (
          <Alert
            tone={/saved|forwarded/i.test(message) ? "success" : "warning"}
            title={message}
          >
            Changes are stored only in this local prototype session.
          </Alert>
        )}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="rounded-card bg-surface p-5 elevate">
            <p role="heading" aria-level={2} className="text-lg font-semibold">
              Source Payroll Information
            </p>
            <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
              <DataPoint label="Payroll Reference" value={payroll.reference} />
              <DataPoint label="Payroll Type" value={payroll.payrollType} />
              <DataPoint label="Payroll Period" value={payroll.payrollPeriod} />
              <DataPoint label="Fund Source" value={payroll.fund} />
              <DataPoint
                label="Required Cost Centers"
                value={payroll.requiredCostCenters
                  .map((center) => center.name)
                  .join(", ")}
              />
              <DataPoint
                label="Approved Gross"
                value={peso.format(payroll.gross)}
              />
              <DataPoint
                label="Approved Deductions"
                value={peso.format(payroll.deductions)}
              />
              <DataPoint
                label="Approved Net"
                value={peso.format(payroll.net)}
              />
              <DataPoint
                label="Applicable Budget Document"
                value={type ?? "Fund Configuration Required"}
              />
              <DataPoint
                label="Source Snapshot"
                value={payroll.snapshotVersion}
              />
            </dl>
            <p className="mt-4 text-xs leading-relaxed text-text-muted">
              Budget Office cannot edit the approved payroll, fund, totals, or
              required Cost Centers.
            </p>
          </section>
          <section className="rounded-card bg-surface p-5 elevate">
            <Tag kind="placeholder">
              Provisional Budget Document Form — For Prototype Testing
            </Tag>
            <p
              role="heading"
              aria-level={2}
              className="mt-4 text-xl font-semibold"
            >
              Prepare {type ?? "Budget Document"}
            </p>
            <p className="mt-2 text-sm text-text-muted">
              This is not an approved official university ORAS or BURAS
              template.
            </p>
            <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
              <DataPoint label="Document Type" value={type ?? "Unavailable"} />
              <DataPoint label="Source Payroll" value={payroll.reference} />
              <DataPoint label="Payroll Type" value={payroll.payrollType} />
              <DataPoint label="Payroll Period" value={payroll.payrollPeriod} />
              <DataPoint label="Fund Source" value={payroll.fund} />
              <DataPoint
                label="Required Cost Centers"
                value={payroll.requiredCostCenters
                  .map((center) => center.name)
                  .join(", ")}
              />
              <DataPoint label="Prepared By" value={user.name} />
              <DataPoint
                label="Revision"
                value={String(
                  returned
                    ? (existing?.revision ?? 0) + 1
                    : (existing?.revision ?? 1),
                )}
              />
            </dl>
            <div className="mt-5 grid gap-5">
              <TextField
                label="Budget Document Reference"
                value={values.reference}
                disabled={Boolean(existing) || formLocked}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    reference: event.target.value,
                  }))
                }
                error={errors.reference}
              />
              <div>
                <TextField
                  label="Proposed Budget Document Amount"
                  inputMode="decimal"
                  value={values.amount}
                  disabled={formLocked}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  error={errors.amount}
                />
                {Number.isFinite(amount) &&
                  amount > 0 &&
                  amount !== payroll.net && (
                    <p className="mt-2 text-xs text-warning">
                      Review comparison: proposed amount {peso.format(amount)}{" "}
                      differs from payroll net {peso.format(payroll.net)}. No
                      official equivalence rule is assumed.
                    </p>
                  )}
              </div>
              <MultilineField
                label="Particulars / Description"
                value={values.particulars}
                onChange={(value) =>
                  setValues((current) => ({ ...current, particulars: value }))
                }
                placeholder="Enter a brief description of the budget document."
                required
                error={errors.particulars}
                disabled={formLocked}
              />
              <MultilineField
                label="Preparation Notes (Optional)"
                value={values.notes}
                onChange={(value) =>
                  setValues((current) => ({ ...current, notes: value }))
                }
                placeholder="Enter optional preparation notes."
                disabled={formLocked}
              />
              {returned && (
                <MultilineField
                  label="Correction Explanation"
                  value={values.correction}
                  onChange={(value) =>
                    setValues((current) => ({ ...current, correction: value }))
                  }
                  placeholder="Explain what was changed or reviewed."
                  required
                  error={errors.correction}
                  disabled={formLocked}
                />
              )}
              <TextField
                label="Supporting Document Reference"
                value={values.support}
                disabled={formLocked}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    support: event.target.value,
                  }))
                }
                hint="Optional prototype reference. Official attachment requirements remain TBD."
              />
              <div>
                <p className="mb-1.5 text-sm font-medium">
                  Optional Local Supporting File
                </p>
                <input
                  type="file"
                  disabled={formLocked}
                  onChange={(event) =>
                    setSelectedFile(event.target.files?.[0] ?? null)
                  }
                  className="block w-full rounded-control border border-border-strong bg-surface p-3 text-sm file:mr-3 file:rounded-control file:border-0 file:bg-info-soft file:px-3 file:py-2 file:font-medium file:text-primary"
                />
                <p className="mt-1.5 text-xs text-text-muted">
                  {selectedFile
                    ? `${selectedFile.name} selected in this browser session.`
                    : "No file selected. Files are not uploaded to a server."}
                </p>
              </div>
            </div>
          </section>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={formLocked}
            onClick={() => persist(false)}
          >
            {returned ? "Save Revised Draft" : "Save Draft"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!changed || formLocked}
            onClick={() => {
              setValues(saved)
              setErrors({})
              setMessage("Unsaved changes were discarded.")
            }}
          >
            Discard Unsaved Changes
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (
                !changed ||
                window.confirm("Discard unsaved changes and return?")
              )
                onBrowse()
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (validate(false)) setPreview(true)
            }}
          >
            {returned ? "Review Resubmission" : "Preview Document"}
          </Button>
        </div>
      </div>
      {preview && (
        <Modal
          title="Provisional Document Preview — Not an Official University Form"
          onClose={() => setPreview(false)}
          wide
        >
          <Tag kind="placeholder">Prototype testing only</Tag>
          <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
            <DataPoint
              label="Demo Document Reference"
              value={values.reference}
            />
            <DataPoint label="Document Type" value={type ?? "Unavailable"} />
            <DataPoint label="Linked Payroll" value={payroll.reference} />
            <DataPoint label="Payroll Type" value={payroll.payrollType} />
            <DataPoint label="Payroll Period" value={payroll.payrollPeriod} />
            <DataPoint label="Fund" value={payroll.fund} />
            <DataPoint
              label="Proposed Document Amount"
              value={Number.isFinite(amount) ? peso.format(amount) : "Invalid"}
            />
            <DataPoint label="Prepared By" value={user.name} />
            <DataPoint
              label="Required Cost Centers"
              value={payroll.requiredCostCenters
                .map((center) => center.name)
                .join(", ")}
            />
            <DataPoint
              label="Particulars"
              value={values.particulars || "Not entered"}
            />
            <DataPoint
              label="Preparation Notes"
              value={values.notes || "None"}
            />
          </dl>
          <Alert tone="warning" title="Provisional preview">
            No official signature blocks, certification statements, budget
            account codes, or university template layout are represented.
          </Alert>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPreview(false)}
            >
              Back to Edit
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPreview(false)}
            >
              Close Preview
            </Button>
            <Button
              type="button"
              disabled={locked || !existing || changed}
              onClick={() => {
                if (!existing || changed) {
                  setMessage(
                    "Save the current draft before marking it for approval.",
                  )
                  return
                }
                if (!validate(true)) return
                setPreview(false)
                setConfirm(true)
              }}
            >
              Mark for Approval
            </Button>
          </div>
        </Modal>
      )}
      {confirm && type && (
        <Modal
          title="Mark Budget Document for Approval?"
          onClose={() => setConfirm(false)}
        >
          <p className="text-sm text-text-muted">
            This document will be forwarded to the required Cost Center
            Signatories for review.
          </p>
          <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
            <DataPoint label="Document Reference" value={values.reference} />
            <DataPoint label="Document Type" value={type} />
            <DataPoint label="Related Payroll" value={payroll.reference} />
            <DataPoint label="Payroll Period" value={payroll.payrollPeriod} />
            <DataPoint label="Fund" value={payroll.fund} />
            <DataPoint label="Proposed Amount" value={peso.format(amount)} />
            <DataPoint
              label="Required Cost Centers"
              value={payroll.requiredCostCenters
                .map((center) => center.name)
                .join(", ")}
            />
            <DataPoint
              label="Required Approvals"
              value={String(payroll.requiredCostCenters.length)}
            />
          </dl>
          <Alert tone="warning" title="Preparation is not approval">
            Budget Office prepares this document. Approval must be completed by
            the required Cost Center Signatories.
          </Alert>
          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                const next = persist(true)
                if (next) setConfirm(false)
              }}
            >
              Confirm and Forward
            </Button>
          </div>
        </Modal>
      )}
      {success && (
        <Modal
          title="Budget Document Forwarded"
          onClose={() => setSuccess(null)}
        >
          <p className="text-sm text-text-muted">
            The document has been marked for Cost Center approval in this
            demonstration.
          </p>
          <div className="mt-6 grid gap-3">
            <Button type="button" onClick={() => onTrack(success.id)}>
              Track Approvals
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onHistory(success.id)}
            >
              View Document History
            </Button>
            <Button type="button" variant="secondary" onClick={onBrowse}>
              Back to Approved Payrolls
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}

function documentRequests(
  document: BudgetDocument,
  requests: CostCenterApprovalRequest[],
) {
  return requests.filter(
    (request) =>
      request.documentReference === document.reference &&
      (!document.routingInstanceId ||
        request.routingInstanceId === document.routingInstanceId),
  )
}

function TrackingDetails({
  document,
  payroll,
  requests,
  history,
  onClose,
  onReviewReturn,
}: {
  document: BudgetDocument
  payroll?: BudgetApprovedPayroll
  requests: CostCenterApprovalRequest[]
  history: CostCenterDecision[]
  onClose: () => void
  onReviewReturn: () => void
}) {
  const related = documentRequests(document, requests)
  const approved = completedCostCenters(document, requests)
  const outstanding = document.requiredCostCenterIds.filter(
    (id) => !approved.has(id),
  )
  const decisions = history.filter(
    (event) =>
      event.documentReference === document.reference &&
      (!document.routingInstanceId ||
        event.routingInstanceId === document.routingInstanceId),
  )
  return (
    <Modal title="Cost Center Approval Progress" onClose={onClose} wide>
      <dl className="grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
        <DataPoint label="Document Reference" value={document.reference} />
        <DataPoint label="Linked Payroll" value={document.payrollReference} />
        <DataPoint
          label="Document Revision"
          value={String(document.revision)}
        />
        <DataPoint label="Current Approval Stage" value={document.stage} />
        <DataPoint
          label="Required Cost Centers"
          value={
            payroll?.requiredCostCenters
              .map((center) => center.name)
              .join(", ") ?? "Unavailable"
          }
        />
        <DataPoint
          label="Recorded Approvals"
          value={`${approved.size} of ${document.requiredCostCenterIds.length}`}
        />
        <DataPoint
          label="Outstanding Approvals"
          value={
            outstanding
              .map(
                (id) =>
                  payroll?.requiredCostCenters.find(
                    (center) => center.id === id,
                  )?.name ?? id,
              )
              .join(", ") || "None"
          }
        />
        <DataPoint
          label="Current Holding Office"
          value={document.currentHolder}
        />
      </dl>
      <Alert
        tone={document.stage === "Ready for DV" ? "success" : "info"}
        title={
          document.stage === "Ready for DV"
            ? "All required Cost Center approvals completed"
            : `${approved.size} of ${document.requiredCostCenterIds.length} Cost Center approvals completed`
        }
      >
        {document.stage === "Ready for DV"
          ? "The related payroll is Ready for DV. Budget Office does not create or approve the DV."
          : "The related payroll remains short of Ready for DV while a required current-stage decision is outstanding."}
      </Alert>
      {document.returnInfo && (
        <div className="mt-4">
          <Alert
            tone="warning"
            title={`Returned by ${document.returnInfo.costCenterName}`}
          >
            {document.returnInfo.remarks} ·{" "}
            {dateTime.format(new Date(document.returnInfo.recordedAt))}
          </Alert>
        </div>
      )}
      <p role="heading" aria-level={3} className="mt-6 text-base font-semibold">
        Current Approval Requests
      </p>
      <ul className="mt-3 grid gap-2">
        {related.map((request) => (
          <li
            key={request.id}
            className="rounded-control border border-border p-3 text-sm"
          >
            <span className="font-semibold">{request.costCenterName}</span> ·{" "}
            {request.state} · {request.currentHoldingOffice}
          </li>
        ))}
      </ul>
      <p role="heading" aria-level={3} className="mt-6 text-base font-semibold">
        Approval Timeline
      </p>
      <ul className="mt-3 grid gap-2">
        {[
          ...document.events,
          ...decisions.map((decision) => ({
            id: decision.id,
            action: decision.action,
            actor: decision.actorName,
            office: decision.costCenterName,
            recordedAt: decision.recordedAt,
            remarks: decision.remarks,
            revision: document.revision,
          })),
        ]
          .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
          .map((event) => (
            <li
              key={event.id}
              className="rounded-control bg-canvas p-3 text-sm"
            >
              <p className="font-semibold">{event.action}</p>
              <p className="mt-1 text-xs text-text-muted">
                {event.actor} · {event.office} ·{" "}
                {dateTime.format(new Date(event.recordedAt))} · Revision{" "}
                {event.revision}
              </p>
              {event.remarks && <p className="mt-2">{event.remarks}</p>}
            </li>
          ))}
      </ul>
      <div className="mt-6 flex justify-end gap-3">
        {document.stage === "Returned to Budget Office" && (
          <Button type="button" onClick={onReviewReturn}>
            Review Return
          </Button>
        )}
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  )
}

export function BudgetApprovalTracking({
  payrolls,
  documents,
  costCenterRequests,
  costCenterHistory,
  initialTab = "all",
  initialDocumentId,
  onReviewReturn,
}: {
  payrolls: BudgetApprovedPayroll[]
  documents: BudgetDocument[]
  costCenterRequests: CostCenterApprovalRequest[]
  costCenterHistory: CostCenterDecision[]
  initialTab?: BudgetTrackingTab
  initialDocumentId?: string | null
  onReviewReturn: (payrollId: string, documentId: string) => void
}) {
  const [tab, setTab] = useState<BudgetTrackingTab>(initialTab)
  const [query, setQuery] = useState("")
  const [type, setType] = useState("")
  const [payrollType, setPayrollType] = useState("")
  const [period, setPeriod] = useState("")
  const [fund, setFund] = useState("")
  const [stage, setStage] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(
    initialDocumentId ?? null,
  )
  const filtered = documents.filter((document) => {
    const payroll = payrolls.find((item) => item.id === document.payrollId)
    const tabMatch =
      tab === "all" ||
      (tab === "awaiting" &&
        document.stage === "Awaiting Cost Center Approval") ||
      (tab === "returned" && document.stage === "Returned to Budget Office") ||
      (tab === "completed" && document.stage === "Ready for DV")
    const q = query.trim().toLowerCase()
    return (
      tabMatch &&
      (!q ||
        [document.reference, document.payrollReference].some((value) =>
          value.toLowerCase().includes(q),
        )) &&
      (!type || document.type === type) &&
      (!payrollType || payroll?.payrollType === payrollType) &&
      (!period || payroll?.payrollPeriod === period) &&
      (!fund || document.fund === fund) &&
      (!stage || document.stage === stage)
    )
  })
  const selected = documents.find((document) => document.id === selectedId)
  return (
    <>
      <div className="grid gap-6">
        <PageHeader
          title="Budget Document Approval Tracking"
          subtitle="Monitor ORAS/BURAS documents forwarded to Cost Center Signatories."
        />
        <Alert tone="info" title="Read-only decision tracking">
          Budget Office can monitor recorded decisions but cannot approve or
          return a document as a Cost Center Signatory.
        </Alert>
        <DemoNotice />
        <section className="overflow-hidden rounded-card bg-surface elevate">
          <div className="border-b border-border p-5">
            <div
              role="tablist"
              aria-label="Budget approval tracking views"
              className="grid gap-1 rounded-control bg-canvas p-1 sm:grid-cols-4"
            >
              {([
                ["all", "All Documents"],
                ["awaiting", "Awaiting Cost Center Approval"],
                ["returned", "Returned to Budget"],
                ["completed", "Completed Approvals"],
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
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <TextField
                label="Search Documents"
                icon="search"
                placeholder="Search ORAS/BURAS or related payroll reference..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <SelectField
                label="Document Type"
                value={type}
                onChange={(event) => setType(event.target.value)}
                placeholder="ORAS and BURAS"
              >
                <option value="ORAS">ORAS</option>
                <option value="BURAS">BURAS</option>
              </SelectField>
              <SelectField
                label="Payroll Type"
                value={payrollType}
                onChange={(event) => setPayrollType(event.target.value)}
                placeholder="All payroll types"
              >
                {[...new Set(payrolls.map((item) => item.payrollType))].map(
                  (value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ),
                )}
              </SelectField>
              <SelectField
                label="Payroll Period"
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                placeholder="All periods"
              >
                {[...new Set(payrolls.map((item) => item.payrollPeriod))].map(
                  (value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ),
                )}
              </SelectField>
              <SelectField
                label="Fund"
                value={fund}
                onChange={(event) => setFund(event.target.value)}
                placeholder="All funds"
              >
                <option value="F01">F01</option>
                <option value="F05">F05</option>
                <option value="F07">F07</option>
              </SelectField>
              <SelectField
                label="Current Stage"
                value={stage}
                onChange={(event) => setStage(event.target.value)}
                placeholder="All stages"
              >
                {[...new Set(documents.map((item) => item.stage))].map(
                  (value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ),
                )}
              </SelectField>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setQuery("")
                  setType("")
                  setPayrollType("")
                  setPeriod("")
                  setFund("")
                  setStage("")
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
          {filtered.length ? (
            <ul className="divide-y divide-border">
              {filtered.map((document) => {
                const payroll = payrolls.find(
                  (item) => item.id === document.payrollId,
                )
                const approved = completedCostCenters(
                  document,
                  costCenterRequests,
                ).size
                return (
                  <li
                    key={document.id}
                    className="grid gap-4 p-5 lg:grid-cols-3"
                  >
                    <DataPoint
                      label="Document / Type"
                      value={`${document.reference} · ${document.type}`}
                    />
                    <DataPoint
                      label="Related Payroll / Fund"
                      value={`${document.payrollReference} · ${document.fund}`}
                    />
                    <DataPoint
                      label="Document Amount"
                      value={peso.format(document.amount)}
                    />
                    <DataPoint
                      label="Required Cost Centers"
                      value={
                        payroll?.requiredCostCenters
                          .map((center) => center.name)
                          .join(", ") ?? "Unavailable"
                      }
                    />
                    <DataPoint
                      label="Completed Approvals"
                      value={`${approved} of ${document.requiredCostCenterIds.length}`}
                    />
                    <DataPoint
                      label="Stage / Current Holder"
                      value={`${document.stage} · ${document.currentHolder}`}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setSelectedId(document.id)}
                    >
                      Track Document
                    </Button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="p-8 text-center font-semibold">
              No documents match the selected tracking view.
            </p>
          )}
        </section>
      </div>
      {selected && (
        <TrackingDetails
          document={selected}
          payroll={payrolls.find((item) => item.id === selected.payrollId)}
          requests={costCenterRequests}
          history={costCenterHistory}
          onClose={() => setSelectedId(null)}
          onReviewReturn={() => onReviewReturn(selected.payrollId, selected.id)}
        />
      )}
    </>
  )
}

function DocumentDetails({
  document,
  onClose,
}: {
  document: BudgetDocument
  onClose: () => void
}) {
  return (
    <Modal title="Budget Document Details" onClose={onClose} wide>
      <Tag kind="placeholder">Fictional Demonstration Data</Tag>
      <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
        <DataPoint label="Document Reference" value={document.reference} />
        <DataPoint label="Document Type" value={document.type} />
        <DataPoint label="Linked Payroll" value={document.payrollReference} />
        <DataPoint label="Source Fund" value={document.fund} />
        <DataPoint
          label="Source Payroll Snapshot"
          value={document.sourceSnapshotVersion}
        />
        <DataPoint label="Current Revision" value={String(document.revision)} />
        <DataPoint label="Current State" value={document.stage} />
        <DataPoint label="Prepared By" value={document.preparedBy} />
        <DataPoint
          label="Date Prepared"
          value={dateTime.format(new Date(document.createdAt))}
        />
        <DataPoint label="Current Holder" value={document.currentHolder} />
        <DataPoint
          label="Document Amount"
          value={peso.format(document.amount)}
        />
        <DataPoint
          label="Supporting Records"
          value={document.supportReferences.join(", ") || "None"}
        />
        <DataPoint label="Particulars" value={document.particulars} />
        <DataPoint label="Preparation Notes" value={document.notes || "None"} />
      </dl>
      <p role="heading" aria-level={3} className="mt-6 text-base font-semibold">
        Approval and Return History
      </p>
      <ul className="mt-3 grid gap-2">
        {document.events.map((event) => (
          <li
            key={event.id}
            className="rounded-control border border-border p-3 text-sm"
          >
            <p className="font-semibold">{event.action}</p>
            <p className="mt-1 text-xs text-text-muted">
              {event.actor} · {event.office} ·{" "}
              {dateTime.format(new Date(event.recordedAt))}
            </p>
            {event.remarks && <p className="mt-2">{event.remarks}</p>}
          </li>
        ))}
      </ul>
      <div className="mt-6 flex justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  )
}

export function BudgetDocumentHistory({
  documents,
  payrolls,
  initialTab = "all",
  initialDocumentId,
  onEdit,
  onTrack,
}: {
  documents: BudgetDocument[]
  payrolls: BudgetApprovedPayroll[]
  initialTab?: BudgetHistoryTab
  initialDocumentId?: string | null
  onEdit: (payrollId: string, documentId: string) => void
  onTrack: (documentId: string) => void
}) {
  const [tab, setTab] = useState<BudgetHistoryTab>(initialTab)
  const [query, setQuery] = useState("")
  const [type, setType] = useState("")
  const [fund, setFund] = useState("")
  const [period, setPeriod] = useState("")
  const [date, setDate] = useState("")
  const [detailId, setDetailId] = useState<string | null>(
    initialDocumentId ?? null,
  )
  const [revisionsId, setRevisionsId] = useState<string | null>(null)
  const filtered = documents.filter((document) => {
    const payroll = payrolls.find((item) => item.id === document.payrollId)
    const tabMatch =
      tab === "all" ||
      (tab === "draft" && document.stage === "Draft") ||
      (tab === "forwarded" &&
        document.stage === "Awaiting Cost Center Approval") ||
      (tab === "returned" && document.stage === "Returned to Budget Office") ||
      (tab === "completed" && document.stage === "Ready for DV")
    const q = query.trim().toLowerCase()
    return (
      tabMatch &&
      (!q ||
        [document.reference, document.payrollReference].some((value) =>
          value.toLowerCase().includes(q),
        )) &&
      (!type || document.type === type) &&
      (!fund || document.fund === fund) &&
      (!period || payroll?.payrollPeriod === period) &&
      (!date || document.createdAt.slice(0, 10) === date)
    )
  })
  const detail = documents.find((document) => document.id === detailId)
  const revisions = documents.find((document) => document.id === revisionsId)
  return (
    <>
      <div className="grid gap-6">
        <PageHeader
          title="Document History"
          subtitle="View budget documents prepared, forwarded, returned, and completed by Budget Office."
        />
        <DemoNotice />
        <section className="overflow-hidden rounded-card bg-surface elevate">
          <div className="border-b border-border p-5">
            <div
              role="tablist"
              aria-label="Document history views"
              className="grid gap-1 rounded-control bg-canvas p-1 sm:grid-cols-5"
            >
              {([
                ["all", "All Documents"],
                ["draft", "Drafts"],
                ["forwarded", "Forwarded"],
                ["returned", "Returned"],
                ["completed", "Completed"],
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
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <TextField
                label="Document or Payroll Reference"
                icon="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <SelectField
                label="Document Type"
                value={type}
                onChange={(event) => setType(event.target.value)}
                placeholder="All types"
              >
                <option value="ORAS">ORAS</option>
                <option value="BURAS">BURAS</option>
              </SelectField>
              <SelectField
                label="Fund"
                value={fund}
                onChange={(event) => setFund(event.target.value)}
                placeholder="All funds"
              >
                <option value="F01">F01</option>
                <option value="F05">F05</option>
                <option value="F07">F07</option>
              </SelectField>
              <SelectField
                label="Payroll Period"
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                placeholder="All periods"
              >
                {[...new Set(payrolls.map((item) => item.payrollPeriod))].map(
                  (value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ),
                )}
              </SelectField>
              <TextField
                label="Date Prepared"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setQuery("")
                  setType("")
                  setFund("")
                  setPeriod("")
                  setDate("")
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
          {filtered.length ? (
            <ul className="divide-y divide-border">
              {filtered.map((document) => {
                const payroll = payrolls.find(
                  (item) => item.id === document.payrollId,
                )
                return (
                  <li
                    key={document.id}
                    className="grid gap-4 p-5 lg:grid-cols-3"
                  >
                    <DataPoint
                      label="Document / Type"
                      value={`${document.reference} · ${document.type}`}
                    />
                    <DataPoint
                      label="Payroll / Period"
                      value={`${document.payrollReference} · ${payroll?.payrollPeriod ?? "Unavailable"}`}
                    />
                    <DataPoint
                      label="Fund / Amount"
                      value={`${document.fund} · ${peso.format(document.amount)}`}
                    />
                    <DataPoint
                      label="Prepared By / Date"
                      value={`${document.preparedBy} · ${dateTime.format(new Date(document.createdAt))}`}
                    />
                    <DataPoint
                      label="Current State"
                      value={<StatusTag stage={document.stage} />}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setDetailId(document.id)}
                      >
                        View Document
                      </Button>
                      {(document.stage === "Draft" ||
                        document.stage === "Returned to Budget Office") && (
                        <Button
                          type="button"
                          onClick={() =>
                            onEdit(document.payrollId, document.id)
                          }
                        >
                          {document.stage === "Draft"
                            ? "Continue Draft"
                            : "Review Return"}
                        </Button>
                      )}
                      {document.stage === "Awaiting Cost Center Approval" ||
                      document.stage === "Ready for DV" ? (
                        <Button
                          type="button"
                          onClick={() => onTrack(document.id)}
                        >
                          Track Approval
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="link"
                        onClick={() => setRevisionsId(document.id)}
                      >
                        View Revisions
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="p-8 text-center font-semibold">
              No documents match the selected history view.
            </p>
          )}
        </section>
      </div>
      {detail && (
        <DocumentDetails document={detail} onClose={() => setDetailId(null)} />
      )}
      {revisions && (
        <Modal
          title="Document Revisions"
          onClose={() => setRevisionsId(null)}
          wide
        >
          <ul className="grid gap-3">
            {revisions.revisions.map((revision) => (
              <li
                key={revision.id}
                className="rounded-control border border-border p-4"
              >
                <p className="font-semibold">Revision {revision.revision}</p>
                <p className="mt-1 text-xs text-text-muted">
                  {revision.updatedBy} ·{" "}
                  {dateTime.format(new Date(revision.updatedAt))}
                </p>
                <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                  <DataPoint
                    label="Amount"
                    value={peso.format(revision.amount)}
                  />
                  <DataPoint label="Particulars" value={revision.particulars} />
                  <DataPoint label="Notes" value={revision.notes || "None"} />
                  <DataPoint
                    label="Correction Explanation"
                    value={revision.correctionExplanation ?? "Not applicable"}
                  />
                </dl>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setRevisionsId(null)}
            >
              Close
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}

export function BudgetNotifications({
  notifications,
  setNotifications,
  onPayroll,
  onPrepare,
  onReturn,
  onTrack,
}: {
  notifications: BudgetNotification[]
  setNotifications: Dispatch<SetStateAction<BudgetNotification[]>>
  onPayroll: (payrollId: string) => void
  onPrepare: (payrollId: string) => void
  onReturn: (documentId: string) => void
  onTrack: (documentId: string) => void
}) {
  const [tab, setTab] = useState<"all" | "unread">("all")
  const visible = notifications
    .filter((item) => tab === "all" || !item.read)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const open = (notice: BudgetNotification) => {
    setNotifications((items) =>
      items.map((item) =>
        item.id === notice.id ? { ...item, read: true } : item,
      ),
    )
    if (notice.action === "prepare" && notice.payrollId)
      onPrepare(notice.payrollId)
    else if (notice.action === "payroll" && notice.payrollId)
      onPayroll(notice.payrollId)
    else if (notice.action === "return" && notice.documentId)
      onReturn(notice.documentId)
    else if (notice.action === "tracking" && notice.documentId)
      onTrack(notice.documentId)
  }
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Notifications"
        subtitle="Updates about approved payrolls, budget document preparation, and Cost Center approval decisions."
      />
      <DemoNotice />
      <section className="rounded-card bg-surface p-5 elevate">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div
            role="tablist"
            aria-label="Notification views"
            className="grid grid-cols-2 gap-1 rounded-control bg-canvas p-1"
          >
            {(["all", "unread"] as const).map((id) => (
              <Button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                variant={tab === id ? "primary" : "secondary"}
                onClick={() => setTab(id)}
              >
                {id === "all" ? "All" : "Unread"}
              </Button>
            ))}
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
          <ul className="mt-5 divide-y divide-border rounded-control border border-border">
            {visible.map((notice) => (
              <li
                key={notice.id}
                className={clsx("p-4", !notice.read && "bg-info-soft")}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={clsx(
                      "mt-1 size-2.5 shrink-0 rounded-full",
                      notice.read ? "bg-border-strong" : "bg-accent",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{notice.title}</p>
                    <p className="mt-1 text-sm text-text-muted">
                      {notice.description}
                    </p>
                    <p className="mt-2 text-xs text-text-muted">
                      {dateTime.format(new Date(notice.createdAt))}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => open(notice)}
                      >
                        {notice.action === "prepare"
                          ? "Prepare Document"
                          : notice.action === "return"
                            ? "Review Return"
                            : notice.action === "tracking"
                              ? "Track Approval"
                              : "View Payroll"}
                      </Button>
                      {!notice.read && (
                        <Button
                          type="button"
                          variant="link"
                          onClick={() =>
                            setNotifications((items) =>
                              items.map((item) =>
                                item.id === notice.id
                                  ? { ...item, read: true }
                                  : item,
                              ),
                            )
                          }
                        >
                          Mark as Read
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 rounded-control bg-canvas p-8 text-center font-semibold">
            No {tab === "unread" ? "unread " : ""}notifications.
          </p>
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

export function BudgetDashboard({
  payrolls,
  documents,
  costCenterRequests,
  user,
  onApproved,
  onPrepare,
  onReview,
  onTrack,
  onHistory,
}: {
  payrolls: BudgetApprovedPayroll[]
  documents: BudgetDocument[]
  costCenterRequests: CostCenterApprovalRequest[]
  user: MockUser
  onApproved: (tab?: BudgetApprovedTab) => void
  onPrepare: (payrollId: string, documentId?: string) => void
  onReview: (payrollId: string, documentId: string) => void
  onTrack: (documentId?: string, tab?: BudgetTrackingTab) => void
  onHistory: (documentId?: string) => void
}) {
  const eligible = payrolls.filter(payrollEligible)
  const awaiting = eligible.filter(
    (payroll) => !documentForPayroll(payroll.id, documents),
  )
  const returned = documents.filter(
    (document) => document.stage === "Returned to Budget Office",
  )
  const forwarded = documents.filter(
    (document) => document.stage === "Awaiting Cost Center Approval",
  )
  const completed = documents.filter(
    (document) => document.stage === "Ready for DV",
  )
  const activity = documents
    .flatMap((document) =>
      document.events.map((event) => ({
        ...event,
        documentId: document.id,
        documentReference: document.reference,
      })),
    )
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Budget Office Dashboard"
        subtitle="Monitor approved payrolls, budget-document preparation, and Cost Center approval progress."
      />
      <DemoNotice />
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-lg font-semibold">Welcome back, {user.name}</p>
        <Tag kind="placeholder">Demo Data</Tag>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Awaiting Preparation"
          count={awaiting.length}
          action="View Approved Payrolls"
          onAction={() => onApproved("awaiting")}
        />
        <SummaryCard
          title="Drafts / Returned"
          count={
            documents.filter(
              (document) =>
                document.stage === "Draft" ||
                document.stage === "Returned to Budget Office",
            ).length
          }
          action="Review Documents"
          onAction={() => onApproved("progress")}
        />
        <SummaryCard
          title="Awaiting Cost Center Approval"
          count={forwarded.length}
          action="Track Approvals"
          onAction={() => onTrack(undefined, "awaiting")}
        />
        <SummaryCard
          title="Ready for DV"
          count={completed.length}
          action="View Completed Approvals"
          onAction={() => onTrack(undefined, "completed")}
        />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-card bg-surface p-5 elevate">
          <p role="heading" aria-level={2} className="text-lg font-semibold">
            Approved Payrolls Awaiting Preparation
          </p>
          <ul className="mt-4 grid gap-3">
            {awaiting.slice(0, 5).map((payroll) => (
              <li
                key={payroll.id}
                className="rounded-control border border-border p-4"
              >
                <DataPoint
                  label="Payroll"
                  value={`${payroll.reference} · ${payroll.payrollType}`}
                />
                <DataPoint
                  label="Period / Fund / Required Document"
                  value={`${payroll.payrollPeriod} · ${payroll.fund} · ${documentTypeForFund(payroll.fund)}`}
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-3"
                  onClick={() => onPrepare(payroll.id)}
                >
                  Prepare {documentTypeForFund(payroll.fund)}
                </Button>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-card bg-surface p-5 elevate">
          <p role="heading" aria-level={2} className="text-lg font-semibold">
            Returned Documents
          </p>
          {returned.length ? (
            <ul className="mt-4 grid gap-3">
              {returned.map((document) => (
                <li
                  key={document.id}
                  className="rounded-control border border-border p-4"
                >
                  <DataPoint
                    label="Document / Payroll"
                    value={`${document.reference} · ${document.payrollReference}`}
                  />
                  <DataPoint
                    label="Returning Cost Center / Date"
                    value={`${document.returnInfo?.costCenterName ?? "Unavailable"} · ${
                      document.returnInfo
                        ? dateTime.format(
                            new Date(document.returnInfo.recordedAt),
                          )
                        : "Unavailable"
                    }`}
                  />
                  <Button
                    type="button"
                    className="mt-3"
                    onClick={() => onReview(document.payrollId, document.id)}
                  >
                    Review Return
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-text-muted">
              No returned documents require action.
            </p>
          )}
        </section>
        <section className="rounded-card bg-surface p-5 elevate">
          <p role="heading" aria-level={2} className="text-lg font-semibold">
            Approval Progress
          </p>
          {forwarded.length ? (
            <ul className="mt-4 grid gap-3">
              {forwarded.map((document) => {
                const approved = completedCostCenters(
                  document,
                  costCenterRequests,
                ).size
                return (
                  <li
                    key={document.id}
                    className="rounded-control border border-border p-4"
                  >
                    <DataPoint
                      label="Document / Payroll"
                      value={`${document.reference} · ${document.payrollReference}`}
                    />
                    <DataPoint
                      label="Approval Progress / Stage"
                      value={`${approved} of ${document.requiredCostCenterIds.length} approved · ${document.stage}`}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      className="mt-3"
                      onClick={() => onTrack(document.id)}
                    >
                      Track Approval
                    </Button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-text-muted">
              No documents are awaiting Cost Center approval.
            </p>
          )}
        </section>
        <section className="rounded-card bg-surface p-5 elevate">
          <p role="heading" aria-level={2} className="text-lg font-semibold">
            Recent Activity
          </p>
          <ul className="mt-4 grid gap-3">
            {activity.slice(0, 5).map((event) => (
              <li key={event.id} className="rounded-control bg-canvas p-3">
                <p className="font-semibold">{event.action}</p>
                <p className="mt-1 text-xs text-text-muted">
                  {event.documentReference} · {event.actor} / {event.office} ·{" "}
                  {dateTime.format(new Date(event.recordedAt))}
                </p>
                <Button
                  type="button"
                  variant="link"
                  className="mt-2"
                  onClick={() => onHistory(event.documentId)}
                >
                  View Details
                </Button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

export function BudgetHeaderBell({
  notifications,
  onOpen,
}: {
  notifications: BudgetNotification[]
  onOpen: () => void
}) {
  const { open, setOpen, ref } = usePopover()
  const unread = notifications.filter((item) => !item.read)
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        data-trigger
        aria-label={`Budget notifications${
          unread.length ? `, ${unread.length} unread` : ""
        }`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="relative grid size-10 place-items-center rounded-control text-text-muted hover:bg-info-soft hover:text-text"
      >
        <Icon name="bell" size={19} />
        {unread.length > 0 && (
          <span className="absolute right-1.5 top-1.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-xs font-bold text-on-accent">
            {unread.length}
          </span>
        )}
      </button>
      {open && (
        <div className="elevate absolute right-0 z-30 mt-2 w-80 max-w-[calc(100vw-1.5rem)] rounded-card bg-surface p-3">
          <p className="font-semibold">Budget notifications</p>
          <p className="mt-1 text-xs text-text-muted">
            {unread.length} unread update{unread.length === 1 ? "" : "s"}
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-3 w-full"
            onClick={() => {
              setOpen(false)
              onOpen()
            }}
          >
            Open Notifications
          </Button>
        </div>
      )}
    </div>
  )
}
