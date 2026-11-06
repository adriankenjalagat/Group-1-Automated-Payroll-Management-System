import clsx from "clsx"
import { useMemo, useState } from "react"
import { Alert, Button, Icon, TextField } from "../../MsuPayroll"
import { Modal, SelectField, Tag } from "../../admin/ui"
import type { HrEmployee } from "../hr/hrData"
import { rowTotals, type PayrollDraft, type PayrollRow } from "./payrollData"
import type { DvEvent, DvRecord } from "./dvData"
import {
  historicalPeriodLabel,
  type HistoricalImportBatch,
  type HistoricalPayrollRecord,
} from "./historicalData"

type ReportType = "register" | "deductions" | "employee" | "processing"
type Filters = {
  period: string
  payrollTypeId: string
  fund: string
  costCenter: string
  search: string
  payrollReference: string
  deductionType: string
  employeeId: string
  origin: string
  dateFrom: string
  dateTo: string
}

type ProcessingRow = {
  id: string
  payrollReference: string
  payrollTypeId: string
  payrollTypeName: string
  period: string
  fund: string
  documentType: "Payroll" | "ORAS" | "BURAS" | "Disbursement Voucher"
  stage: string
  office: string
  enteredAt: string
  completedAt?: string
  user?: string
  remarks?: string
  costCenters: string[]
  sourceLabel: string
  events: {
    at: string
    office: string
    action: string
    user?: string
    remarks?: string
  }[]
}

const initialFilters: Filters = {
  period: "",
  payrollTypeId: "",
  fund: "",
  costCenter: "",
  search: "",
  payrollReference: "",
  deductionType: "",
  employeeId: "",
  origin: "",
  dateFrom: "",
  dateTo: "",
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

function reportTitle(type: ReportType) {
  return type === "register"
    ? "Payroll Register"
    : type === "deductions"
      ? "Deduction Reports"
      : type === "employee"
        ? "Employee Payroll History"
        : "Approval Processing Time"
}

function reportDescription(type: ReportType) {
  return type === "register"
    ? "View employee payroll amounts and totals for the selected payroll records."
    : type === "deductions"
      ? "View totals for each deduction category across the selected payroll records."
      : type === "employee"
        ? "Search and review an employee's payroll records across available periods."
        : "Review recorded processing durations across payroll and document approval stages."
}

function filteredDrafts(drafts: PayrollDraft[], filters: Filters) {
  const normalized = filters.search.trim().toLowerCase()
  return drafts.filter(
    (draft) =>
      (!filters.period || draft.period === filters.period) &&
      (!filters.payrollTypeId ||
        draft.payrollTypeId === filters.payrollTypeId) &&
      (!filters.fund || draft.fund === filters.fund) &&
      (!filters.payrollReference || draft.id === filters.payrollReference) &&
      (!filters.costCenter ||
        draft.rows.some((row) => row.office === filters.costCenter)) &&
      (!normalized ||
        [draft.id, draft.payrollTypeName, draft.period].some((value) =>
          value.toLowerCase().includes(normalized),
        ) ||
        draft.rows.some(
          (row) =>
            [row.employeeName, row.employeeId].some((value) =>
              value.toLowerCase().includes(normalized),
            ) ||
            row.deductions.some((item) =>
              item.name.toLowerCase().includes(normalized),
            ),
        )),
  )
}

function registerRows(drafts: PayrollDraft[], costCenter: string) {
  return drafts.flatMap((draft) =>
    draft.rows
      .filter((row) => !costCenter || row.office === costCenter)
      .map((row) => ({ draft, row, totals: rowTotals(row) })),
  )
}

function employeeCandidates(
  drafts: PayrollDraft[],
  employees: HrEmployee[],
  historicalRecords: HistoricalPayrollRecord[],
) {
  const fromPayrolls = drafts.flatMap((draft) =>
    draft.rows.map((row) => ({
      id: row.employeeId,
      name: row.employeeName,
      classification: row.classification,
      employmentType: row.employmentType,
      office: row.office,
    })),
  )
  const fromHr = employees.map((employee) => ({
    id: employee.employeeId,
    name: employee.name,
    classification: employee.classification,
    employmentType: employee.employmentType,
    office: employee.office,
  }))
  const fromHistory = historicalRecords.map((record) => ({
    id: record.employeeId,
    name: record.employeeName,
    classification: "Historical identity",
    employmentType: "Imported historical record",
    office: record.costCenter ?? "Historical cost center not supplied",
  }))
  return [
    ...new Map(
      [...fromHistory, ...fromPayrolls, ...fromHr].map((employee) => [
        employee.id,
        employee,
      ]),
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name))
}

function durationLabel(start: string, end?: string) {
  if (!end) return "Duration unavailable"
  const milliseconds = new Date(end).valueOf() - new Date(start).valueOf()
  if (!Number.isFinite(milliseconds) || milliseconds < 0)
    return "Duration unavailable"
  const minutes = Math.floor(milliseconds / 60000)
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const remainder = minutes % 60
  return [days ? `${days}d` : "", hours ? `${hours}h` : "", `${remainder}m`]
    .filter(Boolean)
    .join(" ")
}

function emptyDeductionGroup() {
  return { amount: 0, employees: new Set<string>() }
}

function payrollProcessingRows(drafts: PayrollDraft[]): ProcessingRow[] {
  return drafts.flatMap((draft) => {
    const events = [...draft.approvalHistory].sort((a, b) =>
      a.at.localeCompare(b.at),
    )
    return events.map((event, index) => ({
      id: `${draft.id}-${event.id}`,
      payrollReference: draft.id,
      payrollTypeId: draft.payrollTypeId,
      payrollTypeName: draft.payrollTypeName,
      period: draft.period,
      fund: draft.fund,
      documentType: "Payroll" as const,
      stage: event.stage,
      office: event.holder,
      enteredAt: event.at,
      completedAt: events[index + 1]?.at,
      remarks: event.remarks,
      costCenters: [...new Set(draft.rows.map((row) => row.office))],
      sourceLabel: "Current System Payroll",
      events: events.map((item) => ({
        at: item.at,
        office: item.holder,
        action: item.stage,
        remarks: item.remarks,
      })),
    }))
  })
}

function dvProcessingRows(records: DvRecord[]): ProcessingRow[] {
  return records.flatMap((record) => {
    const events = [...record.events].sort((a, b) => a.at.localeCompare(b.at))
    return events.map((event, index) => ({
      id: `${record.id}-${event.id}`,
      payrollReference: record.payrollId,
      payrollTypeId: record.payrollTypeId,
      payrollTypeName: record.payrollTypeName,
      period: record.period,
      fund: record.fund,
      documentType: "Disbursement Voucher" as const,
      stage: event.action,
      office: event.office,
      enteredAt: event.at,
      completedAt: events[index + 1]?.at,
      user: event.user,
      remarks: event.remarks,
      costCenters: record.payrollSnapshot.costCenters,
      sourceLabel: record.fixtureLabel,
      events: events.map((item: DvEvent) => ({
        at: item.at,
        office: item.office,
        action: item.action,
        user: item.user,
        remarks: item.remarks,
      })),
    }))
  })
}

function EmployeeBreakdown({
  draft,
  row,
  title = "Employee Payroll Breakdown",
  onClose,
}: {
  draft: PayrollDraft
  row: PayrollRow
  title?: string
  onClose: () => void
}) {
  const totals = rowTotals(row)
  const pending =
    row.calculationStatus === "Blocked" || draft.finalNetPending === true
  return (
    <Modal title={title} onClose={onClose} wide>
      <Tag kind="placeholder">Read-only report snapshot</Tag>
      <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
        <DataPoint label="Employee Name" value={row.employeeName} />
        <DataPoint label="Employee ID" value={row.employeeId} />
        <DataPoint label="Payroll Reference" value={draft.id} />
        <DataPoint label="Payroll Type" value={draft.payrollTypeName} />
        <DataPoint label="Payroll Period" value={draft.period} />
        <DataPoint label="Fund" value={draft.fund} />
        <DataPoint label="Pay Basis" value={row.payBasis} />
        <DataPoint label="Cost Center" value={row.office} />
        <DataPoint
          label="Recorded Stage / Source"
          value={`${draft.stageLabel ?? draft.stage} · Current Payroll System`}
        />
        <DataPoint label="Source Reference" value={draft.id} />
        <DataPoint
          label="Basic Pay"
          value={
            row.basicPay !== undefined
              ? peso.format(totals.basic)
              : "Pending Calculation"
          }
        />
        <DataPoint
          label="Other Earnings"
          value={
            row.calculationStatus === "Computed"
              ? peso.format(totals.adjustments)
              : "Pending Calculation"
          }
        />
        <DataPoint
          label="Gross Pay"
          value={
            row.calculationStatus === "Computed"
              ? peso.format(totals.gross)
              : "Pending Calculation"
          }
        />
        <DataPoint
          label="Total Deductions"
          value={
            row.deductions.length
              ? peso.format(totals.deductions)
              : pending
                ? "Configuration Required"
                : peso.format(0)
          }
        />
        <DataPoint
          label="Net Pay"
          value={pending ? "Pending Calculation" : peso.format(totals.net)}
        />
      </dl>
      <section className="mt-5">
        <SectionTitle title="Recorded Deductions" />
        {row.deductions.length ? (
          <ul className="mt-3 grid gap-2">
            {row.deductions.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-control bg-canvas p-3 text-sm"
              >
                <span>
                  <span className="font-medium">{item.name}</span>
                  <span className="mt-1 block text-xs text-text-muted">
                    {item.explanation}
                  </span>
                </span>
                <span className="font-semibold tabular-nums">
                  {peso.format(item.amount)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-text-muted">
            No recorded deduction entries are available.
          </p>
        )}
      </section>
      <section className="mt-5">
        <SectionTitle title="Available Approval History" />
        {draft.approvalHistory.length ? (
          <ol className="mt-3 grid gap-2">
            {draft.approvalHistory.map((event) => (
              <li
                key={event.id}
                className="rounded-control border border-border p-3 text-sm"
              >
                <p className="font-medium">{event.stage}</p>
                <p className="mt-1 text-xs text-text-muted">
                  {event.holder} · {dateTime.format(new Date(event.at))}
                </p>
                {event.remarks && (
                  <p className="mt-2 text-text-muted">{event.remarks}</p>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-text-muted">
            No approval history is recorded for this payroll.
          </p>
        )}
      </section>
      <div className="mt-5 flex justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  )
}

function DeductionDetails({
  name,
  drafts,
  costCenter,
  onClose,
}: {
  name: string
  drafts: PayrollDraft[]
  costCenter: string
  onClose: () => void
}) {
  const rows = drafts.flatMap((draft) =>
    draft.rows.flatMap((row) =>
      !costCenter || row.office === costCenter
        ? row.deductions
            .filter((item) => item.name === name)
            .map((deduction) => ({ draft, row, deduction }))
        : [],
    ),
  )
  return (
    <Modal title="Deduction Report Details" onClose={onClose} wide>
      <dl className="grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
        <DataPoint label="Deduction Type" value={name} />
        <DataPoint
          label="Matching Employee Entries"
          value={String(rows.length)}
        />
        <DataPoint
          label="Total Recorded Deduction"
          value={peso.format(
            rows.reduce((sum, item) => sum + item.deduction.amount, 0),
          )}
        />
      </dl>
      <ul className="mt-5 divide-y divide-border rounded-control border border-border">
        {rows.map(({ draft, row, deduction }) => (
          <li
            key={`${draft.id}-${row.employeeId}-${deduction.id}`}
            className="grid gap-3 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4"
          >
            <DataPoint
              label="Employee"
              value={`${row.employeeName} (${row.employeeId})`}
            />
            <DataPoint
              label="Payroll / Period"
              value={`${draft.id} · ${draft.period}`}
            />
            <DataPoint
              label="Payroll Type / Fund"
              value={`${draft.payrollTypeName} · ${draft.fund}`}
            />
            <DataPoint
              label="Recorded Amount"
              value={peso.format(deduction.amount)}
            />
          </li>
        ))}
      </ul>
      <div className="mt-5 flex justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>
          Back to Summary
        </Button>
      </div>
    </Modal>
  )
}

function ProcessingTimeline({
  row,
  onClose,
}: {
  row: ProcessingRow
  onClose: () => void
}) {
  return (
    <Modal title="Approval Processing Timeline" onClose={onClose} wide>
      <dl className="grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
        <DataPoint label="Payroll Reference" value={row.payrollReference} />
        <DataPoint label="Document Type" value={row.documentType} />
        <DataPoint label="Record Source" value={row.sourceLabel} />
        <DataPoint label="Payroll Type" value={row.payrollTypeName} />
        <DataPoint
          label="Payroll Period / Fund"
          value={`${row.period} · ${row.fund}`}
        />
      </dl>
      <ol className="mt-5 grid gap-3">
        {row.events.map((event, index) => (
          <li
            key={`${event.at}-${event.action}-${index}`}
            className="rounded-control border border-border p-4"
          >
            <div className="flex gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-on-primary">
                {index + 1}
              </span>
              <div>
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
              </div>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs text-text-muted">
        Durations use calendar elapsed time between recorded timestamps. No
        working-day, holiday, or service-level policy is assumed.
      </p>
      <div className="mt-5 flex justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>
          Back to Reports
        </Button>
      </div>
    </Modal>
  )
}

function FilterPanel({
  type,
  filters,
  setFilters,
  drafts,
  historicalRecords,
  employees,
  generated,
  onGenerate,
  onClear,
}: {
  type: ReportType
  filters: Filters
  setFilters: (next: Filters) => void
  drafts: PayrollDraft[]
  historicalRecords: HistoricalPayrollRecord[]
  employees: ReturnType<typeof employeeCandidates>
  generated: boolean
  onGenerate: () => void
  onClear: () => void
}) {
  const periods = [
    ...new Set([
      ...drafts.map((draft) => draft.period),
      ...(type === "employee"
        ? historicalRecords.map((record) =>
            historicalPeriodLabel(
              record.payrollPeriodStart,
              record.payrollPeriodEnd,
            ),
          )
        : []),
    ]),
  ]
  const payrollTypes = [
    ...new Map([
      ...drafts.map(
        (draft) => [draft.payrollTypeId, draft.payrollTypeName] as const,
      ),
      ...(type === "employee"
        ? historicalRecords.map(
            (record) =>
              [`historical:${record.payrollType}`, record.payrollType] as const,
          )
        : []),
    ]).entries(),
  ]
  const costCenters = [
    ...new Set(drafts.flatMap((draft) => draft.rows.map((row) => row.office))),
  ]
  const payrollReferences = drafts.map((draft) => draft.id)
  const deductionTypes = [
    ...new Set(
      drafts.flatMap((draft) =>
        draft.rows.flatMap((row) => row.deductions.map((item) => item.name)),
      ),
    ),
  ]
  const set = (key: keyof Filters, value: string) =>
    setFilters({ ...filters, [key]: value })
  return (
    <section className="rounded-card bg-surface p-5 elevate sm:p-6">
      <SectionTitle
        title={`${reportTitle(type)} Filters`}
        description="Choose a reporting scope, then generate an up-to-date preview from existing local records."
      />
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {type === "employee" ? (
          <>
            <TextField
              label="Search Employee"
              icon="search"
              value={filters.search}
              onChange={(event) => set("search", event.target.value)}
              placeholder="Search employee name or employee ID..."
            />
            <SelectField
              label="Employee"
              value={filters.employeeId}
              onChange={(event) => set("employeeId", event.target.value)}
              placeholder="Select an employee"
            >
              {employees
                .filter(
                  (employee) =>
                    !filters.search.trim() ||
                    [employee.name, employee.id].some((value) =>
                      value
                        .toLowerCase()
                        .includes(filters.search.trim().toLowerCase()),
                    ),
                )
                .map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} — {employee.id}
                  </option>
                ))}
            </SelectField>
          </>
        ) : (
          <TextField
            label="Search"
            icon="search"
            value={filters.search}
            onChange={(event) => set("search", event.target.value)}
            placeholder={
              type === "deductions"
                ? "Search payroll reference or deduction type..."
                : type === "processing"
                  ? "Search payroll or document reference..."
                  : "Search payroll reference, type, or employee..."
            }
          />
        )}
        <SelectField
          label="Payroll Period"
          value={filters.period}
          onChange={(event) => set("period", event.target.value)}
          placeholder="All periods"
        >
          {periods.map((period) => (
            <option key={period} value={period}>
              {period}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Payroll Type"
          value={filters.payrollTypeId}
          onChange={(event) => set("payrollTypeId", event.target.value)}
          placeholder="All represented payroll types"
        >
          {payrollTypes.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Fund Source"
          value={filters.fund}
          onChange={(event) => set("fund", event.target.value)}
          placeholder="All Funds"
        >
          <option value="F01">F01</option>
          <option value="F05">F05</option>
          <option value="F07">F07</option>
        </SelectField>
        <SelectField
          label="Cost Center / Office"
          value={filters.costCenter}
          onChange={(event) => set("costCenter", event.target.value)}
          placeholder="All represented Cost Centers"
        >
          {costCenters.map((office) => (
            <option key={office} value={office}>
              {office}
            </option>
          ))}
        </SelectField>
        {type === "register" && (
          <SelectField
            label="Payroll Reference"
            value={filters.payrollReference}
            onChange={(event) => set("payrollReference", event.target.value)}
            placeholder="All payroll references"
          >
            {payrollReferences.map((reference) => (
              <option key={reference} value={reference}>
                {reference}
              </option>
            ))}
          </SelectField>
        )}
        {type === "deductions" && (
          <SelectField
            label="Deduction Type"
            value={filters.deductionType}
            onChange={(event) => set("deductionType", event.target.value)}
            placeholder="All recorded deduction types"
          >
            {deductionTypes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </SelectField>
        )}
        {type === "employee" && (
          <SelectField
            label="Record Origin"
            value={filters.origin}
            onChange={(event) => set("origin", event.target.value)}
            placeholder="All supported origins"
          >
            <option value="Current Payroll Record">
              Current Payroll Record
            </option>
            <option value="Imported Historical Payroll">
              Imported Historical Payroll
            </option>
          </SelectField>
        )}
        {type === "processing" && (
          <>
            <TextField
              label="Date From"
              type="date"
              value={filters.dateFrom}
              onChange={(event) => set("dateFrom", event.target.value)}
            />
            <TextField
              label="Date To"
              type="date"
              value={filters.dateTo}
              onChange={(event) => set("dateTo", event.target.value)}
            />
          </>
        )}
      </div>
      <div className="mt-5 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          onClick={onClear}
          disabled={
            !generated && Object.values(filters).every((value) => value === "")
          }
        >
          Clear Filters
        </Button>
        <Button type="button" onClick={onGenerate}>
          Generate Preview
        </Button>
      </div>
    </section>
  )
}

function ExportActions({ onUnavailable }: { onUnavailable: () => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="secondary" onClick={onUnavailable}>
        Export PDF
      </Button>
      <Button type="button" variant="secondary" onClick={onUnavailable}>
        Export Excel
      </Button>
    </div>
  )
}

function HistoricalHistoryDetails({
  record,
  batch,
  onClose,
}: {
  record: HistoricalPayrollRecord
  batch?: HistoricalImportBatch
  onClose: () => void
}) {
  return (
    <Modal title="Imported Historical Payroll Details" onClose={onClose} wide>
      <div className="flex flex-wrap gap-2">
        <Tag kind="placeholder">Imported Historical Record</Tag>
        <Tag kind="placeholder">Read Only</Tag>
      </div>
      <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
        <DataPoint label="Employee Name" value={record.employeeName} />
        <DataPoint label="Employee ID" value={record.employeeId} />
        <DataPoint
          label="Payroll Period"
          value={historicalPeriodLabel(
            record.payrollPeriodStart,
            record.payrollPeriodEnd,
          )}
        />
        <DataPoint
          label="Payroll Reference"
          value={record.originalPayrollReference ?? "Not supplied"}
        />
        <DataPoint label="Payroll Type" value={record.payrollType} />
        <DataPoint label="Fund" value={record.fundSource} />
        <DataPoint label="Pay Basis" value={record.payBasis} />
        <DataPoint
          label="Historical Cost Center"
          value={record.costCenter ?? "Not supplied"}
        />
        <DataPoint
          label="Basic Pay"
          value={
            record.basicPay === undefined
              ? "Not supplied"
              : peso.format(record.basicPay)
          }
        />
        <DataPoint
          label="Other Earnings"
          value={
            record.otherEarnings === undefined
              ? "Not supplied"
              : peso.format(record.otherEarnings)
          }
        />
        <DataPoint label="Gross Pay" value={peso.format(record.grossPay)} />
        <DataPoint
          label="Total Deductions"
          value={peso.format(record.totalDeductions)}
        />
        <DataPoint label="Net Pay" value={peso.format(record.netPay)} />
        <DataPoint
          label="Detailed Deductions"
          value="Not supplied by the historical source"
        />
        <DataPoint label="Source" value="Imported Historical Record" />
        <DataPoint label="Recorded Stage" value="Read-only historical import" />
        <DataPoint label="Source Reference" value={record.importId} />
        <DataPoint
          label="Original File / Row"
          value={`${batch?.originalFilename ?? "Filename unavailable"} · Row ${record.originalSourceRow}`}
        />
        <DataPoint
          label="Import Date"
          value={
            batch ? dateTime.format(new Date(batch.importedAt)) : "Unavailable"
          }
        />
        <DataPoint
          label="Approval History"
          value="Not created by Historical Import"
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

export function Reports({
  drafts,
  dvRecords,
  employees,
  historicalRecords,
  historicalBatches,
  initialReport,
}: {
  drafts: PayrollDraft[]
  dvRecords: DvRecord[]
  employees: HrEmployee[]
  historicalRecords: HistoricalPayrollRecord[]
  historicalBatches: HistoricalImportBatch[]
  initialReport?: ReportType
}) {
  const [type, setType] = useState<ReportType>(initialReport ?? "register")
  const [filters, setFilters] = useState<Filters>(initialFilters)
  const [applied, setApplied] = useState<Filters | null>(null)
  const [exportNotice, setExportNotice] = useState(false)
  const [validationMessage, setValidationMessage] = useState("")
  const [breakdown, setBreakdown] = useState<{
    draftId: string
    employeeId: string
  } | null>(null)
  const [deductionName, setDeductionName] = useState<string | null>(null)
  const [historyDetail, setHistoryDetail] = useState<{
    draftId: string
    employeeId: string
  } | null>(null)
  const [historicalDetailId, setHistoricalDetailId] = useState<string | null>(
    null,
  )
  const [timelineId, setTimelineId] = useState<string | null>(null)
  const candidates = useMemo(
    () => employeeCandidates(drafts, employees, historicalRecords),
    [drafts, employees, historicalRecords],
  )
  const previewDrafts = applied ? filteredDrafts(drafts, applied) : []
  const rows = applied ? registerRows(previewDrafts, applied.costCenter) : []
  const processingRows = useMemo(
    () => [...payrollProcessingRows(drafts), ...dvProcessingRows(dvRecords)],
    [drafts, dvRecords],
  )
  const filteredProcessing = applied
    ? processingRows.filter((row) => {
        const normalized = applied.search.trim().toLowerCase()
        return (
          (!applied.period || row.period === applied.period) &&
          (!applied.payrollTypeId ||
            row.payrollTypeId === applied.payrollTypeId) &&
          (!applied.fund || row.fund === applied.fund) &&
          (!applied.costCenter ||
            row.costCenters.includes(applied.costCenter)) &&
          (!applied.dateFrom ||
            row.enteredAt.slice(0, 10) >= applied.dateFrom) &&
          (!applied.dateTo || row.enteredAt.slice(0, 10) <= applied.dateTo) &&
          (!normalized ||
            [
              row.payrollReference,
              row.payrollTypeName,
              row.documentType,
              row.office,
            ].some((value) => value.toLowerCase().includes(normalized)))
        )
      })
    : []
  const selectedCandidate = candidates.find(
    (candidate) => candidate.id === applied?.employeeId,
  )
  const employeeHistory =
    applied?.employeeId && applied
      ? previewDrafts.flatMap((draft) =>
          draft.rows
            .filter((row) => row.employeeId === applied.employeeId)
            .map((row) => ({ draft, row, totals: rowTotals(row) })),
        )
      : []
  const historicalEmployeeHistory =
    applied?.employeeId && applied
      ? historicalRecords.filter((record) => {
          const period = historicalPeriodLabel(
            record.payrollPeriodStart,
            record.payrollPeriodEnd,
          )
          return (
            record.employeeId === applied.employeeId &&
            (!applied.period || period === applied.period) &&
            (!applied.payrollTypeId ||
              applied.payrollTypeId === `historical:${record.payrollType}`) &&
            (!applied.fund || record.fundSource === applied.fund) &&
            (!applied.origin ||
              applied.origin === "Imported Historical Payroll")
          )
        })
      : []
  const currentEmployeeHistory =
    applied?.origin === "Imported Historical Payroll" ||
    applied?.payrollTypeId.startsWith("historical:")
      ? []
      : employeeHistory
  const breakdownDraft = drafts.find((draft) => draft.id === breakdown?.draftId)
  const breakdownRow = breakdownDraft?.rows.find(
    (row) => row.employeeId === breakdown?.employeeId,
  )
  const historyDraft = drafts.find(
    (draft) => draft.id === historyDetail?.draftId,
  )
  const historyRow = historyDraft?.rows.find(
    (row) => row.employeeId === historyDetail?.employeeId,
  )
  const timelineRow = processingRows.find((row) => row.id === timelineId)
  const historicalDetail = historicalRecords.find(
    (record) => record.historicalRecordId === historicalDetailId,
  )
  const historicalDetailBatch = historicalBatches.find(
    (batch) => batch.importId === historicalDetail?.importId,
  )

  const switchType = (next: ReportType) => {
    setType(next)
    setFilters(initialFilters)
    setApplied(null)
    setExportNotice(false)
    setValidationMessage("")
  }
  const clear = () => {
    setFilters(initialFilters)
    setApplied(null)
    setExportNotice(false)
    setValidationMessage("")
  }
  const generate = () => {
    if (type === "employee" && !filters.employeeId) {
      setApplied({ ...filters })
      setValidationMessage("Select an employee to view payroll history.")
      setExportNotice(false)
      return
    }
    if (
      type === "processing" &&
      filters.dateFrom &&
      filters.dateTo &&
      filters.dateFrom > filters.dateTo
    ) {
      setApplied(null)
      setValidationMessage("The start date must be on or before the end date.")
      setExportNotice(false)
      return
    }
    setApplied({ ...filters })
    setExportNotice(false)
    setValidationMessage("")
  }

  const renderRegister = () => {
    const totals = rows
      .filter(({ row }) => row.calculationStatus === "Computed")
      .reduce(
        (sum, item) => ({
          basic: sum.basic + item.totals.basic,
          adjustments: sum.adjustments + item.totals.adjustments,
          gross: sum.gross + item.totals.gross,
          deductions: sum.deductions + item.totals.deductions,
          net: sum.net + item.totals.net,
        }),
        { basic: 0, adjustments: 0, gross: 0, deductions: 0, net: 0 },
      )
    const totalsReconcile =
      Math.abs(totals.gross - totals.deductions - totals.net) < 0.01
    // All current DV records are isolated fictional fixtures and cannot make
    // shared payroll drafts eligible for an official final register.
    const allFinal = false
    return (
      <section className="overflow-hidden rounded-card bg-surface elevate">
        <div className="border-b border-border p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <SectionTitle
                title="Payroll Register Preview"
                description="Employee-level amounts are read from stored payroll rows and are not recalculated here."
              />
              <div className="mt-3">
                <Tag kind={allFinal ? "simulated" : "placeholder"}>
                  {allFinal ? "Final Report" : "Draft Preview — Not Final"}
                </Tag>
              </div>
            </div>
            <ExportActions onUnavailable={() => setExportNotice(true)} />
          </div>
          <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2 lg:grid-cols-4">
            <DataPoint
              label="Payroll Reference"
              value={
                previewDrafts.length
                  ? previewDrafts.map((draft) => draft.id).join(", ")
                  : "No matching payroll"
              }
            />
            <DataPoint
              label="Payroll Type"
              value={
                previewDrafts.length
                  ? [
                      ...new Set(
                        previewDrafts.map((draft) => draft.payrollTypeName),
                      ),
                    ].join(", ")
                  : "No matching payroll"
              }
            />
            <DataPoint
              label="Payroll Period"
              value={applied?.period || "All available periods"}
            />
            <DataPoint
              label="Fund Source"
              value={applied?.fund || "All Funds"}
            />
            <DataPoint
              label="Related DV Reference"
              value={
                allFinal
                  ? dvRecords
                      .filter((record) =>
                        previewDrafts.some(
                          (draft) => draft.id === record.payrollId,
                        ),
                      )
                      .map((record) => record.id)
                      .join(", ")
                  : "Not available for draft previews"
              }
            />
            <DataPoint
              label="Cost Center Selection"
              value={applied?.costCenter || "All represented Cost Centers"}
            />
            <DataPoint
              label="Report Availability"
              value={allFinal ? "Final Payroll Register" : "Draft Preview"}
            />
            <DataPoint
              label="Generated Date"
              value={
                allFinal
                  ? "Use recorded final document generation date when available"
                  : "Not generated"
              }
              muted={!allFinal}
            />
          </dl>
          {!allFinal && previewDrafts.length > 0 && (
            <div className="mt-4">
              <Alert tone="warning" title="Draft Preview — Not Final">
                The matching payrolls have not reached the required stage for a
                final Payroll Register. No shared payroll has a genuine recorded
                Chancellor DV approval, so finalized-register export is
                unavailable.
              </Alert>
            </div>
          )}
        </div>
        {rows.length ? (
          <>
            <div className="hidden xl:block">
              <table className="w-full table-fixed text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-canvas text-text-muted">
                    {[
                      "Employee ID",
                      "Employee Name",
                      "Pay Basis",
                      "Basic Pay",
                      "Other Earnings",
                      "Gross Pay",
                      "Total Deductions",
                      "Net Pay",
                      "Cost Center",
                      "Action",
                    ].map((item) => (
                      <th key={item} className="px-2 py-3 font-semibold">
                        {item}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map(({ draft, row, totals: value }) => {
                    const pending =
                      row.calculationStatus === "Blocked" ||
                      draft.finalNetPending
                    return (
                      <tr key={`${draft.id}-${row.employeeId}`}>
                        <td className="px-2 py-3">{row.employeeId}</td>
                        <td className="px-2 py-3 font-medium">
                          {row.employeeName}
                        </td>
                        <td className="px-2 py-3">{row.payBasis}</td>
                        <td className="px-2 py-3 text-right tabular-nums">
                          {row.basicPay !== undefined
                            ? peso.format(value.basic)
                            : "Pending"}
                        </td>
                        <td className="px-2 py-3 text-right tabular-nums">
                          {row.calculationStatus === "Computed"
                            ? peso.format(value.adjustments)
                            : "Pending"}
                        </td>
                        <td className="px-2 py-3 text-right tabular-nums">
                          {row.calculationStatus === "Computed"
                            ? peso.format(value.gross)
                            : "Pending"}
                        </td>
                        <td className="px-2 py-3 text-right tabular-nums">
                          {row.deductions.length
                            ? peso.format(value.deductions)
                            : pending
                              ? "Configuration Required"
                              : peso.format(0)}
                        </td>
                        <td className="px-2 py-3 text-right font-semibold tabular-nums">
                          {pending ? "Pending" : peso.format(value.net)}
                        </td>
                        <td className="px-2 py-3">{row.office}</td>
                        <td className="px-2 py-3 text-right">
                          <Button
                            type="button"
                            variant="link"
                            className="text-xs"
                            onClick={() =>
                              setBreakdown({
                                draftId: draft.id,
                                employeeId: row.employeeId,
                              })
                            }
                          >
                            View Employee Breakdown
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-border xl:hidden">
              {rows.map(({ draft, row, totals: value }) => {
                const pending =
                  row.calculationStatus === "Blocked" || draft.finalNetPending
                return (
                  <li key={`${draft.id}-${row.employeeId}`} className="p-5">
                    <p className="font-semibold">{row.employeeName}</p>
                    <p className="text-xs text-text-muted">
                      {row.employeeId} · {row.payBasis} · {row.office}
                    </p>
                    <dl className="mt-3 grid grid-cols-2 gap-3">
                      <DataPoint
                        label="Gross Pay"
                        value={
                          row.calculationStatus === "Computed"
                            ? peso.format(value.gross)
                            : "Pending"
                        }
                      />
                      <DataPoint
                        label="Deductions"
                        value={
                          row.deductions.length
                            ? peso.format(value.deductions)
                            : pending
                              ? "Configuration Required"
                              : peso.format(0)
                        }
                      />
                      <DataPoint
                        label="Net Pay"
                        value={pending ? "Pending" : peso.format(value.net)}
                      />
                    </dl>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        setBreakdown({
                          draftId: draft.id,
                          employeeId: row.employeeId,
                        })
                      }
                      className="mt-4 w-full"
                    >
                      View Employee Breakdown
                    </Button>
                  </li>
                )
              })}
            </ul>
            <dl className="grid gap-4 border-t border-border bg-canvas p-5 sm:grid-cols-2 xl:grid-cols-5">
              <DataPoint
                label="Total Basic Pay"
                value={peso.format(totals.basic)}
              />
              <DataPoint
                label="Total Other Earnings"
                value={peso.format(totals.adjustments)}
              />
              <DataPoint
                label="Total Gross Pay"
                value={peso.format(totals.gross)}
              />
              <DataPoint
                label="Total Deductions"
                value={peso.format(totals.deductions)}
              />
              <DataPoint
                label="Total Net Pay"
                value={peso.format(totals.net)}
              />
            </dl>
          </>
        ) : (
          <div className="p-8 text-center">
            <p className="font-semibold">
              No payroll registers are available for the selected filters.
            </p>
            <p className="mt-2 text-sm text-text-muted">
              No records match your search or filters.
            </p>
          </div>
        )}
        <div className="border-t border-border p-5">
          <Alert tone="info" title="Register reconciliation">
            Cross-document reconciliation is not yet available. No generated
            Payroll Register or LandBank upload file exists for these draft
            records.
          </Alert>
          {!totalsReconcile && (
            <div className="mt-4">
              <Alert tone="danger" title="Reconciliation issue">
                Report totals do not reconcile with the related source records.
              </Alert>
            </div>
          )}
        </div>
      </section>
    )
  }

  const renderDeductions = () => {
    const relevantRows = rows
    const groups = new Map<string, ReturnType<typeof emptyDeductionGroup>>()
    relevantRows.forEach(({ draft, row }) =>
      row.deductions.forEach((item) => {
        if (applied?.deductionType && item.name !== applied.deductionType)
          return
        const normalized = applied?.search.trim().toLowerCase()
        if (
          normalized &&
          ![
            item.name,
            draft.id,
            draft.payrollTypeName,
            row.employeeName,
            row.employeeId,
          ].some((value) => value.toLowerCase().includes(normalized))
        )
          return
        const current = groups.get(item.name) ?? emptyDeductionGroup()
        current.amount += item.amount
        current.employees.add(row.employeeId)
        groups.set(item.name, current)
      }),
    )
    const total = [...groups.values()].reduce(
      (sum, item) => sum + item.amount,
      0,
    )
    const incomplete = previewDrafts.some(
      (draft) =>
        draft.finalNetPending ||
        draft.rows.some((row) => row.calculationStatus === "Blocked"),
    )
    return (
      <section className="overflow-hidden rounded-card bg-surface elevate">
        <div className="border-b border-border p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <SectionTitle
              title="Deduction Report Preview"
              description="Recorded deduction entries only; no contribution or remittance calculation occurs here."
            />
            <ExportActions onUnavailable={() => setExportNotice(true)} />
          </div>
          <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2 lg:grid-cols-5">
            <DataPoint
              label="Selected Period"
              value={applied?.period || "All available periods"}
            />
            <DataPoint
              label="Payroll Type / Scope"
              value={
                applied?.payrollTypeId
                  ? (previewDrafts[0]?.payrollTypeName ?? "No matching type")
                  : "All represented payroll types"
              }
            />
            <DataPoint
              label="Selected Fund"
              value={applied?.fund || "All Funds"}
            />
            <DataPoint
              label="Included Payroll Records"
              value={String(previewDrafts.length)}
            />
            <DataPoint
              label="Relevant Employees"
              value={String(
                new Set(
                  [...groups.values()].flatMap((group) => [...group.employees]),
                ).size,
              )}
            />
            <DataPoint
              label="Total Applicable Deductions"
              value={peso.format(total)}
            />
          </dl>
          {incomplete && (
            <div className="mt-4">
              <Alert tone="warning" title="Incomplete deduction configuration">
                One or more matching payrolls contain pending computation or
                deduction rules. Missing deductions are not interpreted as zero.
              </Alert>
            </div>
          )}
        </div>
        {groups.size ? (
          <ul className="divide-y divide-border">
            {[...groups.entries()].map(([name, group]) => (
              <li
                key={name}
                className="grid gap-3 p-5 sm:grid-cols-3 sm:items-center"
              >
                <DataPoint label="Deduction Type" value={name} />
                <DataPoint
                  label="Applicable Employee Count"
                  value={String(group.employees.size)}
                />
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <span className="font-semibold tabular-nums">
                    {peso.format(group.amount)}
                  </span>
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => setDeductionName(name)}
                  >
                    View Details
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-8 text-center text-sm text-text-muted">
            No deduction records are available for the selected period.
          </p>
        )}
        <div className="border-t border-border p-5">
          <Alert tone="info" title="Reporting only">
            Deduction Reports summarize recorded payroll deductions. They do not
            perform government remittances or payment transactions.
          </Alert>
        </div>
      </section>
    )
  }

  const renderEmployee = () => {
    if (!applied?.employeeId)
      return (
        <section className="rounded-card bg-surface p-8 text-center elevate">
          <p className="font-semibold">
            Select an employee to view payroll history.
          </p>
          <p className="mt-2 text-sm text-text-muted">
            Use the employee search and selector, then generate a preview.
          </p>
        </section>
      )
    return (
      <section className="overflow-hidden rounded-card bg-surface elevate">
        <div className="border-b border-border p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <SectionTitle
              title="Employee Payroll History Preview"
              description="Current-system and imported historical payroll records for the selected employee."
            />
            <ExportActions onUnavailable={() => setExportNotice(true)} />
          </div>
          <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2 lg:grid-cols-4">
            <DataPoint
              label="Employee Name"
              value={selectedCandidate?.name ?? applied.employeeId}
            />
            <DataPoint label="Employee ID" value={applied.employeeId} />
            <DataPoint
              label="Employee Classification"
              value={selectedCandidate?.classification ?? "Not available"}
            />
            <DataPoint
              label="Relevant Employment Information"
              value={
                selectedCandidate
                  ? `${selectedCandidate.employmentType} · ${selectedCandidate.office}`
                  : "Not available"
              }
            />
            <DataPoint
              label="Record Origin"
              value={
                applied.origin ||
                (currentEmployeeHistory.length &&
                historicalEmployeeHistory.length
                  ? "Current Payroll and Imported History"
                  : historicalEmployeeHistory.length
                    ? "Imported Historical Payroll"
                    : "Current Payroll Record")
              }
            />
          </dl>
        </div>
        {currentEmployeeHistory.length || historicalEmployeeHistory.length ? (
          <>
            <div className="hidden xl:block">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-canvas text-text-muted">
                    {[
                      "Payroll Period",
                      "Payroll Reference",
                      "Payroll Type",
                      "Fund",
                      "Gross Pay",
                      "Total Deductions",
                      "Net Pay",
                      "Recorded Stage / Source",
                      "Actions",
                    ].map((item) => (
                      <th key={item} className="px-3 py-3 font-semibold">
                        {item}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {currentEmployeeHistory.map(({ draft, row, totals }) => {
                    const pending =
                      row.calculationStatus === "Blocked" ||
                      draft.finalNetPending
                    return (
                      <tr key={`${draft.id}-${row.employeeId}`}>
                        <td className="px-3 py-3">{draft.period}</td>
                        <td className="px-3 py-3 font-medium">{draft.id}</td>
                        <td className="px-3 py-3">{draft.payrollTypeName}</td>
                        <td className="px-3 py-3">{draft.fund}</td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          {row.calculationStatus === "Computed"
                            ? peso.format(totals.gross)
                            : "Pending"}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          {row.deductions.length
                            ? peso.format(totals.deductions)
                            : pending
                              ? "Configuration Required"
                              : peso.format(0)}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold tabular-nums">
                          {pending ? "Pending" : peso.format(totals.net)}
                        </td>
                        <td className="px-3 py-3">
                          {draft.stageLabel ?? draft.stage} · Current Payroll
                          Record
                        </td>
                        <td className="px-3 py-3 text-right">
                          <Button
                            type="button"
                            variant="link"
                            onClick={() =>
                              setHistoryDetail({
                                draftId: draft.id,
                                employeeId: row.employeeId,
                              })
                            }
                          >
                            View Details
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                  {historicalEmployeeHistory.map((record) => (
                    <tr key={record.historicalRecordId}>
                      <td className="px-3 py-3">
                        {historicalPeriodLabel(
                          record.payrollPeriodStart,
                          record.payrollPeriodEnd,
                        )}
                      </td>
                      <td className="px-3 py-3 font-medium">
                        {record.originalPayrollReference ?? record.importId}
                      </td>
                      <td className="px-3 py-3">{record.payrollType}</td>
                      <td className="px-3 py-3">{record.fundSource}</td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {peso.format(record.grossPay)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {peso.format(record.totalDeductions)}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums">
                        {peso.format(record.netPay)}
                      </td>
                      <td className="px-3 py-3">
                        Read-only historical import · Imported Historical Record
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Button
                          type="button"
                          variant="link"
                          onClick={() =>
                            setHistoricalDetailId(record.historicalRecordId)
                          }
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-border xl:hidden">
              {currentEmployeeHistory.map(({ draft, row, totals }) => {
                const pending =
                  row.calculationStatus === "Blocked" || draft.finalNetPending
                return (
                  <li key={`${draft.id}-${row.employeeId}`} className="p-5">
                    <p className="font-semibold">{draft.period}</p>
                    <p className="mt-1 text-sm">{draft.payrollTypeName}</p>
                    <p className="text-xs text-text-muted">
                      {draft.id} · {draft.fund} · Current Payroll Record
                    </p>
                    <dl className="mt-3 grid grid-cols-2 gap-3">
                      <DataPoint
                        label="Gross Pay"
                        value={
                          row.calculationStatus === "Computed"
                            ? peso.format(totals.gross)
                            : "Pending"
                        }
                      />
                      <DataPoint
                        label="Net Pay"
                        value={pending ? "Pending" : peso.format(totals.net)}
                      />
                    </dl>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        setHistoryDetail({
                          draftId: draft.id,
                          employeeId: row.employeeId,
                        })
                      }
                      className="mt-4 w-full"
                    >
                      View Details
                    </Button>
                  </li>
                )
              })}
              {historicalEmployeeHistory.map((record) => (
                <li key={record.historicalRecordId} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {historicalPeriodLabel(
                          record.payrollPeriodStart,
                          record.payrollPeriodEnd,
                        )}
                      </p>
                      <p className="mt-1 text-sm">{record.payrollType}</p>
                    </div>
                    <Tag kind="placeholder">Imported Historical Record</Tag>
                  </div>
                  <p className="text-xs text-text-muted">
                    {record.originalPayrollReference ?? record.importId} ·{" "}
                    {record.fundSource} · Read Only
                  </p>
                  <dl className="mt-3 grid grid-cols-2 gap-3">
                    <DataPoint
                      label="Gross Pay"
                      value={peso.format(record.grossPay)}
                    />
                    <DataPoint
                      label="Net Pay"
                      value={peso.format(record.netPay)}
                    />
                  </dl>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      setHistoricalDetailId(record.historicalRecordId)
                    }
                    className="mt-4 w-full"
                  >
                    View Details
                  </Button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="p-8 text-center text-sm text-text-muted">
            No payroll history is available for the selected employee.
          </p>
        )}
        <div className="border-t border-border p-5">
          <p className="text-xs text-text-muted">
            Current Payroll Records and Imported Historical Records remain
            separately labeled. Historical imports do not create current-system
            approval or payment activity.
          </p>
        </div>
      </section>
    )
  }

  const renderProcessing = () => {
    const completed = filteredProcessing.filter((row) => row.completedAt)
    return (
      <section className="overflow-hidden rounded-card bg-surface elevate">
        <div className="border-b border-border p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <SectionTitle
              title="Approval Processing Time Preview"
              description="Calendar elapsed durations from actual recorded local event timestamps."
            />
            <ExportActions onUnavailable={() => setExportNotice(true)} />
          </div>
          <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-3">
            <DataPoint
              label="Number of Payrolls Analyzed"
              value={String(
                new Set(filteredProcessing.map((row) => row.payrollReference))
                  .size,
              )}
            />
            <DataPoint
              label="Completed Workflow Records"
              value={String(completed.length)}
            />
            <DataPoint
              label="Available Processing Duration Information"
              value={`${completed.length} of ${filteredProcessing.length} stage records`}
            />
          </dl>
        </div>
        {filteredProcessing.length ? (
          <>
            <div className="hidden xl:block">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-canvas text-text-muted">
                    {[
                      "Payroll Reference",
                      "Document Type",
                      "Office / Approval Stage",
                      "Received / Entered Stage",
                      "Completed / Forwarded",
                      "Recorded Duration",
                      "Actions",
                    ].map((item) => (
                      <th key={item} className="px-3 py-3 font-semibold">
                        {item}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredProcessing.map((row) => (
                    <tr key={row.id}>
                      <td className="px-3 py-3 font-medium">
                        {row.payrollReference}
                      </td>
                      <td className="px-3 py-3">{row.documentType}</td>
                      <td className="px-3 py-3">
                        {row.office} · {row.stage}
                        <span className="mt-1 block text-text-muted">
                          {row.sourceLabel}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {dateTime.format(new Date(row.enteredAt))}
                      </td>
                      <td className="px-3 py-3">
                        {row.completedAt
                          ? dateTime.format(new Date(row.completedAt))
                          : "Still in progress / no later timestamp"}
                      </td>
                      <td className="px-3 py-3">
                        {durationLabel(row.enteredAt, row.completedAt)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Button
                          type="button"
                          variant="link"
                          onClick={() => setTimelineId(row.id)}
                        >
                          View Timeline
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-border xl:hidden">
              {filteredProcessing.map((row) => (
                <li key={row.id} className="p-5">
                  <p className="font-semibold">{row.payrollReference}</p>
                  <p className="mt-1 text-sm">
                    {row.documentType} · {row.office}
                  </p>
                  <p className="text-xs text-text-muted">
                    {row.stage} · {row.sourceLabel}
                  </p>
                  <dl className="mt-3 grid grid-cols-2 gap-3">
                    <DataPoint
                      label="Entered"
                      value={dateTime.format(new Date(row.enteredAt))}
                    />
                    <DataPoint
                      label="Duration"
                      value={durationLabel(row.enteredAt, row.completedAt)}
                    />
                  </dl>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setTimelineId(row.id)}
                    className="mt-4 w-full"
                  >
                    View Timeline
                  </Button>
                </li>
              ))}
            </ul>
            {filteredProcessing.some((row) => !row.completedAt) && (
              <div className="border-t border-border p-5">
                <Alert tone="warning" title="Incomplete timestamps">
                  Processing duration cannot be calculated because one or more
                  event timestamps are unavailable.
                </Alert>
              </div>
            )}
          </>
        ) : (
          <div className="p-8 text-center">
            <p className="font-semibold">
              No recorded approval events are available for processing-time
              analysis.
            </p>
            <p className="mt-2 text-sm text-text-muted">
              Processing duration cannot be calculated because one or more event
              timestamps are unavailable. No records match your search or
              filters.
            </p>
          </div>
        )}
        <div className="border-t border-border p-5">
          <p className="text-xs text-text-muted">
            No office rankings, service-level targets, working-day exclusions,
            or holiday calendars are assumed.
          </p>
        </div>
      </section>
    )
  }

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
            Reports
          </p>
          <p className="mt-2 text-sm text-text-muted">
            View payroll registers, deduction summaries, employee payroll
            history, and approval processing information.
          </p>
        </div>
        <Alert tone="info" title="Report availability">
          Report availability depends on the payroll&apos;s recorded processing
          stage. Draft information is not an officially finalized payroll
          report.
        </Alert>

        <div
          role="tablist"
          aria-label="Accounting report categories"
          className="grid gap-1 rounded-control bg-surface p-1 elevate sm:grid-cols-2 xl:grid-cols-4"
        >
          {([
            ["register", "Payroll Register"],
            ["deductions", "Deduction Reports"],
            ["employee", "Employee Payroll History"],
            ["processing", "Approval Processing Time"],
          ] as const).map(([id, label]) => (
            <Button
              key={id}
              type="button"
              variant={type === id ? "primary" : "secondary"}
              role="tab"
              aria-selected={type === id}
              onClick={() => switchType(id)}
              className={clsx(
                "h-11 border-0 shadow-none",
                type !== id && "bg-transparent text-text-muted",
              )}
            >
              {label}
            </Button>
          ))}
        </div>

        <div>
          <SectionTitle
            title={reportTitle(type)}
            description={reportDescription(type)}
          />
        </div>

        <FilterPanel
          type={type}
          filters={filters}
          setFilters={setFilters}
          drafts={drafts}
          historicalRecords={historicalRecords}
          employees={candidates}
          generated={Boolean(applied)}
          onGenerate={generate}
          onClear={clear}
        />

        {validationMessage && (
          <Alert tone="danger" title="Check report filters">
            {validationMessage}
          </Alert>
        )}

        {exportNotice && (
          <Alert tone="warning" title="Export unavailable">
            Export is not available for this report in the current prototype.
            The official report template has not yet been configured, and no
            file was downloaded.
          </Alert>
        )}

        {!applied ? (
          <section className="rounded-card bg-surface p-8 text-center elevate">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-info-soft text-primary">
              <Icon name="clipboard" size={24} />
            </span>
            <p className="mt-4 font-semibold">
              Generate a report preview to view matching records.
            </p>
            <p className="mt-2 text-sm text-text-muted">
              Preview generation reads existing local records and does not
              create an official file.
            </p>
          </section>
        ) : type === "register" ? (
          renderRegister()
        ) : type === "deductions" ? (
          renderDeductions()
        ) : type === "employee" ? (
          renderEmployee()
        ) : (
          renderProcessing()
        )}

        <Alert tone="info" title="Frontend reporting prototype">
          Reports are read-only browser-session views. No payroll amount,
          approval, remittance, payment, bank transaction, or employee record is
          changed by generating a preview. Backend access control remains
          unimplemented in this prototype.
        </Alert>
      </div>

      {breakdownDraft && breakdownRow && (
        <EmployeeBreakdown
          draft={breakdownDraft}
          row={breakdownRow}
          onClose={() => setBreakdown(null)}
        />
      )}
      {deductionName && applied && (
        <DeductionDetails
          name={deductionName}
          drafts={previewDrafts}
          costCenter={applied.costCenter}
          onClose={() => setDeductionName(null)}
        />
      )}
      {historyDraft && historyRow && (
        <EmployeeBreakdown
          draft={historyDraft}
          row={historyRow}
          title="Employee Payroll History Details"
          onClose={() => setHistoryDetail(null)}
        />
      )}
      {timelineRow && (
        <ProcessingTimeline
          row={timelineRow}
          onClose={() => setTimelineId(null)}
        />
      )}
      {historicalDetail && (
        <HistoricalHistoryDetails
          record={historicalDetail}
          batch={historicalDetailBatch}
          onClose={() => setHistoricalDetailId(null)}
        />
      )}
    </>
  )
}
