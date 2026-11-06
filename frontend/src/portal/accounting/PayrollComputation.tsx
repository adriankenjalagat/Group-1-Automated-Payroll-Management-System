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
  draftTotals,
  rowTotals,
  type ComputationEvent,
  type PayrollAdjustment,
  type PayrollDraft,
  type PayrollException,
  type PayrollRow,
} from "./payrollData"

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
  month: "short",
  day: "numeric",
  timeZone: "UTC",
})
const formatDate = (value: string) =>
  value ? dateOnly.format(new Date(`${value}T00:00:00Z`)) : "Not recorded"

type Availability = "Computable" | "Missing Input" | "Configuration Required" | "Requires Review"

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

function availabilityFor(draft: PayrollDraft, row: PayrollRow): Availability {
  if (row.calculationStatus === "Blocked")
    return row.payBasis === "Monthly"
      ? "Configuration Required"
      : "Missing Input"
  if (draft.finalNetPending || row.limitation) return "Requires Review"
  return "Computable"
}

function AvailabilityBadge({ value }: { value: Availability }) {
  const tone =
    value === "Computable"
      ? "bg-success-soft text-success"
      : value === "Requires Review"
        ? "bg-warning-soft text-warning"
        : "bg-danger-soft text-danger"
  return (
    <span
      className={clsx(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        tone,
      )}
    >
      {value}
    </span>
  )
}

function stageLabel(draft: PayrollDraft) {
  if (draft.locked && draft.stage === "For Approval")
    return "For Approval / Locked"
  if (draft.locked && draft.stage === "Completed") return "Approved / Locked"
  if (draft.stage === "Returned") return "Returned for Correction"
  if (draft.stage === "Draft") return draft.stageLabel ?? "Editable Draft"
  return draft.stageLabel ?? draft.stage
}

function derivedExceptions(draft: PayrollDraft): PayrollException[] {
  const existingKeys = new Set(
    draft.exceptions.map((item) => `${item.employeeId}|${item.problemType}`),
  )
  const result = [...draft.exceptions]
  draft.rows.forEach((row) => {
    if (row.payBasis === "Monthly") {
      const item: PayrollException = {
        id: `${draft.id}-${row.employeeId}-monthly-rule`,
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        problemType: "Unconfirmed monthly computation formula",
        explanation: "Monthly attendance deduction rules require confirmation.",
        sourceModule: "Administrator Payroll Configuration",
        nextAction:
          "Configure the monthly attendance, proration, and rounding rules.",
        blocksComputation: true,
      }
      if (!existingKeys.has(`${item.employeeId}|${item.problemType}`))
        result.push(item)
    } else if (draft.finalNetPending && !row.deductions.length) {
      const item: PayrollException = {
        id: `${draft.id}-${row.employeeId}-deduction-rule`,
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        problemType: "Missing applicable deduction rule",
        explanation: "Applicable deduction rules have not been configured.",
        sourceModule: "Administrator Payroll Configuration",
        nextAction:
          "Confirm applicable deduction treatment before final net pay is calculated.",
        blocksComputation: true,
      }
      if (!existingKeys.has(`${item.employeeId}|${item.problemType}`))
        result.push(item)
    }
  })
  return result
}

function draftOption(draft: PayrollDraft) {
  const type = draft.payrollTypeName
    .replace("Payroll for ", "")
    .replace(" Employees", "")
  return `${draft.id} — ${type} — ${draft.period} — ${draft.fund}`
}

function initialHistory(draft: PayrollDraft): ComputationEvent[] {
  const stored = draft.computationHistory ?? []
  const hasStored = (action: string, employeeId: string) =>
    stored.some(
      (item) => item.action === action && item.employeeId === employeeId,
    )
  const seeded: ComputationEvent[] = [
    {
      id: `${draft.id}-initial`,
      at: draft.createdAt,
      action: "Initial Draft Computation",
      reason:
        "Initial local calculation from the stored fictional payroll inputs.",
      recordedBy: draft.createdBy,
      version: 1,
    },
  ]
  const adjustmentEvents = draft.rows.flatMap((row) =>
    hasStored("Adjustment Added", row.employeeId)
      ? []
      : row.adjustments.map((adjustment, index) => ({
          id: `${draft.id}-${adjustment.id}`,
          at: adjustment.recordedAt,
          employeeId: row.employeeId,
          action: "Adjustment Added",
          newValue: peso.format(adjustment.amount),
          reason: adjustment.reason,
          recordedBy: adjustment.recordedBy,
          version: Math.max(1, index + 1),
        })),
  )
  const correctionEvents = draft.corrections
    .filter((item) => !hasStored("Draft Entry Corrected", item.employeeId))
    .map((item, index) => ({
      id: `${draft.id}-${item.id}`,
      at: item.recordedAt,
      employeeId: item.employeeId,
      action: item.action,
      previousValue: item.previousValue,
      newValue: item.newValue,
      reason: item.reason,
      recordedBy: item.recordedBy,
      version: Math.max(1, draft.computationVersion - index),
    }))
  return [...seeded, ...adjustmentEvents, ...correctionEvents, ...stored].sort(
    (a, b) => b.at.localeCompare(a.at),
  )
}

function EmployeeComputation({
  draft,
  row,
  editable,
  onClose,
  onAdjust,
  onCorrect,
}: {
  draft: PayrollDraft
  row: PayrollRow
  editable: boolean
  onClose: () => void
  onAdjust: () => void
  onCorrect: () => void
}) {
  const totals = rowTotals(row)
  const pending = row.calculationStatus === "Blocked" || draft.finalNetPending
  const formula =
    row.payBasis === "Daily" &&
    row.verifiedDaysWorked !== undefined &&
    row.applicableRate !== undefined
      ? `${row.verifiedDaysWorked} × ${peso.format(row.applicableRate)} = ${peso.format(totals.basic)}`
      : row.payBasis === "Hourly" &&
          row.verifiedHoursWorked !== undefined &&
          row.applicableRate !== undefined
        ? `${row.verifiedHoursWorked} × ${peso.format(row.applicableRate)} = ${peso.format(totals.basic)}`
        : "Configuration Required"
  return (
    <Modal title="Employee Payroll Computation" onClose={onClose} wide>
      <p className="-mt-3 text-sm text-text-muted">
        Detailed calculation breakdown for the selected employee.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Tag kind="placeholder">Read-only source snapshot</Tag>
        <AvailabilityBadge value={availabilityFor(draft, row)} />
      </div>

      <section className="mt-6">
        <SectionTitle title="Employee Information" />
        <dl className="mt-3 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
          <DataPoint label="Employee Name" value={row.employeeName} />
          <DataPoint label="Employee ID" value={row.employeeId} />
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
          <DataPoint label="Cost Center / Office" value={row.office} />
          <DataPoint label="Pay Basis" value={row.payBasis} />
          <DataPoint label="Payroll Period" value={draft.period} />
        </dl>
      </section>

      <section className="mt-6">
        <SectionTitle title="Source Information" />
        <div className="mt-3 grid gap-4 rounded-control border border-border p-4">
          <dl className="grid gap-4 sm:grid-cols-2">
            <DataPoint
              label="HR Payroll Assignment"
              value={`${row.payrollTypeName} · Effective-date details not available in this isolated snapshot`}
            />
            <DataPoint
              label="Applicable Rate"
              value={
                row.applicableRate !== undefined
                  ? peso.format(row.applicableRate)
                  : "Applicable pay rate is missing."
              }
              muted={row.applicableRate === undefined}
            />
            <DataPoint
              label="Document Submission"
              value={`${row.sourceSubmissionId} · ${draft.period} · Status: Transmitted`}
            />
            <DataPoint
              label="Prior Verification"
              value="Simulated Supervisor validation and HR verification recorded in the payroll snapshot."
            />
            <DataPoint
              label="Attendance / Teaching Load"
              value={row.attendanceSummary}
            />
            <DataPoint
              label="Approved Leave / Travel / CTO"
              value={row.approvedAbsenceSummary}
            />
            <DataPoint
              label="Source Transmittal"
              value={row.sourceTransmittalId}
            />
          </dl>
          <p className="text-xs text-text-muted">
            Accounting cannot edit HR appointment, assignment, fund, rate, or
            attendance source records from this view.
          </p>
        </div>
      </section>

      <section className="mt-6">
        <SectionTitle title={`${row.payBasis} Pay Calculation`} />
        <dl className="mt-3 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
          {row.payBasis === "Daily" && (
            <>
              <DataPoint
                label="Daily Rate"
                value={
                  row.applicableRate !== undefined
                    ? peso.format(row.applicableRate)
                    : "Missing Input"
                }
              />
              <DataPoint
                label="Verified Days Worked"
                value={row.verifiedDaysWorked ?? "Missing Input"}
              />
              <DataPoint
                label="Basic Pay Formula"
                value="Verified Days Worked × Applicable Daily Rate"
              />
              <DataPoint label="Computed Basic Pay" value={formula} />
            </>
          )}
          {row.payBasis === "Hourly" && (
            <>
              <DataPoint
                label="Hourly Rate"
                value={
                  row.applicableRate !== undefined
                    ? peso.format(row.applicableRate)
                    : "Missing Input"
                }
              />
              <DataPoint
                label="Verified Teaching Hours / Load"
                value={row.verifiedHoursWorked ?? "Missing Input"}
              />
              <DataPoint
                label="Basic Pay Formula"
                value="Verified Hours × Applicable Hourly Rate"
              />
              <DataPoint label="Computed Basic Pay" value={formula} />
            </>
          )}
          {row.payBasis === "Monthly" && (
            <>
              <DataPoint
                label="Applicable Monthly Rate"
                value={
                  row.applicableRate !== undefined
                    ? peso.format(row.applicableRate)
                    : "Configuration Required"
                }
              />
              <DataPoint
                label="Appointment Effective Date"
                value="Not available in the isolated payroll snapshot"
                muted
              />
              <DataPoint
                label="Applicable Work Schedule"
                value="Configuration Required"
                muted
              />
              <DataPoint label="Lates" value="Rule not configured" muted />
              <DataPoint label="Absences" value="Rule not configured" muted />
              <DataPoint label="Undertime" value="Rule not configured" muted />
              <DataPoint
                label="Allowance Eligibility"
                value="Not established by the available source information"
                muted
              />
              <DataPoint
                label="Applicable Deduction Rules"
                value="Configuration Required"
                muted
              />
            </>
          )}
          <DataPoint
            label="Covered Payroll Period"
            value={`${formatDate(draft.periodStart)} to ${formatDate(draft.periodEnd)}`}
          />
        </dl>
        {row.payBasis === "Monthly" && (
          <div className="mt-3">
            <Alert tone="warning" title="Monthly formula pending">
              Monthly payroll computation requires confirmed Accounting
              calculation rules. No divisor, late percentage, undertime
              conversion, grace period, holiday treatment, or absence formula is
              assumed.
            </Alert>
          </div>
        )}
      </section>

      <section className="mt-6">
        <SectionTitle title="Earnings Breakdown" />
        <div className="mt-3 overflow-hidden rounded-control border border-border">
          <div className="hidden grid-cols-[1fr_1.2fr_0.7fr_1.2fr] gap-3 bg-canvas p-3 text-xs font-semibold text-text-muted sm:grid">
            <span>Earning Description</span>
            <span>Calculation Basis</span>
            <span className="text-right">Amount</span>
            <span>Source / Explanation</span>
          </div>
          <ul className="divide-y divide-border">
            <li className="grid gap-2 p-3 text-sm sm:grid-cols-[1fr_1.2fr_0.7fr_1.2fr]">
              <span className="font-medium">Basic Pay</span>
              <span className="text-text-muted">{formula}</span>
              <span className="font-semibold tabular-nums sm:text-right">
                {row.basicPay !== undefined
                  ? peso.format(row.basicPay)
                  : "Pending Calculation"}
              </span>
              <span className="text-text-muted">
                {row.computationExplanation}
              </span>
            </li>
            {row.adjustments.map((item) => (
              <li
                key={item.id}
                className="grid gap-2 p-3 text-sm sm:grid-cols-[1fr_1.2fr_0.7fr_1.2fr]"
              >
                <span className="font-medium">{item.type}</span>
                <span className="text-text-muted">{item.reason}</span>
                <span className="font-semibold tabular-nums sm:text-right">
                  {peso.format(item.amount)}
                </span>
                <span className="text-text-muted">
                  Evidence: {item.evidenceFilename}
                </span>
              </li>
            ))}
          </ul>
        </div>
        {row.payBasis === "Monthly" && (
          <p className="mt-3 text-xs text-text-muted">
            Monthly allowance, first-salary proration, and thirteenth-month pay
            are not calculated because eligibility and formulas are not
            confirmed for this record.
          </p>
        )}
      </section>

      <section className="mt-6">
        <SectionTitle title="Deductions Breakdown" />
        {row.deductions.length ? (
          <div className="mt-3 overflow-hidden rounded-control border border-border">
            <div className="hidden grid-cols-[1.2fr_1fr_0.8fr_0.8fr_1.4fr] gap-3 bg-canvas p-3 text-xs font-semibold text-text-muted sm:grid">
              <span>Deduction Type</span>
              <span>Applicable Basis</span>
              <span>Configured Rate / Amount</span>
              <span>Computed Deduction</span>
              <span>Explanation</span>
            </div>
            <ul className="divide-y divide-border">
              {row.deductions.map((item) => (
                <li
                  key={item.id}
                  className="grid gap-2 p-3 text-sm sm:grid-cols-[1.2fr_1fr_0.8fr_0.8fr_1.4fr]"
                >
                  <span className="font-medium">{item.name}</span>
                  <span className="text-text-muted">{item.basis}</span>
                  <span>Explicit demo amount</span>
                  <span className="font-semibold tabular-nums">
                    {peso.format(item.amount)}
                  </span>
                  <span className="text-text-muted">{item.explanation}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="mt-3">
            <Alert tone="warning" title="Deduction configuration unavailable">
              Applicable deduction rule has not been configured. This is not
              treated as a zero deduction.
            </Alert>
          </div>
        )}
      </section>

      <section className="mt-6">
        <SectionTitle title="Final Employee Calculation Summary" />
        <dl className="mt-3 grid gap-4 rounded-control bg-accent p-4 text-on-accent sm:grid-cols-5">
          <DataPoint
            label="Basic Pay"
            value={
              row.basicPay !== undefined
                ? peso.format(totals.basic)
                : "Pending Calculation"
            }
          />
          <DataPoint
            label="Other Earnings / Adjustments"
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
                : "Configuration Required"
            }
          />
          <DataPoint
            label="Net Pay"
            value={pending ? "Pending Calculation" : peso.format(totals.net)}
          />
        </dl>
        <div className="mt-4 rounded-control bg-canvas p-4">
          <p className="text-sm font-semibold">
            How This Amount Was Calculated
          </p>
          <p className="mt-1 text-sm text-text-muted">
            {row.computationExplanation}{" "}
            {pending
              ? "Final net pay remains pending until all applicable rules and inputs are confirmed."
              : `Gross pay of ${peso.format(totals.gross)} less recorded deductions of ${peso.format(totals.deductions)} produces sample net pay of ${peso.format(totals.net)}.`}
          </p>
        </div>
      </section>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
        {editable && (
          <>
            <Button type="button" variant="secondary" onClick={onCorrect}>
              Correct Entry
            </Button>
            <Button type="button" onClick={onAdjust}>
              Add Adjustment
            </Button>
          </>
        )}
      </div>
    </Modal>
  )
}

function AdjustmentForm({
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
  onSave: (adjustment: PayrollAdjustment, notes: string) => void
}) {
  const [type, setType] = useState<PayrollAdjustment["type"] | "">("")
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [evidence, setEvidence] = useState("")
  const [notes, setNotes] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const value = Number(amount)
    const next: Record<string, string> = {}
    if (!type) next.type = "Select an adjustment type."
    if (!amount || !Number.isFinite(value) || value <= 0)
      next.amount = "Enter a valid positive adjustment amount."
    if (!reason.trim())
      next.reason = "Please enter a reason for the adjustment."
    if (!evidence.trim())
      next.evidence = "Supporting evidence is required for this adjustment."
    setErrors(next)
    if (Object.keys(next).length) return
    onSave(
      {
        id: `DEMO-ADJ-${Date.now()}`,
        type: type as PayrollAdjustment["type"],
        amount: value,
        reason: reason.trim(),
        evidenceFilename: evidence.trim(),
        recordedBy: user,
        recordedAt: new Date().toISOString(),
      },
      notes.trim(),
    )
  }
  return (
    <Modal title="Add Payroll Adjustment" onClose={onClose}>
      <p className="-mt-3 text-sm text-text-muted">
        Record an authorized one-time payment or payroll adjustment for the
        selected employee.
      </p>
      <form onSubmit={submit} noValidate className="mt-5 grid gap-4">
        <dl className="grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
          <DataPoint label="Employee Name" value={row.employeeName} />
          <DataPoint label="Employee ID" value={row.employeeId} />
          <DataPoint label="Payroll Reference" value={draft.id} />
        </dl>
        <SelectField
          label="Adjustment Type"
          value={type}
          onChange={(event) =>
            setType(event.target.value as PayrollAdjustment["type"])
          }
          placeholder="Select adjustment type"
          error={errors.type}
          required
        >
          <option value="Authorized one-time payment">One-Time Payment</option>
          <option value="Back pay">Back Pay</option>
          <option value="Salary adjustment">Salary Adjustment</option>
        </SelectField>
        <TextField
          label="Adjustment Amount"
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          error={errors.amount}
          required
        />
        <TextField
          label="Reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Explain why this adjustment is necessary..."
          error={errors.reason}
          required
        />
        <TextField
          label="Supporting Evidence Reference"
          value={evidence}
          onChange={(event) => setEvidence(event.target.value)}
          placeholder="Enter a fictional attachment filename or reference"
          error={errors.evidence}
          hint="A supported fictional evidence reference is required."
          required
        />
        {evidence && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-control bg-canvas p-3 text-sm">
            <span>
              <span className="font-medium">Selected Filename:</span> {evidence}
              <span className="ml-2 text-success">Available</span>
            </span>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="link"
                onClick={() => setEvidence("")}
              >
                Replace File
              </Button>
              <Button
                type="button"
                variant="link"
                onClick={() => setEvidence("")}
              >
                Remove File
              </Button>
            </div>
          </div>
        )}
        <TextField
          label="Notes (optional)"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
        <Alert tone="warning" title="Demonstration entry only">
          Saving updates this shared local draft. It does not authorize an
          official payment or change any global payroll rule.
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

function CorrectionForm({
  draft,
  row,
  onClose,
  onSave,
}: {
  draft: PayrollDraft
  row: PayrollRow
  onClose: () => void
  onSave: (
    adjustmentId: string,
    amount: number,
    reason: string,
    evidence: string,
  ) => void
}) {
  const [entryId, setEntryId] = useState(row.adjustments[0]?.id ?? "")
  const selected = row.adjustments.find((item) => item.id === entryId)
  const [amount, setAmount] = useState(selected ? String(selected.amount) : "")
  const [reason, setReason] = useState("")
  const [evidence, setEvidence] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const nextValue = Number(amount)
  const preview =
    selected && Number.isFinite(nextValue)
      ? rowTotals({
          ...row,
          adjustments: row.adjustments.map((item) =>
            item.id === selected.id ? { ...item, amount: nextValue } : item,
          ),
        })
      : undefined
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const next: Record<string, string> = {}
    if (!selected) next.entry = "Select an Accounting-controlled entry."
    if (!amount || !Number.isFinite(nextValue) || nextValue < 0)
      next.amount = "Enter a valid corrected amount."
    if (!reason.trim()) next.reason = "Please explain the correction."
    if (!evidence.trim())
      next.evidence = "Supporting evidence is required for this correction."
    setErrors(next)
    if (!Object.keys(next).length)
      onSave(entryId, nextValue, reason.trim(), evidence.trim())
  }
  return (
    <Modal title="Correct Payroll Draft Entry" onClose={onClose}>
      <p className="-mt-3 text-sm text-text-muted">
        Correct an authorized draft entry and preserve the reason for the
        change.
      </p>
      <form onSubmit={submit} noValidate className="mt-5 grid gap-4">
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
              label="Entry to Correct"
              value={entryId}
              onChange={(event) => {
                const value = event.target.value
                setEntryId(value)
                setAmount(
                  String(
                    row.adjustments.find((item) => item.id === value)?.amount ??
                      "",
                  ),
                )
              }}
              error={errors.entry}
            >
              {row.adjustments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.type} · {peso.format(item.amount)}
                </option>
              ))}
            </SelectField>
            <TextField
              label="Current Value"
              value={selected ? peso.format(selected.amount) : ""}
              readOnly
            />
            <TextField
              label="Corrected Value"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              error={errors.amount}
              required
            />
            <TextField
              label="Correction Reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              error={errors.reason}
              placeholder="Please explain the correction."
              required
            />
            <TextField
              label="Supporting Evidence"
              value={evidence}
              onChange={(event) => setEvidence(event.target.value)}
              error={errors.evidence}
              required
            />
            <dl className="grid gap-4 rounded-control border border-border p-4 sm:grid-cols-2">
              <DataPoint
                label="Affected Gross Pay"
                value={preview ? peso.format(preview.gross) : "Enter a value"}
              />
              <DataPoint
                label="Affected Net Pay"
                value={preview ? peso.format(preview.net) : "Enter a value"}
              />
            </dl>
          </>
        ) : (
          <Alert tone="warning" title="No correctable Accounting entry">
            Only Accounting-controlled adjustments can be corrected here. This
            value is maintained by HR when the issue concerns classification,
            assignment, appointment rate, fund, employment dates, or verified
            attendance.
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

export function PayrollComputation({
  drafts,
  setDrafts,
  initialDraftId,
  user,
  onBack,
  onReview,
}: {
  drafts: PayrollDraft[]
  setDrafts: Dispatch<SetStateAction<PayrollDraft[]>>
  initialDraftId?: string | null
  user: string
  onBack: (draftId?: string) => void
  onReview: (draftId: string) => void
}) {
  const defaultId =
    (initialDraftId && drafts.some((draft) => draft.id === initialDraftId)
      ? initialDraftId
      : drafts.find((draft) => draft.id === "DEMO-PAY-2026-001")?.id) ??
    drafts[0]?.id ??
    ""
  const [selectedId, setSelectedId] = useState(defaultId)
  const [draftSearch, setDraftSearch] = useState("")
  const [query, setQuery] = useState("")
  const [basis, setBasis] = useState("")
  const [availability, setAvailability] = useState("")
  const [office, setOffice] = useState("")
  const [rowId, setRowId] = useState<string | null>(null)
  const [adjustId, setAdjustId] = useState<string | null>(null)
  const [correctId, setCorrectId] = useState<string | null>(null)
  const [issueId, setIssueId] = useState<string | null>(null)
  const [confirmRecompute, setConfirmRecompute] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [showHistory, setShowHistory] = useState(true)
  const [notice, setNotice] = useState("")
  const [noticeTone, setNoticeTone] = useState<"success" | "warning">("success")
  const draft = drafts.find((item) => item.id === selectedId)
  const options = drafts.filter(
    (item) =>
      !draftSearch.trim() ||
      draftOption(item).toLowerCase().includes(draftSearch.toLowerCase()),
  )
  const exceptions = useMemo(
    () => (draft ? derivedExceptions(draft) : []),
    [draft],
  )
  const pendingEmployees = draft
    ? exceptions.filter(
        (item) =>
          draft.exceptions.some((source) => source.id === item.id) ||
          draft.rows.some(
            (row) =>
              row.employeeId === item.employeeId &&
              row.calculationStatus === "Blocked",
          ),
      )
    : []
  const filteredRows = (draft?.rows ?? []).filter((row) => {
    const status = availabilityFor(draft!, row)
    return (
      (!query.trim() ||
        [row.employeeName, row.employeeId].some((value) =>
          value.toLowerCase().includes(query.trim().toLowerCase()),
        )) &&
      (!basis || row.payBasis === basis) &&
      (!availability || status === availability) &&
      (!office || row.office === office)
    )
  })
  const selectedRow = draft?.rows.find((row) => row.employeeId === rowId)
  const adjustmentRow = draft?.rows.find((row) => row.employeeId === adjustId)
  const correctionRow = draft?.rows.find((row) => row.employeeId === correctId)
  const selectedIssue = exceptions.find((item) => item.id === issueId)
  const editable =
    Boolean(draft) &&
    !draft!.locked &&
    (draft!.stage === "Draft" || draft!.stage === "Returned")
  const totals = draft ? draftTotals(draft) : undefined
  const history = draft ? initialHistory(draft) : []
  const updateDraft = (
    next: PayrollDraft,
    message: string,
    tone: "success" | "warning" = "success",
  ) => {
    setDrafts((current) =>
      current.map((item) => (item.id === next.id ? next : item)),
    )
    setNotice(message)
    setNoticeTone(tone)
  }
  const appendEvent = (
    current: PayrollDraft,
    event: Omit<ComputationEvent, "id" | "at" | "version">,
  ) => ({
    ...event,
    id: `DEMO-COMP-${Date.now()}`,
    at: new Date().toISOString(),
    version: current.computationVersion + 1,
  })
  const addAdjustment = (
    row: PayrollRow,
    adjustment: PayrollAdjustment,
    notes: string,
  ) => {
    if (!draft || !editable) return
    const next: PayrollDraft = {
      ...draft,
      rows: draft.rows.map((item) =>
        item.employeeId === row.employeeId
          ? { ...item, adjustments: [...item.adjustments, adjustment] }
          : item,
      ),
      updatedAt: adjustment.recordedAt,
      computationVersion: draft.computationVersion + 1,
      computationHistory: [
        ...(draft.computationHistory ?? []),
        appendEvent(draft, {
          employeeId: row.employeeId,
          action: "Adjustment Added",
          newValue: peso.format(adjustment.amount),
          reason: notes
            ? `${adjustment.reason} Notes: ${notes}`
            : adjustment.reason,
          recordedBy: user,
        }),
      ],
    }
    updateDraft(
      next,
      `Adjustment saved for ${row.employeeName}. Employee and payroll totals were recalculated.`,
    )
    setAdjustId(null)
    setRowId(null)
  }
  const correctEntry = (
    row: PayrollRow,
    adjustmentId: string,
    amount: number,
    reason: string,
    evidence: string,
  ) => {
    if (!draft || !editable) return
    const current = row.adjustments.find((item) => item.id === adjustmentId)
    if (!current) return
    const now = new Date().toISOString()
    const next: PayrollDraft = {
      ...draft,
      rows: draft.rows.map((item) =>
        item.employeeId === row.employeeId
          ? {
              ...item,
              adjustments: item.adjustments.map((adjustment) =>
                adjustment.id === adjustmentId
                  ? { ...adjustment, amount, evidenceFilename: evidence }
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
          evidenceReference: evidence,
          recordedBy: user,
          recordedAt: now,
        },
      ],
      updatedAt: now,
      computationVersion: draft.computationVersion + 1,
      computationHistory: [
        ...(draft.computationHistory ?? []),
        appendEvent(draft, {
          employeeId: row.employeeId,
          action: "Draft Entry Corrected",
          previousValue: peso.format(current.amount),
          newValue: peso.format(amount),
          reason,
          recordedBy: user,
        }),
      ],
    }
    updateDraft(
      next,
      `The Accounting-controlled entry for ${row.employeeName} was corrected and totals were refreshed.`,
    )
    setCorrectId(null)
    setRowId(null)
  }
  const recompute = () => {
    if (!draft || !editable) return
    const now = new Date().toISOString()
    const nextRows = draft.rows.map((row) => {
      const basic =
        row.payBasis === "Daily" &&
        row.applicableRate !== undefined &&
        row.verifiedDaysWorked !== undefined
          ? row.applicableRate * row.verifiedDaysWorked
          : row.payBasis === "Hourly" &&
              row.applicableRate !== undefined &&
              row.verifiedHoursWorked !== undefined
            ? row.applicableRate * row.verifiedHoursWorked
            : row.basicPay
      return { ...row, basicPay: basic }
    })
    const next: PayrollDraft = {
      ...draft,
      rows: nextRows,
      updatedAt: now,
      computationVersion: draft.computationVersion + 1,
      computationHistory: [
        ...(draft.computationHistory ?? []),
        appendEvent(draft, {
          action:
            draft.stage === "Returned"
              ? "Returned Payroll Recomputed"
              : "Payroll Recomputed",
          reason:
            "Recalculated supported amounts from current stored rates, verified days or hours, adjustments, and explicit deductions. Unresolved rules remain pending.",
          recordedBy: user,
        }),
      ],
    }
    updateDraft(
      next,
      exceptions.length
        ? "Supported amounts were recomputed. Some payroll amounts remain blocked; existing valid records and history were preserved."
        : "Payroll amounts were recomputed from the current supported inputs.",
      exceptions.length ? "warning" : "success",
    )
    setConfirmRecompute(false)
  }
  const clearFilters = () => {
    setQuery("")
    setBasis("")
    setAvailability("")
    setOffice("")
  }
  const validationFailures = draft
    ? [
        [draft.rows.length > 0, "Required employee records must exist."],
        [
          draft.includedSubmissionIds.length === draft.rows.length,
          "Included submissions must be represented by Transmitted source references.",
        ],
        [
          draft.rows.every((row) => row.applicableRate !== undefined),
          "Applicable rate information must be available.",
        ],
        [
          draft.rows.every((row) => row.calculationStatus === "Computed"),
          "All included employees need complete computation inputs.",
        ],
        [
          !draft.finalNetPending,
          "Applicable deduction treatment must be configured.",
        ],
        [
          !draft.rows.some((row) =>
            row.deductions.some((item) => item.name.includes("Demo Deduction")),
          ),
          "Fictional demo deductions cannot satisfy production-readiness checks.",
        ],
        [
          exceptions.length === 0,
          "Blocking payroll exceptions must be resolved.",
        ],
        [
          draft.rows.every((row) => rowTotals(row).net >= 0),
          "Gross and net pay must reconcile.",
        ],
        [
          draft.approvalRouteConfigured,
          "The required approval route must be configured.",
        ],
      ]
        .filter(([passed]) => !passed)
        .map(([, message]) => String(message))
    : []

  if (!draft) {
    return (
      <div className="grid gap-6">
        <div>
          <p
            id="page-title"
            role="heading"
            aria-level={1}
            className="text-2xl font-semibold sm:text-3xl"
          >
            Payroll Computation
          </p>
          <p className="mt-2 text-sm text-text-muted">
            Review employee earnings, deductions, adjustments, and computed
            payroll amounts.
          </p>
        </div>
        <Alert tone="warning" title="No payroll selected">
          Select an existing payroll draft to view its computations.
        </Alert>
        <Button type="button" variant="secondary" onClick={() => onBack()}>
          <Icon name="arrowLeft" size={16} />
          Back to Payroll Management
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-6 font-sans">
        <div>
          <Button
            type="button"
            variant="link"
            onClick={() => onBack(draft.id)}
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
                Payroll Computation
              </p>
              <p className="mt-2 text-sm text-text-muted">
                Review employee earnings, deductions, adjustments, and computed
                payroll amounts.
              </p>
            </div>
            <Tag kind="simulated">Frontend demonstration</Tag>
          </div>
        </div>

        {notice && (
          <Alert tone={noticeTone} title="Payroll draft updated">
            {notice}
          </Alert>
        )}
        {draft.locked && (
          <Alert tone="warning" title="Locked payroll">
            This payroll is locked and cannot be edited unless returned through
            the authorized workflow. Calculations, deductions, and history
            remain available for review.
          </Alert>
        )}
        {draft.returnInfo && (
          <Alert tone="warning" title="Returned for correction">
            {draft.returnInfo.remarks} This is a fictional workflow remark and
            not an official university approval decision.
          </Alert>
        )}

        <section className="rounded-card bg-surface p-5 elevate sm:p-6">
          <SectionTitle
            title="Selected Payroll Draft"
            description="Choose an existing shared payroll record. Selecting an option does not create a new draft."
          />
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <TextField
              label="Search Payroll Drafts"
              icon="search"
              value={draftSearch}
              onChange={(event) => setDraftSearch(event.target.value)}
              placeholder="Search reference, type, period, or fund..."
            />
            <SelectField
              label="Payroll Draft"
              value={selectedId}
              onChange={(event) => {
                setSelectedId(event.target.value)
                setNotice("")
                clearFilters()
              }}
              hint={`${options.length} matching existing payroll record${
                options.length === 1 ? "" : "s"
              }`}
            >
              {options.map((item) => (
                <option key={item.id} value={item.id}>
                  {draftOption(item)}
                </option>
              ))}
            </SelectField>
          </div>
        </section>

        <section className="rounded-card bg-surface p-5 elevate">
          <SectionTitle title="Payroll Information" />
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DataPoint label="Payroll Reference" value={draft.id} />
            <DataPoint label="Payroll Type" value={draft.payrollTypeName} />
            <DataPoint label="Payroll Period" value={draft.period} />
            <DataPoint label="Fund Source" value={draft.fund} />
            <DataPoint label="Processing Stage" value={stageLabel(draft)} />
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
                new Set(pendingEmployees.map((item) => item.employeeId)).size,
              )}
            />
            <DataPoint
              label="Applicable Pay Basis / Bases"
              value={[...new Set(draft.rows.map((row) => row.payBasis))].join(
                ", ",
              )}
            />
            <DataPoint
              label="Last Computation Date"
              value={dateTime.format(new Date(draft.updatedAt))}
            />
            <DataPoint
              label="Calculation Version"
              value={`Version ${draft.computationVersion}`}
            />
          </dl>
        </section>

        <section>
          <SectionTitle title="Financial Summary" />
          <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {[
              ["Total Basic Pay", totals!.basic, false],
              [
                "Total Other Earnings / Adjustments",
                totals!.adjustments,
                false,
              ],
              ["Total Gross Pay", totals!.gross, false],
              ["Total Deductions", totals!.deductions, draft.finalNetPending],
              ["Total Net Pay", totals!.net, draft.finalNetPending],
            ].map(([label, amount, pending]) => (
              <div
                key={String(label)}
                className="rounded-card bg-surface p-5 elevate"
              >
                <p className="text-xs font-medium text-text-muted">{label}</p>
                <p className="mt-2 text-xl font-bold tabular-nums">
                  {draft.rows.some(
                    (row) => row.calculationStatus === "Blocked",
                  ) || pending
                    ? "Pending Calculation"
                    : peso.format(Number(amount))}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-text-muted">
            Total Gross Pay = Basic Pay + Applicable Other Earnings. Total Net
            Pay = Total Gross Pay − Applicable Deductions. These reconciliation
            relationships do not replace detailed official payroll rules.
          </p>
        </section>

        <section
          aria-label="Payroll computation exceptions"
          className="overflow-hidden rounded-card bg-surface elevate"
        >
          <div className="border-b border-border p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <SectionTitle
                title="Employee Payroll Computations"
                description="Review the calculated payroll amounts for each included employee."
              />
              {editable && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setConfirmRecompute(true)}
                >
                  Recompute Payroll
                </Button>
              )}
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <TextField
                label="Search Employee"
                icon="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by employee name or employee ID..."
              />
              <SelectField
                label="Pay Basis"
                value={basis}
                onChange={(event) => setBasis(event.target.value)}
                placeholder="All"
              >
                <option value="Monthly">Monthly</option>
                <option value="Daily">Daily</option>
                <option value="Hourly">Hourly</option>
              </SelectField>
              <SelectField
                label="Calculation Availability"
                value={availability}
                onChange={(event) => setAvailability(event.target.value)}
                placeholder="All"
              >
                <option value="Computable">Computable</option>
                <option value="Missing Input">Missing Input</option>
                <option value="Configuration Required">
                  Configuration Required
                </option>
                <option value="Requires Review">Requires Review</option>
              </SelectField>
              <SelectField
                label="Cost Center"
                value={office}
                onChange={(event) => setOffice(event.target.value)}
                placeholder="All"
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
                onClick={clearFilters}
                disabled={!query && !basis && !availability && !office}
              >
                Clear Filters
              </Button>
            </div>
          </div>
          {!draft.rows.length ? (
            <p className="p-8 text-center text-sm text-text-muted">
              No employees are available in this payroll draft.
            </p>
          ) : filteredRows.length ? (
            <>
              <div className="hidden xl:block">
                <table className="w-full table-fixed text-left text-xs">
                  <colgroup>
                    <col className="w-[17%]" />
                    <col className="w-[8%]" />
                    <col className="w-[10%]" />
                    <col className="w-[10%]" />
                    <col className="w-[10%]" />
                    <col className="w-[10%]" />
                    <col className="w-[10%]" />
                    <col className="w-[12%]" />
                    <col className="w-[13%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-border bg-canvas text-text-muted">
                      {[
                        "Employee Name / ID",
                        "Pay Basis",
                        "Basic Pay",
                        "Other Earnings",
                        "Gross Pay",
                        "Total Deductions",
                        "Net Pay",
                        "Calculation Availability",
                      ].map((label) => (
                        <th key={label} className="px-2 py-3 font-semibold">
                          {label}
                        </th>
                      ))}
                      <th className="px-2 py-3 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredRows.map((row) => {
                      const value = rowTotals(row)
                      const pending =
                        row.calculationStatus === "Blocked" ||
                        draft.finalNetPending
                      return (
                        <tr key={row.employeeId}>
                          <td className="px-2 py-3">
                            <p className="font-semibold">{row.employeeName}</p>
                            <p className="text-text-muted">{row.employeeId}</p>
                          </td>
                          <td className="px-2 py-3">{row.payBasis}</td>
                          <td className="px-2 py-3 tabular-nums">
                            {row.basicPay !== undefined
                              ? peso.format(value.basic)
                              : "Pending"}
                          </td>
                          <td className="px-2 py-3 tabular-nums">
                            {row.calculationStatus === "Computed"
                              ? peso.format(value.adjustments)
                              : "Pending"}
                          </td>
                          <td className="px-2 py-3 tabular-nums">
                            {row.calculationStatus === "Computed"
                              ? peso.format(value.gross)
                              : "Pending"}
                          </td>
                          <td className="px-2 py-3 tabular-nums">
                            {row.deductions.length
                              ? peso.format(value.deductions)
                              : "Configuration Required"}
                          </td>
                          <td className="px-2 py-3 font-semibold tabular-nums">
                            {pending ? "Pending" : peso.format(value.net)}
                          </td>
                          <td className="px-2 py-3">
                            <AvailabilityBadge
                              value={availabilityFor(draft, row)}
                            />
                          </td>
                          <td className="px-2 py-3">
                            <div className="flex flex-wrap justify-end gap-1">
                              <Button
                                type="button"
                                variant="link"
                                className="text-xs"
                                onClick={() => setRowId(row.employeeId)}
                              >
                                View Computation
                              </Button>
                              {editable && (
                                <>
                                  <Button
                                    type="button"
                                    variant="link"
                                    className="text-xs"
                                    onClick={() => setAdjustId(row.employeeId)}
                                  >
                                    Add Adjustment
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="link"
                                    className="text-xs"
                                    onClick={() => setCorrectId(row.employeeId)}
                                  >
                                    Correct Entry
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
                {filteredRows.map((row) => {
                  const value = rowTotals(row)
                  const pending =
                    row.calculationStatus === "Blocked" || draft.finalNetPending
                  return (
                    <li key={row.employeeId} className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{row.employeeName}</p>
                          <p className="text-xs text-text-muted">
                            {row.employeeId} · {row.payBasis}
                          </p>
                        </div>
                        <AvailabilityBadge
                          value={availabilityFor(draft, row)}
                        />
                      </div>
                      <dl className="mt-4 grid grid-cols-2 gap-3">
                        <DataPoint
                          label="Basic Pay"
                          value={
                            row.basicPay !== undefined
                              ? peso.format(value.basic)
                              : "Pending"
                          }
                        />
                        <DataPoint
                          label="Gross Pay"
                          value={
                            row.calculationStatus === "Computed"
                              ? peso.format(value.gross)
                              : "Pending"
                          }
                        />
                        <DataPoint
                          label="Total Deductions"
                          value={
                            row.deductions.length
                              ? peso.format(value.deductions)
                              : "Configuration Required"
                          }
                        />
                        <DataPoint
                          label="Net Pay"
                          value={pending ? "Pending" : peso.format(value.net)}
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
                              Correct Entry
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
            <div className="p-8 text-center">
              <p className="text-sm font-medium">
                No employee computations match the selected filters.
              </p>
              <Button
                type="button"
                variant="secondary"
                onClick={clearFilters}
                className="mt-4"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-card bg-surface elevate">
          <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-start sm:justify-between">
            <SectionTitle
              title="Payroll Exceptions"
              description="Employees or calculations requiring correction or additional information."
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setNotice(
                  "Available shared local records were rechecked. Unresolved source and configuration requirements remain listed.",
                )
                setNoticeTone("warning")
              }}
            >
              Refresh Source Data
            </Button>
          </div>
          {exceptions.length ? (
            <ul className="divide-y divide-border">
              {exceptions.map((item) => (
                <li
                  key={item.id}
                  className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4"
                >
                  <DataPoint
                    label="Employee Name / ID"
                    value={`${item.employeeName} (${item.employeeId})`}
                  />
                  <DataPoint
                    label="Payroll Input / Rule"
                    value={item.problemType}
                  />
                  <DataPoint
                    label="Issue / Source / Effect"
                    value={`${item.explanation} · ${item.sourceModule} · ${
                      item.blocksComputation
                        ? "Blocks final computation"
                        : "Requires review"
                    }`}
                  />
                  <div className="flex flex-wrap items-start justify-end gap-2">
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => setIssueId(item.id)}
                    >
                      View Issue
                    </Button>
                    {draft.rows.some(
                      (row) => row.employeeId === item.employeeId,
                    ) && (
                      <Button
                        type="button"
                        variant="link"
                        onClick={() => setRowId(item.employeeId)}
                      >
                        View Computation
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-5 text-sm text-text-muted">
              No payroll computation exceptions found.
            </p>
          )}
        </section>

        <section className="overflow-hidden rounded-card bg-surface elevate">
          <div className="border-b border-border p-5">
            <SectionTitle
              title="Excluded / Pending Employees"
              description="Employees missing required inputs are not included in payable payroll totals."
            />
          </div>
          {pendingEmployees.length ? (
            <ul className="divide-y divide-border">
              {pendingEmployees.map((item) => (
                <li
                  key={item.id}
                  className="grid gap-3 p-5 sm:grid-cols-3 sm:items-center"
                >
                  <DataPoint
                    label="Employee"
                    value={`${item.employeeName} (${item.employeeId})`}
                  />
                  <DataPoint
                    label="Missing Information"
                    value={
                      item.employeeId === "DEMO-EMP-105"
                        ? "Verified attendance information is missing for the selected payroll period."
                        : item.explanation
                    }
                  />
                  <div className="sm:text-right">
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => setIssueId(item.id)}
                    >
                      View Issue
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-5 text-sm text-text-muted">
              No excluded or pending employees are recorded for this payroll.
            </p>
          )}
        </section>

        {draft.rows.some((row) => row.adjustments.length > 0) && (
          <section className="rounded-card bg-surface p-5 elevate">
            <SectionTitle
              title="Adjustment History"
              description="Recorded Accounting-controlled earnings entries for this shared local draft."
            />
            <ul className="mt-4 grid gap-3">
              {draft.rows.flatMap((row) =>
                row.adjustments.map((item) => (
                  <li key={item.id} className="rounded-control bg-canvas p-4">
                    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <DataPoint
                        label="Employee"
                        value={`${row.employeeName} (${row.employeeId})`}
                      />
                      <DataPoint label="Adjustment Type" value={item.type} />
                      <DataPoint
                        label="Amount"
                        value={peso.format(item.amount)}
                      />
                      <DataPoint label="Reason" value={item.reason} />
                      <DataPoint
                        label="Evidence Reference"
                        value={item.evidenceFilename}
                      />
                      <DataPoint
                        label="Recorded User"
                        value={item.recordedBy}
                      />
                      <DataPoint
                        label="Recorded Time"
                        value={dateTime.format(new Date(item.recordedAt))}
                      />
                      <DataPoint
                        label="Related Computation Version"
                        value={`Version ${draft.computationVersion}`}
                      />
                    </dl>
                  </li>
                )),
              )}
            </ul>
          </section>
        )}

        <section className="rounded-card bg-surface elevate">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowHistory((value) => !value)}
            aria-expanded={showHistory}
            className="h-auto w-full justify-between rounded-card border-0 p-5 shadow-none"
          >
            <span className="text-left">
              <span className="block font-semibold">Computation History</span>
              <span className="mt-1 block text-xs font-normal text-text-muted">
                {history.length} recorded local event
                {history.length === 1 ? "" : "s"}
              </span>
            </span>
            <Icon
              name="chevronDown"
              size={17}
              className={clsx(showHistory && "rotate-180")}
            />
          </Button>
          {showHistory && (
            <div className="border-t border-border p-5">
              <ul className="grid gap-3">
                {history.map((event) => (
                  <li key={event.id} className="rounded-control bg-canvas p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-sm font-semibold">{event.action}</p>
                      <span className="text-xs text-text-muted">
                        Version {event.version}
                      </span>
                    </div>
                    <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <DataPoint
                        label="Computation Date / Time"
                        value={dateTime.format(new Date(event.at))}
                      />
                      <DataPoint label="Payroll Reference" value={draft.id} />
                      <DataPoint
                        label="Affected Employee"
                        value={event.employeeId ?? "Entire payroll"}
                      />
                      <DataPoint
                        label="Previous / New Value"
                        value={`${event.previousValue ?? "Not applicable"} → ${event.newValue ?? "Not applicable"}`}
                      />
                      <DataPoint label="Reason" value={event.reason} />
                      <DataPoint
                        label="Recorded User"
                        value={event.recordedBy}
                      />
                    </dl>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-text-muted">
                Read-only local demonstration history. This is not a production
                immutable audit log.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-card bg-surface p-5 elevate">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Final Payroll Validation</p>
              <p className="mt-1 text-sm text-text-muted">
                Review readiness before opening the existing final-review
                workflow. This action does not approve payroll.
              </p>
            </div>
            <Button type="button" onClick={() => setReviewing(true)}>
              Review for Approval
            </Button>
          </div>
        </section>

        <Alert tone="info" title="Frontend computation prototype">
          Payroll calculations, corrections, attachments, history, and workflow
          handoffs are shared local demonstration state only. No backend,
          statutory formula service, official authorization, bank processing,
          payment release, or payslip publication is implemented.
        </Alert>
      </div>

      {selectedRow && (
        <EmployeeComputation
          draft={draft}
          row={selectedRow}
          editable={editable}
          onClose={() => setRowId(null)}
          onAdjust={() => {
            setAdjustId(selectedRow.employeeId)
            setRowId(null)
          }}
          onCorrect={() => {
            setCorrectId(selectedRow.employeeId)
            setRowId(null)
          }}
        />
      )}
      {adjustmentRow && (
        <AdjustmentForm
          draft={draft}
          row={adjustmentRow}
          user={user}
          onClose={() => setAdjustId(null)}
          onSave={(adjustment, notes) =>
            addAdjustment(adjustmentRow, adjustment, notes)
          }
        />
      )}
      {correctionRow && (
        <CorrectionForm
          draft={draft}
          row={correctionRow}
          onClose={() => setCorrectId(null)}
          onSave={(entryId, amount, reason, evidence) =>
            correctEntry(correctionRow, entryId, amount, reason, evidence)
          }
        />
      )}
      {selectedIssue && (
        <Modal
          title="Payroll Computation Issue"
          onClose={() => setIssueId(null)}
        >
          <dl className="grid gap-4 rounded-control bg-canvas p-4">
            <DataPoint
              label="Employee"
              value={`${selectedIssue.employeeName} (${selectedIssue.employeeId})`}
            />
            <DataPoint
              label="Payroll Input / Rule"
              value={selectedIssue.problemType}
            />
            <DataPoint
              label="Issue Description"
              value={selectedIssue.explanation}
            />
            <DataPoint
              label="Source Office / Information"
              value={selectedIssue.sourceModule}
            />
            <DataPoint
              label="Effect on Computation"
              value={
                selectedIssue.blocksComputation
                  ? "Blocks final payroll computation"
                  : "Requires review"
              }
            />
            <DataPoint
              label="Required Next Action"
              value={selectedIssue.nextAction}
            />
          </dl>
          <p className="mt-4 text-xs text-text-muted">
            This issue cannot be bypassed or manually marked resolved by
            Accounting. Correct the authoritative source or configuration.
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
      {confirmRecompute && (
        <Modal
          title="Recompute Payroll?"
          onClose={() => setConfirmRecompute(false)}
        >
          <p className="text-sm leading-relaxed">
            This action will recalculate the editable payroll using the current
            applicable source information and configured rules.
          </p>
          {exceptions.length > 0 && (
            <div className="mt-4">
              <Alert tone="warning" title="Partial computation expected">
                Unsupported amounts will remain pending. Existing valid evidence
                and history will be preserved.
              </Alert>
            </div>
          )}
          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConfirmRecompute(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={recompute}>
              Confirm Recompute
            </Button>
          </div>
        </Modal>
      )}
      {reviewing && (
        <Modal
          title={
            validationFailures.length
              ? "Payroll Not Ready for Approval"
              : "Payroll Ready for Final Review"
          }
          onClose={() => setReviewing(false)}
          wide
        >
          {validationFailures.length ? (
            <>
              <Alert tone="danger" title="Unresolved requirements">
                This payroll was not marked For Approval.
              </Alert>
              <ul className="mt-4 grid gap-2">
                {validationFailures.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-danger"
                  >
                    <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setReviewing(false)}
                >
                  Return to Computation
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setReviewing(false)
                    document
                      .querySelector(
                        '[aria-label="Payroll computation exceptions"]',
                      )
                      ?.scrollIntoView({ behavior: "smooth" })
                  }}
                >
                  View Exceptions
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-text-muted">
                Continue to the existing Payroll Management final-review
                workflow for {draft.id}. No approval decision occurs here.
              </p>
              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setReviewing(false)}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={() => onReview(draft.id)}>
                  Open Final Review
                </Button>
              </div>
            </>
          )}
        </Modal>
      )}
    </>
  )
}
