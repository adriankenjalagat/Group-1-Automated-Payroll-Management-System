import clsx from "clsx"
import { useMemo, useState } from "react"
import { Alert, Button, Icon, TextField, type IconName } from "../../MsuPayroll"
import { Tag } from "../../admin/ui"
import type { DvRecord } from "./dvData"
import type { HistoricalImportBatch } from "./historicalData"
import type { PayrollDraft } from "./payrollData"

type ApprovalView = "progress" | "return"
type DvView = "review" | "progress" | "return"
type ReportShortcut = "register" | "deductions" | "employee" | "processing"
type ImportShortcut = "import" | "history" | "records"

type DashboardProps = {
  user: string
  drafts: PayrollDraft[]
  dvRecords: DvRecord[]
  historicalBatches: HistoricalImportBatch[]
  onCreateDraft: () => void
  onPayroll: (draftId?: string) => void
  onComputation: (draftId?: string) => void
  onApproval: (draftId?: string, view?: ApprovalView) => void
  onDv: (dvId?: string, view?: DvView) => void
  onReport: (report?: ReportShortcut) => void
  onImport: (tab?: ImportShortcut, batchId?: string) => void
}

type AttentionItem = {
  id: string
  reference: string
  type: string
  description: string
  period: string
  stage: string
  meta: string
  action: string
  priority: number
  onOpen: () => void
}

type ActivityItem = {
  id: string
  action: string
  reference: string
  actor: string
  at: string
  source: "payroll" | "computation" | "approval" | "dv" | "import"
  onOpen: () => void
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
const currentDate = new Intl.DateTimeFormat("en-PH", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
})

type DataPointProps = {
  label: string
  value: React.ReactNode
}

function DataPoint({ label, value }: DataPointProps) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-text-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium">{value}</dd>
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
  description: string
  action?: string
  onAction?: () => void
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p role="heading" aria-level={2} className="text-lg font-semibold">
          {title}
        </p>
        <p className="mt-1 text-sm text-text-muted">{description}</p>
      </div>
      {action && onAction && (
        <Button
          type="button"
          variant="secondary"
          className="shrink-0"
          onClick={onAction}
        >
          {action}
        </Button>
      )}
    </div>
  )
}

function OverviewCard({
  icon,
  title,
  count,
  description,
  action,
  onAction,
  emphasized,
}: {
  icon: IconName
  title: string
  count: number
  description: string
  action: string
  onAction: () => void
  emphasized?: boolean
}) {
  return (
    <section
      className={clsx(
        "rounded-card border bg-surface p-5 elevate",
        emphasized ? "border-warning" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-10 place-items-center rounded-control bg-info-soft text-primary">
          <Icon name={icon} size={20} />
        </span>
        {emphasized && <Tag kind="placeholder">Needs attention</Tag>}
      </div>
      <p className="mt-4 text-sm font-semibold text-text-muted">{title}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{count}</p>
      <p className="mt-2 min-h-10 text-sm text-text-muted">{description}</p>
      <Button type="button" variant="link" className="mt-3" onClick={onAction}>
        {action}
      </Button>
    </section>
  )
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string
  value: number
  detail: string
}) {
  return (
    <div className="rounded-control bg-canvas p-4">
      <p className="text-xs font-medium text-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-text-muted">{detail}</p>
    </div>
  )
}

function EmptyState({
  title,
  detail,
  action,
  onAction,
}: {
  title: string
  detail?: string
  action?: string
  onAction?: () => void
}) {
  return (
    <div className="rounded-control bg-canvas p-6 text-center">
      <p className="font-semibold">{title}</p>
      {detail && <p className="mt-2 text-sm text-text-muted">{detail}</p>}
      {action && onAction && (
        <Button type="button" className="mt-4" onClick={onAction}>
          {action}
        </Button>
      )}
    </div>
  )
}

function includesQuery(query: string, values: Array<string | undefined>) {
  const normalized = query.trim().toLowerCase()
  return (
    !normalized ||
    values.some((value) => value?.toLowerCase().includes(normalized))
  )
}

function isEligibleReadyDv(record: DvRecord) {
  return (
    record.stage === "Ready for Accounting Review" &&
    record.prerequisites.payrollExists &&
    record.prerequisites.payrollApprovalsComplete &&
    record.prerequisites.budgetDocumentExists &&
    record.prerequisites.budgetApprovalsComplete &&
    record.prerequisites.readyForDvRecorded
  )
}

export function AccountingDashboard({
  user,
  drafts,
  dvRecords,
  historicalBatches,
  onCreateDraft,
  onPayroll,
  onComputation,
  onApproval,
  onDv,
  onReport,
  onImport,
}: DashboardProps) {
  const [query, setQuery] = useState("")
  const editableDrafts = drafts.filter(
    (draft) => draft.stage === "Draft" && !draft.locked,
  )
  const approvalDrafts = drafts.filter(
    (draft) => draft.stage === "For Approval",
  )
  const returnedPayrolls = drafts.filter(
    (draft) =>
      draft.stage === "Returned" &&
      (draft.currentApprovalHolder === "Accounting" ||
        draft.returnInfo ||
        draft.approvalHistory.at(-1)?.holder === "Accounting"),
  )
  const returnedDvs = dvRecords.filter(
    (record) =>
      record.stage === "Returned to Accounting" &&
      record.currentHolder === "Accounting Section",
  )
  const readyDvs = dvRecords.filter(isEligibleReadyDv)
  const recentDrafts = [...drafts]
    .filter((draft) =>
      includesQuery(query, [
        draft.id,
        draft.payrollTypeName,
        draft.period,
        draft.fund,
        draft.stageLabel,
        draft.stage,
      ]),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5)

  const computationDrafts = editableDrafts.filter((draft) =>
    includesQuery(query, [
      draft.id,
      draft.payrollTypeName,
      draft.period,
      draft.fund,
    ]),
  )
  const computableDrafts = editableDrafts.filter(
    (draft) =>
      !draft.finalNetPending &&
      !draft.exceptions.some((item) => item.blocksComputation) &&
      draft.rows.every((row) => row.calculationStatus === "Computed"),
  )
  const reviewDrafts = editableDrafts.filter(
    (draft) =>
      draft.finalNetPending ||
      draft.exceptions.length > 0 ||
      draft.rows.some((row) => row.calculationStatus === "Blocked"),
  )
  const blockingEmployees = new Set(
    editableDrafts.flatMap((draft) => [
      ...draft.exceptions
        .filter((item) => item.blocksComputation)
        .map((item) => `${draft.id}:${item.employeeId}`),
      ...draft.rows
        .filter((row) => row.calculationStatus === "Blocked")
        .map((row) => `${draft.id}:${row.employeeId}`),
    ]),
  )
  const approvalPreview = drafts
    .filter(
      (draft) =>
        (draft.stage === "For Approval" || draft.stage === "Returned") &&
        includesQuery(query, [
          draft.id,
          draft.payrollTypeName,
          draft.period,
          draft.currentApprovalHolder,
          draft.stageLabel,
        ]),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5)
  const dvPreview = dvRecords
    .filter((record) =>
      includesQuery(query, [
        record.id,
        record.payrollId,
        record.payrollTypeName,
        record.period,
        record.stage,
      ]),
    )
    .sort((a, b) => {
      const aDate = a.events.at(-1)?.at ?? a.generatedAt ?? ""
      const bDate = b.events.at(-1)?.at ?? b.generatedAt ?? ""
      return bDate.localeCompare(aDate)
    })
    .slice(0, 5)
  const recentImports = [...historicalBatches]
    .filter((batch) =>
      includesQuery(query, [
        batch.importId,
        batch.originalFilename,
        ...batch.payrollPeriodCoverage,
      ]),
    )
    .sort((a, b) => b.importedAt.localeCompare(a.importedAt))
    .slice(0, 3)

  const attentionItems = useMemo(() => {
    const items: AttentionItem[] = []
    drafts.forEach((draft) => {
      const blockedRows = draft.rows.filter(
        (row) => row.calculationStatus === "Blocked",
      )
      if (draft.stage === "Draft" && draft.finalNetPending)
        items.push({
          id: `${draft.id}-configuration`,
          reference: draft.id,
          type: "Payroll Computation Issue",
          description:
            blockedRows.length > 0
              ? `${blockedRows.length} employee calculation${
                  blockedRows.length === 1 ? "" : "s"
                } require configuration.`
              : "Final net pay remains pending because calculation rules require review.",
          period: draft.period,
          stage: draft.stageLabel ?? "Configuration Required",
          meta: `${draft.payrollTypeName} · ${draft.fund}`,
          action: "Review Computation",
          priority: 1,
          onOpen: () => onComputation(draft.id),
        })
      const blocking = draft.exceptions.filter((item) => item.blocksComputation)
      if (draft.stage === "Draft" && blocking.length)
        items.push({
          id: `${draft.id}-exceptions`,
          reference: draft.id,
          type: "Missing Employee Data",
          description: `${new Set(blocking.map((item) => item.employeeId)).size} employee${
            blocking.length === 1 ? "" : "s"
          } have blocking payroll information exceptions.`,
          period: draft.period,
          stage: draft.stageLabel ?? draft.stage,
          meta: `${draft.payrollTypeName} · ${draft.fund}`,
          action: "View Exceptions",
          priority: 1,
          onOpen: () => onComputation(draft.id),
        })
      if (draft.stage === "Returned" && draft.returnInfo)
        items.push({
          id: `${draft.id}-returned`,
          reference: draft.id,
          type: "Returned Payroll",
          description: draft.returnInfo.remarks,
          period: draft.period,
          stage: draft.stageLabel ?? "Returned to Accounting",
          meta: `${draft.payrollTypeName} · ${draft.fund}`,
          action: "Review Return",
          priority: 0,
          onOpen: () => onApproval(draft.id, "return"),
        })
    })
    readyDvs.forEach((record) =>
      items.push({
        id: `${record.id}-ready`,
        reference: record.id,
        type: "DV Ready for Review",
        description:
          "A fictional demonstration voucher has recorded prerequisite completion and is ready for Accounting checking.",
        period: record.period,
        stage: record.stage,
        meta: `${record.payrollTypeName} · ${record.fund}`,
        action: "Review DV",
        priority: 0,
        onOpen: () => onDv(record.id, "review"),
      }),
    )
    returnedDvs.forEach((record) =>
      items.push({
        id: `${record.id}-returned`,
        reference: record.id,
        type: "Returned DV",
        description:
          record.returnInfo?.remarks ??
          "The voucher was returned to Accounting with recorded remarks.",
        period: record.period,
        stage: record.stage,
        meta: `${record.payrollTypeName} · ${record.fund}`,
        action: "View Remarks",
        priority: 0,
        onOpen: () => onDv(record.id, "return"),
      }),
    )
    return items
      .filter((item) =>
        includesQuery(query, [
          item.reference,
          item.type,
          item.description,
          item.period,
          item.meta,
        ]),
      )
      .sort((a, b) => a.priority - b.priority)
  }, [drafts, readyDvs, returnedDvs, query, onApproval, onComputation, onDv])

  const recentActivity = useMemo(() => {
    const items: ActivityItem[] = []
    drafts.forEach((draft) => {
      items.push({
        id: `${draft.id}-created`,
        action: "Payroll Draft Created",
        reference: draft.id,
        actor: draft.createdBy,
        at: draft.createdAt,
        source: "payroll",
        onOpen: () => onPayroll(draft.id),
      })
      draft.computationHistory?.forEach((event) =>
        items.push({
          id: `${draft.id}-${event.id}`,
          action: event.action,
          reference: draft.id,
          actor: event.recordedBy,
          at: event.at,
          source: "computation",
          onOpen: () => onComputation(draft.id),
        }),
      )
      draft.corrections.forEach((event) =>
        items.push({
          id: `${draft.id}-${event.id}`,
          action: "Draft Entry Corrected",
          reference: draft.id,
          actor: event.recordedBy,
          at: event.recordedAt,
          source: "computation",
          onOpen: () => onComputation(draft.id),
        }),
      )
      draft.rows
        .flatMap((row) => row.adjustments)
        .forEach((event) =>
          items.push({
            id: `${draft.id}-${event.id}`,
            action: "Payroll Adjustment Added",
            reference: draft.id,
            actor: event.recordedBy,
            at: event.recordedAt,
            source: "computation",
            onOpen: () => onComputation(draft.id),
          }),
        )
      draft.approvalHistory.forEach((event) =>
        items.push({
          id: `${draft.id}-${event.id}`,
          action: event.stage,
          reference: draft.id,
          actor: event.holder,
          at: event.at,
          source: "approval",
          onOpen: () =>
            onApproval(
              draft.id,
              draft.stage === "Returned" ? "return" : "progress",
            ),
        }),
      )
    })
    dvRecords.forEach((record) =>
      record.events.forEach((event) =>
        items.push({
          id: `${record.id}-${event.id}`,
          action: event.action,
          reference: record.id,
          actor: event.user ?? event.office,
          at: event.at,
          source: "dv",
          onOpen: () =>
            onDv(
              record.id,
              record.stage === "Returned to Accounting"
                ? "return"
                : record.stage === "Ready for Accounting Review"
                  ? "review"
                  : "progress",
            ),
        }),
      ),
    )
    historicalBatches.forEach((batch) =>
      items.push({
        id: `${batch.importId}-imported`,
        action: "Historical Payroll Imported",
        reference: batch.importId,
        actor: batch.importedBy,
        at: batch.importedAt,
        source: "import",
        onOpen: () => onImport("history", batch.importId),
      }),
    )
    return items
      .filter((item) =>
        includesQuery(query, [
          item.action,
          item.reference,
          item.actor,
          item.source,
        ]),
      )
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 8)
  }, [
    drafts,
    dvRecords,
    historicalBatches,
    query,
    onApproval,
    onComputation,
    onDv,
    onImport,
    onPayroll,
  ])

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p
            id="page-title"
            role="heading"
            aria-level={1}
            tabIndex={-1}
            className="text-2xl font-semibold sm:text-3xl"
          >
            Accounting Dashboard
          </p>
          <p className="mt-2 max-w-3xl text-sm text-text-muted">
            Monitor payroll preparation, computation, approvals, disbursement
            vouchers, and reporting activities.
          </p>
          <p className="mt-5 text-lg font-semibold">Welcome back, {user}</p>
          <p className="mt-1 text-sm text-text-muted">
            Here&apos;s an overview of your payroll-related tasks and recent
            activities.
          </p>
          <p className="mt-2 text-xs font-medium text-text-muted">
            {currentDate.format(new Date())}
          </p>
        </div>
        <Button type="button" onClick={onCreateDraft}>
          <Icon name="plus" size={18} />
          Create Payroll Draft
        </Button>
      </div>

      <Alert tone="info" title="Frontend operational overview">
        Counts and previews use the same local session records as the Accounting
        modules. Opening the Dashboard does not create, approve, release, or pay
        any payroll or voucher.
      </Alert>

      <TextField
        label="Search Dashboard Records"
        icon="search"
        placeholder="Search payroll, DV, import, period, type, or recorded activity..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewCard
          icon="clipboard"
          title="Payroll Drafts"
          count={editableDrafts.length}
          description="Payrolls currently being prepared."
          action="View Drafts"
          onAction={() => onPayroll()}
        />
        <OverviewCard
          icon="shield"
          title="For Approval"
          count={approvalDrafts.length}
          description="Payrolls awaiting action in the approval process."
          action="Track Approvals"
          onAction={() => onApproval()}
        />
        <OverviewCard
          icon="alert"
          title="Returned Items"
          count={returnedPayrolls.length + returnedDvs.length}
          description="Payrolls or documents needing Accounting review."
          action="Review Returns"
          emphasized={returnedPayrolls.length + returnedDvs.length > 0}
          onAction={() =>
            returnedPayrolls[0]
              ? onApproval(returnedPayrolls[0].id, "return")
              : returnedDvs[0]
                ? onDv(returnedDvs[0].id, "return")
                : onApproval()
          }
        />
        <OverviewCard
          icon="mail"
          title="DVs Ready for Review"
          count={readyDvs.length}
          description="Vouchers requiring document and amount validation."
          action="Review DVs"
          emphasized={readyDvs.length > 0}
          onAction={() =>
            readyDvs[0]
              ? onDv(readyDvs[0].id, "review")
              : onDv(undefined, "review")
          }
        />
      </div>
      {returnedPayrolls.length + returnedDvs.length === 0 && (
        <p className="text-sm text-text-muted">
          No documents are currently returned to Accounting.
        </p>
      )}

      <section className="rounded-card border border-warning bg-surface p-5 elevate sm:p-6">
        <SectionHeader
          title="Attention Required"
          description="Items that need action from the Accounting Section."
        />
        {attentionItems.length ? (
          <ul className="mt-5 grid gap-3">
            {attentionItems.map((item) => (
              <li
                key={item.id}
                className="grid gap-4 rounded-control bg-canvas p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{item.reference}</p>
                    <Tag kind="placeholder">{item.type}</Tag>
                  </div>
                  <p className="mt-2 text-sm">{item.description}</p>
                  <p className="mt-2 text-xs text-text-muted">
                    {item.period} · {item.meta} · {item.stage}
                  </p>
                </div>
                <Button type="button" variant="secondary" onClick={item.onOpen}>
                  {item.action}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-5">
            <EmptyState
              title={
                query
                  ? "No attention items match the Dashboard search."
                  : "No items currently require your action."
              }
              detail={
                query
                  ? "Clear or change the search to review other Accounting tasks."
                  : "You can review payroll drafts, approvals, and recent activities using the sections below."
              }
            />
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-card bg-surface p-5 elevate sm:p-6">
          <SectionHeader
            title="Payroll Management"
            description="Recent payroll drafts and their preparation status."
            action="View All"
            onAction={() => onPayroll()}
          />
          {recentDrafts.length ? (
            <ul className="mt-5 divide-y divide-border rounded-control border border-border">
              {recentDrafts.map((draft) => (
                <li
                  key={draft.id}
                  className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div>
                    <p className="font-semibold">{draft.id}</p>
                    <p className="mt-1 text-sm">
                      {draft.payrollTypeName} · {draft.period}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      {draft.fund} · {draft.stageLabel ?? draft.stage}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => onPayroll(draft.id)}
                  >
                    {draft.stage === "Draft"
                      ? "Continue Draft"
                      : "View Payroll"}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-5">
              <EmptyState
                title={
                  query
                    ? "No payroll records match the Dashboard search."
                    : "No payroll drafts are currently available."
                }
                action="Create Payroll Draft"
                onAction={onCreateDraft}
              />
            </div>
          )}
        </section>

        <section className="rounded-card bg-surface p-5 elevate sm:p-6">
          <SectionHeader
            title="Payroll Computation"
            description="Review calculation availability, exceptions, and payroll amounts."
            action="View All"
            onAction={() => onComputation()}
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Metric
              label="Computable Drafts"
              value={computableDrafts.length}
              detail="Enough recorded information for supported draft calculations."
            />
            <Metric
              label="Drafts Requiring Review"
              value={reviewDrafts.length}
              detail="Recorded issues, pending rules, or manual review."
            />
            <Metric
              label="Employees with Blocking Exceptions"
              value={blockingEmployees.size}
              detail="Unique affected employees within each editable payroll."
            />
          </div>
          {reviewDrafts.length === 0 && (
            <p className="mt-4 text-sm text-text-muted">
              No computation exceptions currently require review.
            </p>
          )}
          {computationDrafts.length ? (
            <ul className="mt-5 divide-y divide-border rounded-control border border-border">
              {computationDrafts.slice(0, 5).map((draft) => {
                const blocked = new Set([
                  ...draft.exceptions
                    .filter((item) => item.blocksComputation)
                    .map((item) => item.employeeId),
                  ...draft.rows
                    .filter((row) => row.calculationStatus === "Blocked")
                    .map((row) => row.employeeId),
                ]).size
                const availability = draft.rows.some(
                  (row) => row.calculationStatus === "Blocked",
                )
                  ? "Configuration Required"
                  : draft.finalNetPending || draft.exceptions.length
                    ? "Requires Review"
                    : "Available for Draft Review"
                return (
                  <li
                    key={draft.id}
                    className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div>
                      <p className="font-semibold">{draft.id}</p>
                      <p className="mt-1 text-sm">
                        {draft.payrollTypeName} · {draft.period}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
                        {availability} · {blocked} blocking employee exception
                        {blocked === 1 ? "" : "s"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => onComputation(draft.id)}
                    >
                      View Computation
                    </Button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="mt-5">
              <EmptyState
                title={
                  query
                    ? "No computation records match the Dashboard search."
                    : "No payroll computations are available yet."
                }
                action="Open Payroll Computation"
                onAction={() => onComputation()}
              />
            </div>
          )}
        </section>

        <section className="rounded-card bg-surface p-5 elevate sm:p-6">
          <SectionHeader
            title="Approval Tracking"
            description="Monitor the progress of payrolls and related approval documents."
            action="View All"
            onAction={() => onApproval()}
          />
          {approvalPreview.length ? (
            <ul className="mt-5 divide-y divide-border rounded-control border border-border">
              {approvalPreview.map((draft) => {
                const holder =
                  draft.currentApprovalHolder ??
                  draft.approvalHistory.at(-1)?.holder ??
                  (draft.stage === "Returned"
                    ? "Accounting Section"
                    : "Holding office not recorded")
                return (
                  <li
                    key={draft.id}
                    className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div>
                      <p className="font-semibold">{draft.id}</p>
                      <p className="mt-1 text-sm">
                        {draft.payrollTypeName} · {draft.period}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
                        {draft.stageLabel ?? draft.stage} · {holder}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="link"
                      onClick={() =>
                        onApproval(
                          draft.id,
                          draft.stage === "Returned" ? "return" : "progress",
                        )
                      }
                    >
                      {draft.stage === "Returned"
                        ? "Review Return"
                        : "Track Progress"}
                    </Button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="mt-5">
              <EmptyState
                title="No payrolls are currently in the approval workflow."
                action="Open Approval Tracking"
                onAction={() => onApproval()}
              />
            </div>
          )}
        </section>

        <section className="rounded-card bg-surface p-5 elevate sm:p-6">
          <SectionHeader
            title="Disbursement Vouchers"
            description="Review vouchers requiring Accounting checking and track their approval progress."
            action="View All"
            onAction={() => onDv()}
          />
          {readyDvs.length === 0 && (
            <p className="mt-4 text-sm text-text-muted">
              No Disbursement Vouchers currently require review.
            </p>
          )}
          {dvPreview.length ? (
            <ul className="mt-5 divide-y divide-border rounded-control border border-border">
              {dvPreview.map((record) => {
                const view: DvView =
                  record.stage === "Ready for Accounting Review"
                    ? "review"
                    : record.stage === "Returned to Accounting"
                      ? "return"
                      : "progress"
                return (
                  <li
                    key={record.id}
                    className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{record.id}</p>
                        <Tag kind="placeholder">Fictional DV Fixture</Tag>
                      </div>
                      <p className="mt-1 text-sm">
                        {record.payrollId} ·{" "}
                        {record.amount === null
                          ? "Amount unavailable"
                          : peso.format(record.amount)}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
                        {record.stage} · {record.currentHolder}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => onDv(record.id, view)}
                    >
                      {view === "review"
                        ? "Review DV"
                        : view === "return"
                          ? "Review Return"
                          : "View Progress"}
                    </Button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="mt-5">
              <EmptyState
                title="No Disbursement Vouchers currently require Accounting review."
                action="View All"
                onAction={() => onDv()}
              />
            </div>
          )}
        </section>
      </div>

      <section className="rounded-card bg-surface p-5 elevate sm:p-6">
        <SectionHeader
          title="Reports"
          description="Access payroll registers, deduction summaries, employee history, and approval processing reports."
          action="View Reports"
          onAction={() => onReport()}
        />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {([
            [
              "register",
              "Payroll Register",
              "View permitted payroll records and employee pay totals.",
            ],
            [
              "deductions",
              "Deduction Reports",
              "Review recorded deduction amounts by period and category.",
            ],
            [
              "employee",
              "Employee Payroll History",
              "Search an employee's payroll records across periods.",
            ],
            [
              "processing",
              "Approval Processing Time",
              "Review recorded processing durations across approval stages.",
            ],
          ] as const).map(([id, title, description]) => (
            <div
              key={id}
              className="rounded-control border border-border bg-canvas p-4"
            >
              <span className="grid size-9 place-items-center rounded-control bg-info-soft text-primary">
                <Icon name="building" size={18} />
              </span>
              <p className="mt-4 font-semibold">{title}</p>
              <p className="mt-2 min-h-10 text-sm text-text-muted">
                {description}
              </p>
              <Button
                type="button"
                variant="link"
                className="mt-3"
                onClick={() => onReport(id)}
              >
                Open Report
              </Button>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-text-muted">
          Report availability depends on recorded source stages. Opening a
          shortcut does not finalize a draft or generate an export.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-card bg-surface p-5 elevate sm:p-6">
          <SectionHeader
            title="Historical Import"
            description="Access previously imported payroll records and review import activity."
            action="View Imports"
            onAction={() => onImport("history")}
          />
          {recentImports.length ? (
            <ul className="mt-5 divide-y divide-border rounded-control border border-border">
              {recentImports.map((batch) => (
                <li
                  key={batch.importId}
                  className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{batch.importId}</p>
                      {batch.demoFixtureFlag && (
                        <Tag kind="placeholder">Fictional Sample</Tag>
                      )}
                    </div>
                    <p className="mt-1 break-words text-sm">
                      {batch.originalFilename}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      {batch.payrollPeriodCoverage.join(", ")} ·{" "}
                      {batch.recordCount} records ·{" "}
                      {dateTime.format(new Date(batch.importedAt))}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => onImport("history", batch.importId)}
                  >
                    View Import
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-5">
              <EmptyState
                title={
                  query && historicalBatches.length
                    ? "No historical imports match the Dashboard search."
                    : "No historical payroll imports are available."
                }
                action="Open Historical Import"
                onAction={() => onImport("import")}
              />
            </div>
          )}
          <Button
            type="button"
            variant="secondary"
            className="mt-5"
            onClick={() => onImport("import")}
          >
            Import Historical Payroll
          </Button>
          <p className="mt-3 text-xs text-text-muted">
            Historical imports are read-only and do not enter active payroll,
            approval, DV, payslip, or payment workflows.
          </p>
        </section>

        <section className="rounded-card bg-surface p-5 elevate sm:p-6">
          <SectionHeader
            title="Recent Activity"
            description="Recent recorded payroll and Accounting workflow actions."
          />
          {recentActivity.length ? (
            <ol className="mt-5 grid gap-3">
              {recentActivity.map((item) => (
                <li
                  key={item.id}
                  className="grid gap-3 rounded-control bg-canvas p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start"
                >
                  <span className="grid size-9 place-items-center rounded-full bg-info-soft text-primary">
                    <Icon
                      name={
                        item.source === "dv"
                          ? "mail"
                          : item.source === "import"
                            ? "clock"
                            : item.source === "approval"
                              ? "shield"
                              : "clipboard"
                      }
                      size={17}
                    />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{item.action}</p>
                    <p className="mt-1 text-xs text-text-muted">
                      {item.reference} · {item.actor}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      {dateTime.format(new Date(item.at))}
                    </p>
                  </div>
                  <Button type="button" variant="link" onClick={item.onOpen}>
                    View Details
                  </Button>
                </li>
              ))}
            </ol>
          ) : (
            <div className="mt-5">
              <EmptyState title="No recent Accounting activity is available." />
            </div>
          )}
          <p className="mt-4 text-xs text-text-muted">
            This feed includes only timestamps stored in local source records;
            it is not a production immutable audit log.
          </p>
        </section>
      </div>
    </div>
  )
}
