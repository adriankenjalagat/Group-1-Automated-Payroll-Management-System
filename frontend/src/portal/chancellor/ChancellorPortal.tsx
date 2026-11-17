import clsx from "clsx"
import { useRef, useState, type Dispatch, type SetStateAction } from "react"
import { Alert, Button, Icon, TextField } from "../../MsuPayroll"
import { Modal, SelectField, Tag, usePopover } from "../../admin/ui"
import type { MockUser } from "../../auth/mockData"
import { approvalsApi } from "../../api/approvals"
import type {
  DownstreamDocumentBundle,
  DvEmployeeSummary,
  DvRecord,
  SupportingDocument,
} from "../accounting/dvData"
import {
  applyChancellorDecision,
  chancellorReconciliation as reconciliation,
  currentAccountantApproval as accountantApproval,
  isChancellorPending as pendingForChancellor,
  type ChancellorNotification,
} from "./chancellorData"

export type ChancellorHistoryTab = "all" | "approved" | "returned"

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
      Vouchers, payrolls, approvals, employees, amounts, and downstream document
      references shown here are isolated prototype fixtures.
    </Alert>
  )
}

function DataPoint({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-text-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium leading-snug">
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

function DocumentPreview({
  document,
  record,
  onClose,
}: {
  document: SupportingDocument
  record: DvRecord
  onClose: () => void
}) {
  return (
    <Modal title="Supporting Document Details" onClose={onClose}>
      <Tag kind="placeholder">Fictional demonstration document reference</Tag>
      <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
        <DataPoint label="Document Title" value={document.name} />
        <DataPoint
          label="Document Reference"
          value={document.reference ?? "Reference unavailable"}
        />
        <DataPoint label="Related DV" value={record.id} />
        <DataPoint label="Payroll Reference" value={record.payrollId} />
        <DataPoint label="Document Type" value={document.group} />
        <DataPoint
          label="Availability"
          value={document.available ? "Demo metadata available" : "Unavailable"}
        />
      </dl>
      <Alert tone="warning" title="Original file preview unavailable">
        Fictional demonstration document reference. An original file preview is
        not available.
      </Alert>
      <div className="mt-5 flex justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>
          Close Preview
        </Button>
      </div>
    </Modal>
  )
}

function PayrollDetails({
  rows,
  onClose,
}: {
  rows: DvEmployeeSummary[]
  onClose: () => void
}) {
  return (
    <Modal title="Read-only Payroll Details" onClose={onClose} wide>
      <ul className="divide-y divide-border rounded-control border border-border">
        {rows.map((employee) => (
          <li
            key={employee.employeeId}
            className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            <DataPoint
              label="Employee"
              value={`${employee.employeeId} · ${employee.name}`}
            />
            <DataPoint label="Fund" value={employee.fund} />
            <DataPoint
              label="Gross Pay"
              value={peso.format(employee.grossPay)}
            />
            <DataPoint
              label="Deductions"
              value={peso.format(employee.deductions)}
            />
            <DataPoint label="Net Pay" value={peso.format(employee.netPay)} />
            <DataPoint
              label="Bank Data Status"
              value={
                employee.bankAccountAvailable
                  ? "Required demo data available"
                  : "Missing — follow-up required"
              }
            />
          </li>
        ))}
      </ul>
      <div className="mt-5 flex justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  )
}

function ReviewWorkspace({
  record,
  records,
  setRecords,
  user,
  onClose,
  onHistory,
  onNext,
  onDashboard,
}: {
  record: DvRecord
  records: DvRecord[]
  setRecords: Dispatch<SetStateAction<DvRecord[]>>
  user: MockUser
  onClose: () => void
  onHistory: (tab?: ChancellorHistoryTab, decisionId?: string) => void
  onNext: () => void
  onDashboard: () => void
}) {
  const [document, setDocument] = useState<SupportingDocument | null>(null)
  const [payrollOpen, setPayrollOpen] = useState(false)
  const [approveOpen, setApproveOpen] = useState(false)
  const [approvalRemarks, setApprovalRemarks] = useState("")
  const [returnOpen, setReturnOpen] = useState(false)
  const [returnStep, setReturnStep] = useState<"edit" | "confirm">("edit")
  const [returnRemarks, setReturnRemarks] = useState("")
  const [returnError, setReturnError] = useState("")
  const [decisionError, setDecisionError] = useState("")
  const [success, setSuccess] = useState<{
    action: "Approved" | "Returned"
    decisionId: string
    bundle?: DownstreamDocumentBundle
  } | null>(null)
  const lock = useRef(false)
  const approval = accountantApproval(record)
  const checks = reconciliation(record)
  const pending = pendingForChancellor(record)
  const authorized = user.roles.includes("Office of the Chancellor")
  const canDecide = pending && authorized && Boolean(approval)
  const canApprove = canDecide && checks.eligible
  const amountDifference =
    record.amount === null
      ? null
      : record.amount - record.payrollSnapshot.netPay

  const current = () => records.find((item) => item.id === record.id)
  const recordDecision = (
    action: "Approved" | "Returned",
    remarks?: string,
  ) => {
    if (lock.current) return
    const latest = current()
    if (!latest) {
      setDecisionError("The selected Disbursement Voucher could not be found.")
      return
    }
    const result = applyChancellorDecision({
      record: latest,
      actor: {
        id: user.accountId ?? user.username,
        name: user.name,
        authorized: user.roles.includes("Office of the Chancellor"),
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
    const numericPayrollId = parseInt(String(latest.payrollId || latest.id).replace(/\D/g, ''), 10)
    if (!isNaN(numericPayrollId)) {
      approvalsApi.submitDecision({
        payrollId: numericPayrollId,
        decision: action === "Returned" ? "Returned" : "Approved",
        remarks,
      }).catch((e) => {
        console.warn('Live chancellor approval decision sync noted:', e.message)
      })
    }
    setRecords((items) =>
      items.map((item) => (item.id === latest.id ? result.record : item)),
    )
    setApproveOpen(false)
    setReturnOpen(false)
    setDecisionError("")
    setSuccess({
      action,
      decisionId: result.decision.id,
      bundle: result.bundle,
    })
    lock.current = false
  }

  const reviewReturn = () => {
    if (!returnRemarks.trim()) {
      setReturnError("Please enter a reason for returning this DV.")
      return
    }
    setReturnError("")
    setReturnStep("confirm")
  }

  return (
    <>
      <div className="grid gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p role="heading" aria-level={2} className="text-xl font-semibold">
              DV Details
            </p>
            <div className="mt-2">
              <Tag kind="placeholder">
                {pending ? "Awaiting Chancellor Decision" : record.stage}
              </Tag>
            </div>
          </div>
          <Button type="button" variant="secondary" onClick={onClose}>
            Back to DV List
          </Button>
        </div>
        {decisionError && (
          <Alert tone="danger" title="Decision unavailable">
            {decisionError}
          </Alert>
        )}
        <section className="rounded-card bg-surface p-5 elevate">
          <p role="heading" aria-level={3} className="text-lg font-semibold">
            Disbursement Voucher Information
          </p>
          <p className="mt-4 text-3xl font-bold text-primary">
            {record.amount === null
              ? "Amount unavailable"
              : peso.format(record.amount)}
          </p>
          <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2 xl:grid-cols-3">
            <DataPoint label="DV Reference" value={record.id} />
            <DataPoint label="Related Payroll" value={record.payrollId} />
            <DataPoint label="Payroll Type" value={record.payrollTypeName} />
            <DataPoint label="Payroll Period" value={record.period} />
            <DataPoint label="Fund Source" value={record.fund} />
            <DataPoint
              label="Applicable Budget Document"
              value={`${record.budgetDocument.type} · ${record.budgetDocument.reference ?? "Reference unavailable"}`}
            />
            <DataPoint
              label="Prepared by Accounting"
              value={record.preparedBy ?? "Not recorded"}
            />
            <DataPoint
              label="Date Prepared"
              value={
                record.generatedAt
                  ? dateTime.format(new Date(record.generatedAt))
                  : "Not recorded"
              }
            />
            <DataPoint
              label="Accountant Approval"
              value={approval ? "Approved" : "Missing"}
            />
            <DataPoint
              label="Accountant Approval Date"
              value={
                approval
                  ? dateTime.format(new Date(approval.recordedAt))
                  : "Not recorded"
              }
            />
            <DataPoint
              label="Current Holding Office"
              value={record.currentHolder}
            />
            <DataPoint label="Current DV Stage" value={record.stage} />
          </dl>
        </section>
        <section className="rounded-card bg-surface p-5 elevate">
          <p role="heading" aria-level={3} className="text-lg font-semibold">
            Related Payroll Summary
          </p>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <DataPoint label="Payroll Reference" value={record.payrollId} />
            <DataPoint
              label="Payroll Type / Period"
              value={`${record.payrollTypeName} · ${record.period}`}
            />
            <DataPoint label="Fund" value={record.fund} />
            <DataPoint
              label="Included Employees"
              value={String(record.payrollSnapshot.includedEmployeeCount)}
            />
            <DataPoint
              label="Gross Payroll"
              value={peso.format(record.payrollSnapshot.grossPay)}
            />
            <DataPoint
              label="Total Deductions"
              value={peso.format(record.payrollSnapshot.deductions)}
            />
            <DataPoint
              label="Net Payroll"
              value={peso.format(record.payrollSnapshot.netPay)}
            />
            <DataPoint
              label="Related DV Amount"
              value={
                record.amount === null
                  ? "Unavailable"
                  : peso.format(record.amount)
              }
            />
          </dl>
          <div className="mt-5 grid gap-4 rounded-control border border-border p-4 sm:grid-cols-3">
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
                amountDifference === null
                  ? "Unavailable"
                  : peso.format(amountDifference)
              }
            />
          </div>
          {!checks.amountMatches && (
            <div className="mt-4">
              <Alert tone="danger" title="DV total inconsistency">
                The DV amount does not match the applicable approved payroll
                total. Refer the issue to Accounting.
              </Alert>
            </div>
          )}
          <Button
            type="button"
            variant="secondary"
            className="mt-5"
            disabled={!record.employeePayrollRows?.length}
            onClick={() => setPayrollOpen(true)}
          >
            View Payroll Details
          </Button>
        </section>
        <section className="rounded-card bg-surface p-5 elevate">
          <p role="heading" aria-level={3} className="text-lg font-semibold">
            Supporting Documents
          </p>
          <ul className="mt-5 divide-y divide-border rounded-control border border-border">
            {record.supportingDocuments.map((item) => (
              <li
                key={item.id}
                className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5"
              >
                <DataPoint label="Document Name" value={item.name} />
                <DataPoint
                  label="Reference"
                  value={item.reference ?? "Unavailable"}
                />
                <DataPoint label="Type" value={item.group} />
                <DataPoint
                  label="Availability"
                  value={
                    item.available ? "Demo metadata available" : "Unavailable"
                  }
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setDocument(item)}
                >
                  View Document
                </Button>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-card bg-surface p-5 elevate">
          <p role="heading" aria-level={3} className="text-lg font-semibold">
            Approval History Before Chancellor Review
          </p>
          <ul className="mt-5 grid gap-3">
            {record.events
              .filter(
                (event) =>
                  !/Chancellor|downstream/i.test(
                    `${event.office} ${event.action}`,
                  ),
              )
              .map((event) => (
                <li key={event.id} className="rounded-control bg-canvas p-4">
                  <p className="font-semibold">{event.action}</p>
                  <p className="mt-1 text-xs text-text-muted">
                    {event.office} · {event.user ?? "Recorded role"} ·{" "}
                    {dateTime.format(new Date(event.at))}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    Document reference:{" "}
                    {event.action.toLowerCase().includes("budget")
                      ? record.budgetDocument.reference
                      : record.id}
                  </p>
                  {event.remarks && (
                    <p className="mt-2 text-sm">{event.remarks}</p>
                  )}
                </li>
              ))}
          </ul>
        </section>
        <section className="rounded-card bg-surface p-5 elevate">
          <p role="heading" aria-level={3} className="text-lg font-semibold">
            Chancellor Decision
          </p>
          <p className="mt-2 text-sm text-text-muted">
            After reviewing the voucher and related payroll information, select
            the appropriate action.
          </p>
          {!approval && (
            <div className="mt-4">
              <Alert tone="danger" title="Accountant approval missing">
                This DV has not completed the required Accountant approval
                stage.
              </Alert>
            </div>
          )}
          {!checks.supportAvailable && (
            <div className="mt-4">
              <Alert tone="danger" title="Missing required support">
                Required supporting information is unavailable. The DV cannot be
                approved yet.
              </Alert>
            </div>
          )}
          {!pending && (
            <div className="mt-4">
              <Alert tone="info" title="Read-only DV">
                This DV is not currently awaiting a Chancellor decision.
              </Alert>
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
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
              disabled={!canDecide}
              onClick={() => {
                setReturnStep("edit")
                setReturnOpen(true)
              }}
            >
              Return DV
            </Button>
          </div>
        </section>
      </div>
      {document && (
        <DocumentPreview
          document={document}
          record={record}
          onClose={() => setDocument(null)}
        />
      )}
      {payrollOpen && (
        <PayrollDetails
          rows={record.employeePayrollRows ?? []}
          onClose={() => setPayrollOpen(false)}
        />
      )}
      {approveOpen && (
        <Modal
          title="Approve Disbursement Voucher?"
          onClose={() => setApproveOpen(false)}
          wide
        >
          <p className="text-sm text-text-muted">
            You are about to approve this Disbursement Voucher. Your decision
            will be recorded and the approved DV will proceed to the
            post-approval disbursement-document process.
          </p>
          <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
            <DataPoint label="DV Reference" value={record.id} />
            <DataPoint label="Related Payroll" value={record.payrollId} />
            <DataPoint
              label="Payroll Type / Period"
              value={`${record.payrollTypeName} · ${record.period}`}
            />
            <DataPoint label="Fund Source" value={record.fund} />
            <DataPoint
              label="DV Amount"
              value={
                record.amount === null
                  ? "Unavailable"
                  : peso.format(record.amount)
              }
            />
            <DataPoint
              label="Accountant Approval"
              value={approval ? "Approved" : "Missing"}
            />
            <DataPoint label="Current Stage" value={record.stage} />
          </dl>
          <div className="mt-5">
            <MultilineField
              label="Approval Remarks (Optional)"
              value={approvalRemarks}
              onChange={setApprovalRemarks}
              placeholder="Enter additional review notes, if any..."
            />
          </div>
          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
              ? "Return Disbursement Voucher"
              : "Confirm DV Return"
          }
          onClose={() => setReturnOpen(false)}
          wide
        >
          {returnStep === "edit" ? (
            <>
              <p className="text-sm text-text-muted">
                Provide the reason this DV must be corrected or reviewed again
                by Accounting Section.
              </p>
              <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
                <DataPoint label="DV Reference" value={record.id} />
                <DataPoint label="Related Payroll" value={record.payrollId} />
                <DataPoint
                  label="Payroll Period / Fund"
                  value={`${record.period} · ${record.fund}`}
                />
                <DataPoint
                  label="DV Amount"
                  value={
                    record.amount === null
                      ? "Unavailable"
                      : peso.format(record.amount)
                  }
                />
                <DataPoint label="Current Stage" value={record.stage} />
                <DataPoint
                  label="Receiving Office"
                  value="Accounting Section"
                />
              </dl>
              <div className="mt-5">
                <MultilineField
                  label="Reason for Return / Remarks"
                  value={returnRemarks}
                  onChange={(value) => {
                    setReturnRemarks(value)
                    setReturnError("")
                  }}
                  placeholder="Explain the issue that Accounting Section must review or correct..."
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
                This Disbursement Voucher will be returned to Accounting Section
                with your remarks.
              </p>
              <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
                <DataPoint label="DV Reference" value={record.id} />
                <DataPoint label="Related Payroll" value={record.payrollId} />
                <DataPoint
                  label="Chancellor Role"
                  value="Office of the Chancellor"
                />
                <DataPoint
                  label="Receiving Office"
                  value="Accounting Section"
                />
                <DataPoint label="Complete Remarks" value={returnRemarks} />
              </dl>
              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
            success.action === "Returned"
              ? "DV Returned"
              : success.bundle?.state === "Ready for Cashier"
                ? "DV Approved"
                : "DV Approved — Document Preparation Requires Attention"
          }
          onClose={() => setSuccess(null)}
        >
          <Alert
            tone={
              success.bundle?.state === "Requires Follow-up"
                ? "warning"
                : "success"
            }
            title="Decision recorded"
          >
            {success.action === "Returned"
              ? "The Disbursement Voucher has been returned to Accounting Section with your remarks."
              : success.bundle?.state === "Ready for Cashier"
                ? "The Disbursement Voucher has been approved in this demonstration. The corresponding validated disbursement-document records are available to Cashier for the next processing stage."
                : "The Chancellor approval was recorded, but the downstream document handoff is not complete. Review the recorded issue before Cashier processing."}
          </Alert>
          {success.bundle?.issue && (
            <p className="mt-4 text-sm">{success.bundle.issue}</p>
          )}
          <div className="mt-5 grid gap-3">
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
            <Button type="button" variant="secondary" onClick={onNext}>
              Review Next DV
            </Button>
            <Button type="button" variant="secondary" onClick={onDashboard}>
              Back to Dashboard
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}

export function ChancellorDvReview({
  records,
  setRecords,
  user,
  initialDvId,
  onHistory,
  onDashboard,
}: {
  records: DvRecord[]
  setRecords: Dispatch<SetStateAction<DvRecord[]>>
  user: MockUser
  initialDvId?: string | null
  onHistory: (tab?: ChancellorHistoryTab, decisionId?: string) => void
  onDashboard: () => void
}) {
  const [query, setQuery] = useState("")
  const [type, setType] = useState("")
  const [period, setPeriod] = useState("")
  const [fund, setFund] = useState("")
  const [received, setReceived] = useState("")
  const [stage, setStage] = useState("")
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(
    initialDvId ?? null,
  )
  const pending = records.filter(pendingForChancellor)
  const filtered = pending.filter((record) => {
    const q = query.trim().toLowerCase()
    return (
      (!q ||
        [
          record.id,
          record.payrollId,
          record.payrollTypeName,
          record.period,
        ].some((value) => value.toLowerCase().includes(q))) &&
      (!type || record.payrollTypeId === type) &&
      (!period || record.period === period) &&
      (!fund || record.fund === fund) &&
      (!received || record.receivedByChancellorAt?.slice(0, 10) === received) &&
      (!stage || record.stage === stage)
    )
  })
  const pageSize = 5
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize)
  const selected = records.find((record) => record.id === selectedId)
  const clear = () => {
    setQuery("")
    setType("")
    setPeriod("")
    setFund("")
    setReceived("")
    setStage("")
    setPage(1)
  }
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Disbursement Voucher Review"
        subtitle="Review Disbursement Vouchers forwarded by the Accountant and record your decision."
      />
      <Alert tone="info" title="Chancellor review eligibility">
        Only DVs that completed the required Accountant approval stage are
        eligible for Chancellor review.
      </Alert>
      <DemoNotice />
      {!selected ? (
        <section className="overflow-hidden rounded-card bg-surface elevate">
          <div className="border-b border-border p-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <TextField
                label="Search DVs"
                icon="search"
                placeholder="Search DV reference or payroll reference..."
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setPage(1)
                }}
              />
              <SelectField
                label="Payroll Type"
                value={type}
                onChange={(event) => setType(event.target.value)}
                placeholder="All payroll types"
              >
                {[
                  ...new Map(
                    pending.map((record) => [
                      record.payrollTypeId,
                      record.payrollTypeName,
                    ]),
                  ).entries(),
                ].map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Payroll Period"
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                placeholder="All periods"
              >
                {[...new Set(pending.map((record) => record.period))].map(
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
              <TextField
                label="Date Received"
                type="date"
                value={received}
                onChange={(event) => setReceived(event.target.value)}
              />
              <SelectField
                label="Current DV Stage"
                value={stage}
                onChange={(event) => setStage(event.target.value)}
                placeholder="All stages"
              >
                <option value="Awaiting Chancellor Review">
                  Awaiting Chancellor Review
                </option>
              </SelectField>
              <Button type="button" variant="secondary" onClick={clear}>
                Clear Filters
              </Button>
            </div>
          </div>
          {visible.length ? (
            <ul className="divide-y divide-border">
              {visible.map((record) => {
                const approval = accountantApproval(record)
                return (
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
                      label="Accountant Approval / Received"
                      value={`${
                        approval
                          ? dateTime.format(new Date(approval.recordedAt))
                          : "Missing"
                      } · ${
                        record.receivedByChancellorAt
                          ? dateTime.format(
                              new Date(record.receivedByChancellorAt),
                            )
                          : "Not recorded"
                      }`}
                    />
                    <div>
                      <DataPoint label="Current Stage" value={record.stage} />
                      <Button
                        type="button"
                        className="mt-3"
                        onClick={() => setSelectedId(record.id)}
                      >
                        Review DV
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="p-8 text-center font-semibold">
              No Disbursement Vouchers currently require your approval.
            </p>
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
      ) : (
        <ReviewWorkspace
          key={selected.id}
          record={selected}
          records={records}
          setRecords={setRecords}
          user={user}
          onClose={() => setSelectedId(null)}
          onHistory={onHistory}
          onNext={() => {
            const next = records.find(
              (record) =>
                pendingForChancellor(record) && record.id !== selected.id,
            )
            setSelectedId(next?.id ?? null)
          }}
          onDashboard={onDashboard}
        />
      )}
    </div>
  )
}

function decisions(records: DvRecord[]) {
  return records.flatMap((record) =>
    (record.chancellorDecisions ?? []).map((decision) => ({
      record,
      decision,
    })),
  )
}

export function ChancellorDecisionHistory({
  records,
  initialTab = "all",
  initialDecisionId,
}: {
  records: DvRecord[]
  initialTab?: ChancellorHistoryTab
  initialDecisionId?: string
}) {
  const [tab, setTab] = useState<ChancellorHistoryTab>(initialTab)
  const [query, setQuery] = useState("")
  const [type, setType] = useState("")
  const [period, setPeriod] = useState("")
  const [fund, setFund] = useState("")
  const [decisionFilter, setDecisionFilter] = useState("")
  const [date, setDate] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(
    initialDecisionId ?? null,
  )
  const all = decisions(records)
  const filtered = all.filter(({ record, decision }) => {
    const q = query.trim().toLowerCase()
    return (
      (tab === "all" ||
        (tab === "approved" && decision.action === "Approved") ||
        (tab === "returned" && decision.action === "Returned")) &&
      (!q ||
        [record.id, record.payrollId].some((value) =>
          value.toLowerCase().includes(q),
        )) &&
      (!type || record.payrollTypeId === type) &&
      (!period || record.period === period) &&
      (!fund || record.fund === fund) &&
      (!decisionFilter || decision.action === decisionFilter) &&
      (!date || decision.recordedAt.slice(0, 10) === date)
    )
  })
  const selected = all.find(({ decision }) => decision.id === selectedId)
  return (
    <>
      <div className="grid gap-6">
        <PageHeader
          title="Decision History"
          subtitle="View Disbursement Vouchers you previously approved or returned."
        />
        <DemoNotice />
        <section className="overflow-hidden rounded-card bg-surface elevate">
          <div className="border-b border-border p-5">
            <div
              role="tablist"
              aria-label="Chancellor decision history"
              className="grid gap-1 rounded-control bg-canvas p-1 sm:grid-cols-3"
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
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <TextField
                label="Search Decisions"
                icon="search"
                placeholder="Search DV reference or payroll reference..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <SelectField
                label="Payroll Type"
                value={type}
                onChange={(event) => setType(event.target.value)}
                placeholder="All payroll types"
              >
                {[
                  ...new Map(
                    records.map((record) => [
                      record.payrollTypeId,
                      record.payrollTypeName,
                    ]),
                  ).entries(),
                ].map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Payroll Period"
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                placeholder="All periods"
              >
                {[...new Set(records.map((record) => record.period))].map(
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
                label="Decision"
                value={decisionFilter}
                onChange={(event) => setDecisionFilter(event.target.value)}
                placeholder="All decisions"
              >
                <option value="Approved">Approved</option>
                <option value="Returned">Returned</option>
              </SelectField>
              <TextField
                label="Decision Date"
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
                  setPeriod("")
                  setFund("")
                  setDecisionFilter("")
                  setDate("")
                }}
              >
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
                    label="DV / Payroll"
                    value={`${record.id} · ${record.payrollId}`}
                  />
                  <DataPoint
                    label="Payroll Type / Period"
                    value={`${record.payrollTypeName} · ${record.period}`}
                  />
                  <DataPoint
                    label="Fund / Decision"
                    value={`${record.fund} · ${decision.action}`}
                  />
                  <DataPoint
                    label="Decision Date / Current Stage"
                    value={`${dateTime.format(new Date(decision.recordedAt))} · ${record.stage}`}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setSelectedId(decision.id)}
                    >
                      View Decision
                    </Button>
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => setSelectedId(decision.id)}
                    >
                      View DV
                    </Button>
                    {decision.remarks && (
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
              No Chancellor decisions match the selected filters.
            </p>
          )}
        </section>
      </div>
      {selected && (
        <Modal
          title="Chancellor Decision Details"
          onClose={() => setSelectedId(null)}
          wide
        >
          <dl className="grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
            <DataPoint
              label="Decision Event Reference"
              value={selected.decision.id}
            />
            <DataPoint label="DV Reference" value={selected.record.id} />
            <DataPoint
              label="Related Payroll"
              value={selected.record.payrollId}
            />
            <DataPoint
              label="Current DV Revision"
              value={String(selected.decision.dvRevision)}
            />
            <DataPoint
              label="Recorded Chancellor User"
              value={selected.decision.recordedUser}
            />
            <DataPoint label="Decision" value={selected.decision.action} />
            <DataPoint
              label="Date and Time"
              value={dateTime.format(new Date(selected.decision.recordedAt))}
            />
            <DataPoint
              label="Remarks"
              value={selected.decision.remarks ?? "No remarks recorded"}
            />
            <DataPoint
              label="Previous Workflow Stage"
              value={selected.decision.previousStage}
            />
            <DataPoint
              label="Stage After Decision"
              value={selected.decision.nextStage}
            />
            <DataPoint
              label="Current Workflow Stage"
              value={selected.record.stage}
            />
            <DataPoint
              label="Downstream Handoff"
              value={selected.record.downstreamBundle?.state ?? "Not generated"}
            />
          </dl>
          {selected.record.downstreamBundle && (
            <div className="mt-4">
              <Alert
                tone={
                  selected.record.downstreamBundle.state === "Ready for Cashier"
                    ? "success"
                    : "warning"
                }
                title="Downstream document bundle"
              >
                {selected.record.downstreamBundle.issue ??
                  `${selected.record.downstreamBundle.payrollRegisterReference}, ${selected.record.downstreamBundle.adaAdcaReference}, and demonstration bank metadata are ready for Cashier. Payroll remains Not Released.`}
              </Alert>
            </div>
          )}
          <div className="mt-5 flex justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSelectedId(null)}
            >
              Close
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}

export function ChancellorNotifications({
  notifications,
  setNotifications,
  records,
  onReview,
  onDecision,
}: {
  notifications: ChancellorNotification[]
  setNotifications: Dispatch<SetStateAction<ChancellorNotification[]>>
  records: DvRecord[]
  onReview: (dvId: string) => void
  onDecision: (decisionId: string) => void
}) {
  const [tab, setTab] = useState<"all" | "unread">("all")
  const visible = notifications
    .filter((notice) => tab === "all" || !notice.read)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const open = (notice: ChancellorNotification) => {
    setNotifications((items) =>
      items.map((item) =>
        item.id === notice.id ? { ...item, read: true } : item,
      ),
    )
    if (notice.action === "decision" && notice.decisionId)
      onDecision(notice.decisionId)
    else if (records.some((record) => record.id === notice.dvId))
      onReview(notice.dvId)
  }
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Notifications"
        subtitle="Updates about Disbursement Vouchers requiring your decision."
      />
      <DemoNotice />
      <section className="rounded-card bg-surface p-5 elevate">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div
            role="tablist"
            aria-label="Chancellor notification views"
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
                {id === "all" ? "All Notifications" : "Unread"}
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
                <p className="font-semibold">{notice.title}</p>
                <p className="mt-1 text-sm text-text-muted">
                  {notice.description}
                </p>
                <p className="mt-2 text-xs text-text-muted">
                  {notice.dvId} · {notice.payrollId} ·{" "}
                  {dateTime.format(new Date(notice.createdAt))}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => open(notice)}
                  >
                    {notice.action === "decision"
                      ? "View Decision"
                      : "Review DV"}
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

export function ChancellorDashboard({
  records,
  user,
  onReview,
  onHistory,
}: {
  records: DvRecord[]
  user: MockUser
  onReview: (dvId?: string) => void
  onHistory: (tab?: ChancellorHistoryTab, decisionId?: string) => void
}) {
  const pending = records.filter(pendingForChancellor)
  const allDecisions = decisions(records)
  const approved = allDecisions.filter(
    ({ decision }) => decision.action === "Approved",
  )
  const returned = allDecisions.filter(
    ({ decision }) => decision.action === "Returned",
  )
  const cashier = records.filter(
    (record) =>
      record.downstreamBundle?.state === "Ready for Cashier" &&
      record.releaseStatus !== "Released",
  )
  const recent = [...allDecisions].sort((a, b) =>
    b.decision.recordedAt.localeCompare(a.decision.recordedAt),
  )
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Office of the Chancellor Dashboard"
        subtitle="Review pending Disbursement Vouchers and monitor your recent decisions."
      />
      <DemoNotice />
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-lg font-semibold">Welcome back, {user.name}</p>
        <Tag kind="placeholder">Demo Data</Tag>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Pending DV Reviews"
          count={pending.length}
          action="Review Pending DVs"
          onAction={() => onReview()}
        />
        <SummaryCard
          title="Approved by You"
          count={approved.length}
          action="View Approvals"
          onAction={() => onHistory("approved")}
        />
        <SummaryCard
          title="Returned by You"
          count={returned.length}
          action="View Returns"
          onAction={() => onHistory("returned")}
        />
        <SummaryCard
          title="Awaiting Cashier Processing"
          count={cashier.length}
          action="View Approved DVs"
          onAction={() => onHistory("approved")}
        />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-card bg-surface p-5 elevate">
          <p role="heading" aria-level={2} className="text-lg font-semibold">
            Disbursement Vouchers Awaiting Your Decision
          </p>
          {pending.length ? (
            <ul className="mt-4 grid gap-3">
              {pending.slice(0, 5).map((record) => (
                <li
                  key={record.id}
                  className="rounded-control border border-border p-4"
                >
                  <DataPoint
                    label="DV / Payroll Type"
                    value={`${record.id} · ${record.payrollTypeName}`}
                  />
                  <DataPoint
                    label="Period / Fund / Amount"
                    value={`${record.period} · ${record.fund} · ${
                      record.amount === null
                        ? "Unavailable"
                        : peso.format(record.amount)
                    }`}
                  />
                  <DataPoint
                    label="Date Received"
                    value={
                      record.receivedByChancellorAt
                        ? dateTime.format(
                            new Date(record.receivedByChancellorAt),
                          )
                        : "Not recorded"
                    }
                  />
                  <Button
                    type="button"
                    className="mt-3"
                    onClick={() => onReview(record.id)}
                  >
                    Review DV
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-text-muted">
              No Disbursement Vouchers currently require your review.
            </p>
          )}
        </section>
        <section className="rounded-card bg-surface p-5 elevate">
          <p role="heading" aria-level={2} className="text-lg font-semibold">
            Recent DV Decisions
          </p>
          {recent.length ? (
            <ul className="mt-4 grid gap-3">
              {recent.slice(0, 5).map(({ record, decision }) => (
                <li key={decision.id} className="rounded-control bg-canvas p-4">
                  <p className="font-semibold">
                    {record.id} · {decision.action}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    {dateTime.format(new Date(decision.recordedAt))}
                  </p>
                  {decision.remarks && (
                    <p className="mt-2 text-sm">{decision.remarks}</p>
                  )}
                  <Button
                    type="button"
                    variant="link"
                    className="mt-2"
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
            <p className="mt-4 text-sm text-text-muted">
              No Chancellor decisions have been recorded.
            </p>
          )}
        </section>
      </div>
      <Alert tone="warning" title="Release remains a Cashier action">
        Chancellor approval does not mark payroll Released and does not publish
        employee payslips.
      </Alert>
    </div>
  )
}

export function ChancellorHeaderBell({
  notifications,
  onOpen,
}: {
  notifications: ChancellorNotification[]
  onOpen: () => void
}) {
  const { open, setOpen, ref } = usePopover()
  const unread = notifications.filter((item) => !item.read)
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        data-trigger
        aria-label={`Chancellor notifications${
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
          <p className="font-semibold">Chancellor notifications</p>
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
