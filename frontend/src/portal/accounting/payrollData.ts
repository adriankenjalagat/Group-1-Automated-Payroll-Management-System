import type { HrEmployee, FundSource, PayBasis } from "../hr/hrData"
import type { AttendanceModuleState } from "../hr/attendanceData"
import type { TransmittalRecord } from "../hr/Transmittals"

export type PayrollStage = "Draft" | "For Approval" | "Returned" | "Completed"
export type CalculationStatus = "Computed" | "Blocked"

export type PayrollAdjustment = {
  id: string
  type: "Authorized one-time payment" | "Back pay" | "Salary adjustment"
  amount: number
  reason: string
  evidenceFilename: string
  recordedBy: string
  recordedAt: string
}

export type PayrollCorrection = {
  id: string
  employeeId: string
  action: string
  previousValue: string
  newValue: string
  reason: string
  evidenceReference?: string
  recordedBy: string
  recordedAt: string
}

export type PayrollRow = {
  employeeId: string
  employeeName: string
  classification: HrEmployee["classification"]
  employmentType: string
  office: string
  payrollTypeId: string
  payrollTypeName: string
  fund: FundSource
  payBasis: PayBasis
  sourceSubmissionId: string
  sourceTransmittalId: string
  applicableRate?: number
  verifiedDaysWorked?: number
  verifiedHoursWorked?: number
  attendanceSummary: string
  approvedAbsenceSummary: string
  basicPay?: number
  adjustments: PayrollAdjustment[]
  deductions: {
    id: string
    name: string
    basis: string
    amount: number
    explanation: string
  }[]
  calculationStatus: CalculationStatus
  limitation?: string
  computationExplanation: string
}

export type PayrollException = {
  id: string
  employeeId: string
  employeeName: string
  problemType: string
  explanation: string
  sourceModule: string
  nextAction: string
  blocksComputation: boolean
}

export type ApprovalEvent = {
  id: string
  stage: string
  holder: string
  at: string
  remarks?: string
}

export type ComputationEvent = {
  id: string
  at: string
  employeeId?: string
  action: string
  previousValue?: string
  newValue?: string
  reason: string
  recordedBy: string
  version: number
}

export type PayrollDraft = {
  id: string
  payrollTypeId: string
  payrollTypeName: string
  fund: FundSource
  period: string
  periodStart: string
  periodEnd: string
  rows: PayrollRow[]
  includedSubmissionIds: string[]
  exceptions: PayrollException[]
  stage: PayrollStage
  currentApprovalHolder?: string
  approvalRouteConfigured: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
  locked: boolean
  computationVersion: number
  corrections: PayrollCorrection[]
  approvalHistory: ApprovalEvent[]
  returnInfo?: {
    office: string
    remarks: string
    at: string
  }
  stageLabel?: string
  finalNetPending?: boolean
  approvalBlockReason?: string
  computationHistory?: ComputationEvent[]
}

/** Accounting source record derived from a transmitted snapshot or retained demonstration input. */
export type PayrollSource = {
  submissionId: string
  transmittalId: string
  employeeId: string
  payrollTypeId: string
  payrollTypeName: string
  fund: FundSource
  period: string
  periodStart: string
  periodEnd: string
  transmitted: boolean
  assignmentConfirmed: boolean
  applicableRate?: number
  verifiedDaysWorked?: number
  verifiedHoursWorked?: number
  attendanceReference?: string
  sourceNote: string
}

const demoDeduction = (employeeId: string, amount: number) => [
  {
    id: `DEMO-DED-${employeeId}`,
    name: "Demo Deduction — Not an Official Payroll Rule",
    basis: "Explicit fictional fixture value",
    amount,
    explanation:
      "Not SSS, Pag-IBIG, PhilHealth, income tax, or a university-authorized deduction. No contribution rate is inferred.",
  },
]

const jobOrderRow = (
  employeeId: string,
  employeeName: string,
  submissionId: string,
  days: number,
  rate: number,
  deduction: number,
  adjustment?: PayrollAdjustment,
): PayrollRow => ({
  employeeId,
  employeeName,
  classification: "Staff",
  employmentType: "Job Order",
  office: "Campus Services Unit (fictional)",
  payrollTypeId: "job-order-staff",
  payrollTypeName: "Payroll for Job Order Staff Employees",
  fund: "F05",
  payBasis: "Daily",
  sourceSubmissionId: submissionId,
  sourceTransmittalId: "DEMO-TR-2026-001",
  applicableRate: rate,
  verifiedDaysWorked: days,
  attendanceSummary: `${days} verified demonstration day${
    days === 1 ? "" : "s"
  } · DEMO-ATT-${employeeId.slice(-3)}. The source submission completed simulated Supervisor validation and HR verification before Transmitted status.`,
  approvedAbsenceSummary:
    "No approved absence is included in this isolated Payroll Management fixture.",
  basicPay: days * rate,
  adjustments: adjustment ? [adjustment] : [],
  deductions: demoDeduction(employeeId, deduction),
  calculationStatus: "Computed",
  computationExplanation: `Basic Pay = ${days} verified demo day${
    days === 1 ? "" : "s"
  } × ₱${rate.toFixed(2)} fictional daily rate. Sample arithmetic only.`,
})

const lecturerRow = (
  employeeId: string,
  employeeName: string,
  hours: number,
  rate: number,
): PayrollRow => ({
  employeeId,
  employeeName,
  classification: "Faculty",
  employmentType: "Lecturer",
  office: "Academic Unit A (fictional)",
  payrollTypeId: "lecturer-faculty",
  payrollTypeName: "Payroll for Lecturer Faculty Employees",
  fund: "F07",
  payBasis: "Hourly",
  sourceSubmissionId: `DEMO-SUB-${employeeId.slice(-3)}`,
  sourceTransmittalId: "DEMO-TR-2026-003",
  applicableRate: rate,
  verifiedHoursWorked: hours,
  attendanceSummary: `${hours} verified fictional teaching-load hours for UI testing.`,
  approvedAbsenceSummary:
    "Not applicable to this fictional hourly teaching-load example.",
  basicPay: hours * rate,
  adjustments: [],
  deductions: [],
  calculationStatus: "Computed",
  limitation:
    "Official deduction treatment is not configured; final net pay remains pending.",
  computationExplanation: `Basic Pay = ${hours} verified fictional hour${
    hours === 1 ? "" : "s"
  } × ₱${rate.toFixed(2)} fictional hourly rate.`,
})

const monthlyCandidate = (
  employeeId: string,
  employeeName: string,
): PayrollRow => ({
  employeeId,
  employeeName,
  classification: "Staff",
  employmentType: "Permanent",
  office: "Campus Administrative Services (fictional)",
  payrollTypeId: "permanent-staff",
  payrollTypeName: "Payroll for Permanent Staff Employees",
  fund: "F01",
  payBasis: "Monthly",
  sourceSubmissionId: `DEMO-SUB-${employeeId.slice(-3)}`,
  sourceTransmittalId: "DEMO-TR-2026-002",
  attendanceSummary:
    "Fictional attendance and appointment records are available for review; no deduction or rounding rule is applied.",
  approvedAbsenceSummary:
    "Pending review under unconfirmed monthly computation rules.",
  adjustments: [],
  deductions: [],
  calculationStatus: "Blocked",
  limitation: "Monthly computation rules require confirmation.",
  computationExplanation:
    "Monthly computation rules require confirmation. No monthly deduction, proration, or rounding formula has been invented.",
})

const jordanAdjustment: PayrollAdjustment = {
  id: "DEMO-ADJ-101",
  type: "Authorized one-time payment",
  amount: 250,
  reason: "Fictional approved adjustment used for prototype testing.",
  evidenceFilename:
    "DEMO-EVIDENCE-ADJ-101.pdf (fictional demonstration attachment)",
  recordedBy: "Fictional Accounting User",
  recordedAt: "2026-10-29T10:15:00+08:00",
}

const payrollARows = [
  jobOrderRow(
    "DEMO-EMP-101",
    "Jordan Dela Cruz",
    "DEMO-SUB-101",
    10,
    820,
    100,
    jordanAdjustment,
  ),
  jobOrderRow("DEMO-EMP-102", "Sam Flores", "DEMO-SUB-102", 9, 950, 200),
  jobOrderRow("DEMO-EMP-103", "Kim Navarro", "DEMO-SUB-103", 11, 780, 80),
  jobOrderRow("DEMO-EMP-104", "Avery Reyes", "DEMO-SUB-104", 8, 900, 0),
]

const rileyException: PayrollException = {
  id: "DEMO-EXC-105",
  employeeId: "DEMO-EMP-105",
  employeeName: "Riley Mendoza",
  problemType: "Missing verified attendance",
  explanation:
    "Verified attendance information is missing for the selected payroll period.",
  sourceModule: "Attendance & Leave",
  nextAction:
    "HR must verify attendance / days worked for the selected payroll period. Accounting cannot enter or bypass this requirement.",
  blocksComputation: true,
}

/** Isolated Accounting fixtures. They do not modify or claim synchronization with HR or Employee portal records. */
export const initialPayrollDrafts: PayrollDraft[] = [
  {
    id: "DEMO-PAY-2026-001",
    payrollTypeId: "job-order-staff",
    payrollTypeName: "Payroll for Job Order Staff Employees",
    fund: "F05",
    period: "October 16–31, 2026",
    periodStart: "2026-10-16",
    periodEnd: "2026-10-31",
    rows: payrollARows,
    includedSubmissionIds: payrollARows.map((row) => row.sourceSubmissionId),
    exceptions: [rileyException],
    stage: "Draft",
    approvalRouteConfigured: false,
    approvalBlockReason:
      "Mark for Approval is blocked because one employee has missing verified attendance and the required approval route is not configured.",
    createdBy: "Fictional Accounting User",
    createdAt: "2026-10-28T09:00:00+08:00",
    updatedAt: "2026-10-30T15:30:00+08:00",
    locked: false,
    computationVersion: 1,
    corrections: [],
    approvalHistory: [],
  },
  {
    id: "DEMO-PAY-2026-002",
    payrollTypeId: "permanent-staff",
    payrollTypeName: "Payroll for Permanent Staff Employees",
    fund: "F01",
    period: "October 2026",
    periodStart: "2026-10-01",
    periodEnd: "2026-10-31",
    rows: [
      monthlyCandidate("DEMO-EMP-201", "Morgan Castillo"),
      monthlyCandidate("DEMO-EMP-202", "Taylor Villanueva"),
    ],
    includedSubmissionIds: ["DEMO-SUB-201", "DEMO-SUB-202"],
    exceptions: [],
    stage: "Draft",
    stageLabel: "Draft — Requires Configuration",
    finalNetPending: true,
    approvalRouteConfigured: false,
    approvalBlockReason: "Monthly computation rules require confirmation.",
    createdBy: "Fictional Accounting User",
    createdAt: "2026-10-27T08:45:00+08:00",
    updatedAt: "2026-10-30T13:20:00+08:00",
    locked: false,
    computationVersion: 1,
    corrections: [],
    approvalHistory: [],
  },
  {
    id: "DEMO-PAY-2026-003",
    payrollTypeId: "lecturer-faculty",
    payrollTypeName: "Payroll for Lecturer Faculty Employees",
    fund: "F07",
    period: "October 2026",
    periodStart: "2026-10-01",
    periodEnd: "2026-10-31",
    rows: [
      lecturerRow("DEMO-EMP-301", "Leah Aquino", 16, 600),
      lecturerRow("DEMO-EMP-302", "Noel Bautista", 12, 750),
    ],
    includedSubmissionIds: ["DEMO-SUB-301", "DEMO-SUB-302"],
    exceptions: [],
    stage: "Draft",
    stageLabel: "Draft — Requires Review",
    finalNetPending: true,
    approvalRouteConfigured: false,
    approvalBlockReason:
      "Official deduction treatment and approval routing are not configured. Final net pay is pending.",
    createdBy: "Fictional Accounting User",
    createdAt: "2026-10-26T14:00:00+08:00",
    updatedAt: "2026-10-30T11:10:00+08:00",
    locked: false,
    computationVersion: 1,
    corrections: [],
    approvalHistory: [],
  },
  {
    id: "DEMO-PAY-2026-004",
    payrollTypeId: "job-order-staff",
    payrollTypeName: "Payroll for Job Order Staff Employees",
    fund: "F05",
    period: "October 1–15, 2026",
    periodStart: "2026-10-01",
    periodEnd: "2026-10-15",
    rows: [
      jobOrderRow(
        "DEMO-EMP-106",
        "Cameron Santiago",
        "DEMO-SUB-106",
        8,
        800,
        0,
      ),
    ],
    includedSubmissionIds: ["DEMO-SUB-106"],
    exceptions: [],
    stage: "Returned",
    stageLabel: "Returned — Demo Workflow Record",
    approvalRouteConfigured: false,
    approvalBlockReason:
      "The fictional return concern must be resolved and approval routing confirmed before resubmission.",
    createdBy: "Fictional Accounting User",
    createdAt: "2026-10-18T09:00:00+08:00",
    updatedAt: "2026-10-24T14:20:00+08:00",
    locked: false,
    computationVersion: 1,
    corrections: [],
    returnInfo: {
      office: "Fictional Cost Center Signatory role",
      remarks:
        "Please review the supporting record for the reported workdays of one included employee.",
      at: "2026-10-24T14:20:00+08:00",
    },
    approvalHistory: [
      {
        id: "DEMO-APPROVAL-004A",
        stage: "Submitted to demo workflow",
        holder: "Fictional Cost Center Signatory role",
        at: "2026-10-22T10:00:00+08:00",
        remarks:
          "Simulated routing event only; no real office approval occurred.",
      },
      {
        id: "DEMO-APPROVAL-004B",
        stage: "Returned for test correction",
        holder: "Accounting",
        at: "2026-10-24T14:20:00+08:00",
        remarks:
          "Please review the supporting record for the reported workdays of one included employee. Fictional test remark only.",
      },
    ],
  },
]

/** Retained isolated sources used by the create-draft workflow; no cross-portal synchronization is claimed. */
export const accountingDemoSources: PayrollSource[] = payrollARows.map(
  (row) => ({
    submissionId: row.sourceSubmissionId,
    transmittalId: row.sourceTransmittalId,
    employeeId: row.employeeId,
    payrollTypeId: row.payrollTypeId,
    payrollTypeName: row.payrollTypeName,
    fund: row.fund,
    period: "October 16–31, 2026",
    periodStart: "2026-10-16",
    periodEnd: "2026-10-31",
    transmitted: true,
    assignmentConfirmed: true,
    applicableRate: row.applicableRate,
    verifiedDaysWorked: row.verifiedDaysWorked,
    attendanceReference: `DEMO-ATT-${row.employeeId.slice(-3)}`,
    sourceNote:
      "Isolated fictional Payroll Management fixture. The source is described as Supervisor-validated, HR-verified, and Transmitted for UI testing only; no cross-portal synchronization is claimed.",
  }),
)

function periodDates(label: string) {
  const parsed = new Date(`${label} 1 00:00:00 UTC`)
  if (Number.isNaN(parsed.valueOf())) return { start: "", end: "" }
  const year = parsed.getUTCFullYear()
  const month = parsed.getUTCMonth()
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return {
    start: `${year}-${String(month + 1).padStart(2, "0")}-01`,
    end: `${year}-${String(month + 1).padStart(2, "0")}-${String(last).padStart(2, "0")}`,
  }
}

/** Shared HR transmittals become Accounting source records. Missing rates/rules stay missing. */
export function sourcesFromTransmittals(
  transmittals: TransmittalRecord[],
): PayrollSource[] {
  return transmittals.flatMap((transmittal) =>
    transmittal.included.map((item) => {
      const dates = periodDates(item.payrollPeriod)
      return {
        submissionId: item.submissionId,
        transmittalId: transmittal.id,
        employeeId: item.employeeId,
        payrollTypeId: item.payrollTypeId,
        payrollTypeName: item.payrollTypeName,
        fund: item.fund as FundSource,
        period: item.payrollPeriod,
        periodStart: dates.start,
        periodEnd: dates.end,
        transmitted: true,
        assignmentConfirmed: true,
        sourceNote:
          "Shared local HR transmittal snapshot. Payroll inputs remain subject to HR and rule configuration.",
      }
    }),
  )
}

export function rowTotals(row: PayrollRow) {
  const adjustments = row.adjustments.reduce(
    (sum, item) => sum + item.amount,
    0,
  )
  const basic = row.basicPay ?? 0
  const gross = basic + adjustments
  const deductions = row.deductions.reduce((sum, item) => sum + item.amount, 0)
  return { basic, adjustments, gross, deductions, net: gross - deductions }
}

export function draftTotals(draft: PayrollDraft) {
  return draft.rows
    .filter((row) => row.calculationStatus === "Computed")
    .reduce(
      (totals, row) => {
        const value = rowTotals(row)
        return {
          basic: totals.basic + value.basic,
          adjustments: totals.adjustments + value.adjustments,
          gross: totals.gross + value.gross,
          deductions: totals.deductions + value.deductions,
          net: totals.net + value.net,
        }
      },
      { basic: 0, adjustments: 0, gross: 0, deductions: 0, net: 0 },
    )
}

export function evaluateSource(
  source: PayrollSource,
  employees: HrEmployee[],
  attendance: AttendanceModuleState,
) {
  const employee = employees.find(
    (item) => item.employeeId === source.employeeId,
  )
  const problems: PayrollException[] = []
  const add = (
    type: string,
    explanation: string,
    module: string,
    nextAction: string,
  ) =>
    problems.push({
      id: `${source.submissionId}-${type}`,
      employeeId: source.employeeId,
      employeeName: employee?.name ?? source.employeeId,
      problemType: type,
      explanation,
      sourceModule: module,
      nextAction,
      blocksComputation: true,
    })
  if (!employee)
    add(
      "Missing employee record",
      "A matching HR-maintained employee record is unavailable.",
      "HR Employee Records",
      "Ask HR to review the employee record.",
    )
  if (
    employee &&
    (employee.employmentStatus !== "Active" ||
      employee.appointmentStart > source.periodEnd ||
      (employee.appointmentEnd && employee.appointmentEnd < source.periodStart))
  )
    add(
      "Invalid appointment dates",
      "The employee is not active for the selected payroll period.",
      "HR Employee Records",
      "Ask HR to verify appointment effective dates.",
    )
  if (!source.transmitted)
    add(
      "Submission not transmitted",
      "Only Transmitted submissions can enter Accounting payroll preparation.",
      "HR Transmittals",
      "Wait for HR electronic transmittal.",
    )
  if (
    !source.assignmentConfirmed ||
    (employee &&
      currentAssignmentId(employee) &&
      currentAssignmentId(employee) !== source.payrollTypeId)
  )
    add(
      "Inconsistent payroll assignment",
      "The payroll assignment does not match the selected payroll type.",
      "HR Employee Records",
      "Ask HR to verify the payroll assignment.",
    )
  if (
    employee &&
    employee.fundSource !== source.fund &&
    !source.sourceNote.includes("retained")
  )
    add(
      "Inconsistent payroll fund",
      "The employee fund does not match the transmitted payroll group.",
      "HR Employee Records",
      "Ask HR to verify the fund assignment.",
    )
  const payBasis = employee?.payBasis
  if (!source.applicableRate)
    add(
      "Missing applicable pay rate",
      "The employee's applicable payroll rate is missing. Review the HR-maintained appointment information.",
      "HR Employee Records",
      "Ask HR to record the authorized appointment rate.",
    )
  if (payBasis === "Daily" && source.verifiedDaysWorked === undefined)
    add(
      "Missing attendance input",
      "Verified days worked are unavailable for the selected payroll period.",
      "Attendance & Leave",
      "Ask HR to verify attendance days.",
    )
  if (payBasis === "Hourly" && source.verifiedHoursWorked === undefined)
    add(
      "Missing teaching-load information",
      "Verified hours or teaching load are unavailable.",
      "Attendance / Teaching Load",
      "Record verified hours in the responsible source module.",
    )
  if (payBasis === "Monthly")
    add(
      "Unconfirmed payroll calculation rules",
      "Monthly payroll computation requires confirmed payroll calculation rules.",
      "Administrator Payroll Configuration",
      "Configure monthly attendance, proration, and deduction rules.",
    )
  const currentAttendance =
    employee &&
    attendance.attendanceRecords.find(
      (record) =>
        record.employeeId === employee.employeeId &&
        record.period === source.period,
    )
  if (!source.attendanceReference && !currentAttendance)
    add(
      "Missing attendance record",
      "Verified attendance information is unavailable for the selected payroll period.",
      "Attendance & Leave",
      "Ask HR to provide verified attendance information.",
    )
  return { employee, problems }
}

function currentAssignmentId(employee: HrEmployee) {
  return employee.assignments.find((item) => item.status === "Active")
    ?.payrollTypeId
}
