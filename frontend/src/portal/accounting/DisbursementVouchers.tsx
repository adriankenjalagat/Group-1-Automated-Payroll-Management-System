import clsx from "clsx"
import { useMemo, useState, type Dispatch, type SetStateAction } from "react"
import { Alert, Button, Icon, TextField } from "../../MsuPayroll"
import { Modal, SelectField, Tag } from "../../admin/ui"
import {
  dvTotals,
  type DvEvent,
  type DvRecord,
  type DvStage,
  type SupportingDocument,
} from "./dvData"

type MainTab = "ready" | "approval" | "returned" | "history"
type DetailTab = "information" | "payroll" | "documents" | "journal" | "validation"
type ValidationState = "Passed" | "Needs Review" | "Missing Data" | "Configuration Required"

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
    <div>
      <dt className="text-xs font-medium text-text-muted">{label}</dt>
      <dd
        className={clsx(
          "mt-1 text-sm font-medium leading-snug break-words",
          muted && "text-text-muted",
        )}
      >
        {value}
      </dd>
    </div>
  )
}

function SectionTitle({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div>
      <p role="heading" aria-level={2} className="text-lg font-semibold">
        {title}
      </p>
      {description && (
        <p className="mt-1 text-sm text-text-muted">{description}</p>
      )}
    </div>
  )
}

function ValidationBadge({ state }: { state: ValidationState }) {
  const style =
    state === "Passed"
      ? "bg-success-soft text-success"
      : state === "Needs Review"
        ? "bg-warning-soft text-warning"
        : "bg-danger-soft text-danger"
  return (
    <span
      className={clsx(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        style,
      )}
    >
      {state}
    </span>
  )
}

function stageTone(stage: DvStage) {
  if (stage === "DV Approved") return "bg-success-soft text-success"
  if (stage === "Returned to Accounting") return "bg-danger-soft text-danger"
  if (stage === "Configuration Required") return "bg-danger-soft text-danger"
  if (
    stage === "Awaiting Accountant Review" ||
    stage === "Awaiting Chancellor Review"
  )
    return "bg-warning-soft text-warning"
  return "bg-info-soft text-primary"
}

function lastActivity(record: DvRecord) {
  return [...record.events].sort((a, b) => b.at.localeCompare(a.at))[0]?.at
}

function validationFor(record: DvRecord) {
  const totals = dvTotals(record)
  const checks: {
    id: string
    label: string
    state: ValidationState
    detail: string
    blocking: boolean
  }[] = [
    {
      id: "payroll",
      label: "Related payroll exists",
      state: record.prerequisites.payrollExists ? "Passed" : "Missing Data",
      detail: record.prerequisites.payrollExists
        ? "The isolated approved payroll snapshot is available."
        : "Required payroll or approval information is unavailable.",
      blocking: !record.prerequisites.payrollExists,
    },
    {
      id: "payroll-approvals",
      label: "Required payroll approvals are complete",
      state: record.prerequisites.payrollApprovalsComplete
        ? "Passed"
        : "Missing Data",
      detail: record.prerequisites.payrollApprovalsComplete
        ? "Required fictional prerequisite decisions are represented in the isolated scenario."
        : "Required Cost Center payroll approvals are missing.",
      blocking: !record.prerequisites.payrollApprovalsComplete,
    },
    {
      id: "budget",
      label: `Approved ${record.budgetDocument.type} is available`,
      state:
        record.prerequisites.budgetDocumentExists &&
        record.budgetDocument.approved
          ? "Passed"
          : "Missing Data",
      detail:
        record.budgetDocument.reference ??
        "The applicable approved ORAS/BURAS is not available.",
      blocking:
        !record.prerequisites.budgetDocumentExists ||
        !record.budgetDocument.approved,
    },
    {
      id: "budget-approvals",
      label: "Budget-document Cost Center approvals are complete",
      state: record.prerequisites.budgetApprovalsComplete
        ? "Passed"
        : "Missing Data",
      detail: record.prerequisites.budgetApprovalsComplete
        ? "The isolated scenario records completion of the required fictional approvals."
        : "Required budget-document approvals are missing.",
      blocking: !record.prerequisites.budgetApprovalsComplete,
    },
    {
      id: "ready",
      label: "Ready for DV stage is recorded",
      state: record.prerequisites.readyForDvRecorded
        ? "Passed"
        : "Missing Data",
      detail: record.prerequisites.readyForDvRecorded
        ? "The isolated scenario reached Ready for DV after its prerequisites."
        : "The payroll has not reached Ready for DV.",
      blocking: !record.prerequisites.readyForDvRecorded,
    },
    {
      id: "documents",
      label: "Required supporting references are available",
      state: record.supportingDocuments.every((item) => item.available)
        ? "Passed"
        : "Missing Data",
      detail: record.supportingDocuments.every((item) => item.available)
        ? "All references required by this isolated scenario are available."
        : "One or more supporting document references are missing.",
      blocking: !record.supportingDocuments.every((item) => item.available),
    },
    {
      id: "amount",
      label: "DV amount reconciles with the approved payroll snapshot",
      state:
        record.amount !== null &&
        record.amount === record.payrollSnapshot.netPay
          ? "Passed"
          : record.amount === null
            ? "Configuration Required"
            : "Needs Review",
      detail:
        record.amount === null
          ? "Amount unavailable — configuration required."
          : record.amount === record.payrollSnapshot.netPay
            ? `${peso.format(record.amount)} reconciles with the stored net payroll snapshot.`
            : "The voucher amount does not reconcile with the related approved payroll total.",
      blocking:
        record.amount === null ||
        record.amount !== record.payrollSnapshot.netPay,
    },
    {
      id: "journal",
      label: "Journal entry data is configured and balanced",
      state: !record.journalConfigurationReference
        ? "Configuration Required"
        : totals.debit === totals.credit && totals.debit > 0
          ? "Passed"
          : "Needs Review",
      detail: !record.journalConfigurationReference
        ? "Journal entry generation requires confirmed accounting configuration."
        : totals.debit === totals.credit && totals.debit > 0
          ? `Demonstration debit and credit totals both equal ${peso.format(totals.debit)}. No official account assignment is claimed.`
          : "Demonstration journal totals do not balance.",
      blocking:
        !record.journalConfigurationReference ||
        totals.debit !== totals.credit ||
        totals.debit <= 0,
    },
    {
      id: "route",
      label: "Accountant approval route is configured",
      state: record.accountantRouteConfigured
        ? "Passed"
        : "Configuration Required",
      detail: record.accountantRouteConfigured
        ? "The isolated scenario identifies Accountant as the next workflow role."
        : "The Accountant approval route is not configured for this voucher.",
      blocking: !record.accountantRouteConfigured,
    },
  ]
  return {
    checks,
    valid: checks.every((item) => !item.blocking),
    debit: totals.debit,
    credit: totals.credit,
  }
}

function DocumentPreview({
  document,
  onClose,
}: {
  document: SupportingDocument
  onClose: () => void
}) {
  return (
    <Modal title="Supporting Document Preview" onClose={onClose}>
      {document.available ? (
        <>
          <Tag kind="placeholder">Read-only fictional reference</Tag>
          <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4">
            <DataPoint label="Document Group" value={document.group} />
            <DataPoint label="Document" value={document.name} />
            <DataPoint
              label="Reference"
              value={document.reference ?? "Reference unavailable"}
              muted={!document.reference}
            />
            <DataPoint
              label="Approval Information"
              value={
                document.approvalInformation ??
                "Approval information unavailable"
              }
            />
            <DataPoint
              label="Recorded Completion Date"
              value={
                document.completedAt
                  ? dateTime.format(new Date(document.completedAt))
                  : "Not recorded"
              }
              muted={!document.completedAt}
            />
          </dl>
          <p className="mt-4 text-xs text-text-muted">
            This is a structured local reference, not a generated official
            document image or replacement for original paper records.
          </p>
        </>
      ) : (
        <Alert tone="warning" title="Document unavailable">
          The selected approval document is not available.
        </Alert>
      )}
      <div className="mt-5 flex justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>
          Close Preview
        </Button>
      </div>
    </Modal>
  )
}

function HistoryDialog({
  record,
  onClose,
}: {
  record: DvRecord
  onClose: () => void
}) {
  const events = [...record.events].sort((a, b) => a.at.localeCompare(b.at))
  return (
    <Modal title="DV Review and Approval History" onClose={onClose} wide>
      <p className="-mt-3 text-sm text-text-muted">
        Recorded local events for {record.id}. History is read-only.
      </p>
      <ul className="mt-5 grid gap-3">
        {events.map((event) => (
          <li key={event.id} className="rounded-control bg-canvas p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-semibold">{event.action}</p>
              <span className="text-xs text-text-muted">
                {dateTime.format(new Date(event.at))}
              </span>
            </div>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <DataPoint
                label="User / Office"
                value={`${event.user ?? "User not recorded"} · ${event.office}`}
              />
              <DataPoint
                label="Remarks"
                value={event.remarks ?? "No remarks recorded"}
              />
            </dl>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-text-muted">
        Local audit-like history cannot be deleted from this interface and is
        not represented as a production immutable audit log.
      </p>
      <div className="mt-5 flex justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  )
}

function ProgressDialog({
  record,
  onClose,
}: {
  record: DvRecord
  onClose: () => void
}) {
  const stages = [
    {
      name: "Accounting DV Review",
      office: "Accounting Section",
      complete: Boolean(record.checkedAt),
      current:
        record.stage === "Ready for Accounting Review" ||
        record.stage === "Checked — Ready to Forward" ||
        record.stage === "Returned to Accounting",
    },
    {
      name: "Accountant DV Review",
      office: "Accountant",
      complete: record.events.some(
        (event) =>
          /Accountant/i.test(event.office) && /approved/i.test(event.action),
      ),
      current: record.stage === "Awaiting Accountant Review",
    },
    {
      name: "Chancellor DV Review",
      office: "Office of the Chancellor",
      complete: record.stage === "DV Approved",
      current: record.stage === "Awaiting Chancellor Review",
    },
  ]
  return (
    <Modal title="DV Approval Progress" onClose={onClose} wide>
      <Alert tone="info" title="Read-only monitoring">
        Accounting cannot perform Accountant or Chancellor approval actions from
        this view.
      </Alert>
      <ol className="mt-5 grid gap-3">
        {stages.map((stage, index) => (
          <li
            key={stage.name}
            className="rounded-control border border-border p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-on-primary">
                  {index + 1}
                </span>
                <div>
                  <p className="font-semibold">{stage.name}</p>
                  <p className="mt-1 text-xs text-text-muted">
                    Responsible office: {stage.office}
                  </p>
                </div>
              </div>
              <span
                className={clsx(
                  "rounded-full px-2.5 py-1 text-xs font-semibold",
                  stage.complete
                    ? "bg-success-soft text-success"
                    : stage.current
                      ? "bg-warning-soft text-warning"
                      : "bg-canvas text-text-muted",
                )}
              >
                {stage.complete
                  ? "Completed"
                  : stage.current
                    ? "Current / Pending"
                    : "Not Yet Reached"}
              </span>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-5 flex justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  )
}

function PayrollSnapshotDialog({
  record,
  onClose,
}: {
  record: DvRecord
  onClose: () => void
}) {
  const snapshot = record.payrollSnapshot
  return (
    <Modal title="Related Payroll Details" onClose={onClose} wide>
      <Tag kind="placeholder">Isolated approved calculation snapshot</Tag>
      <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
        <DataPoint label="Payroll Reference" value={record.payrollId} />
        <DataPoint label="Payroll Type" value={record.payrollTypeName} />
        <DataPoint label="Payroll Period" value={record.period} />
        <DataPoint label="Fund" value={record.fund} />
        <DataPoint
          label="Included Employees"
          value={String(snapshot.includedEmployeeCount)}
        />
        <DataPoint
          label="Applicable Cost Centers"
          value={snapshot.costCenters.join(", ")}
        />
        <DataPoint
          label="Total Basic Pay"
          value={peso.format(snapshot.basicPay)}
        />
        <DataPoint
          label="Total Other Earnings"
          value={peso.format(snapshot.otherEarnings)}
        />
        <DataPoint
          label="Total Gross Pay"
          value={peso.format(snapshot.grossPay)}
        />
        <DataPoint
          label="Total Deductions"
          value={peso.format(snapshot.deductions)}
        />
        <DataPoint label="Total Net Pay" value={peso.format(snapshot.netPay)} />
        <DataPoint
          label="Recorded Payroll Approval Information"
          value={snapshot.approvalInformation}
        />
      </dl>
      <Alert tone="warning" title="Source snapshot is read-only">
        Payroll amounts cannot be edited in the DV module. Corrections require
        the separately authorized payroll and reapproval workflow.
      </Alert>
      <div className="mt-5 flex justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  )
}

function ReturnDialog({
  record,
  onClose,
  onReview,
  onPayroll,
  onDocuments,
}: {
  record: DvRecord
  onClose: () => void
  onReview: () => void
  onPayroll: () => void
  onDocuments: () => void
}) {
  const info = record.returnInfo
  if (!info) return null
  return (
    <Modal title="Returned Disbursement Voucher" onClose={onClose} wide>
      <section>
        <SectionTitle title="DV Information" />
        <dl className="mt-3 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
          <DataPoint label="DV Reference" value={record.id} />
          <DataPoint label="Payroll Reference" value={record.payrollId} />
          <DataPoint label="Payroll Type" value={record.payrollTypeName} />
          <DataPoint label="Payroll Period" value={record.period} />
          <DataPoint label="Fund" value={record.fund} />
          <DataPoint
            label="DV Amount"
            value={
              record.amount !== null
                ? peso.format(record.amount)
                : "Amount unavailable — configuration required."
            }
          />
        </dl>
      </section>
      <section className="mt-6">
        <SectionTitle title="Return Information" />
        <dl className="mt-3 grid gap-4 rounded-control border border-border p-4 sm:grid-cols-2">
          <DataPoint label="Returning Office" value={info.office} />
          <DataPoint
            label="Recorded Return Date"
            value={dateTime.format(new Date(info.at))}
          />
          <DataPoint label="Returning Approval Stage" value={info.stage} />
          <DataPoint label="Complete Return Remarks" value={info.remarks} />
          <DataPoint label="Identified Issue Source" value={info.issueSource} />
        </dl>
      </section>
      <section className="mt-6">
        <SectionTitle title="Available Approval History" />
        <ul className="mt-3 grid gap-2">
          {record.events.map((event) => (
            <li
              key={event.id}
              className="rounded-control bg-canvas p-3 text-sm"
            >
              <p className="font-medium">
                {event.action} · {event.office}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                {dateTime.format(new Date(event.at))}
                {event.remarks ? ` · ${event.remarks}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-6">
        <SectionTitle title="Next Action" />
        <div className="mt-3">
          <Alert
            tone={info.recheckAuthorized ? "info" : "warning"}
            title={
              info.recheckAuthorized
                ? "Accounting recheck is authorized"
                : "Authoritative source correction required"
            }
          >
            {info.issueSource === "Accounting DV review"
              ? "Review the recorded supporting-document reference, revalidate the voucher, and mark the revised local DV as checked again before forwarding."
              : info.issueSource === "Payroll source"
                ? "Use the separately authorized payroll correction and reapproval workflow. The approved payroll is not automatically unlocked here."
                : "Request correction through the authorized Budget Office process. Accounting cannot edit approved ORAS/BURAS data here."}
          </Alert>
        </div>
      </section>
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <Button type="button" variant="secondary" onClick={onPayroll}>
          View Related Payroll
        </Button>
        <Button type="button" variant="secondary" onClick={onDocuments}>
          View Supporting Documents
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          Return to DV List
        </Button>
        {info.recheckAuthorized && (
          <Button type="button" onClick={onReview}>
            Review / Recheck DV
          </Button>
        )}
      </div>
    </Modal>
  )
}

function EmptyState({
  title,
  detail,
  filtered,
  onClear,
}: {
  title: string
  detail?: string
  filtered: boolean
  onClear: () => void
}) {
  return (
    <div className="px-5 py-14 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-info-soft text-primary">
        <Icon name="mail" size={24} />
      </span>
      <p className="mt-4 font-semibold">{title}</p>
      {detail && <p className="mt-2 text-sm text-text-muted">{detail}</p>}
      {filtered && (
        <Button
          type="button"
          variant="secondary"
          onClick={onClear}
          className="mt-5"
        >
          Clear Filters
        </Button>
      )}
    </div>
  )
}

export function DisbursementVouchers({
  records,
  setRecords,
  user,
  initialTab,
  initialRecordId,
  initialView,
}: {
  records: DvRecord[]
  setRecords: Dispatch<SetStateAction<DvRecord[]>>
  user: string
  initialTab?: MainTab
  initialRecordId?: string | null
  initialView?: "review" | "progress" | "return"
}) {
  const [tab, setTab] = useState<MainTab>(initialTab ?? "ready")
  const [query, setQuery] = useState("")
  const [type, setType] = useState("")
  const [period, setPeriod] = useState("")
  const [fund, setFund] = useState("")
  const [stage, setStage] = useState("")
  const [holder, setHolder] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(
    initialView === "review" ? (initialRecordId ?? null) : null,
  )
  const [detailTab, setDetailTab] = useState<DetailTab>("information")
  const [reviewMode, setReviewMode] = useState(initialView === "review")
  const [historyId, setHistoryId] = useState<string | null>(null)
  const [progressId, setProgressId] = useState<string | null>(
    initialView === "progress" ? (initialRecordId ?? null) : null,
  )
  const [returnId, setReturnId] = useState<string | null>(
    initialView === "return" ? (initialRecordId ?? null) : null,
  )
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [payrollId, setPayrollId] = useState<string | null>(null)
  const [confirmCheck, setConfirmCheck] = useState(false)
  const [confirmForward, setConfirmForward] = useState(false)
  const [notice, setNotice] = useState("")

  const selected = records.find((record) => record.id === selectedId)
  const tabRecords = records.filter((record) =>
    tab === "ready"
      ? record.stage === "Ready for Accounting Review" ||
        record.stage === "Checked — Ready to Forward"
      : tab === "approval"
        ? record.stage === "Awaiting Accountant Review" ||
          record.stage === "Awaiting Chancellor Review"
        : tab === "returned"
          ? record.stage === "Returned to Accounting"
          : record.events.length > 0,
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
      (!stage || record.stage === stage) &&
      (!holder || record.currentHolder === holder),
  )
  const payrollTypes = [
    ...new Map(
      records.map((record) => [record.payrollTypeId, record.payrollTypeName]),
    ).entries(),
  ]
  const periods = [...new Set(records.map((record) => record.period))]
  const stages = [...new Set(records.map((record) => record.stage))]
  const holders = [...new Set(records.map((record) => record.currentHolder))]
  const hasFilters = Boolean(query || type || period || fund || stage || holder)
  const clearFilters = () => {
    setQuery("")
    setType("")
    setPeriod("")
    setFund("")
    setStage("")
    setHolder("")
  }
  const openDetail = (
    id: string,
    editable: boolean,
    nextTab: DetailTab = "information",
  ) => {
    setSelectedId(id)
    setReviewMode(editable)
    setDetailTab(nextTab)
    setNotice("")
  }
  const closeDetail = () => {
    setSelectedId(null)
    setConfirmCheck(false)
    setConfirmForward(false)
  }
  const updateRecord = (next: DvRecord, message: string) => {
    setRecords((current) =>
      current.map((record) => (record.id === next.id ? next : record)),
    )
    setNotice(message)
  }
  const markChecked = () => {
    if (!selected) return
    const validation = validationFor(selected)
    if (!validation.valid) return
    const now = new Date().toISOString()
    const next: DvRecord = {
      ...selected,
      stage: "Checked — Ready to Forward",
      currentHolder: "Accounting Section",
      checkedBy: user,
      checkedAt: now,
      events: [
        ...selected.events,
        {
          id: `DEMO-DV-CHECK-${Date.now()}`,
          at: now,
          office: "Accounting Section",
          user,
          action: "Marked DV as checked in the local demonstration",
          remarks:
            "Accounting reviewed the available fictional references. No official certification or signature occurred.",
        },
      ],
    }
    updateRecord(
      next,
      `${selected.id} was marked checked locally and is now eligible for forwarding.`,
    )
    setConfirmCheck(false)
  }
  const forward = () => {
    if (!selected || !selected.checkedAt) return
    if (
      selected.stage === "Awaiting Accountant Review" ||
      selected.stage === "Awaiting Chancellor Review"
    )
      return
    if (!selected.accountantRouteConfigured) return
    const now = new Date().toISOString()
    const next: DvRecord = {
      ...selected,
      stage: "Awaiting Accountant Review",
      currentHolder: "Accountant",
      forwardedAt: now,
      activeRoutingInstance: `${selected.id}-ACCOUNTANT-ROUTE-${Date.now()}`,
      events: [
        ...selected.events,
        {
          id: `DEMO-DV-FORWARD-${Date.now()}`,
          at: now,
          office: "Accounting Section",
          user,
          action: "Forwarded locally to Accountant",
          remarks:
            "Frontend workflow event only. No document was delivered to a real office.",
        },
      ],
    }
    updateRecord(
      next,
      `${selected.id} was forwarded locally to the Accountant workflow.`,
    )
    setConfirmForward(false)
    closeDetail()
    setTab("approval")
  }
  const historyRecord = records.find((record) => record.id === historyId)
  const progressRecord = records.find((record) => record.id === progressId)
  const returnRecord = records.find((record) => record.id === returnId)
  const payrollRecord = records.find((record) => record.id === payrollId)
  const documentRecord = records.find((record) =>
    record.supportingDocuments.some((document) => document.id === documentId),
  )
  const selectedDocument = documentRecord?.supportingDocuments.find(
    (document) => document.id === documentId,
  )

  if (selected) {
    const validation = validationFor(selected)
    const snapshot = selected.payrollSnapshot
    const editable =
      reviewMode &&
      (selected.stage === "Ready for Accounting Review" ||
        selected.stage === "Checked — Ready to Forward" ||
        selected.stage === "Returned to Accounting")
    return (
      <>
        <div className="grid gap-6 font-sans">
          <div>
            <Button
              type="button"
              variant="link"
              onClick={closeDetail}
              className="-ml-1 mb-3"
            >
              <Icon name="arrowLeft" size={16} />
              Back to List
            </Button>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p
                  id="page-title"
                  role="heading"
                  aria-level={1}
                  className="text-2xl font-semibold sm:text-3xl"
                >
                  Disbursement Voucher Review
                </p>
                <p className="mt-2 text-sm text-text-muted">
                  Review the voucher details and supporting documents before
                  forwarding for approval.
                </p>
              </div>
              <span
                className={clsx(
                  "rounded-full px-2.5 py-1 text-xs font-semibold",
                  stageTone(selected.stage),
                )}
              >
                {selected.stage}
              </span>
            </div>
          </div>
          <Alert tone="info" title={selected.fixtureLabel}>
            This self-contained scenario is isolated from incomplete payroll
            drafts. No official university DV, journal entry, signature, or
            approval was generated.
          </Alert>
          {notice && (
            <Alert tone="success" title="Local DV workflow updated">
              {notice}
            </Alert>
          )}
          {selected.returnInfo && (
            <Alert tone="warning" title="Returned DV remarks">
              {selected.returnInfo.remarks}
            </Alert>
          )}

          <div
            role="tablist"
            aria-label="Disbursement Voucher review sections"
            className="grid gap-1 rounded-control bg-surface p-1 elevate sm:grid-cols-3 xl:grid-cols-5"
          >
            {([
              ["information", "DV Information"],
              ["payroll", "Related Payroll"],
              ["documents", "Supporting Documents"],
              ["journal", "Journal Entry Data"],
              ["validation", "Validation & History"],
            ] as const).map(([id, label]) => (
              <Button
                key={id}
                type="button"
                variant={detailTab === id ? "primary" : "secondary"}
                role="tab"
                aria-selected={detailTab === id}
                onClick={() => setDetailTab(id)}
                className={clsx(
                  "h-11 border-0 shadow-none",
                  detailTab !== id && "bg-transparent text-text-muted",
                )}
              >
                {label}
              </Button>
            ))}
          </div>

          {detailTab === "information" && (
            <section className="rounded-card bg-surface p-5 elevate">
              <SectionTitle title="DV Information" />
              <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <DataPoint label="DV Reference" value={selected.id} />
                <DataPoint
                  label="Related Payroll Reference"
                  value={selected.payrollId}
                />
                <DataPoint
                  label="Payroll Type"
                  value={selected.payrollTypeName}
                />
                <DataPoint label="Payroll Period" value={selected.period} />
                <DataPoint label="Fund Source" value={selected.fund} />
                <DataPoint
                  label="Applicable Budget Document"
                  value={`${selected.budgetDocument.type} — ${selected.fund}`}
                />
                <DataPoint
                  label="Budget Document Reference"
                  value={
                    selected.budgetDocument.reference ??
                    "The applicable approved ORAS/BURAS is not available."
                  }
                  muted={!selected.budgetDocument.reference}
                />
                <DataPoint
                  label="DV Amount"
                  value={
                    selected.amount !== null
                      ? peso.format(selected.amount)
                      : "Amount unavailable — configuration required."
                  }
                />
                <DataPoint
                  label="Prepared By"
                  value={selected.preparedBy ?? "Not recorded"}
                  muted={!selected.preparedBy}
                />
                <DataPoint
                  label="Date Generated"
                  value={
                    selected.generatedAt
                      ? dateTime.format(new Date(selected.generatedAt))
                      : "Not recorded"
                  }
                  muted={!selected.generatedAt}
                />
                <DataPoint label="Current DV Stage" value={selected.stage} />
                <DataPoint
                  label="Current Holder"
                  value={selected.currentHolder}
                />
                <DataPoint
                  label="Cashier Release Status"
                  value={selected.releaseStatus ?? "Not Released"}
                />
              </dl>
              <div className="mt-5">
                <Alert tone="warning" title="Official form fields unavailable">
                  Payee wording, account classifications, responsibility center
                  codes, official form identifiers, certifications, signatories,
                  and signature dates require confirmed production
                  configuration.
                </Alert>
              </div>
            </section>
          )}

          {detailTab === "payroll" && (
            <section className="rounded-card bg-surface p-5 elevate">
              <SectionTitle title="Related Payroll Information" />
              <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <DataPoint
                  label="Payroll Reference"
                  value={selected.payrollId}
                />
                <DataPoint
                  label="Payroll Type"
                  value={selected.payrollTypeName}
                />
                <DataPoint label="Payroll Period" value={selected.period} />
                <DataPoint label="Fund" value={selected.fund} />
                <DataPoint
                  label="Included Employee Count"
                  value={String(snapshot.includedEmployeeCount)}
                />
                <DataPoint
                  label="Applicable Cost Centers"
                  value={snapshot.costCenters.join(", ")}
                />
                <DataPoint
                  label="Total Basic Pay"
                  value={peso.format(snapshot.basicPay)}
                />
                <DataPoint
                  label="Total Other Earnings"
                  value={peso.format(snapshot.otherEarnings)}
                />
                <DataPoint
                  label="Total Gross Pay"
                  value={peso.format(snapshot.grossPay)}
                />
                <DataPoint
                  label="Total Deductions"
                  value={peso.format(snapshot.deductions)}
                />
                <DataPoint
                  label="Total Net Pay"
                  value={peso.format(snapshot.netPay)}
                />
                <DataPoint
                  label="Recorded Payroll Approval Information"
                  value={snapshot.approvalInformation}
                />
              </dl>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setPayrollId(selected.id)}
                >
                  View Payroll Details
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setHistoryId(selected.id)}
                >
                  View Approval History
                </Button>
              </div>
              <p className="mt-4 text-xs text-text-muted">
                This approved payroll snapshot is read-only. The DV module does
                not recalculate or edit employee salaries.
              </p>
            </section>
          )}

          {detailTab === "documents" && (
            <section className="rounded-card bg-surface p-5 elevate">
              <SectionTitle
                title="Supporting Documents"
                description="Review the documents associated with this payroll and its completed approval process."
              />
              <ul className="mt-4 grid gap-3">
                {selected.supportingDocuments.map((document) => (
                  <li
                    key={document.id}
                    className="rounded-control border border-border p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-medium text-text-muted">
                          {document.group}
                        </p>
                        <p className="mt-1 font-semibold">{document.name}</p>
                        <p className="mt-1 text-sm text-text-muted">
                          {document.reference ??
                            "The required approval document is not yet available."}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setDocumentId(document.id)}
                        disabled={!document.available}
                      >
                        View Document
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setHistoryId(selected.id)}
                >
                  View Approval History
                </Button>
              </div>
              <div className="mt-5">
                <Alert tone="info" title="Original document notice">
                  Electronic attachments support the workflow. Original paper
                  documents remain the official records under the documented
                  procedure.
                </Alert>
              </div>
            </section>
          )}

          {detailTab === "journal" && (
            <section className="rounded-card bg-surface p-5 elevate">
              <SectionTitle
                title="Journal Entry Data"
                description="Review the accounting entry data generated from the approved payroll and applicable budget information."
              />
              {selected.journalConfigurationReference ? (
                <>
                  <Alert tone="warning" title="Demonstration mapping only">
                    The entries below show aggregate balancing behavior for this
                    isolated fixture. No official account code,
                    chart-of-accounts classification, or journal assignment is
                    represented.
                  </Alert>
                  <div className="mt-4 overflow-hidden rounded-control border border-border">
                    <div className="hidden grid-cols-[1.4fr_1fr_0.7fr_0.7fr_1fr] gap-3 bg-canvas p-3 text-xs font-semibold text-text-muted sm:grid">
                      <span>Entry Description</span>
                      <span>Account Code</span>
                      <span className="text-right">Debit</span>
                      <span className="text-right">Credit</span>
                      <span>Source Reference</span>
                    </div>
                    <ul className="divide-y divide-border">
                      {selected.journalEntries.map((entry) => (
                        <li
                          key={entry.id}
                          className="grid gap-2 p-3 text-sm sm:grid-cols-[1.4fr_1fr_0.7fr_0.7fr_1fr]"
                        >
                          <span className="font-medium">
                            {entry.description}
                          </span>
                          <span className="text-text-muted">
                            {entry.accountCode ??
                              "Official account code not configured"}
                          </span>
                          <span className="tabular-nums sm:text-right">
                            {peso.format(entry.debit)}
                          </span>
                          <span className="tabular-nums sm:text-right">
                            {peso.format(entry.credit)}
                          </span>
                          <span className="text-text-muted">
                            {entry.sourceReference}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <dl className="grid gap-4 border-t border-border bg-canvas p-4 sm:grid-cols-2">
                      <DataPoint
                        label="Total Debits"
                        value={peso.format(validation.debit)}
                      />
                      <DataPoint
                        label="Total Credits"
                        value={peso.format(validation.credit)}
                      />
                    </dl>
                  </div>
                </>
              ) : (
                <Alert tone="warning" title="Configuration required">
                  Journal entry generation requires the confirmed accounting
                  configuration.
                </Alert>
              )}
            </section>
          )}

          {detailTab === "validation" && (
            <section className="rounded-card bg-surface p-5 elevate">
              <SectionTitle
                title="DV Validation"
                description="Determine whether this fictional DV can be marked as checked."
              />
              <ul className="mt-4 grid gap-3">
                {validation.checks.map((check) => (
                  <li
                    key={check.id}
                    className="flex flex-col gap-3 rounded-control border border-border p-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold">{check.label}</p>
                      <p className="mt-1 text-xs text-text-muted">
                        {check.detail}
                      </p>
                    </div>
                    <ValidationBadge state={check.state} />
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                <SectionTitle title="Financial Consistency" />
                <dl className="mt-3 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-3">
                  <DataPoint
                    label="Approved Payroll Total"
                    value={peso.format(snapshot.netPay)}
                  />
                  <DataPoint
                    label="DV Total"
                    value={
                      selected.amount !== null
                        ? peso.format(selected.amount)
                        : "Amount unavailable"
                    }
                  />
                  <DataPoint
                    label="Difference"
                    value={
                      selected.amount !== null
                        ? peso.format(selected.amount - snapshot.netPay)
                        : "Configuration Required"
                    }
                  />
                </dl>
              </div>
              <div className="mt-5">
                <Alert tone="info" title="Payment File Readiness">
                  Bank-account readiness data is not available in the current
                  isolated local records. No missing-account count or account
                  number has been invented, and payment is not implied.
                </Alert>
              </div>
              <div className="mt-5">
                <SectionTitle title="Review History" />
                <ul className="mt-3 grid gap-2">
                  {selected.events.map((event) => (
                    <li
                      key={event.id}
                      className="rounded-control bg-canvas p-3 text-sm"
                    >
                      <p className="font-medium">
                        {event.action} · {event.office}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
                        {dateTime.format(new Date(event.at))}
                        {event.remarks ? ` · ${event.remarks}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          <section className="rounded-card bg-surface p-5 elevate">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">Accounting Review Actions</p>
                <p className="mt-1 text-sm text-text-muted">
                  Actions update shared local DV state only.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setHistoryId(selected.id)}
                >
                  View Approval History
                </Button>
                {editable &&
                  selected.stage !== "Checked — Ready to Forward" && (
                    <Button
                      type="button"
                      onClick={() => setConfirmCheck(true)}
                      disabled={!validation.valid}
                      title={
                        validation.valid
                          ? undefined
                          : "Resolve blocking DV validation issues before checking."
                      }
                    >
                      Mark as Checked
                    </Button>
                  )}
                {editable &&
                  selected.stage === "Checked — Ready to Forward" && (
                    <Button
                      type="button"
                      onClick={() => setConfirmForward(true)}
                      disabled={!selected.accountantRouteConfigured}
                    >
                      Forward to Accountant
                    </Button>
                  )}
              </div>
            </div>
            {!validation.valid && editable && (
              <div className="mt-4">
                <Alert tone="danger" title="DV cannot be marked as checked">
                  Review the Validation &amp; History section. Missing or
                  inconsistent prerequisites must not be bypassed.
                </Alert>
              </div>
            )}
          </section>
        </div>

        {historyRecord && (
          <HistoryDialog
            record={historyRecord}
            onClose={() => setHistoryId(null)}
          />
        )}
        {payrollRecord && (
          <PayrollSnapshotDialog
            record={payrollRecord}
            onClose={() => setPayrollId(null)}
          />
        )}
        {selectedDocument && (
          <DocumentPreview
            document={selectedDocument}
            onClose={() => setDocumentId(null)}
          />
        )}
        {confirmCheck && (
          <Modal
            title="Mark Disbursement Voucher as Checked?"
            onClose={() => setConfirmCheck(false)}
          >
            <dl className="grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
              <DataPoint label="DV Reference" value={selected.id} />
              <DataPoint label="Payroll Reference" value={selected.payrollId} />
              <DataPoint
                label="Payroll Type"
                value={selected.payrollTypeName}
              />
              <DataPoint label="Payroll Period" value={selected.period} />
              <DataPoint label="Fund" value={selected.fund} />
              <DataPoint
                label="DV Amount"
                value={
                  selected.amount !== null
                    ? peso.format(selected.amount)
                    : "Amount unavailable"
                }
              />
            </dl>
            <p className="mt-4 text-sm text-text-muted">
              Confirm that the Disbursement Voucher and available supporting
              documents have been reviewed by Accounting.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmCheck(false)}
              >
                Cancel
              </Button>
              <Button type="button" onClick={markChecked}>
                Confirm Checked
              </Button>
            </div>
          </Modal>
        )}
        {confirmForward && (
          <Modal
            title="Forward Disbursement Voucher for Approval"
            onClose={() => setConfirmForward(false)}
          >
            <dl className="grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
              <DataPoint label="DV Reference" value={selected.id} />
              <DataPoint label="Payroll Reference" value={selected.payrollId} />
              <DataPoint
                label="DV Amount"
                value={
                  selected.amount !== null
                    ? peso.format(selected.amount)
                    : "Amount unavailable"
                }
              />
              <DataPoint label="Receiving Office" value="Accountant" />
            </dl>
            <p className="mt-4 text-sm text-text-muted">
              Forward this checked Disbursement Voucher to the Accountant for
              review.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmForward(false)}
              >
                Cancel
              </Button>
              <Button type="button" onClick={forward}>
                Confirm Forwarding
              </Button>
            </div>
          </Modal>
        )}
      </>
    )
  }

  const empty: [string, string?] =
    tab === "ready"
      ? [
          "No disbursement vouchers are ready for Accounting review.",
          "Eligible vouchers will appear when the required payroll and budget-document approvals are complete.",
        ]
      : tab === "approval"
        ? ["No checked disbursement vouchers are currently awaiting approval."]
        : tab === "returned"
          ? ["No disbursement vouchers are currently returned to Accounting."]
          : ["No disbursement voucher history is available."]

  return (
    <>
      <div className="grid gap-6 font-sans">
        <div>
          <p
            id="page-title"
            role="heading"
            aria-level={1}
            className="text-2xl font-semibold sm:text-3xl"
          >
            Disbursement Vouchers
          </p>
          <p className="mt-2 text-sm text-text-muted">
            Review payroll disbursement vouchers, verify supporting documents,
            and forward checked vouchers for approval.
          </p>
        </div>
        <Alert tone="info" title="Approval responsibilities remain separate">
          Disbursement Vouchers become available when the required payroll and
          ORAS/BURAS approvals are complete. Accountant and Chancellor approvals
          are performed by their respective offices.
        </Alert>
        {notice && (
          <Alert tone="success" title="Local DV workflow updated">
            {notice}
          </Alert>
        )}

        <section className="overflow-hidden rounded-card bg-surface elevate">
          <div className="border-b border-border p-5 sm:p-6">
            <div
              role="tablist"
              aria-label="Disbursement Voucher views"
              className="grid gap-1 rounded-control bg-canvas p-1 sm:grid-cols-4"
            >
              {([
                ["ready", "Ready for Review"],
                ["approval", "For Approval"],
                ["returned", "Returned"],
                ["history", "DV History"],
              ] as const).map(([id, label]) => (
                <Button
                  key={id}
                  type="button"
                  variant={tab === id ? "primary" : "secondary"}
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => {
                    setTab(id)
                    clearFilters()
                  }}
                  className={clsx(
                    "h-11 border-0 shadow-none",
                    tab !== id && "bg-transparent text-text-muted",
                  )}
                >
                  {label}
                </Button>
              ))}
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <TextField
                label="Search Disbursement Vouchers"
                icon="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by DV reference, payroll reference, or payroll type..."
              />
              <SelectField
                label="Payroll Type"
                value={type}
                onChange={(event) => setType(event.target.value)}
                placeholder="All payroll types"
              >
                {payrollTypes.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
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
                label="DV Workflow Stage"
                value={stage}
                onChange={(event) => setStage(event.target.value)}
                placeholder="All stages"
              >
                {stages.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Current Holding Office"
                value={holder}
                onChange={(event) => setHolder(event.target.value)}
                placeholder="All offices"
              >
                {holders.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </SelectField>
              <Button
                type="button"
                variant="secondary"
                onClick={clearFilters}
                disabled={!hasFilters}
              >
                Clear Filters
              </Button>
            </div>
            <p className="mt-3 text-xs text-text-muted">
              {filtered.length} matching voucher
              {filtered.length === 1 ? "" : "s"}
            </p>
          </div>

          {filtered.length ? (
            <>
              <div className="hidden 2xl:block">
                <table className="w-full table-fixed text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-canvas text-text-muted">
                      {(tab === "returned"
                        ? [
                            "DV Reference",
                            "Payroll Reference",
                            "Returning Office",
                            "Return Date",
                            "Remarks Preview",
                            "Current Action Holder",
                            "Actions",
                          ]
                        : [
                            "DV Reference",
                            "Payroll Reference",
                            "Payroll Type / Period",
                            "Fund",
                            "DV Amount",
                            "DV Workflow Stage",
                            "Current Holder",
                            "Last Activity",
                            "Actions",
                          ]
                      ).map((item) => (
                        <th key={item} className="px-3 py-3 font-semibold">
                          {item}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((record) => (
                      <tr key={record.id}>
                        {tab === "returned" ? (
                          <>
                            <td className="px-3 py-3 font-semibold">
                              {record.id}
                            </td>
                            <td className="px-3 py-3">{record.payrollId}</td>
                            <td className="px-3 py-3">
                              {record.returnInfo?.office ?? "Not recorded"}
                            </td>
                            <td className="px-3 py-3">
                              {record.returnInfo?.at
                                ? dateTime.format(
                                    new Date(record.returnInfo.at),
                                  )
                                : "Not recorded"}
                            </td>
                            <td className="px-3 py-3">
                              {record.returnInfo?.remarks ??
                                "Return remarks unavailable"}
                            </td>
                            <td className="px-3 py-3">
                              {record.currentHolder}
                            </td>
                            <td className="px-3 py-3 text-right">
                              <Button
                                type="button"
                                variant="link"
                                onClick={() => setReturnId(record.id)}
                              >
                                Review Return
                              </Button>
                              <Button
                                type="button"
                                variant="link"
                                onClick={() => setProgressId(record.id)}
                              >
                                View Progress
                              </Button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-3">
                              <p className="font-semibold">{record.id}</p>
                              <p className="mt-1 text-text-muted">
                                {record.fixtureLabel}
                              </p>
                            </td>
                            <td className="px-3 py-3">{record.payrollId}</td>
                            <td className="px-3 py-3">
                              <p>{record.payrollTypeName}</p>
                              <p className="mt-1 text-text-muted">
                                {record.period}
                              </p>
                            </td>
                            <td className="px-3 py-3">{record.fund}</td>
                            <td className="px-3 py-3 font-semibold tabular-nums">
                              {record.amount !== null
                                ? peso.format(record.amount)
                                : "Amount unavailable — configuration required."}
                            </td>
                            <td className="px-3 py-3">
                              <span
                                className={clsx(
                                  "rounded-full px-2 py-1 text-xs font-semibold",
                                  stageTone(record.stage),
                                )}
                              >
                                {record.stage}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              {record.currentHolder}
                            </td>
                            <td className="px-3 py-3">
                              {lastActivity(record)
                                ? dateTime.format(
                                    new Date(lastActivity(record)!),
                                  )
                                : "Not recorded"}
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex flex-wrap justify-end gap-1">
                                {tab === "ready" && (
                                  <Button
                                    type="button"
                                    variant="link"
                                    onClick={() => openDetail(record.id, true)}
                                  >
                                    Review DV
                                  </Button>
                                )}
                                {(tab === "approval" || tab === "history") && (
                                  <Button
                                    type="button"
                                    variant="link"
                                    onClick={() => openDetail(record.id, false)}
                                  >
                                    View DV
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  variant="link"
                                  onClick={() => setProgressId(record.id)}
                                >
                                  View Progress
                                </Button>
                                {tab === "history" && (
                                  <Button
                                    type="button"
                                    variant="link"
                                    onClick={() => setHistoryId(record.id)}
                                  >
                                    View Approval History
                                  </Button>
                                )}
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="divide-y divide-border 2xl:hidden">
                {filtered.map((record) => (
                  <li key={record.id} className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{record.id}</p>
                        <p className="mt-1 text-sm">{record.payrollTypeName}</p>
                        <p className="mt-1 text-xs text-text-muted">
                          {record.fixtureLabel}
                        </p>
                      </div>
                      <span
                        className={clsx(
                          "rounded-full px-2.5 py-1 text-xs font-semibold",
                          stageTone(record.stage),
                        )}
                      >
                        {record.stage}
                      </span>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-3">
                      <DataPoint
                        label="Payroll / Period"
                        value={`${record.payrollId} · ${record.period}`}
                      />
                      <DataPoint label="Fund" value={record.fund} />
                      <DataPoint
                        label="DV Amount"
                        value={
                          record.amount !== null
                            ? peso.format(record.amount)
                            : "Amount unavailable"
                        }
                      />
                      <DataPoint
                        label="Current Holder"
                        value={record.currentHolder}
                      />
                      {tab === "returned" && (
                        <>
                          <DataPoint
                            label="Returning Office"
                            value={record.returnInfo?.office ?? "Not recorded"}
                          />
                          <DataPoint
                            label="Return Date"
                            value={
                              record.returnInfo?.at
                                ? dateTime.format(
                                    new Date(record.returnInfo.at),
                                  )
                                : "Not recorded"
                            }
                          />
                          <DataPoint
                            label="Remarks"
                            value={
                              record.returnInfo?.remarks ??
                              "Return remarks unavailable"
                            }
                          />
                        </>
                      )}
                    </dl>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {tab === "ready" && (
                        <Button
                          type="button"
                          onClick={() => openDetail(record.id, true)}
                        >
                          Review DV
                        </Button>
                      )}
                      {(tab === "approval" || tab === "history") && (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => openDetail(record.id, false)}
                        >
                          View DV
                        </Button>
                      )}
                      {tab === "returned" && (
                        <Button
                          type="button"
                          onClick={() => setReturnId(record.id)}
                        >
                          Review Return
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setProgressId(record.id)}
                      >
                        View Progress
                      </Button>
                      {tab === "history" && (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setHistoryId(record.id)}
                        >
                          View Approval History
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <EmptyState
              title={
                hasFilters
                  ? "No disbursement vouchers match your search or filters."
                  : empty[0]
              }
              detail={hasFilters ? undefined : empty[1]}
              filtered={hasFilters}
              onClear={clearFilters}
            />
          )}
        </section>

        <Alert tone="info" title="Frontend DV prototype">
          Voucher review, checking, routing, documents, and history are shared
          browser-session demonstrations only. No real DV, accounting entry,
          office delivery, signature, payment, LandBank file, or backend
          authorization is produced.
        </Alert>
      </div>

      {historyRecord && (
        <HistoryDialog
          record={historyRecord}
          onClose={() => setHistoryId(null)}
        />
      )}
      {progressRecord && (
        <ProgressDialog
          record={progressRecord}
          onClose={() => setProgressId(null)}
        />
      )}
      {returnRecord && (
        <ReturnDialog
          record={returnRecord}
          onClose={() => setReturnId(null)}
          onReview={() => {
            setReturnId(null)
            openDetail(returnRecord.id, true, "validation")
          }}
          onPayroll={() => {
            setReturnId(null)
            setPayrollId(returnRecord.id)
          }}
          onDocuments={() => {
            setReturnId(null)
            openDetail(returnRecord.id, true, "documents")
          }}
        />
      )}
      {payrollRecord && (
        <PayrollSnapshotDialog
          record={payrollRecord}
          onClose={() => setPayrollId(null)}
        />
      )}
      {selectedDocument && (
        <DocumentPreview
          document={selectedDocument}
          onClose={() => setDocumentId(null)}
        />
      )}
    </>
  )
}
