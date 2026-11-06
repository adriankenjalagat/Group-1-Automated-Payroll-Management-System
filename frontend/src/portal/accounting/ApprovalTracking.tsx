import clsx from "clsx"
import { useMemo, useState } from "react"
import { Alert, Button, Icon, TextField } from "../../MsuPayroll"
import { Modal, SelectField, Tag } from "../../admin/ui"
import {
  draftTotals,
  type PayrollDraft,
  type PayrollStage,
} from "./payrollData"
import {
  initialBudgetPayrolls,
  type BudgetDocument,
} from "../budget/budgetData"
import type { CostCenterApprovalRequest } from "../costCenter/costCenterData"

type TrackingTab = "all" | "progress" | "returned" | "completed"
type TrackingState = "progress" | "returned" | "completed"
type TimelineState = "Completed" | "Current / Pending" | "Not Yet Reached" | "Returned" | "Blocked / Configuration Required"
type DocumentType = "Payroll" | "ORAS" | "BURAS" | "Disbursement Voucher"
type StageKey = "accounting" | "payroll-cost-center" | "budget-preparation" | "budget-cost-center" | "dv-accounting" | "dv-accountant" | "dv-chancellor"

type CostCenterDecision = {
  id: string
  costCenter: string
  stage: "Payroll Approval" | "ORAS/BURAS Approval"
  signatory?: string
  decision: "Approved" | "Pending" | "Returned"
  at?: string
  remarks?: string
}

type TrackingEvent = {
  id: string
  at: string
  documentType: DocumentType
  stage: string
  stageKey: StageKey
  office: string
  user?: string
  action: string
  remarks?: string
  relatedDocumentId?: string
  previousStage?: string
  nextStage?: string
}

type TimelineStep = {
  key: StageKey
  title: string
  office: string
  description: string
  state: TimelineState
}

type TrackingRecord = {
  id: string
  approvalRecordId: string
  payrollTypeId: string
  payrollTypeName: string
  period: string
  fund: "F01" | "F05" | "F07"
  employeeCount: number
  netTotal: number | null
  state: TrackingState
  currentStage: string
  currentHolders: string[]
  lastActivity?: string
  markedAt?: string
  locked: boolean
  routeConfigured: boolean
  isolatedFixture: boolean
  payrollCostCenters: CostCenterDecision[]
  budgetCostCenters: CostCenterDecision[]
  budgetDocumentType: "ORAS" | "BURAS"
  budgetDocumentReference?: string
  budgetPreparationStatus: string
  dvReference?: string
  dvAvailable: boolean
  supportingDocumentsAvailable: boolean
  dvReviewStatus: string
  events: TrackingEvent[]
  returnInfo?: {
    documentType: DocumentType
    office: string
    at: string
    remarks?: string
    stage: string
    nextAction: string
    accountingCorrectionAuthorized: boolean
  }
  sourceDraft?: PayrollDraft
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

function recordFromBudget(
  document: BudgetDocument,
  requests: CostCenterApprovalRequest[],
): TrackingRecord {
  const payroll = initialBudgetPayrolls.find(
    (item) => item.id === document.payrollId,
  )
  const related = requests.filter(
    (request) =>
      request.documentReference === document.reference &&
      (!document.routingInstanceId ||
        request.routingInstanceId === document.routingInstanceId),
  )
  const budgetCostCenters: CostCenterDecision[] =
    document.requiredCostCenterIds.map((costCenterId) => {
      const request = related.find((item) => item.costCenterId === costCenterId)
      const costCenter =
        payroll?.requiredCostCenters.find((item) => item.id === costCenterId)
          ?.name ??
        request?.costCenterName ??
        costCenterId
      return {
        id: request?.id ?? `${document.id}-${costCenterId}`,
        costCenter,
        stage: "ORAS/BURAS Approval",
        decision: request?.state ?? "Pending",
        at: request?.decisions.at(-1)?.recordedAt,
        remarks:
          request?.returnInfo?.remarks ?? request?.decisions.at(-1)?.remarks,
      }
    })
  const events: TrackingEvent[] = document.events.map((event) => ({
    id: event.id,
    at: event.recordedAt,
    documentType: document.type,
    stage:
      event.action === "Budget document fully approved"
        ? "Cost Center: ORAS / BURAS Approval"
        : "Budget: ORAS / BURAS Preparation",
    stageKey:
      event.action === "Budget document fully approved" ||
      /return|cost center/i.test(event.action)
        ? "budget-cost-center"
        : "budget-preparation",
    office: event.office,
    user: event.actor,
    action: event.action,
    remarks: event.remarks,
    relatedDocumentId: document.reference,
  }))
  return {
    id: document.payrollReference,
    approvalRecordId: `${document.id}-ACCOUNTING-TRACKING`,
    payrollTypeId: payroll?.id ?? document.payrollId,
    payrollTypeName: payroll?.payrollType ?? "Budget-linked payroll",
    period: payroll?.payrollPeriod ?? "Period unavailable",
    fund: document.fund,
    employeeCount: payroll?.employees.length ?? 0,
    netTotal: payroll?.net ?? null,
    state:
      document.stage === "Returned to Budget Office" ? "returned" : "progress",
    currentStage: document.stage,
    currentHolders: [document.currentHolder],
    lastActivity: document.updatedAt,
    markedAt: document.createdAt,
    locked: document.stage !== "Draft",
    routeConfigured: related.length > 0,
    isolatedFixture: true,
    payrollCostCenters:
      payroll?.approvalEvents.map((event) => ({
        id: event.id,
        costCenter: event.costCenterName,
        stage: "Payroll Approval",
        decision: "Approved",
        at: event.recordedAt,
        remarks: event.remarks,
      })) ?? [],
    budgetCostCenters,
    budgetDocumentType: document.type,
    budgetDocumentReference: document.reference,
    budgetPreparationStatus:
      document.stage === "Draft"
        ? "Budget document draft"
        : "Budget document prepared",
    dvAvailable: document.stage === "Ready for DV",
    supportingDocumentsAvailable: document.supportReferences.length > 0,
    dvReviewStatus:
      document.stage === "Ready for DV"
        ? "Eligible for Accounting DV workflow"
        : "Not yet eligible",
    events,
    returnInfo: document.returnInfo
      ? {
          documentType: document.type,
          office: document.returnInfo.costCenterName,
          at: document.returnInfo.recordedAt,
          remarks: document.returnInfo.remarks,
          stage: "Cost Center ORAS/BURAS Approval",
          nextAction:
            "Budget Office reviews and revises the returned document.",
          accountingCorrectionAuthorized: false,
        }
      : undefined,
  }
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

function StatusBadge({ state }: { state: TimelineState }) {
  const styles =
    state === "Completed"
      ? "bg-success-soft text-success"
      : state === "Current / Pending"
        ? "bg-warning-soft text-warning"
        : state === "Returned"
          ? "bg-danger-soft text-danger"
          : state === "Blocked / Configuration Required"
            ? "bg-danger-soft text-danger"
            : "bg-canvas text-text-muted"
  const icon =
    state === "Completed"
      ? "check"
      : state === "Returned"
        ? "arrowLeft"
        : state === "Blocked / Configuration Required"
          ? "alert"
          : "clock"
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        styles,
      )}
    >
      <Icon name={icon} size={13} />
      {state}
    </span>
  )
}

function compactPayrollType(name: string) {
  return name.replace("Payroll for ", "").replace(" Employees", "")
}

function actualEvents(draft: PayrollDraft): TrackingEvent[] {
  return draft.approvalHistory.map((event) => {
    const returned = /return/i.test(event.stage)
    const marked = /marked|submitted/i.test(event.stage)
    return {
      id: event.id,
      at: event.at,
      documentType: "Payroll" as const,
      stage: marked
        ? "Accounting: Mark for Approval"
        : returned
          ? "Cost Center: Payroll Approval"
          : event.stage,
      stageKey: marked ? "accounting" as const : "payroll-cost-center" as const,
      office: returned
        ? (draft.returnInfo?.office ?? "Recorded returning office unavailable")
        : event.holder,
      action: event.stage,
      remarks: event.remarks,
      previousStage: marked ? "Payroll Computation" : undefined,
      nextStage: returned
        ? "Returned to Accounting"
        : "Cost Center Payroll Approval",
    }
  })
}

function hasGenuineDvCompletion(draft: PayrollDraft) {
  return draft.approvalHistory.some(
    (event) =>
      /chancellor/i.test(`${event.stage} ${event.holder}`) &&
      /approv/i.test(event.stage),
  )
}

function recordFromDraft(draft: PayrollDraft): TrackingRecord | null {
  const completed = hasGenuineDvCompletion(draft)
  const entered =
    draft.stage === "For Approval" ||
    draft.stage === "Returned" ||
    completed ||
    draft.approvalHistory.length > 0
  if (!entered) return null
  const events = actualEvents(draft)
  const marked = events.find((event) => event.stageKey === "accounting")
  const returned = draft.stage === "Returned" || Boolean(draft.returnInfo)
  const state: TrackingState = completed
    ? "completed"
    : returned
      ? "returned"
      : "progress"
  const netAvailable =
    draft.rows.length > 0 &&
    draft.rows.every((row) => row.calculationStatus === "Computed") &&
    !draft.finalNetPending
  const lastActivity =
    [...events].sort((a, b) => b.at.localeCompare(a.at))[0]?.at ??
    draft.updatedAt
  return {
    id: draft.id,
    approvalRecordId: `${draft.id}-TRACKING`,
    payrollTypeId: draft.payrollTypeId,
    payrollTypeName: draft.payrollTypeName,
    period: draft.period,
    fund: draft.fund,
    employeeCount: draft.rows.filter(
      (row) => row.calculationStatus === "Computed",
    ).length,
    netTotal: netAvailable ? draftTotals(draft).net : null,
    state,
    currentStage: completed
      ? "DV Approved"
      : returned
        ? "Returned to Accounting"
        : "Awaiting Payroll Approval",
    currentHolders: completed
      ? ["Downstream disbursement workflow"]
      : returned
        ? ["Accounting Section"]
        : draft.currentApprovalHolder
          ? [draft.currentApprovalHolder]
          : [],
    lastActivity,
    markedAt: marked?.at,
    locked: draft.locked,
    routeConfigured: draft.approvalRouteConfigured,
    isolatedFixture: false,
    payrollCostCenters: [],
    budgetCostCenters: [],
    budgetDocumentType: draft.fund === "F01" ? "ORAS" : "BURAS",
    budgetPreparationStatus: "Not Yet Reached",
    dvAvailable: false,
    supportingDocumentsAvailable: false,
    dvReviewStatus: completed ? "DV Approved" : "Not Yet Reached",
    events,
    returnInfo: returned
      ? {
          documentType: "Payroll",
          office:
            draft.returnInfo?.office ?? "Recorded returning office unavailable",
          at: draft.returnInfo?.at ?? lastActivity,
          remarks: draft.returnInfo?.remarks,
          stage: "Cost Center: Payroll Approval",
          nextAction:
            "Open the existing payroll computation for authorized correction, recompute supported values, and complete final review before any resubmission.",
          accountingCorrectionAuthorized: draft.stage === "Returned",
        }
      : undefined,
    sourceDraft: draft,
  }
}

const fixture: TrackingRecord = {
  id: "DEMO-APPROVAL-001",
  approvalRecordId: "DEMO-APPROVAL-001",
  payrollTypeId: "isolated-approval-example",
  payrollTypeName: "Fictional Approval Workflow Example",
  period: "Isolated UI workflow fixture",
  fund: "F05",
  employeeCount: 0,
  netTotal: null,
  state: "progress",
  currentStage: "Awaiting Payroll Approval",
  currentHolders: ["Demo Cost Center B"],
  lastActivity: "2026-10-31T10:15:00+08:00",
  markedAt: "2026-10-31T09:00:00+08:00",
  locked: true,
  routeConfigured: true,
  isolatedFixture: true,
  payrollCostCenters: [
    {
      id: "DEMO-CC-PAY-A",
      costCenter: "Demo Cost Center A",
      stage: "Payroll Approval",
      signatory: "Fictional authorized role",
      decision: "Approved",
      at: "2026-10-31T10:15:00+08:00",
      remarks: "Fictional approval event for interface testing only.",
    },
    {
      id: "DEMO-CC-PAY-B",
      costCenter: "Demo Cost Center B",
      stage: "Payroll Approval",
      decision: "Pending",
    },
  ],
  budgetCostCenters: [
    {
      id: "DEMO-CC-BUD-A",
      costCenter: "Demo Cost Center A",
      stage: "ORAS/BURAS Approval",
      decision: "Pending",
    },
    {
      id: "DEMO-CC-BUD-B",
      costCenter: "Demo Cost Center B",
      stage: "ORAS/BURAS Approval",
      decision: "Pending",
    },
  ],
  budgetDocumentType: "BURAS",
  budgetPreparationStatus: "Not Yet Reached",
  dvAvailable: false,
  supportingDocumentsAvailable: false,
  dvReviewStatus: "Not Yet Reached",
  events: [
    {
      id: "DEMO-APPROVAL-001-A",
      at: "2026-10-31T09:00:00+08:00",
      documentType: "Payroll",
      stage: "Accounting: Mark for Approval",
      stageKey: "accounting",
      office: "Accounting Section",
      user: "Fictional Accounting role",
      action: "Submitted to isolated approval workflow",
      remarks:
        "Fictional Approval Workflow Example. This event is not attached to an actual payroll draft.",
      previousStage: "Payroll Computation",
      nextStage: "Cost Center Payroll Approval",
    },
    {
      id: "DEMO-APPROVAL-001-B",
      at: "2026-10-31T10:15:00+08:00",
      documentType: "Payroll",
      stage: "Cost Center: Payroll Approval",
      stageKey: "payroll-cost-center",
      office: "Demo Cost Center A",
      user: "Fictional authorized role",
      action: "Approved fictional payroll workflow fixture",
      remarks:
        "Demo Cost Center B remains pending; the workflow has not advanced to Budget.",
      previousStage: "Accounting: Mark for Approval",
      nextStage: "Await remaining required Cost Center approval",
    },
  ],
}

const timelineDefinitions: Omit<TimelineStep, "state">[] = [
  {
    key: "accounting",
    title: "Accounting: Mark for Approval",
    office: "Accounting Section",
    description:
      "Accounting completes payroll review and marks the draft for approval.",
  },
  {
    key: "payroll-cost-center",
    title: "Cost Center: Payroll Approval",
    office: "Required Cost Center signatories",
    description: "Designated Cost Center signatories review the payroll.",
  },
  {
    key: "budget-preparation",
    title: "Budget Office: ORAS / BURAS Preparation",
    office: "Budget Office",
    description:
      "Budget prepares ORAS for F01 or BURAS for F05/F07 after required payroll approvals.",
  },
  {
    key: "budget-cost-center",
    title: "Cost Center: ORAS / BURAS Approval",
    office: "Required Cost Center signatories",
    description: "Required Cost Centers review the applicable budget document.",
  },
  {
    key: "dv-accounting",
    title: "Accounting: Disbursement Voucher Review",
    office: "Accounting Section",
    description:
      "Accounting reviews the DV and supporting documents when the workflow reaches Ready for DV.",
  },
  {
    key: "dv-accountant",
    title: "Accountant: DV Review",
    office: "Accountant",
    description: "The Accountant reviews the Disbursement Voucher.",
  },
  {
    key: "dv-chancellor",
    title: "Office of the Chancellor: DV Review",
    office: "Office of the Chancellor",
    description:
      "The Office of the Chancellor performs the final recorded DV approval review.",
  },
]

function timelineFor(record: TrackingRecord): TimelineStep[] {
  const completed = new Set(
    record.events
      .filter((event) => /approved|submitted|marked/i.test(event.action))
      .map((event) => event.stageKey),
  )
  const returnedStage = record.events.find((event) =>
    /return/i.test(event.action),
  )?.stageKey
  const currentKey: StageKey =
    record.state === "returned"
      ? (returnedStage ?? "payroll-cost-center")
      : record.currentStage === "Awaiting Payroll Approval"
        ? "payroll-cost-center"
        : record.currentStage === "Budget Document Preparation"
          ? "budget-preparation"
          : record.currentStage === "Awaiting Budget Document Approval"
            ? "budget-cost-center"
            : record.currentStage === "Ready for DV"
              ? "dv-accounting"
              : record.currentStage === "DV Under Accountant Review"
                ? "dv-accountant"
                : record.currentStage === "DV Under Chancellor Review"
                  ? "dv-chancellor"
                  : "dv-chancellor"
  const currentIndex = timelineDefinitions.findIndex(
    (step) => step.key === currentKey,
  )
  return timelineDefinitions.map((step, index) => {
    let state: TimelineState = "Not Yet Reached"
    if (completed.has(step.key)) state = "Completed"
    if (step.key === currentKey) state = "Current / Pending"
    if (returnedStage === step.key) state = "Returned"
    if (
      step.key === "payroll-cost-center" &&
      !record.routeConfigured &&
      record.state !== "returned"
    )
      state = "Blocked / Configuration Required"
    if (record.state === "completed") state = "Completed"
    if (index > currentIndex && record.state !== "completed")
      state = "Not Yet Reached"
    return { ...step, state }
  })
}

function DecisionTable({
  title,
  decisions,
}: {
  title: string
  decisions: CostCenterDecision[]
}) {
  const [expanded, setExpanded] = useState(false)
  return (
    <section className="rounded-control border border-border">
      <Button
        type="button"
        variant="secondary"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="h-auto w-full justify-between rounded-control border-0 p-4 shadow-none"
      >
        <span className="text-left">
          <span className="block font-semibold">{title}</span>
          <span className="mt-1 block text-xs font-normal text-text-muted">
            {decisions.length
              ? `${decisions.filter((item) => item.decision === "Approved").length} approved · ${decisions.filter((item) => item.decision === "Pending").length} pending`
              : "No configured Cost Center decision details are available"}
          </span>
        </span>
        <Icon
          name="chevronDown"
          size={17}
          className={clsx(expanded && "rotate-180")}
        />
      </Button>
      {expanded &&
        (decisions.length ? (
          <>
            <div className="hidden border-t border-border lg:block">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-canvas text-text-muted">
                    {[
                      "Required Cost Center",
                      "Approval Stage",
                      "Authorized Signatory",
                      "Decision",
                      "Action Date",
                      "Remarks",
                    ].map((item) => (
                      <th key={item} className="px-3 py-3 font-semibold">
                        {item}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {decisions.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-3 font-medium">
                        {item.costCenter}
                      </td>
                      <td className="px-3 py-3">{item.stage}</td>
                      <td className="px-3 py-3">
                        {item.signatory ?? "Not configured / not recorded"}
                      </td>
                      <td className="px-3 py-3">{item.decision}</td>
                      <td className="px-3 py-3">
                        {item.at
                          ? dateTime.format(new Date(item.at))
                          : "Pending"}
                      </td>
                      <td className="px-3 py-3">
                        {item.remarks ?? "No remarks recorded"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-border border-t border-border lg:hidden">
              {decisions.map((item) => (
                <li key={item.id} className="p-4">
                  <p className="font-semibold">{item.costCenter}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-3">
                    <DataPoint label="Stage" value={item.stage} />
                    <DataPoint label="Decision" value={item.decision} />
                    <DataPoint
                      label="Signatory"
                      value={item.signatory ?? "Not configured / not recorded"}
                    />
                    <DataPoint
                      label="Action Date"
                      value={
                        item.at ? dateTime.format(new Date(item.at)) : "Pending"
                      }
                    />
                    <DataPoint
                      label="Remarks"
                      value={item.remarks ?? "No remarks recorded"}
                    />
                  </dl>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="border-t border-border p-4">
            <Alert tone="warning" title="Approval route details unavailable">
              Approval routing has not been configured for this payroll type,
              fund, or required Cost Center, or the configured route is not
              exposed to this local prototype.
            </Alert>
          </div>
        ))}
    </section>
  )
}

function ProgressDialog({
  record,
  onClose,
  onHistory,
}: {
  record: TrackingRecord
  onClose: () => void
  onHistory: () => void
}) {
  const timeline = timelineFor(record)
  return (
    <Modal title="Payroll Approval Progress" onClose={onClose} wide>
      <p className="-mt-3 text-sm text-text-muted">
        View the current approval stage and the history of required approvals.
      </p>
      {record.isolatedFixture && (
        <div className="mt-4">
          <Alert tone="info" title="Fictional Approval Workflow Example">
            This isolated fixture demonstrates one completed and one pending
            Cost Center decision. It is not attached to an actual payroll draft
            and has no approved payroll amount.
          </Alert>
        </div>
      )}

      <section className="mt-6">
        <SectionTitle title="Payroll Summary" />
        <dl className="mt-3 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
          <DataPoint label="Payroll Reference" value={record.id} />
          <DataPoint label="Payroll Type" value={record.payrollTypeName} />
          <DataPoint label="Payroll Period" value={record.period} />
          <DataPoint label="Fund Source" value={record.fund} />
          <DataPoint
            label="Included Employee Count"
            value={String(record.employeeCount)}
          />
          <DataPoint
            label="Net Payroll Total"
            value={
              record.netTotal !== null
                ? peso.format(record.netTotal)
                : "Approved calculation snapshot unavailable"
            }
            muted={record.netTotal === null}
          />
          <DataPoint
            label="Date Marked for Approval"
            value={
              record.markedAt
                ? dateTime.format(new Date(record.markedAt))
                : "Not recorded"
            }
            muted={!record.markedAt}
          />
          <DataPoint
            label="Current Workflow Stage"
            value={record.currentStage}
          />
          <DataPoint
            label="Current Holding Office / Offices"
            value={
              record.currentHolders.length
                ? record.currentHolders.join(", ")
                : record.routeConfigured
                  ? "Current approval holder unavailable"
                  : "Approval route unavailable"
            }
          />
        </dl>
      </section>

      <section className="mt-6">
        <SectionTitle
          title="Approval Timeline"
          description="Stages reflect recorded actions only. Later stages remain inactive until prerequisites are recorded."
        />
        <ol className="mt-4 grid gap-3">
          {timeline.map((step, index) => {
            const events = record.events.filter(
              (event) => event.stageKey === step.key,
            )
            return (
              <li
                key={step.key}
                className="relative rounded-control border border-border p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-on-primary text-sm font-semibold">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-semibold">{step.title}</p>
                      <p className="mt-1 text-xs text-text-muted">
                        Responsible office: {step.office}
                      </p>
                      <p className="mt-2 text-sm text-text-muted">
                        {step.description}
                      </p>
                    </div>
                  </div>
                  <StatusBadge state={step.state} />
                </div>
                {events.length > 0 && (
                  <ul className="mt-3 grid gap-2 border-t border-border pt-3">
                    {events.map((event) => (
                      <li key={event.id} className="text-xs text-text-muted">
                        {dateTime.format(new Date(event.at))} · {event.action}
                        {event.remarks ? ` · ${event.remarks}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
                {step.key === "budget-preparation" && (
                  <dl className="mt-3 grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
                    <DataPoint
                      label="Required Document Type"
                      value={record.budgetDocumentType}
                    />
                    <DataPoint
                      label="Preparation Status"
                      value={record.budgetPreparationStatus}
                    />
                    <DataPoint
                      label="Document Reference"
                      value={
                        record.budgetDocumentReference ??
                        "The required approval document is not yet available."
                      }
                      muted={!record.budgetDocumentReference}
                    />
                  </dl>
                )}
                {step.key === "dv-accounting" && (
                  <dl className="mt-3 grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
                    <DataPoint
                      label="DV Reference"
                      value={record.dvReference ?? "Not generated"}
                      muted={!record.dvReference}
                    />
                    <DataPoint
                      label="DV Availability"
                      value={record.dvAvailable ? "Available" : "Not available"}
                    />
                    <DataPoint
                      label="Supporting Document Availability"
                      value={
                        record.supportingDocumentsAvailable
                          ? "Available"
                          : "Not available"
                      }
                    />
                    <DataPoint
                      label="DV Review / Checked Information"
                      value={record.dvReviewStatus}
                    />
                  </dl>
                )}
              </li>
            )
          })}
        </ol>
      </section>

      <div className="mt-6 grid gap-4">
        <DecisionTable
          title="Payroll Cost Center Approval Details"
          decisions={record.payrollCostCenters}
        />
        <DecisionTable
          title={`${record.budgetDocumentType} Cost Center Approval Details`}
          decisions={record.budgetCostCenters}
        />
      </div>

      {record.state === "completed" && (
        <div className="mt-5">
          <Alert tone="info" title="DV approval is not payment release">
            Completed DV approval does not mean the payroll is Released or Paid.
            Downstream Cashier processing remains separate.
          </Alert>
        </div>
      )}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
        <Button type="button" onClick={onHistory}>
          View Approval History
        </Button>
      </div>
    </Modal>
  )
}

function HistoryDialog({
  record,
  onClose,
  onEvent,
}: {
  record: TrackingRecord
  onClose: () => void
  onEvent: (eventId: string) => void
}) {
  const events = [...record.events].sort((a, b) => a.at.localeCompare(b.at))
  return (
    <Modal title="Approval History" onClose={onClose} wide>
      <p className="-mt-3 text-sm text-text-muted">
        Recorded actions taken during payroll and document approval.
      </p>
      {events.length ? (
        <>
          <div className="mt-5 hidden overflow-hidden rounded-control border border-border lg:block">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-canvas text-text-muted">
                  {[
                    "Date and Time",
                    "Document Type",
                    "Approval Stage",
                    "Responsible Office",
                    "Recorded User",
                    "Action",
                    "Remarks",
                  ].map((item) => (
                    <th key={item} className="px-2 py-3 font-semibold">
                      {item}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {events.map((event) => (
                  <tr key={event.id}>
                    <td className="px-2 py-3">
                      {dateTime.format(new Date(event.at))}
                    </td>
                    <td className="px-2 py-3">{event.documentType}</td>
                    <td className="px-2 py-3">{event.stage}</td>
                    <td className="px-2 py-3">{event.office}</td>
                    <td className="px-2 py-3">
                      {event.user ?? "Not recorded"}
                    </td>
                    <td className="px-2 py-3">
                      <Button
                        type="button"
                        variant="link"
                        className="text-xs"
                        onClick={() => onEvent(event.id)}
                      >
                        {event.action}
                      </Button>
                    </td>
                    <td className="px-2 py-3">
                      {event.remarks ?? "No remarks recorded"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="mt-5 divide-y divide-border rounded-control border border-border lg:hidden">
            {events.map((event) => (
              <li key={event.id} className="p-4">
                <p className="text-xs text-text-muted">
                  {dateTime.format(new Date(event.at))}
                </p>
                <p className="mt-1 font-semibold">{event.action}</p>
                <p className="mt-1 text-sm text-text-muted">
                  {event.documentType} · {event.stage} · {event.office}
                </p>
                <Button
                  type="button"
                  variant="link"
                  onClick={() => onEvent(event.id)}
                  className="mt-2"
                >
                  View Event Details
                </Button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-5 rounded-control bg-canvas p-4 text-sm text-text-muted">
          No recorded approval events are available.
        </p>
      )}
      <p className="mt-4 text-xs text-text-muted">
        Read-only local workflow history. Events cannot be deleted or edited
        from Approval Tracking.
      </p>
      <div className="mt-5 flex justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  )
}

function EventDialog({
  record,
  event,
  onClose,
}: {
  record: TrackingRecord
  event: TrackingEvent
  onClose: () => void
}) {
  return (
    <Modal title="Approval Event Details" onClose={onClose}>
      <dl className="grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
        <DataPoint label="Payroll Reference" value={record.id} />
        <DataPoint
          label="Related Document Reference"
          value={event.relatedDocumentId ?? "Not recorded"}
          muted={!event.relatedDocumentId}
        />
        <DataPoint label="Recorded Office" value={event.office} />
        <DataPoint
          label="Recorded User"
          value={event.user ?? "Not recorded"}
          muted={!event.user}
        />
        <DataPoint label="Action" value={event.action} />
        <DataPoint
          label="Date and Time"
          value={dateTime.format(new Date(event.at))}
        />
        <DataPoint
          label="Remarks"
          value={event.remarks ?? "No remarks recorded"}
        />
        <DataPoint
          label="Previous Workflow Stage"
          value={event.previousStage ?? "Not recorded"}
        />
        <DataPoint
          label="Next Workflow Stage"
          value={event.nextStage ?? "Not recorded"}
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

function ReturnDialog({
  record,
  onClose,
  onOpenCorrection,
}: {
  record: TrackingRecord
  onClose: () => void
  onOpenCorrection: (draftId: string) => void
}) {
  const info = record.returnInfo
  if (!info) return null
  return (
    <Modal title="Returned Document Details" onClose={onClose} wide>
      <section>
        <SectionTitle title="Payroll Information" />
        <dl className="mt-3 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
          <DataPoint label="Payroll Reference" value={record.id} />
          <DataPoint label="Payroll Type" value={record.payrollTypeName} />
          <DataPoint label="Payroll Period" value={record.period} />
          <DataPoint label="Fund Source" value={record.fund} />
        </dl>
      </section>
      <section className="mt-6">
        <SectionTitle title="Return Information" />
        <dl className="mt-3 grid gap-4 rounded-control border border-border p-4 sm:grid-cols-2">
          <DataPoint label="Document Type" value={info.documentType} />
          <DataPoint label="Returning Office" value={info.office} />
          <DataPoint label="Recorded Return Action" value="Returned" />
          <DataPoint
            label="Return Date and Time"
            value={dateTime.format(new Date(info.at))}
          />
          <DataPoint label="Relevant Approval Stage" value={info.stage} />
          <DataPoint
            label="Remarks"
            value={
              info.remarks ?? "Return remarks are missing from this record."
            }
            muted={!info.remarks}
          />
        </dl>
        {!info.remarks && (
          <div className="mt-3">
            <Alert tone="warning" title="Incomplete return record">
              Expected return remarks were not recorded. No remarks have been
              invented.
            </Alert>
          </div>
        )}
      </section>
      <section className="mt-6">
        <SectionTitle title="Previous Action History" />
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
            tone={info.accountingCorrectionAuthorized ? "info" : "warning"}
            title={
              info.accountingCorrectionAuthorized
                ? "Accounting correction is authorized"
                : "Read-only for Accounting"
            }
          >
            {info.nextAction}
          </Alert>
        </div>
      </section>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>
          Back to Returned
        </Button>
        {info.documentType === "Payroll" &&
          info.accountingCorrectionAuthorized &&
          record.sourceDraft && (
            <Button type="button" onClick={() => onOpenCorrection(record.id)}>
              Open Payroll for Correction
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
        <Icon name="shield" size={24} />
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

export function ApprovalTracking({
  drafts,
  budgetDocuments = [],
  costCenterRequests = [],
  onOpenCorrection,
  initialTab,
  initialRecordId,
  initialView,
}: {
  drafts: PayrollDraft[]
  budgetDocuments?: BudgetDocument[]
  costCenterRequests?: CostCenterApprovalRequest[]
  onOpenCorrection: (draftId: string) => void
  initialTab?: TrackingTab
  initialRecordId?: string | null
  initialView?: "progress" | "return"
}) {
  const [tab, setTab] = useState<TrackingTab>(initialTab ?? "all")
  const [query, setQuery] = useState("")
  const [type, setType] = useState("")
  const [period, setPeriod] = useState("")
  const [fund, setFund] = useState("")
  const [stage, setStage] = useState("")
  const [holder, setHolder] = useState("")
  const [progressId, setProgressId] = useState<string | null>(
    initialView === "progress" ? (initialRecordId ?? null) : null,
  )
  const [historyId, setHistoryId] = useState<string | null>(null)
  const [returnId, setReturnId] = useState<string | null>(
    initialView === "return" ? (initialRecordId ?? null) : null,
  )
  const [eventId, setEventId] = useState<string | null>(null)

  const records = useMemo(
    () => [
      ...drafts
        .map(recordFromDraft)
        .filter((record): record is TrackingRecord => Boolean(record)),
      ...budgetDocuments
        .filter((document) => document.stage !== "Draft")
        .map((document) => recordFromBudget(document, costCenterRequests)),
      fixture,
    ],
    [budgetDocuments, costCenterRequests, drafts],
  )
  const tabRecords = records.filter((record) =>
    tab === "all"
      ? true
      : tab === "progress"
        ? record.state === "progress"
        : tab === "returned"
          ? record.state === "returned"
          : record.state === "completed",
  )
  const filtered = tabRecords.filter(
    (record) =>
      (!query.trim() ||
        [record.id, record.payrollTypeName, record.period].some((value) =>
          value.toLowerCase().includes(query.trim().toLowerCase()),
        )) &&
      (!type || record.payrollTypeId === type) &&
      (!period || record.period === period) &&
      (!fund || record.fund === fund) &&
      (!stage || record.currentStage === stage) &&
      (!holder || record.currentHolders.includes(holder)),
  )
  const payrollTypes = [
    ...new Map(
      records.map((record) => [record.payrollTypeId, record.payrollTypeName]),
    ).entries(),
  ]
  const periods = [...new Set(records.map((record) => record.period))]
  const stages = [...new Set(records.map((record) => record.currentStage))]
  const holders = [
    ...new Set(records.flatMap((record) => record.currentHolders)),
  ]
  const hasFilters = Boolean(query || type || period || fund || stage || holder)
  const clearFilters = () => {
    setQuery("")
    setType("")
    setPeriod("")
    setFund("")
    setStage("")
    setHolder("")
  }
  const progressRecord = records.find((record) => record.id === progressId)
  const historyRecord = records.find((record) => record.id === historyId)
  const returnRecord = records.find((record) => record.id === returnId)
  const eventRecord = records.find((record) =>
    record.events.some((event) => event.id === eventId),
  )
  const selectedEvent = eventRecord?.events.find(
    (event) => event.id === eventId,
  )
  const counts = {
    progress: records.filter((record) => record.state === "progress").length,
    otherOffices: records.filter(
      (record) =>
        record.state === "progress" &&
        record.currentHolders.some((office) => office !== "Accounting Section"),
    ).length,
    returned: records.filter((record) => record.state === "returned").length,
    completed: records.filter((record) => record.state === "completed").length,
  }
  const empty: [string, string?] =
    tab === "all"
      ? [
          "No payrolls have entered the approval workflow yet.",
          "Payrolls will appear here after Accounting marks eligible completed drafts for approval.",
        ]
      : tab === "progress"
        ? ["No payroll approvals are currently in progress.", undefined]
        : tab === "returned"
          ? [
              "No payrolls or documents are currently returned to Accounting.",
              undefined,
            ]
          : ["No completed DV approvals are available.", undefined]

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
            Approval Tracking
          </p>
          <p className="mt-2 text-sm text-text-muted">
            Monitor payroll approvals, document routing, pending actions, and
            returned transactions.
          </p>
        </div>
        <Alert tone="info" title="Monitoring interface">
          Approval decisions are performed by the designated offices. Accounting
          can monitor progress and address returned documents when authorized.
        </Alert>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Payrolls In Progress", counts.progress],
            ["Awaiting Action by Other Offices", counts.otherOffices],
            ["Returned to Accounting", counts.returned],
            ["Completed DV Approvals", counts.completed],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-card bg-surface p-5 elevate"
            >
              <p className="text-xs font-medium text-text-muted">{label}</p>
              <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-card bg-surface elevate">
          <div className="border-b border-border p-5 sm:p-6">
            <div
              role="tablist"
              aria-label="Approval Tracking views"
              className="grid gap-1 rounded-control bg-canvas p-1 sm:grid-cols-4"
            >
              {([
                ["all", "All Payrolls"],
                ["progress", "In Progress"],
                ["returned", "Returned"],
                ["completed", "Completed Approvals"],
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
            <div className="mt-5">
              <SectionTitle
                title={
                  tab === "returned"
                    ? "Returned Items"
                    : tab === "completed"
                      ? "Completed Approvals"
                      : tab === "progress"
                        ? "Approvals In Progress"
                        : "Approval Workflow Records"
                }
                description={
                  tab === "returned"
                    ? "Payrolls and approval documents returned to Accounting for review or correction."
                    : tab === "completed"
                      ? "Payrolls whose required Disbursement Voucher approvals have been completed."
                      : "Only payrolls and isolated fixtures that have entered an approval workflow are shown."
                }
              />
              <p className="mt-2 text-xs text-text-muted">
                {filtered.length} matching record
                {filtered.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <TextField
                label="Search Payrolls"
                icon="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search payroll reference, payroll type, or period..."
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
                placeholder="All Funds"
              >
                <option value="F01">F01</option>
                <option value="F05">F05</option>
                <option value="F07">F07</option>
              </SelectField>
              <SelectField
                label="Current Approval Stage"
                value={stage}
                onChange={(event) => setStage(event.target.value)}
                placeholder="All represented stages"
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
                placeholder="All represented offices"
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
          </div>

          {filtered.length ? (
            tab === "returned" ? (
              <>
                <div className="hidden xl:block">
                  <table className="w-full table-fixed text-left text-xs">
                    <thead>
                      <tr className="border-b border-border bg-canvas text-text-muted">
                        {[
                          "Payroll Reference",
                          "Document Type",
                          "Payroll Type",
                          "Payroll Period",
                          "Returning Office",
                          "Return Date",
                          "Return Remarks Preview",
                          "Action",
                        ].map((item) => (
                          <th key={item} className="px-3 py-3 font-semibold">
                            {item}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filtered.map((record) => (
                        <tr key={record.id}>
                          <td className="px-3 py-3 font-semibold">
                            {record.id}
                          </td>
                          <td className="px-3 py-3">
                            {record.returnInfo?.documentType ?? "Unavailable"}
                          </td>
                          <td className="px-3 py-3">
                            {record.payrollTypeName}
                          </td>
                          <td className="px-3 py-3">{record.period}</td>
                          <td className="px-3 py-3">
                            {record.returnInfo?.office ??
                              "Current approval holder unavailable"}
                          </td>
                          <td className="px-3 py-3">
                            {record.returnInfo?.at
                              ? dateTime.format(new Date(record.returnInfo.at))
                              : "Not recorded"}
                          </td>
                          <td className="px-3 py-3">
                            {record.returnInfo?.remarks ??
                              "Return remarks are missing"}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <Button
                              type="button"
                              variant="link"
                              onClick={() => setReturnId(record.id)}
                            >
                              Review Return
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <ul className="divide-y divide-border xl:hidden">
                  {filtered.map((record) => (
                    <li key={record.id} className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{record.id}</p>
                          <p className="mt-1 text-sm">
                            {record.payrollTypeName}
                          </p>
                        </div>
                        <span className="rounded-full bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger">
                          {record.returnInfo?.documentType ?? "Returned"}
                        </span>
                      </div>
                      <dl className="mt-4 grid grid-cols-2 gap-3">
                        <DataPoint
                          label="Period / Fund"
                          value={`${record.period} · ${record.fund}`}
                        />
                        <DataPoint
                          label="Returning Office"
                          value={
                            record.returnInfo?.office ??
                            "Current approval holder unavailable"
                          }
                        />
                        <DataPoint
                          label="Return Date"
                          value={
                            record.returnInfo?.at
                              ? dateTime.format(new Date(record.returnInfo.at))
                              : "Not recorded"
                          }
                        />
                        <DataPoint
                          label="Remarks"
                          value={
                            record.returnInfo?.remarks ??
                            "Return remarks are missing"
                          }
                        />
                      </dl>
                      <Button
                        type="button"
                        onClick={() => setReturnId(record.id)}
                        className="mt-4 w-full"
                      >
                        Review Return
                      </Button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <div className="hidden 2xl:block">
                  <table className="w-full table-fixed text-left text-xs">
                    <thead>
                      <tr className="border-b border-border bg-canvas text-text-muted">
                        {[
                          "Payroll Reference",
                          "Payroll Type",
                          "Payroll Period",
                          "Fund",
                          "Net Payroll Total",
                          "Current Stage",
                          "Current Holder",
                          "Last Activity",
                          "Actions",
                        ].map((item) => (
                          <th key={item} className="px-3 py-3 font-semibold">
                            {item}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filtered.map((record) => (
                        <tr key={record.id}>
                          <td className="px-3 py-3">
                            <p className="font-semibold">{record.id}</p>
                            {record.isolatedFixture && (
                              <p className="mt-1 text-text-muted">
                                Isolated fictional fixture
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {record.payrollTypeName}
                          </td>
                          <td className="px-3 py-3">{record.period}</td>
                          <td className="px-3 py-3">{record.fund}</td>
                          <td className="px-3 py-3 font-semibold tabular-nums">
                            {record.netTotal !== null
                              ? peso.format(record.netTotal)
                              : "Snapshot unavailable"}
                          </td>
                          <td className="px-3 py-3">{record.currentStage}</td>
                          <td className="px-3 py-3">
                            {record.currentHolders.length
                              ? record.currentHolders.join(", ")
                              : record.routeConfigured
                                ? "Current approval holder unavailable"
                                : "Approval route unavailable"}
                          </td>
                          <td className="px-3 py-3">
                            {record.lastActivity
                              ? dateTime.format(new Date(record.lastActivity))
                              : "Not recorded"}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap justify-end gap-1">
                              <Button
                                type="button"
                                variant="link"
                                onClick={() => setProgressId(record.id)}
                              >
                                View Progress
                              </Button>
                              <Button
                                type="button"
                                variant="link"
                                onClick={() => setHistoryId(record.id)}
                              >
                                View Approval History
                              </Button>
                              {record.state === "returned" && (
                                <Button
                                  type="button"
                                  variant="link"
                                  onClick={() => setReturnId(record.id)}
                                >
                                  Review Return
                                </Button>
                              )}
                            </div>
                          </td>
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
                          <p className="mt-1 text-sm">
                            {record.payrollTypeName}
                          </p>
                          {record.isolatedFixture && (
                            <p className="mt-1 text-xs text-text-muted">
                              Isolated fictional fixture
                            </p>
                          )}
                        </div>
                        <span
                          className={clsx(
                            "rounded-full px-2.5 py-1 text-xs font-semibold",
                            record.state === "returned"
                              ? "bg-danger-soft text-danger"
                              : record.state === "completed"
                                ? "bg-success-soft text-success"
                                : "bg-warning-soft text-warning",
                          )}
                        >
                          {record.currentStage}
                        </span>
                      </div>
                      <dl className="mt-4 grid grid-cols-2 gap-3">
                        <DataPoint
                          label="Period / Fund"
                          value={`${record.period} · ${record.fund}`}
                        />
                        <DataPoint
                          label="Current Holder"
                          value={
                            record.currentHolders.length
                              ? record.currentHolders.join(", ")
                              : record.routeConfigured
                                ? "Current approval holder unavailable"
                                : "Approval route unavailable"
                          }
                        />
                        <DataPoint
                          label="Net Payroll Total"
                          value={
                            record.netTotal !== null
                              ? peso.format(record.netTotal)
                              : "Snapshot unavailable"
                          }
                        />
                        <DataPoint
                          label="Last Activity"
                          value={
                            record.lastActivity
                              ? dateTime.format(new Date(record.lastActivity))
                              : "Not recorded"
                          }
                        />
                      </dl>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setProgressId(record.id)}
                        >
                          View Progress
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setHistoryId(record.id)}
                        >
                          View Approval History
                        </Button>
                        {record.state === "returned" && (
                          <Button
                            type="button"
                            onClick={() => setReturnId(record.id)}
                          >
                            Review Return
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )
          ) : (
            <EmptyState
              title={
                hasFilters
                  ? "No approval records match your search or filters."
                  : empty[0]
              }
              detail={hasFilters ? undefined : empty[1]}
              filtered={hasFilters}
              onClear={clearFilters}
            />
          )}
        </section>

        <Alert tone="info" title="Frontend monitoring prototype">
          Approval Tracking is read-only for approval decisions. Actual
          cross-office authorization, notifications, signatures, document
          generation, and production routing require backend enforcement and
          confirmed route configuration.
        </Alert>
      </div>

      {progressRecord && (
        <ProgressDialog
          record={progressRecord}
          onClose={() => setProgressId(null)}
          onHistory={() => {
            setProgressId(null)
            setHistoryId(progressRecord.id)
          }}
        />
      )}
      {historyRecord && (
        <HistoryDialog
          record={historyRecord}
          onClose={() => setHistoryId(null)}
          onEvent={(id) => {
            setHistoryId(null)
            setEventId(id)
          }}
        />
      )}
      {eventRecord && selectedEvent && (
        <EventDialog
          record={eventRecord}
          event={selectedEvent}
          onClose={() => setEventId(null)}
        />
      )}
      {returnRecord && (
        <ReturnDialog
          record={returnRecord}
          onClose={() => setReturnId(null)}
          onOpenCorrection={onOpenCorrection}
        />
      )}
    </>
  )
}
