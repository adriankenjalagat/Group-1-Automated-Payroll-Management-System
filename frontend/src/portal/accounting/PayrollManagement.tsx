import clsx from "clsx"
import {
  useMemo,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react"
import { Alert, Button, Icon, TextField } from "../../MsuPayroll"
import { Modal, SelectField, Tag } from "../../admin/ui"
import {
  payrollConfigurationRefs,
  type FundSource,
  type HrEmployee,
  type PayBasis,
} from "../hr/hrData"
import type { AttendanceModuleState } from "../hr/attendanceData"
import type { TransmittalRecord } from "../hr/Transmittals"
import { Pagination, usePaged } from "../hr/ui"
import {
  accountingDemoSources,
  draftTotals,
  evaluateSource,
  rowTotals,
  sourcesFromTransmittals,
  type PayrollAdjustment,
  type PayrollDraft,
  type PayrollException,
  type PayrollRow,
  type PayrollSource,
  type PayrollStage,
} from "./payrollData"

type View = "drafts" | "approval" | "returned" | "history"
type Screen = "list" | "create" | "eligibility" | "detail" | "review"
type Setup = {
  payrollTypeId: string
  fund: FundSource | ""
  period: string
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
const dateOnly = new Intl.DateTimeFormat("en-PH", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
})
const formatDate = (value: string) =>
  value ? dateOnly.format(new Date(`${value}T00:00:00Z`)) : "Not configured"

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

interface StageBadgeProps {
  stage: PayrollStage
  label?: string
}

function StageBadge({ stage, label }: StageBadgeProps) {
  const tone =
    stage === "Draft"
      ? "bg-info-soft text-primary"
      : stage === "For Approval"
        ? "bg-warning-soft text-warning"
        : stage === "Returned"
          ? "bg-danger-soft text-danger"
          : "bg-success-soft text-success"
  const icon =
    stage === "Draft"
      ? "pencil"
      : stage === "For Approval"
        ? "clock"
        : stage === "Returned"
          ? "arrowLeft"
          : "check"
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        tone,
      )}
    >
      <Icon name={icon} size={13} />
      {label ?? stage}
    </span>
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

function TextAreaField({
  label,
  value,
  onChange,
  error,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  placeholder?: string
}) {
  const id = `textarea-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <textarea
        id={id}
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-invalid={Boolean(error) || undefined}
        className={clsx(
          "w-full resize-y rounded-control border bg-surface px-3.5 py-3 text-base text-text placeholder:text-text-muted/70 sm:text-sm",
          error ? "border-danger" : "border-border-strong hover:border-primary",
        )}
      />
      {error && (
        <p
          role="alert"
          className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-danger"
        >
          <Icon name="alert" size={14} />
          {error}
        </p>
      )}
    </div>
  )
}

function sourceRows(
  setup: Setup,
  sources: PayrollSource[],
  employees: HrEmployee[],
  attendance: AttendanceModuleState,
) {
  const matching = sources.filter(
    (item) =>
      item.payrollTypeId === setup.payrollTypeId &&
      item.fund === setup.fund &&
      item.period === setup.period,
  )
  const eligible: {
    source: PayrollSource
    employee: HrEmployee
    row: PayrollRow
  }[] = []
  const exceptions: PayrollException[] = []
  matching.forEach((source) => {
    const result = evaluateSource(source, employees, attendance)
    if (!result.employee || result.problems.length) {
      exceptions.push(...result.problems)
      return
    }
    const employee = result.employee
    const basic =
      employee.payBasis === "Daily" &&
      source.applicableRate !== undefined &&
      source.verifiedDaysWorked !== undefined
        ? source.applicableRate * source.verifiedDaysWorked
        : employee.payBasis === "Hourly" &&
            source.applicableRate !== undefined &&
            source.verifiedHoursWorked !== undefined
          ? source.applicableRate * source.verifiedHoursWorked
          : undefined
    if (basic === undefined) {
      exceptions.push({
        id: `${source.submissionId}-unsupported`,
        employeeId: employee.employeeId,
        employeeName: employee.name,
        problemType: "Unsupported calculation category",
        explanation:
          "A supported calculation cannot be completed from the available inputs.",
        sourceModule: "Administrator Payroll Configuration",
        nextAction: "Configure the applicable rule and input source.",
        blocksComputation: true,
      })
      return
    }
    const attendanceRecord = attendance.attendanceRecords.find(
      (record) =>
        record.employeeId === employee.employeeId &&
        record.period === source.period,
    )
    const approved = attendance.approvedRecords.filter(
      (record) =>
        record.employeeId === employee.employeeId &&
        record.startDate <= source.periodEnd &&
        record.endDate >= source.periodStart,
    )
    const unit =
      employee.payBasis === "Daily"
        ? `${source.verifiedDaysWorked} verified day${
            source.verifiedDaysWorked === 1 ? "" : "s"
          }`
        : `${source.verifiedHoursWorked} verified hours`
    const row: PayrollRow = {
      employeeId: employee.employeeId,
      employeeName: employee.name,
      classification: employee.classification,
      employmentType: employee.employmentType,
      office: employee.office,
      payrollTypeId: source.payrollTypeId,
      payrollTypeName: source.payrollTypeName,
      fund: source.fund,
      payBasis: employee.payBasis,
      sourceSubmissionId: source.submissionId,
      sourceTransmittalId: source.transmittalId,
      applicableRate: source.applicableRate,
      verifiedDaysWorked: source.verifiedDaysWorked,
      verifiedHoursWorked: source.verifiedHoursWorked,
      attendanceSummary: source.attendanceReference
        ? `${unit} · ${source.attendanceReference}`
        : attendanceRecord
          ? `${attendanceRecord.entries.length} recorded attendance entries.`
          : "No attendance summary available.",
      approvedAbsenceSummary: approved.length
        ? approved
            .map(
              (item) =>
                `${item.type}: ${formatDate(item.startDate)} to ${formatDate(item.endDate)}`,
            )
            .join("; ")
        : "No related approved leave, travel, or CTO record.",
      basicPay: basic,
      adjustments: [],
      deductions: [],
      calculationStatus: "Computed",
      computationExplanation: `Basic Pay = ${unit} × ${peso.format(source.applicableRate!)} fictional authorized rate snapshot. No deduction rule is configured for this employee row.`,
    }
    eligible.push({ source, employee, row })
  })
  return { matching, eligible, exceptions }
}

function EmployeeSourceDialog({
  source,
  employee,
  problems,
  attendance,
  onClose,
}: {
  source: PayrollSource
  employee?: HrEmployee
  problems: PayrollException[]
  attendance: AttendanceModuleState
  onClose: () => void
}) {
  const record =
    employee &&
    attendance.attendanceRecords.find(
      (item) =>
        item.employeeId === employee.employeeId &&
        item.period === source.period,
    )
  return (
    <Modal title="Employee Payroll Data" onClose={onClose} wide>
      <Tag kind="placeholder">Read-only source information</Tag>
      <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
        <DataPoint
          label="Employee"
          value={
            employee
              ? `${employee.name} (${employee.employeeId})`
              : source.employeeId
          }
        />
        <DataPoint label="Payroll Assignment" value={source.payrollTypeName} />
        <DataPoint label="Fund" value={source.fund} />
        <DataPoint
          label="Pay Basis"
          value={employee?.payBasis ?? "Not available"}
        />
        <DataPoint
          label="Period"
          value={`${source.period} · ${formatDate(source.periodStart)} to ${formatDate(source.periodEnd)}`}
        />
        <DataPoint label="Source Submission" value={source.submissionId} />
        <DataPoint label="Source Transmittal" value={source.transmittalId} />
        <DataPoint
          label="Applicable Rate"
          value={
            source.applicableRate !== undefined
              ? `${peso.format(source.applicableRate!)} · fictional demonstration snapshot`
              : "Not available"
          }
          muted={source.applicableRate === undefined}
        />
        <DataPoint
          label="Attendance Input"
          value={
            source.verifiedDaysWorked !== undefined
              ? `${source.verifiedDaysWorked} verified day(s)`
              : source.verifiedHoursWorked !== undefined
                ? `${source.verifiedHoursWorked} verified hour(s)`
                : record
                  ? `${record.entries.length} record entries; calculation use is not configured`
                  : "Not available"
          }
          muted={
            source.verifiedDaysWorked === undefined &&
            source.verifiedHoursWorked === undefined
          }
        />
      </dl>
      <p className="mt-4 text-xs leading-relaxed text-text-muted">
        {source.sourceNote}
      </p>
      {problems.length > 0 && (
        <div className="mt-4">
          <Alert tone="warning" title="Eligibility needs attention">
            <ul className="grid gap-1">
              {problems.map((item) => (
                <li key={item.id}>{item.explanation}</li>
              ))}
            </ul>
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

function CreateWorkflow({
  drafts,
  sources,
  employees,
  attendance,
  initialSetup,
  onCancel,
  onExisting,
  onContinue,
}: {
  drafts: PayrollDraft[]
  sources: PayrollSource[]
  employees: HrEmployee[]
  attendance: AttendanceModuleState
  initialSetup: Setup
  onCancel: () => void
  onExisting: (id: string) => void
  onContinue: (setup: Setup) => void
}) {
  const [setup, setSetup] = useState<Setup>(initialSetup)
  const [typeSearch, setTypeSearch] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [discard, setDiscard] = useState(false)
  const configured = payrollConfigurationRefs.filter(
    (item) =>
      item.status === "Configured for demonstration" &&
      (!typeSearch.trim() ||
        item.name.toLowerCase().includes(typeSearch.trim().toLowerCase())),
  )
  const periods = [
    ...new Set(
      sources
        .filter(
          (source) =>
            (!setup.payrollTypeId ||
              source.payrollTypeId === setup.payrollTypeId) &&
            (!setup.fund || source.fund === setup.fund),
        )
        .map((source) => source.period),
    ),
  ]
  const selectedSource = sources.find(
    (source) =>
      source.payrollTypeId === setup.payrollTypeId &&
      source.fund === setup.fund &&
      source.period === setup.period,
  )
  const config = payrollConfigurationRefs.find(
    (item) => item.id === setup.payrollTypeId,
  )
  const existing = drafts.find(
    (draft) =>
      draft.payrollTypeId === setup.payrollTypeId &&
      draft.fund === setup.fund &&
      draft.period === setup.period,
  )
  const dirty = Boolean(setup.payrollTypeId || setup.fund || setup.period)
  const close = () => (dirty ? setDiscard(true) : onCancel())
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const next: Record<string, string> = {}
    if (!setup.payrollTypeId)
      next.payrollTypeId = "Select a configured payroll type."
    if (!setup.fund) next.fund = "Select a fund source."
    if (!setup.period)
      next.period =
        "Select a payroll period represented by available source records."
    if (setup.payrollTypeId && !config)
      next.payrollTypeId = "This payroll configuration is unavailable."
    setErrors(next)
    if (!Object.keys(next).length && !existing) onContinue(setup)
  }
  return (
    <>
      <div className="grid gap-6 font-sans">
        <div>
          <Button
            type="button"
            variant="link"
            onClick={close}
            className="-ml-1 mb-3"
          >
            <Icon name="arrowLeft" size={16} />
            Back to Payroll Management
          </Button>
          <p
            id="page-title"
            role="heading"
            aria-level={1}
            tabIndex={-1}
            className="text-2xl font-semibold sm:text-3xl"
          >
            Create Payroll Draft
          </p>
          <p className="mt-2 text-sm text-text-muted">
            Select the payroll group and period to prepare a new payroll.
          </p>
        </div>
        <form
          onSubmit={submit}
          noValidate
          className="rounded-card bg-surface p-5 elevate sm:p-7"
        >
          <div className="grid gap-5">
            <TextField
              label="Search Payroll Types"
              icon="search"
              value={typeSearch}
              onChange={(event) => setTypeSearch(event.target.value)}
              placeholder="Search configured payroll types..."
            />
            <SelectField
              label="Payroll Type"
              value={setup.payrollTypeId}
              onChange={(event) =>
                setSetup({
                  payrollTypeId: event.target.value,
                  fund: "",
                  period: "",
                })
              }
              placeholder="Select configured payroll type"
              error={errors.payrollTypeId}
            >
              {configured.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Fund Source"
              value={setup.fund}
              onChange={(event) =>
                setSetup((current) => ({
                  ...current,
                  fund: event.target.value as FundSource,
                  period: "",
                }))
              }
              placeholder="Select fund"
              error={errors.fund}
            >
              <option value="F01">F01</option>
              <option value="F05">F05</option>
              <option value="F07">F07</option>
            </SelectField>
            <SelectField
              label="Payroll Period"
              value={setup.period}
              onChange={(event) =>
                setSetup((current) => ({
                  ...current,
                  period: event.target.value,
                }))
              }
              placeholder={
                setup.payrollTypeId && setup.fund
                  ? "Select available period"
                  : "Select payroll type and fund first"
              }
              error={errors.period}
              disabled={!setup.payrollTypeId || !setup.fund}
            >
              {periods.map((period) => (
                <option key={period} value={period}>
                  {period}
                </option>
              ))}
            </SelectField>
            <dl className="grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
              <DataPoint
                label="Period Start"
                value={
                  selectedSource
                    ? formatDate(selectedSource.periodStart)
                    : "Select an available period"
                }
                muted={!selectedSource}
              />
              <DataPoint
                label="Period End"
                value={
                  selectedSource
                    ? formatDate(selectedSource.periodEnd)
                    : "Select an available period"
                }
                muted={!selectedSource}
              />
              <DataPoint
                label="Selected Payroll Type"
                value={config?.name ?? "Not selected"}
                muted={!config}
              />
              <DataPoint
                label="Selected Fund"
                value={setup.fund || "Not selected"}
                muted={!setup.fund}
              />
              <DataPoint
                label="Applicable Pay Basis / Bases"
                value={
                  selectedSource
                    ? (employees.find(
                        (item) => item.employeeId === selectedSource.employeeId,
                      )?.payBasis ?? "Not recorded")
                    : "Depends on eligible employee records"
                }
                muted={!selectedSource}
              />
              <DataPoint
                label="Configuration Availability"
                value={config?.status ?? "Not selected"}
                muted={!config}
              />
              <DataPoint
                label="Calculation Rule Availability"
                value={
                  selectedSource?.verifiedDaysWorked !== undefined
                    ? "Confirmed daily formula available for the demonstration source"
                    : "Requires eligibility review"
                }
                muted={!selectedSource}
              />
            </dl>
            {existing && (
              <Alert
                tone="warning"
                title="A payroll draft already exists for this payroll type, fund, and period."
              >
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onExisting(existing.id)}
                  className="mt-3"
                >
                  View Existing Draft
                </Button>
              </Alert>
            )}
            <Alert tone="info" title="Configuration limitations">
              Only configured demonstration payroll types and periods
              represented by transmitted source records are offered. No
              schedule, rate, or deduction rule is invented here.
            </Alert>
          </div>
          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={Boolean(existing)}>
              Continue
            </Button>
          </div>
        </form>
      </div>
      {discard && (
        <Modal title="Discard payroll setup?" onClose={() => setDiscard(false)}>
          <p className="text-sm text-text-muted">
            Your selected payroll type, fund, and period will be discarded.
          </p>
          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDiscard(false)}
            >
              Keep Editing
            </Button>
            <Button type="button" onClick={onCancel}>
              Discard Setup
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}

function EligibilityReview({
  setup,
  sources,
  employees,
  attendance,
  onBack,
  onGenerate,
}: {
  setup: Setup
  sources: PayrollSource[]
  employees: HrEmployee[]
  attendance: AttendanceModuleState
  onBack: () => void
  onGenerate: (
    rows: PayrollRow[],
    exceptions: PayrollException[],
    sourceIds: string[],
    source: PayrollSource,
  ) => void
}) {
  const [refresh, setRefresh] = useState(0)
  const [viewId, setViewId] = useState<string | null>(null)
  const result = useMemo(
    () => sourceRows(setup, sources, employees, attendance),
    [setup, sources, employees, attendance, refresh],
  )
  const viewed = result.matching.find(
    (source) => source.submissionId === viewId,
  )
  const viewedEvaluation = viewed
    ? evaluateSource(viewed, employees, attendance)
    : undefined
  const config = payrollConfigurationRefs.find(
    (item) => item.id === setup.payrollTypeId,
  )
  const first = result.matching[0]
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
            <Icon name="arrowLeft" size={16} />
            Back to Payroll Setup
          </Button>
          <p
            id="page-title"
            role="heading"
            aria-level={1}
            className="text-2xl font-semibold sm:text-3xl"
          >
            Step 2: Employee Eligibility Review
          </p>
          <p className="mt-2 text-sm text-text-muted">
            Review employees eligible for the selected payroll and identify
            records that need attention.
          </p>
        </div>
        <dl className="grid gap-4 rounded-card bg-surface p-5 elevate sm:grid-cols-2 lg:grid-cols-4">
          <DataPoint
            label="Payroll Type"
            value={config?.name ?? setup.payrollTypeId}
          />
          <DataPoint label="Fund" value={setup.fund} />
          <DataPoint label="Payroll Period" value={setup.period} />
          <DataPoint
            label="Source Submissions"
            value={String(result.matching.length)}
          />
        </dl>
        <section className="overflow-hidden rounded-card bg-surface elevate">
          <div className="border-b border-border p-5">
            <p role="heading" aria-level={2} className="text-lg font-semibold">
              Eligible Employees
            </p>
            <p className="mt-1 text-sm text-text-muted">
              Employees whose transmitted source, appointment snapshot, rate,
              attendance input, and supported calculation are available.
            </p>
          </div>
          {result.eligible.length ? (
            <ul className="divide-y divide-border">
              {result.eligible.map(({ source, employee }) => (
                <li
                  key={source.submissionId}
                  className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4 lg:items-center"
                >
                  <DataPoint
                    label="Employee"
                    value={`${employee.employeeId} · ${employee.name}`}
                  />
                  <DataPoint
                    label="Payroll Group"
                    value={`${source.payrollTypeName} · ${source.fund}`}
                  />
                  <DataPoint
                    label="Payroll Inputs"
                    value={`${employee.payBasis} · Rate and verified ${
                      employee.payBasis === "Daily" ? "days" : "hours"
                    } available`}
                  />
                  <div className="lg:text-right">
                    <span className="inline-flex rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success">
                      Eligible
                    </span>
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => setViewId(source.submissionId)}
                      className="ml-2"
                    >
                      View Employee Payroll Data
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No eligible employees are available for this payroll type, fund, and period." />
          )}
        </section>
        <section className="overflow-hidden rounded-card bg-surface elevate">
          <div className="border-b border-border p-5">
            <p role="heading" aria-level={2} className="text-lg font-semibold">
              Employees Requiring Attention
            </p>
            <p className="mt-1 text-sm text-text-muted">
              Blocked employees remain outside payroll totals until the
              responsible source is corrected.
            </p>
          </div>
          {result.exceptions.length ? (
            <ul className="divide-y divide-border">
              {result.exceptions.map((exception) => (
                <li
                  key={exception.id}
                  className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4"
                >
                  <DataPoint
                    label="Employee"
                    value={`${exception.employeeName} · ${exception.employeeId}`}
                  />
                  <DataPoint
                    label="Missing or Invalid Information"
                    value={`${exception.problemType}: ${exception.explanation}`}
                  />
                  <DataPoint
                    label="Responsible Source / Next Action"
                    value={`${exception.sourceModule} · ${exception.nextAction}`}
                  />
                  <div className="lg:text-right">
                    <span className="inline-flex rounded-full bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger">
                      Blocks computation
                    </span>
                    <Button
                      type="button"
                      variant="link"
                      onClick={() =>
                        setViewId(
                          exception.id
                            .split("-Missing")[0]
                            .split("-Unconfirmed")[0],
                        )
                      }
                      className="ml-2"
                    >
                      View Details
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-5 text-sm text-text-muted">
              No employees require attention for this selection.
            </p>
          )}
        </section>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Button type="button" variant="secondary" onClick={onBack}>
            Back
          </Button>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setRefresh((value) => value + 1)}
            >
              Refresh Eligibility
            </Button>
            <Button
              type="button"
              onClick={() =>
                first &&
                onGenerate(
                  result.eligible.map((item) => item.row),
                  result.exceptions,
                  result.eligible.map((item) => item.source.submissionId),
                  first,
                )
              }
              disabled={!result.eligible.length}
            >
              Generate Draft Payroll
            </Button>
          </div>
        </div>
        {!result.eligible.length && (
          <Alert
            tone="warning"
            title="Payroll computation could not be completed"
          >
            Review the listed exceptions. An empty successful payroll will not
            be created.
          </Alert>
        )}
      </div>
      {viewed && (
        <EmployeeSourceDialog
          source={viewed}
          employee={viewedEvaluation?.employee}
          problems={viewedEvaluation?.problems ?? []}
          attendance={attendance}
          onClose={() => setViewId(null)}
        />
      )}
    </>
  )
}

function ComputationDialog({
  draft,
  row,
  onClose,
}: {
  draft: PayrollDraft
  row: PayrollRow
  onClose: () => void
}) {
  const totals = rowTotals(row)
  return (
    <Modal title="Employee Payroll Computation" onClose={onClose} wide>
      <Tag kind="placeholder">
        Fictional computation inputs · not official university rates
      </Tag>
      <div className="mt-4">
        <Alert tone="info" title="Sample arithmetic only">
          The deduction is fictional and does not represent an official payroll
          rule.
        </Alert>
      </div>
      <section className="mt-5">
        <p role="heading" aria-level={3} className="text-sm font-semibold">
          Employee Information
        </p>
        <dl className="mt-3 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
          <DataPoint
            label="Employee"
            value={`${row.employeeName} (${row.employeeId})`}
          />
          <DataPoint
            label="Employee Classification"
            value={row.classification}
          />
          <DataPoint label="Employment Type" value={row.employmentType} />
          <DataPoint
            label="Assigned Payroll Type"
            value={row.payrollTypeName}
          />
          <DataPoint label="Fund Source" value={row.fund} />
          <DataPoint label="Cost Center" value={row.office} />
          <DataPoint label="Pay Basis" value={row.payBasis} />
          <DataPoint label="Payroll Period" value={draft.period} />
          <DataPoint
            label="Source Submission"
            value={`${row.sourceSubmissionId} · simulated Supervisor validation, HR verification, and Transmitted status`}
          />
          <DataPoint
            label="Source Transmittal"
            value={`${row.sourceTransmittalId} · isolated Payroll Management fixture`}
          />
        </dl>
      </section>
      <section className="mt-5">
        <p role="heading" aria-level={3} className="text-sm font-semibold">
          Payroll Inputs
        </p>
        <dl className="mt-3 grid gap-4 rounded-control border border-border p-4 sm:grid-cols-2">
          {row.payBasis === "Daily" && (
            <>
              <DataPoint
                label="Applicable Daily Rate"
                value={
                  row.applicableRate !== undefined
                    ? peso.format(row.applicableRate)
                    : "Missing"
                }
              />
              <DataPoint
                label="Verified Days Worked"
                value={
                  row.verifiedDaysWorked !== undefined
                    ? String(row.verifiedDaysWorked)
                    : "Missing"
                }
              />
            </>
          )}
          {row.payBasis === "Hourly" && (
            <>
              <DataPoint
                label="Applicable Hourly Rate"
                value={
                  row.applicableRate !== undefined
                    ? peso.format(row.applicableRate)
                    : "Missing"
                }
              />
              <DataPoint
                label="Verified Hours / Teaching Load"
                value={
                  row.verifiedHoursWorked !== undefined
                    ? String(row.verifiedHoursWorked)
                    : "Missing"
                }
              />
            </>
          )}
          {row.payBasis === "Monthly" && (
            <>
              <DataPoint
                label="Applicable Monthly Rate"
                value={
                  row.applicableRate !== undefined
                    ? peso.format(row.applicableRate)
                    : "Missing"
                }
              />
              <DataPoint
                label="Calculation Rule"
                value="Monthly payroll computation requires confirmed payroll calculation rules."
                muted
              />
            </>
          )}
          <DataPoint
            label="Covered Payroll Period"
            value={`${formatDate(draft.periodStart)} to ${formatDate(draft.periodEnd)}`}
          />
          <DataPoint label="Attendance Summary" value={row.attendanceSummary} />
          <DataPoint
            label="Approved Leave / Travel / CTO"
            value={row.approvedAbsenceSummary}
          />
        </dl>
      </section>
      <section className="mt-5">
        <p role="heading" aria-level={3} className="text-sm font-semibold">
          Earnings Breakdown
        </p>
        <ul className="mt-3 divide-y divide-border rounded-control border border-border">
          <li className="grid gap-2 p-3 sm:grid-cols-3">
            <span className="text-sm font-medium">Basic Pay</span>
            <span className="text-xs text-text-muted">
              {row.computationExplanation}
            </span>
            <span className="text-right text-sm font-semibold tabular-nums">
              {row.basicPay !== undefined
                ? peso.format(row.basicPay)
                : "Not computed"}
            </span>
          </li>
          {row.adjustments.map((item) => (
            <li key={item.id} className="grid gap-2 p-3 sm:grid-cols-3">
              <span className="text-sm font-medium">{item.type}</span>
              <span className="text-xs text-text-muted">
                {item.reason} · Evidence: {item.evidenceFilename}
              </span>
              <span className="text-right text-sm font-semibold tabular-nums">
                {peso.format(item.amount)}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-5">
        <p role="heading" aria-level={3} className="text-sm font-semibold">
          Deductions Breakdown
        </p>
        {row.deductions.length ? (
          <ul className="mt-3 divide-y divide-border rounded-control border border-border">
            {row.deductions.map((item) => (
              <li key={item.id} className="grid gap-2 p-3 sm:grid-cols-3">
                <span>{item.name}</span>
                <span className="text-xs text-text-muted">
                  {item.basis} · {item.explanation}
                </span>
                <span className="text-right font-semibold">
                  {peso.format(item.amount)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-text-muted">
            No configured employee-specific deduction applies to this
            demonstration row. No deduction percentage is invented.
          </p>
        )}
      </section>
      <dl className="mt-5 grid gap-4 rounded-control bg-accent p-4 text-on-accent sm:grid-cols-5">
        <DataPoint label="Basic Pay" value={peso.format(totals.basic)} />
        <DataPoint
          label="Other Earnings"
          value={peso.format(totals.adjustments)}
        />
        <DataPoint label="Gross Pay" value={peso.format(totals.gross)} />
        <DataPoint
          label="Total Deductions"
          value={peso.format(totals.deductions)}
        />
        <DataPoint
          label="Net Pay"
          value={draft.finalNetPending ? "Pending" : peso.format(totals.net)}
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

function AdjustmentDialog({
  draft,
  row,
  user,
  onClose,
  onSave,
}: {
  draft: PayrollDraft
  row: PayrollRow
  user: string
  onClose: () => void
  onSave: (adjustment: PayrollAdjustment) => void
}) {
  const [type, setType] = useState<PayrollAdjustment["type"] | "">("")
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [evidence, setEvidence] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const next: Record<string, string> = {}
    const numeric = Number(amount)
    if (!type) next.type = "Select a supported adjustment type."
    if (!amount || !Number.isFinite(numeric) || numeric <= 0)
      next.amount = "Enter a positive adjustment amount."
    if (!reason.trim()) next.reason = "Enter the demonstration reason."
    if (!evidence) next.evidence = "Select supporting evidence."
    setErrors(next)
    if (!Object.keys(next).length)
      onSave({
        id: `DEMO-ADJ-${Date.now()}`,
        type: type as PayrollAdjustment["type"],
        amount: numeric,
        reason: reason.trim(),
        evidenceFilename: evidence,
        recordedBy: user,
        recordedAt: new Date().toISOString(),
      })
  }
  return (
    <Modal title="Add Payroll Adjustment" onClose={onClose}>
      <form onSubmit={submit} noValidate className="grid gap-4">
        <p className="-mt-2 text-sm text-text-muted">
          Record a fictional adjustment or one-time payment for the selected
          employee. This does not constitute official approval.
        </p>
        <dl className="grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
          <DataPoint
            label="Employee"
            value={`${row.employeeName} (${row.employeeId})`}
          />
          <DataPoint label="Payroll Reference" value={draft.id} />
          <DataPoint label="Applicable Payroll Period" value={draft.period} />
        </dl>
        <SelectField
          label="Adjustment Type"
          value={type}
          onChange={(event) =>
            setType(event.target.value as PayrollAdjustment["type"])
          }
          placeholder="Select supported type"
          error={errors.type}
        >
          <option value="Authorized one-time payment">
            Authorized one-time payment
          </option>
          <option value="Back pay">Back pay</option>
          <option value="Salary adjustment">Salary adjustment</option>
        </SelectField>
        <TextField
          label="Adjustment Amount"
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          error={errors.amount}
        />
        <TextAreaField
          label="Reason"
          value={reason}
          onChange={setReason}
          error={errors.reason}
          placeholder="Describe the fictional support and testing purpose."
        />
        <TextField
          label="Supporting Evidence"
          type="file"
          onChange={(event) =>
            setEvidence(event.currentTarget.files?.[0]?.name ?? "")
          }
          error={errors.evidence}
          hint={
            evidence
              ? `Selected: ${evidence}`
              : "Required by the demonstration adjustment workflow."
          }
        />
        <Alert tone="warning" title="Authorization is not created here">
          Saving records the fictional adjustment in this draft. It does not
          make an unsupported payment authorized.
        </Alert>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save Adjustment</Button>
        </div>
      </form>
    </Modal>
  )
}

function CorrectionDialog({
  draft,
  row,
  user,
  onClose,
  onSave,
}: {
  draft: PayrollDraft
  row: PayrollRow
  user: string
  onClose: () => void
  onSave: (
    adjustmentId: string,
    amount: number,
    reason: string,
    reference: string,
  ) => void
}) {
  const [adjustmentId, setAdjustmentId] = useState(row.adjustments[0]?.id ?? "")
  const selected = row.adjustments.find((item) => item.id === adjustmentId)
  const [amount, setAmount] = useState(selected ? String(selected.amount) : "")
  const [reason, setReason] = useState("")
  const [reference, setReference] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const next: Record<string, string> = {}
    const numeric = Number(amount)
    if (!selected)
      next.adjustmentId =
        "No Accounting-controlled adjustment is available to correct."
    if (!amount || !Number.isFinite(numeric) || numeric < 0)
      next.amount = "Enter a valid corrected amount."
    if (!reason.trim()) next.reason = "Enter a correction reason."
    setErrors(next)
    if (!Object.keys(next).length)
      onSave(adjustmentId, numeric, reason.trim(), reference.trim())
  }
  return (
    <Modal title="Correct Payroll Draft Entry" onClose={onClose}>
      <form onSubmit={submit} noValidate className="grid gap-4">
        <p className="-mt-2 text-sm text-text-muted">
          Only Accounting-controlled adjustments can be corrected here. HR rates
          and attendance source records remain read-only.
        </p>
        <dl className="grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
          <DataPoint
            label="Employee"
            value={`${row.employeeName} (${row.employeeId})`}
          />
          <DataPoint label="Payroll Reference" value={draft.id} />
        </dl>
        {row.adjustments.length ? (
          <>
            <SelectField
              label="Current Entry"
              value={adjustmentId}
              onChange={(event) => {
                const id = event.target.value
                setAdjustmentId(id)
                setAmount(
                  String(
                    row.adjustments.find((item) => item.id === id)?.amount ??
                      "",
                  ),
                )
              }}
              error={errors.adjustmentId}
            >
              {row.adjustments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.type} · {peso.format(item.amount)}
                </option>
              ))}
            </SelectField>
            <TextField
              label="Previous Value"
              value={selected ? peso.format(selected.amount) : ""}
              readOnly
            />
            <TextField
              label="Proposed Corrected Value"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              error={errors.amount}
            />
            <TextAreaField
              label="Correction Reason"
              value={reason}
              onChange={setReason}
              error={errors.reason}
            />
            <TextField
              label="Evidence / Reference (optional)"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
            />
          </>
        ) : (
          <Alert tone="warning" title="No correctable Accounting entry">
            Add an authorized adjustment first. Changes to appointment rates or
            attendance must be made in the responsible source module.
          </Alert>
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!row.adjustments.length}>
            Save Correction
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function PayrollDetails({
  draft,
  allSources,
  user,
  onBack,
  onUpdate,
  onReview,
}: {
  draft: PayrollDraft
  allSources: PayrollSource[]
  user: string
  onBack: () => void
  onUpdate: (draft: PayrollDraft, notice: string) => void
  onReview: () => void
}) {
  const [query, setQuery] = useState("")
  const [basis, setBasis] = useState("")
  const [availability, setAvailability] = useState("")
  const [office, setOffice] = useState("")
  const [rowId, setRowId] = useState<string | null>(null)
  const [adjustId, setAdjustId] = useState<string | null>(null)
  const [correctId, setCorrectId] = useState<string | null>(null)
  const [issueId, setIssueId] = useState<string | null>(null)
  const [showExceptions, setShowExceptions] = useState(true)
  const [notice, setNotice] = useState("")
  const totals = draftTotals(draft)
  const filtered = draft.rows.filter(
    (row) =>
      (!query.trim() ||
        [row.employeeName, row.employeeId].some((value) =>
          value.toLowerCase().includes(query.trim().toLowerCase()),
        )) &&
      (!basis || row.payBasis === basis) &&
      (!availability || row.calculationStatus === availability) &&
      (!office || row.office === office),
  )
  const selectedRow = draft.rows.find((row) => row.employeeId === rowId)
  const adjustmentRow = draft.rows.find((row) => row.employeeId === adjustId)
  const correctionRow = draft.rows.find((row) => row.employeeId === correctId)
  const issue = draft.exceptions.find((item) => item.id === issueId)
  const editable =
    !draft.locked && (draft.stage === "Draft" || draft.stage === "Returned")
  const update = (next: PayrollDraft, message: string) => {
    onUpdate(next, message)
    setNotice(message)
  }
  const addAdjustment = (row: PayrollRow, adjustment: PayrollAdjustment) => {
    const next = {
      ...draft,
      rows: draft.rows.map((item) =>
        item.employeeId === row.employeeId
          ? { ...item, adjustments: [...item.adjustments, adjustment] }
          : item,
      ),
      updatedAt: new Date().toISOString(),
      computationVersion: draft.computationVersion + 1,
    }
    update(next, "Adjustment recorded locally and payroll totals recomputed.")
    setAdjustId(null)
  }
  const correct = (
    row: PayrollRow,
    adjustmentId: string,
    amount: number,
    reason: string,
    reference: string,
  ) => {
    const current = row.adjustments.find((item) => item.id === adjustmentId)!
    const now = new Date().toISOString()
    const next = {
      ...draft,
      rows: draft.rows.map((item) =>
        item.employeeId === row.employeeId
          ? {
              ...item,
              adjustments: item.adjustments.map((adjustment) =>
                adjustment.id === adjustmentId
                  ? { ...adjustment, amount }
                  : adjustment,
              ),
            }
          : item,
      ),
      corrections: [
        ...draft.corrections,
        {
          id: `DEMO-COR-${Date.now()}`,
          employeeId: row.employeeId,
          action: `Corrected ${current.type}`,
          previousValue: peso.format(current.amount),
          newValue: peso.format(amount),
          reason,
          evidenceReference: reference || undefined,
          recordedBy: user,
          recordedAt: now,
        },
      ],
      updatedAt: now,
      computationVersion: draft.computationVersion + 1,
    }
    update(
      next,
      "Draft entry corrected locally, previous value preserved, and totals recomputed.",
    )
    setCorrectId(null)
  }
  const recompute = () => {
    if (!editable) return
    update(
      {
        ...draft,
        updatedAt: new Date().toISOString(),
        computationVersion: draft.computationVersion + 1,
      },
      "Supported calculations recomputed. Unresolved rules remain listed as exceptions.",
    )
  }
  const clear = () => {
    setQuery("")
    setBasis("")
    setAvailability("")
    setOffice("")
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
            <Icon name="arrowLeft" size={16} />
            Back to Payroll Management
          </Button>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p
                id="page-title"
                role="heading"
                aria-level={1}
                className="text-2xl font-semibold sm:text-3xl"
              >
                Payroll Draft Details
              </p>
              <p className="mt-2 text-sm text-text-muted">
                Review the payroll computation and employee payment breakdown.
              </p>
            </div>
            <StageBadge stage={draft.stage} label={draft.stageLabel} />
          </div>
        </div>
        {notice && (
          <Alert tone="success" title="Local draft updated">
            {notice}
          </Alert>
        )}
        <Alert tone="info" title="Demo Data">
          All employee records, payroll amounts, adjustments, and deductions
          shown here are fictional and intended for UI/UX testing only.
        </Alert>
        {draft.locked && (
          <Alert
            tone="warning"
            title="This payroll is locked while undergoing approval"
          >
            Editing is unavailable unless it is returned through the authorized
            workflow.
          </Alert>
        )}
        {draft.returnInfo && (
          <Alert tone="danger" title="Return Details">
            <strong>{draft.returnInfo.office}</strong> ·{" "}
            {dateTime.format(new Date(draft.returnInfo.at))}
            <span className="mt-1 block">{draft.returnInfo.remarks}</span>
            <span className="mt-2 block text-xs text-text-muted">
              Previous approval history is preserved. Only permitted draft
              corrections are unlocked.
            </span>
          </Alert>
        )}
        <dl className="grid gap-4 rounded-card bg-surface p-5 elevate sm:grid-cols-2 lg:grid-cols-4">
          <DataPoint label="Payroll Reference" value={draft.id} />
          <DataPoint label="Payroll Type" value={draft.payrollTypeName} />
          <DataPoint
            label="Payroll Period"
            value={`${draft.period} · ${formatDate(draft.periodStart)} to ${formatDate(draft.periodEnd)}`}
          />
          <DataPoint label="Fund" value={draft.fund} />
          <DataPoint
            label="Current Payroll Stage"
            value={draft.stageLabel ?? draft.stage}
          />
          {draft.currentApprovalHolder && (
            <DataPoint
              label="Current Approval Holder"
              value={draft.currentApprovalHolder}
            />
          )}
          <DataPoint
            label="Included Employees"
            value={String(
              draft.rows.filter((row) => row.calculationStatus === "Computed")
                .length,
            )}
          />
          <DataPoint
            label="Excluded Employees"
            value={String(
              new Set(draft.exceptions.map((item) => item.employeeId)).size,
            )}
          />
          <DataPoint
            label="Last Updated"
            value={dateTime.format(new Date(draft.updatedAt))}
          />
          {draft.currentApprovalHolder && (
            <DataPoint
              label="Current Holder"
              value={draft.currentApprovalHolder}
            />
          )}
          {draft.returnInfo && (
            <DataPoint
              label="Returned By / Date"
              value={`${draft.returnInfo.office} · ${dateTime.format(new Date(draft.returnInfo.at))}`}
            />
          )}
        </dl>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["Total Basic Pay", totals.basic],
            ["Total Sample Adjustments", totals.adjustments],
            ["Total Gross Pay", totals.gross],
            ["Total Demo Deductions", totals.deductions],
            ["Total Net Pay", totals.net],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-card bg-surface p-5 elevate"
            >
              <p className="text-xs font-medium text-text-muted">{label}</p>
              <p className="mt-2 text-xl font-bold tabular-nums">
                {draft.rows.every((row) => row.calculationStatus === "Computed")
                  ? draft.finalNetPending && label === "Total Net Pay"
                    ? "Pending"
                    : peso.format(Number(value))
                  : "Not yet computed"}
              </p>
            </div>
          ))}
        </section>
        <section className="overflow-hidden rounded-card bg-surface elevate">
          <div className="border-b border-border p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p
                  role="heading"
                  aria-level={2}
                  className="text-lg font-semibold"
                >
                  Employee Payroll
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  Amounts include only supported calculations and recorded
                  Accounting adjustments.
                </p>
              </div>
              {editable && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" variant="secondary" onClick={recompute}>
                    Recompute Payroll
                  </Button>
                  <Button type="button" onClick={onReview}>
                    Review for Approval
                  </Button>
                </div>
              )}
            </div>
            {draft.approvalBlockReason && (
              <div className="mt-4">
                <Alert tone="warning" title="Approval action unavailable">
                  {draft.approvalBlockReason}
                </Alert>
              </div>
            )}
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <TextField
                label="Search"
                icon="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search employee name or ID..."
              />
              <SelectField
                label="Pay Basis"
                value={basis}
                onChange={(event) => setBasis(event.target.value)}
                placeholder="All pay bases"
              >
                <option value="Monthly">Monthly</option>
                <option value="Daily">Daily</option>
                <option value="Hourly">Hourly</option>
              </SelectField>
              <SelectField
                label="Calculation Availability"
                value={availability}
                onChange={(event) => setAvailability(event.target.value)}
                placeholder="All statuses"
              >
                <option value="Computed">Computed</option>
                <option value="Blocked">Blocked</option>
              </SelectField>
              <SelectField
                label="Cost Center"
                value={office}
                onChange={(event) => setOffice(event.target.value)}
                placeholder="All Cost Centers"
              >
                {[...new Set(draft.rows.map((row) => row.office))].map(
                  (item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ),
                )}
              </SelectField>
              <Button
                type="button"
                variant="secondary"
                onClick={clear}
                disabled={!query && !basis && !availability && !office}
              >
                Clear Filters
              </Button>
            </div>
          </div>
          {filtered.length ? (
            <>
              <div className="hidden xl:block">
                <table className="w-full table-fixed text-left text-xs">
                  <colgroup>
                    <col className="w-[18%]" />
                    <col className="w-[9%]" />
                    <col className="w-[10%]" />
                    <col className="w-[12%]" />
                    <col className="w-[10%]" />
                    <col className="w-[10%]" />
                    <col className="w-[10%]" />
                    <col className="w-[10%]" />
                    <col className="w-[11%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-border bg-canvas text-text-muted">
                      {[
                        "Employee",
                        draft.payrollTypeId === "job-order-staff"
                          ? "Days Worked"
                          : "Days / Hours",
                        draft.payrollTypeId === "job-order-staff"
                          ? "Daily Rate"
                          : "Applicable Rate",
                        "Basic Pay",
                        "Other Earnings",
                        "Gross Pay",
                        "Demo Deductions",
                        "Net Pay",
                      ].map((item) => (
                        <th key={item} className="px-2 py-3 font-semibold">
                          {item}
                        </th>
                      ))}
                      <th className="px-2 py-3 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((row) => {
                      const value = rowTotals(row)
                      return (
                        <tr key={row.employeeId}>
                          <td className="px-2 py-3">
                            <p className="font-semibold">{row.employeeName}</p>
                            <p className="text-text-muted">{row.employeeId}</p>
                          </td>
                          <td className="px-2 py-3 tabular-nums">
                            {row.payBasis === "Daily"
                              ? (row.verifiedDaysWorked ?? "Pending")
                              : row.payBasis === "Hourly"
                                ? (row.verifiedHoursWorked ?? "Pending")
                                : "Pending"}
                          </td>
                          <td className="px-2 py-3 tabular-nums">
                            {row.applicableRate !== undefined
                              ? peso.format(row.applicableRate)
                              : "Pending"}
                          </td>
                          <td className="px-2 py-3 tabular-nums">
                            {row.basicPay !== undefined
                              ? peso.format(value.basic)
                              : "Not computed"}
                          </td>
                          <td className="px-2 py-3 tabular-nums">
                            {row.calculationStatus === "Blocked"
                              ? "Pending"
                              : peso.format(value.adjustments)}
                          </td>
                          <td className="px-2 py-3 tabular-nums">
                            {row.calculationStatus === "Blocked"
                              ? "Pending"
                              : peso.format(value.gross)}
                          </td>
                          <td className="px-2 py-3 tabular-nums">
                            {row.calculationStatus === "Blocked"
                              ? "Pending"
                              : peso.format(value.deductions)}
                          </td>
                          <td className="px-2 py-3 font-semibold tabular-nums">
                            {draft.finalNetPending ||
                            row.calculationStatus === "Blocked"
                              ? "Pending"
                              : peso.format(value.net)}
                          </td>
                          <td className="px-2 py-3">
                            <div className="flex flex-wrap justify-end gap-1">
                              <Button
                                type="button"
                                variant="link"
                                onClick={() => setRowId(row.employeeId)}
                                className="text-xs"
                              >
                                View Computation
                              </Button>
                              {editable && (
                                <>
                                  <Button
                                    type="button"
                                    variant="link"
                                    onClick={() => setAdjustId(row.employeeId)}
                                    className="text-xs"
                                  >
                                    Add Adjustment
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="link"
                                    onClick={() => setCorrectId(row.employeeId)}
                                    className="text-xs"
                                  >
                                    Correct Draft Entry
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <ul className="divide-y divide-border xl:hidden">
                {filtered.map((row) => {
                  const value = rowTotals(row)
                  return (
                    <li key={row.employeeId} className="p-5">
                      <div className="flex flex-wrap justify-between gap-2">
                        <div>
                          <p className="font-semibold">{row.employeeName}</p>
                          <p className="text-xs text-text-muted">
                            {row.employeeId} · {row.payBasis}
                          </p>
                        </div>
                        <span
                          className={clsx(
                            "rounded-full px-2 py-1 text-xs font-semibold",
                            row.calculationStatus === "Computed"
                              ? "bg-success-soft text-success"
                              : "bg-danger-soft text-danger",
                          )}
                        >
                          {row.calculationStatus}
                        </span>
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-3">
                        <DataPoint
                          label={
                            row.payBasis === "Daily"
                              ? "Days Worked / Daily Rate"
                              : "Hours / Applicable Rate"
                          }
                          value={
                            row.applicableRate !== undefined
                              ? `${row.verifiedDaysWorked ?? row.verifiedHoursWorked ?? "Pending"} · ${peso.format(row.applicableRate)}`
                              : "Pending"
                          }
                        />
                        <DataPoint
                          label="Gross Pay"
                          value={
                            row.calculationStatus === "Blocked"
                              ? "Pending"
                              : peso.format(value.gross)
                          }
                        />
                        <DataPoint
                          label="Deductions"
                          value={
                            row.calculationStatus === "Blocked"
                              ? "Pending"
                              : peso.format(value.deductions)
                          }
                        />
                        <DataPoint
                          label="Net Pay"
                          value={
                            draft.finalNetPending ||
                            row.calculationStatus === "Blocked"
                              ? "Pending"
                              : peso.format(value.net)
                          }
                        />
                      </dl>
                      <div className="mt-4 grid gap-2 sm:grid-cols-3">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setRowId(row.employeeId)}
                        >
                          View Computation
                        </Button>
                        {editable && (
                          <>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => setAdjustId(row.employeeId)}
                            >
                              Add Adjustment
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => setCorrectId(row.employeeId)}
                            >
                              Correct Draft Entry
                            </Button>
                          </>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </>
          ) : (
            <EmptyState
              title="No employee rows match the selected filters."
              action={
                <Button type="button" variant="secondary" onClick={clear}>
                  Clear Filters
                </Button>
              }
            />
          )}
        </section>
        <section className="rounded-card bg-surface elevate">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowExceptions((value) => !value)}
            aria-expanded={showExceptions}
            className="h-auto w-full justify-between rounded-card border-0 p-5 shadow-none"
          >
            <span>
              <span className="block text-left font-semibold">
                Payroll Exceptions
              </span>
              <span className="mt-1 block text-left text-xs font-normal text-text-muted">
                {draft.exceptions.length} recorded blocking exception
                {draft.exceptions.length === 1 ? "" : "s"}
              </span>
            </span>
            <Icon
              name="chevronDown"
              size={17}
              className={clsx(showExceptions && "rotate-180")}
            />
          </Button>
          {showExceptions &&
            (draft.exceptions.length ? (
              <ul className="divide-y divide-border border-t border-border">
                {draft.exceptions.map((exception) => (
                  <li
                    key={exception.id}
                    className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4"
                  >
                    <DataPoint
                      label="Employee"
                      value={`${exception.employeeName} (${exception.employeeId})`}
                    />
                    <DataPoint
                      label="Problem"
                      value={`${exception.problemType}: ${exception.explanation}`}
                    />
                    <DataPoint
                      label="Required Next Action"
                      value={`${exception.nextAction} · ${exception.sourceModule}`}
                    />
                    <div className="lg:text-right">
                      <span className="rounded-full bg-danger-soft px-2 py-1 text-xs font-semibold text-danger">
                        Blocks computation
                      </span>
                      <Button
                        type="button"
                        variant="link"
                        onClick={() => setIssueId(exception.id)}
                        className="ml-2"
                      >
                        View Issue
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="border-t border-border p-5 text-sm text-text-muted">
                No payroll exceptions are recorded.
              </p>
            ))}
        </section>
        {draft.corrections.length > 0 && (
          <section className="rounded-card bg-surface p-5 elevate">
            <p role="heading" aria-level={2} className="text-lg font-semibold">
              Correction &amp; Change History
            </p>
            <ul className="mt-3 grid gap-2">
              {draft.corrections.map((item) => (
                <li
                  key={item.id}
                  className="rounded-control bg-canvas p-3 text-sm"
                >
                  <p className="font-medium">
                    {item.action} · {item.employeeId}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    Previous: {item.previousValue} · New: {item.newValue}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    {item.reason} · {item.recordedBy} ·{" "}
                    {dateTime.format(new Date(item.recordedAt))}
                    {item.evidenceReference
                      ? ` · ${item.evidenceReference}`
                      : ""}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-text-muted">
              Local demonstration history only; this is not an immutable
              production audit log.
            </p>
          </section>
        )}
        {draft.approvalHistory.length > 0 && (
          <section className="rounded-card bg-surface p-5 elevate">
            <p role="heading" aria-level={2} className="text-lg font-semibold">
              Approval History
            </p>
            <ul className="mt-3 grid gap-2">
              {draft.approvalHistory.map((event) => (
                <li
                  key={event.id}
                  className="rounded-control bg-canvas p-3 text-sm"
                >
                  <p className="font-medium">
                    {event.stage} · {event.holder}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    {dateTime.format(new Date(event.at))}
                    {event.remarks ? ` · ${event.remarks}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      {selectedRow && (
        <ComputationDialog
          draft={draft}
          row={selectedRow}
          onClose={() => setRowId(null)}
        />
      )}
      {adjustmentRow && (
        <AdjustmentDialog
          draft={draft}
          row={adjustmentRow}
          user={user}
          onClose={() => setAdjustId(null)}
          onSave={(adjustment) => addAdjustment(adjustmentRow, adjustment)}
        />
      )}
      {correctionRow && (
        <CorrectionDialog
          draft={draft}
          row={correctionRow}
          user={user}
          onClose={() => setCorrectId(null)}
          onSave={(id, amount, reason, reference) =>
            correct(correctionRow, id, amount, reason, reference)
          }
        />
      )}
      {issue && (
        <Modal title="Payroll Exception" onClose={() => setIssueId(null)}>
          <dl className="grid gap-4 rounded-control bg-canvas p-4">
            <DataPoint
              label="Employee"
              value={`${issue.employeeName} (${issue.employeeId})`}
            />
            <DataPoint label="Problem Type" value={issue.problemType} />
            <DataPoint label="Explanation" value={issue.explanation} />
            <DataPoint label="Responsible Source" value={issue.sourceModule} />
            <DataPoint label="Required Next Action" value={issue.nextAction} />
          </dl>
          <p className="mt-4 text-xs text-text-muted">
            This exception cannot be bypassed from Accounting. Correct the data
            in the responsible source module and refresh eligibility.
          </p>
          <div className="mt-5 flex justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIssueId(null)}
            >
              Close
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}

function ApprovalReview({
  draft,
  sources,
  onBack,
  onConfirm,
}: {
  draft: PayrollDraft
  sources: PayrollSource[]
  onBack: () => void
  onConfirm: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const totals = draftTotals(draft)
  const transmitted = draft.includedSubmissionIds.every((id) =>
    sources.some((source) => source.submissionId === id && source.transmitted),
  )
  const checks = [
    [
      "Included employees meet applicable eligibility conditions.",
      draft.rows.length > 0,
    ],
    ["Required source submissions were Transmitted.", transmitted],
    [
      "Computation rules are available and applicable.",
      draft.rows.every((row) => row.calculationStatus === "Computed") &&
        !draft.finalNetPending,
    ],
    [
      "No included employee has unresolved blocking computation errors.",
      draft.exceptions.length === 0,
    ],
    [
      "Payroll totals reconcile.",
      draft.rows.every((row) => rowTotals(row).net >= 0),
    ],
    [
      "Relevant payroll assignments and effective dates are valid.",
      draft.rows.length > 0,
    ],
    [
      "Approval routing is configured for the required Cost Centers.",
      draft.approvalRouteConfigured,
    ],
  ] as const
  const valid = checks.every(([, value]) => value)
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
            <Icon name="arrowLeft" size={16} />
            Back to Draft
          </Button>
          <p
            id="page-title"
            role="heading"
            aria-level={1}
            className="text-2xl font-semibold sm:text-3xl"
          >
            Review Payroll for Approval
          </p>
        </div>
        <section className="rounded-card bg-surface p-5 elevate">
          <p role="heading" aria-level={2} className="text-lg font-semibold">
            Payroll Information
          </p>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DataPoint label="Payroll Reference" value={draft.id} />
            <DataPoint label="Payroll Type" value={draft.payrollTypeName} />
            <DataPoint label="Fund" value={draft.fund} />
            <DataPoint label="Payroll Period" value={draft.period} />
            <DataPoint
              label="Included Employees"
              value={String(
                draft.rows.filter((row) => row.calculationStatus === "Computed")
                  .length,
              )}
            />
            <DataPoint
              label="Excluded Employees"
              value={String(
                new Set(draft.exceptions.map((item) => item.employeeId)).size,
              )}
            />
          </dl>
        </section>
        <section className="rounded-card bg-surface p-5 elevate">
          <p role="heading" aria-level={2} className="text-lg font-semibold">
            Financial Summary
          </p>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
              value={
                draft.finalNetPending ? "Pending" : peso.format(totals.net)
              }
            />
          </dl>
        </section>
        <section className="rounded-card bg-surface p-5 elevate">
          <p role="heading" aria-level={2} className="text-lg font-semibold">
            Validation Summary
          </p>
          <ul className="mt-4 grid gap-2">
            {checks.map(([label, passed]) => (
              <li
                key={label}
                className={clsx(
                  "flex items-start gap-2 text-sm",
                  passed ? "text-text" : "text-danger",
                )}
              >
                <Icon
                  name={passed ? "check" : "alert"}
                  size={16}
                  className={clsx(
                    "mt-0.5",
                    passed ? "text-success" : "text-danger",
                  )}
                />
                {label}
              </li>
            ))}
          </ul>
          {draft.approvalBlockReason && (
            <div className="mt-4">
              <Alert tone="danger" title="Mark for Approval is blocked">
                {draft.approvalBlockReason}
              </Alert>
            </div>
          )}
        </section>
        <section className="rounded-card bg-surface p-5 elevate">
          <p role="heading" aria-level={2} className="text-lg font-semibold">
            Employee Preview
          </p>
          <ul className="mt-3 divide-y divide-border rounded-control border border-border">
            {draft.rows.map((row) => (
              <li
                key={row.employeeId}
                className="flex flex-wrap justify-between gap-3 p-3 text-sm"
              >
                <span>
                  {row.employeeId} · {row.employeeName}
                </span>
                <span className="font-semibold tabular-nums">
                  {peso.format(rowTotals(row).net)}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onBack}>
            Back to Draft
          </Button>
          <Button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={!valid}
          >
            Mark for Approval
          </Button>
        </div>
      </div>
      {confirming && (
        <Modal
          title="Confirm Payroll for Approval"
          onClose={() => setConfirming(false)}
        >
          <p className="text-sm leading-relaxed">
            You are about to mark this payroll draft for approval. Editing will
            be restricted until the payroll is returned through the authorized
            approval workflow.
          </p>
          <dl className="mt-4 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
            <DataPoint label="Payroll Reference" value={draft.id} />
            <DataPoint label="Payroll Type" value={draft.payrollTypeName} />
            <DataPoint label="Fund" value={draft.fund} />
            <DataPoint label="Payroll Period" value={draft.period} />
            <DataPoint
              label="Employee Count"
              value={String(draft.rows.length)}
            />
            <DataPoint
              label="Net Payroll Total"
              value={peso.format(totals.net)}
            />
          </dl>
          <p className="mt-4 text-xs text-text-muted">
            This records a local role-based handoff only. It does not notify a
            real Cost Center.
          </p>
          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={onConfirm}>
              Confirm for Approval
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}

export function PayrollManagement({
  employees,
  attendance,
  transmittals,
  drafts,
  setDrafts,
  user,
  onOpenComputation,
  initialDraftId,
  initialScreen,
}: {
  employees: HrEmployee[]
  attendance: AttendanceModuleState
  transmittals: TransmittalRecord[]
  drafts: PayrollDraft[]
  setDrafts: Dispatch<SetStateAction<PayrollDraft[]>>
  user: string
  onOpenComputation?: (draftId: string) => void
  initialDraftId?: string | null
  initialScreen?: "create" | "detail" | "review"
}) {
  const [view, setView] = useState<View>("drafts")
  const [screen, setScreen] = useState<Screen>(
    initialScreen === "create"
      ? "create"
      : initialDraftId
        ? (initialScreen ?? "detail")
        : "list",
  )
  const [selectedId, setSelectedId] = useState<string | null>(
    initialDraftId ?? null,
  )
  const [setup, setSetup] = useState<Setup>({
    payrollTypeId: "",
    fund: "",
    period: "",
  })
  const [query, setQuery] = useState("")
  const [type, setType] = useState("")
  const [period, setPeriod] = useState("")
  const [fund, setFund] = useState("")
  const [stage, setStage] = useState("")
  const [notice, setNotice] = useState("")
  const sources = useMemo(
    () => [...accountingDemoSources, ...sourcesFromTransmittals(transmittals)],
    [transmittals],
  )
  const selected = drafts.find((draft) => draft.id === selectedId)
  const viewRecords = drafts.filter((draft) =>
    view === "drafts"
      ? draft.stage === "Draft"
      : view === "approval"
        ? draft.stage === "For Approval"
        : view === "returned"
          ? draft.stage === "Returned"
          : draft.stage === "Completed",
  )
  const filtered = viewRecords
    .filter(
      (draft) =>
        (!query.trim() ||
          [
            draft.id,
            draft.payrollTypeName,
            draft.period,
            ...draft.rows.flatMap((row) => [row.employeeName, row.employeeId]),
            ...draft.exceptions.flatMap((item) => [
              item.employeeName,
              item.employeeId,
            ]),
          ].some((value) =>
            value.toLowerCase().includes(query.trim().toLowerCase()),
          )) &&
        (!type || draft.payrollTypeId === type) &&
        (!period || draft.period === period) &&
        (!fund || draft.fund === fund) &&
        (!stage || draft.stage === stage),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  const paging = usePaged(
    filtered,
    6,
    `${view}|${query}|${type}|${period}|${fund}|${stage}`,
  )
  const payrollTypes = [
    ...new Map(
      drafts.map((draft) => [draft.payrollTypeId, draft.payrollTypeName]),
    ).entries(),
  ]
  const periods = [...new Set(drafts.map((draft) => draft.period))]
  const clearFilters = () => {
    setQuery("")
    setType("")
    setPeriod("")
    setFund("")
    setStage("")
  }
  const open = (id: string) => {
    setSelectedId(id)
    setScreen("detail")
  }
  const updateDraft = (draft: PayrollDraft, message: string) => {
    setDrafts((current) =>
      current.map((item) => (item.id === draft.id ? draft : item)),
    )
    setNotice(message)
  }
  const generate = (
    rows: PayrollRow[],
    exceptions: PayrollException[],
    ids: string[],
    source: PayrollSource,
  ) => {
    const id = `DEMO-PAY-${String(drafts.reduce((max, item) => Math.max(max, Number(item.id.split("-").pop()) || 0), 0) + 1).padStart(3, "0")}`
    const now = new Date().toISOString()
    const config = payrollConfigurationRefs.find(
      (item) => item.id === setup.payrollTypeId,
    )!
    const draft: PayrollDraft = {
      id,
      payrollTypeId: setup.payrollTypeId,
      payrollTypeName: config.name,
      fund: setup.fund as FundSource,
      period: setup.period,
      periodStart: source.periodStart,
      periodEnd: source.periodEnd,
      rows,
      includedSubmissionIds: ids,
      exceptions,
      stage: "Draft",
      approvalRouteConfigured: true,
      createdBy: user,
      createdAt: now,
      updatedAt: now,
      locked: false,
      computationVersion: 1,
      corrections: [],
      approvalHistory: [],
    }
    setDrafts((current) => [draft, ...current])
    setSelectedId(id)
    setScreen("detail")
    setNotice(
      "Payroll draft generated locally from supported transmitted source inputs.",
    )
  }
  const markApproval = () => {
    if (
      !selected ||
      selected.locked ||
      selected.exceptions.length ||
      selected.finalNetPending ||
      !selected.approvalRouteConfigured
    )
      return
    const now = new Date().toISOString()
    const next: PayrollDraft = {
      ...selected,
      stage: "For Approval",
      locked: true,
      currentApprovalHolder: "Cost Center Signatory",
      returnInfo: undefined,
      updatedAt: now,
      approvalHistory: [
        ...selected.approvalHistory,
        {
          id: `DEMO-APPROVAL-${Date.now()}`,
          stage: "Marked for Approval",
          holder: "Cost Center Signatory",
          at: now,
          remarks:
            "Local role-based routing event; no real office notification was sent.",
        },
      ],
    }
    setDrafts((current) =>
      current.map((item) => (item.id === next.id ? next : item)),
    )
    setNotice(
      "Payroll marked For Approval in the demonstration and ordinary editing is locked.",
    )
    setView("approval")
    setScreen("list")
    setSelectedId(null)
  }
  if (screen === "create")
    return (
      <CreateWorkflow
        drafts={drafts}
        sources={sources}
        employees={employees}
        attendance={attendance}
        initialSetup={setup}
        onCancel={() => setScreen("list")}
        onExisting={open}
        onContinue={(value) => {
          setSetup(value)
          setScreen("eligibility")
        }}
      />
    )
  if (screen === "eligibility")
    return (
      <EligibilityReview
        setup={setup}
        sources={sources}
        employees={employees}
        attendance={attendance}
        onBack={() => setScreen("create")}
        onGenerate={generate}
      />
    )
  if (screen === "detail" && selected)
    return (
      <PayrollDetails
        draft={selected}
        allSources={sources}
        user={user}
        onBack={() => {
          setScreen("list")
          setSelectedId(null)
        }}
        onUpdate={updateDraft}
        onReview={() => setScreen("review")}
      />
    )
  if (screen === "review" && selected)
    return (
      <ApprovalReview
        draft={selected}
        sources={sources}
        onBack={() => setScreen("detail")}
        onConfirm={markApproval}
      />
    )
  const titles: Record<View, [string, string]> = {
    drafts: [
      "Payroll Drafts",
      "Manage payrolls currently being prepared by the Accounting Section.",
    ],
    approval: [
      "For Approval",
      "Payroll records currently within the approval process.",
    ],
    returned: [
      "Returned",
      "Review payrolls returned to Accounting with remarks.",
    ],
    history: [
      "Payroll History",
      "Review previously processed payroll records and their available workflow history.",
    ],
  }
  return (
    <div className="grid gap-6 font-sans">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p
            id="page-title"
            role="heading"
            aria-level={1}
            className="text-2xl font-semibold sm:text-3xl"
          >
            Payroll Management
          </p>
          <p className="mt-2 text-sm text-text-muted">
            Create, compute, review, and prepare employee payroll drafts for
            approval.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setSetup({ payrollTypeId: "", fund: "", period: "" })
            setScreen("create")
          }}
        >
          <Icon name="plus" size={17} />
          Create Payroll Draft
        </Button>
      </section>
      <Alert tone="info" title="Demo Data">
        All employee records, payroll amounts, adjustments, and deductions shown
        here are fictional and intended for UI/UX testing only.
      </Alert>
      {notice && (
        <Alert tone="success" title="Local payroll workflow update">
          {notice}
        </Alert>
      )}
      <section className="overflow-hidden rounded-card bg-surface elevate">
        <div className="border-b border-border p-5 sm:p-6">
          <div
            role="tablist"
            aria-label="Payroll Management views"
            className="grid gap-1 rounded-control bg-canvas p-1 sm:grid-cols-4"
          >
            {([
              ["drafts", "Payroll Drafts"],
              ["approval", "For Approval"],
              ["returned", "Returned"],
              ["history", "Payroll History"],
            ] as const).map(([id, label]) => (
              <Button
                key={id}
                type="button"
                variant={view === id ? "primary" : "secondary"}
                role="tab"
                aria-selected={view === id}
                onClick={() => {
                  setView(id)
                  clearFilters()
                }}
                className={clsx(
                  "h-11 border-0 shadow-none",
                  view !== id && "bg-transparent text-text-muted",
                )}
              >
                {label}{" "}
                <span className="rounded-full bg-deep/10 px-1.5 py-0.5 text-xs">
                  {
                    drafts.filter((draft) =>
                      id === "drafts"
                        ? draft.stage === "Draft"
                        : id === "approval"
                          ? draft.stage === "For Approval"
                          : id === "returned"
                            ? draft.stage === "Returned"
                            : draft.stage === "Completed",
                    ).length
                  }
                </span>
              </Button>
            ))}
          </div>
          <div className="mt-5">
            <p role="heading" aria-level={2} className="text-lg font-semibold">
              {titles[view][0]}
            </p>
            <p className="mt-1 text-sm text-text-muted">{titles[view][1]}</p>
            <p className="mt-2 text-xs text-text-muted">
              {filtered.length} matching record
              {filtered.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <TextField
              label="Search"
              icon="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search payroll reference, type, period, or employee..."
              className="sm:col-span-2"
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
              label="Payroll Stage"
              value={stage}
              onChange={(event) => setStage(event.target.value)}
              placeholder="All stages"
            >
              <option value="Draft">Draft</option>
              <option value="For Approval">For Approval</option>
              <option value="Returned">Returned</option>
              <option value="Completed">Completed</option>
            </SelectField>
            <Button
              type="button"
              variant="secondary"
              onClick={clearFilters}
              disabled={!query && !type && !period && !fund && !stage}
            >
              Clear Filters
            </Button>
          </div>
        </div>
        {filtered.length ? (
          <>
            <div className="hidden 2xl:block">
              <table className="w-full table-fixed text-left text-xs">
                <colgroup>
                  <col className="w-[11%]" />
                  <col className="w-[22%]" />
                  <col className="w-[10%]" />
                  <col className="w-[7%]" />
                  <col className="w-[9%]" />
                  <col className="w-[11%]" />
                  <col className="w-[10%]" />
                  <col className="w-[11%]" />
                  <col className="w-[9%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-border bg-canvas text-text-muted">
                    {[
                      "Payroll Reference",
                      "Payroll Type",
                      "Payroll Period",
                      "Fund",
                      "Employees Included",
                      "Net Payroll Total",
                      "Processing Stage",
                      "Last Updated",
                    ].map((item) => (
                      <th key={item} className="px-2 py-3 font-semibold">
                        {item}
                      </th>
                    ))}
                    <th className="px-2 py-3 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paging.visible.map((draft) => (
                    <tr key={draft.id}>
                      <td className="px-2 py-3 font-semibold">{draft.id}</td>
                      <td className="break-words px-2 py-3">
                        {draft.payrollTypeName}
                      </td>
                      <td className="px-2 py-3">{draft.period}</td>
                      <td className="px-2 py-3">{draft.fund}</td>
                      <td className="px-2 py-3">
                        {
                          draft.rows.filter(
                            (row) => row.calculationStatus === "Computed",
                          ).length
                        }
                      </td>
                      <td className="px-2 py-3 font-semibold tabular-nums">
                        {draft.finalNetPending
                          ? "Pending"
                          : draft.rows.length &&
                              draft.rows.every(
                                (row) => row.calculationStatus === "Computed",
                              )
                            ? peso.format(draftTotals(draft).net)
                            : "Not yet computed"}
                      </td>
                      <td className="px-2 py-3">
                        <StageBadge
                          stage={draft.stage}
                          label={draft.stageLabel}
                        />
                        {draft.currentApprovalHolder && (
                          <p className="mt-1 text-text-muted">
                            Holder: {draft.currentApprovalHolder}
                          </p>
                        )}
                        {draft.returnInfo && (
                          <p className="mt-1 text-text-muted">
                            {draft.returnInfo.office}
                            <br />
                            {dateTime.format(new Date(draft.returnInfo.at))}
                          </p>
                        )}
                      </td>
                      <td className="px-2 py-3">
                        {dateTime.format(new Date(draft.updatedAt))}
                      </td>
                      <td className="px-2 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-1">
                          <Button
                            type="button"
                            variant="link"
                            onClick={() => open(draft.id)}
                            className="text-xs"
                          >
                            View Payroll
                          </Button>
                          {onOpenComputation && (
                            <Button
                              type="button"
                              variant="link"
                              onClick={() => onOpenComputation(draft.id)}
                              className="text-xs"
                            >
                              View Computation
                            </Button>
                          )}
                          {draft.stage === "Draft" && (
                            <Button
                              type="button"
                              variant="link"
                              onClick={() => open(draft.id)}
                              className="text-xs"
                            >
                              Continue Editing
                            </Button>
                          )}
                          {draft.stage === "Returned" && (
                            <Button
                              type="button"
                              variant="link"
                              onClick={() => open(draft.id)}
                              className="text-xs"
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
              {paging.visible.map((draft) => (
                <li key={draft.id} className="p-5">
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <p className="font-semibold">{draft.id}</p>
                      <p className="mt-1 text-sm">{draft.payrollTypeName}</p>
                    </div>
                    <StageBadge stage={draft.stage} label={draft.stageLabel} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-3">
                    <DataPoint
                      label="Period / Fund"
                      value={`${draft.period} · ${draft.fund}`}
                    />
                    <DataPoint
                      label="Employees Included"
                      value={String(
                        draft.rows.filter(
                          (row) => row.calculationStatus === "Computed",
                        ).length,
                      )}
                    />
                    <DataPoint
                      label="Net Payroll Total"
                      value={
                        draft.rows.length && !draft.finalNetPending
                          ? peso.format(draftTotals(draft).net)
                          : draft.finalNetPending
                            ? "Pending"
                            : "Not yet computed"
                      }
                    />
                    <DataPoint
                      label="Last Updated"
                      value={dateTime.format(new Date(draft.updatedAt))}
                    />
                    {draft.currentApprovalHolder && (
                      <DataPoint
                        label="Current Holder"
                        value={draft.currentApprovalHolder}
                      />
                    )}
                    {draft.returnInfo && (
                      <DataPoint
                        label="Returned By / Date"
                        value={`${draft.returnInfo.office} · ${dateTime.format(new Date(draft.returnInfo.at))}`}
                      />
                    )}
                  </dl>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => open(draft.id)}
                    >
                      View Payroll
                    </Button>
                    {onOpenComputation && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => onOpenComputation(draft.id)}
                      >
                        View Computation
                      </Button>
                    )}
                    {draft.stage === "Draft" && (
                      <Button type="button" onClick={() => open(draft.id)}>
                        Continue Editing
                      </Button>
                    )}
                    {draft.stage === "Returned" && (
                      <Button type="button" onClick={() => open(draft.id)}>
                        Review Return
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <Pagination
              page={paging.page}
              pages={paging.pages}
              total={paging.total}
              size={paging.size}
              onPage={paging.setPage}
            />
          </>
        ) : (
          <EmptyState
            title={
              view === "drafts"
                ? "No payroll drafts have been created yet."
                : view === "approval"
                  ? "No payrolls are currently For Approval."
                  : view === "returned"
                    ? "No payrolls have been returned to Accounting."
                    : "No payroll history is available."
            }
            detail={
              query || type || period || fund || stage
                ? "No records match the current search or filters."
                : undefined
            }
            action={
              view === "drafts" &&
              !query &&
              !type &&
              !period &&
              !fund &&
              !stage ? (
                <Button
                  type="button"
                  onClick={() => {
                    setSetup({ payrollTypeId: "", fund: "", period: "" })
                    setScreen("create")
                  }}
                >
                  Create Payroll Draft
                </Button>
              ) : query || type || period || fund || stage ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={clearFilters}
                >
                  Clear Filters
                </Button>
              ) : undefined
            }
          />
        )}
      </section>
      <Alert tone="info" title="Accounting frontend prototype">
        Payroll drafts, computations, corrections, and workflow transitions are
        local demonstration records. Backend authorization, official rules,
        immutable audit logging, and office delivery are not implemented.
      </Alert>
    </div>
  )
}
