// Configuration-driven model for the New Submission form.
//
// The form renders whatever a payroll-type configuration declares. To support another of the
// reference payroll types later, add an entry to `payrollTypeConfigs`; no form code changes are needed.
// Only requirements that have been confirmed from the official procedure are declared here.
// Do NOT add invented checklists for unverified payroll types.
//
// Notes for future configurations (not implemented here because they are unconfirmed):
//  - Staff payroll types use a DTR where the confirmed procedure requires it.
//  - Faculty payroll types use an FSR where the confirmed procedure requires it.
//  - Job Order Faculty DTR-versus-FSR applicability is unresolved. Declare it with
//    `confirmation: 'pending-confirmation'` until the authorized office decides.
//  - Incentive and paid-overtime payrolls have no confirmed document requirements yet.

/** A configured payroll period. A missing opens/deadline means the schedule is not yet configured. */
export type PeriodSchedule = { label: string; opens?: string; deadline?: string }

export type CircumstanceId = 'travel' | 'leave' | 'cto'

export type DocumentRequirement = {
  id: string
  name: string
  description: string
  /** mandatory: always applicable. conditional: applicable only when `trigger` is selected. */
  applicability: 'mandatory' | 'conditional'
  trigger?: CircumstanceId
  /** pending-confirmation items are shown to the employee but never counted as missing. */
  confirmation: 'confirmed' | 'pending-confirmation'
  /** Optional extra instructions displayed with the item. */
  instructions?: string
}

export type PayrollTypeConfig = {
  id: string
  name: string
  classification: 'Staff' | 'Faculty'
  /** Payroll periods configured for this payroll type, with an optional submission schedule. */
  periods: PeriodSchedule[]
  /** Circumstances the employee may indicate for the selected period. */
  circumstances: CircumstanceId[]
  documents: DocumentRequirement[]
}

export const circumstanceLabels: Record<CircumstanceId, string> = {
  travel: 'Official Travel',
  leave: 'Leave of Absence',
  cto: 'Compensatory Time-Off (CTO)',
}

export const payrollTypeConfigs: Record<string, PayrollTypeConfig> = {
  'permanent-staff': {
    id: 'permanent-staff',
    name: 'Payroll for Permanent Staff Employees',
    classification: 'Staff',
    // Fictional configured schedule. Permanent staff attendance for a period is submitted in the
    // following month, so each window opens in the month after the period ends. A period with no
    // dates shows the "not yet configured" state.
    periods: [
      { label: 'July 2026', opens: '2026-08-01', deadline: '2026-08-15' },
      { label: 'August 2026', opens: '2026-09-01', deadline: '2026-09-15' },
      { label: 'September 2026', opens: '2026-10-01', deadline: '2026-10-15' },
      { label: 'October 2026', opens: '2026-11-01', deadline: '2026-11-15' },
      { label: 'November 2026', opens: '2026-12-01', deadline: '2026-12-15' },
      { label: 'December 2026', opens: '2027-01-01', deadline: '2027-01-15' },
    ],
    circumstances: ['travel', 'leave', 'cto'],
    documents: [
      {
        id: 'dtr',
        name: 'Daily Time Record (DTR)',
        description: 'Your signed record of daily attendance for the selected payroll period.',
        applicability: 'mandatory',
        confirmation: 'confirmed',
        instructions:
          "The uploaded record must follow the university's existing signature requirements, including the Immediate Supervisor's signature. Prepare and sign it before uploading.",
      },
      {
        id: 'travel-order',
        name: 'Approved Travel Order',
        description: 'Applies because Official Travel was selected.',
        applicability: 'conditional',
        trigger: 'travel',
        confirmation: 'confirmed',
      },
      {
        id: 'certificate-of-appearance',
        name: 'Certificate of Appearance',
        description: 'Applies because Official Travel was selected.',
        applicability: 'conditional',
        trigger: 'travel',
        confirmation: 'confirmed',
      },
      {
        id: 'leave-application',
        name: 'Approved Leave Application',
        description: 'Applies because Leave of Absence was selected.',
        applicability: 'conditional',
        trigger: 'leave',
        confirmation: 'confirmed',
      },
      {
        id: 'cto-form',
        name: 'Approved CTO Form',
        description: 'Applies because Compensatory Time-Off (CTO) was selected.',
        applicability: 'conditional',
        trigger: 'cto',
        confirmation: 'confirmed',
      },
    ],
  },
}

// ---------------------------------------------------------------------------------------------
// Employee record. In production this comes from HR-maintained records; here it is fictional.
// ---------------------------------------------------------------------------------------------

export type EmployeeRecord = {
  name: string
  employeeId: string
  classification: 'Staff' | 'Faculty'
  employmentType: string
  /** Payroll type id assigned by HR. null means HR has not assigned one. */
  assignedPayrollTypeId: string | null
  /** Present only when available from the account record. */
  office?: string
  /** Immediate Supervisor from the HR record, when recorded. */
  supervisor?: string
}

export const fictionalEmployee: EmployeeRecord = {
  name: 'Alex Rivera',
  employeeId: 'EMP-001',
  classification: 'Staff',
  employmentType: 'Permanent',
  assignedPayrollTypeId: 'permanent-staff',
}

export type PayrollAssignment =
  | { status: 'assigned'; config: PayrollTypeConfig }
  | { status: 'unassigned' }
  | { status: 'unconfigured'; payrollTypeId: string }

/** Resolve the payroll type from the employee record only. The employee never chooses it. */
export function resolveAssignment(employee: EmployeeRecord): PayrollAssignment {
  if (!employee.assignedPayrollTypeId) return { status: 'unassigned' }
  const config = payrollTypeConfigs[employee.assignedPayrollTypeId]
  return config ? { status: 'assigned', config } : { status: 'unconfigured', payrollTypeId: employee.assignedPayrollTypeId }
}

// ---------------------------------------------------------------------------------------------
// Checklist logic
// ---------------------------------------------------------------------------------------------

/** Requirements that currently apply and must be selected before continuing. */
export function activeRequirements(config: PayrollTypeConfig, circumstances: CircumstanceId[]) {
  return config.documents.filter(
    (d) =>
      d.confirmation === 'confirmed' &&
      (d.applicability === 'mandatory' || (d.trigger !== undefined && circumstances.includes(d.trigger))),
  )
}

/** Applicable requirements that are still awaiting office confirmation (never counted as missing). */
export function pendingRequirements(config: PayrollTypeConfig, circumstances: CircumstanceId[]) {
  return config.documents.filter(
    (d) =>
      d.confirmation === 'pending-confirmation' &&
      (d.applicability === 'mandatory' || (d.trigger !== undefined && circumstances.includes(d.trigger))),
  )
}

// ---------------------------------------------------------------------------------------------
// File validation. The approved accepted formats and maximum size are still TBD, so none are set.
// Set these once confirmed; the upload component and validation already honor them.
// ---------------------------------------------------------------------------------------------

export type FileRules = {
  /** e.g. ['.pdf', '.jpg']. Undefined means not yet confirmed, so no restriction is applied. */
  acceptedExtensions?: string[]
  /** Maximum size in bytes. Undefined means not yet confirmed. */
  maxSizeBytes?: number
}

export const fileRules: FileRules = {}

export function validateFile(file: File, rules: FileRules = fileRules): string | null {
  if (rules.acceptedExtensions?.length) {
    const name = file.name.toLowerCase()
    if (!rules.acceptedExtensions.some((ext) => name.endsWith(ext.toLowerCase()))) {
      return `This file type is not accepted. Accepted types: ${rules.acceptedExtensions.join(', ')}.`
    }
  }
  if (rules.maxSizeBytes !== undefined && file.size > rules.maxSizeBytes) {
    return `This file is larger than the configured maximum of ${(rules.maxSizeBytes / (1024 * 1024)).toFixed(1)} MB.`
  }
  return null
}

// ---------------------------------------------------------------------------------------------
// Submission windows. Availability labels are interface indicators, not SRS submission statuses.
// ---------------------------------------------------------------------------------------------

/** Fixed fictional "today" so the fictional schedule above behaves predictably in the prototype. */
export const DEMO_TODAY = '2026-12-03'

export type Availability = 'Open' | 'Upcoming' | 'Closed' | 'Not configured'

export function periodAvailability(period: PeriodSchedule, today = DEMO_TODAY): Availability {
  if (!period.opens || !period.deadline) return 'Not configured'
  if (today < period.opens) return 'Upcoming'
  if (today > period.deadline) return 'Closed'
  return 'Open'
}

export type ExistingSubmission = { period: string; payrollType: string; status: string }

export type PeriodOption = {
  schedule: PeriodSchedule
  availability: Availability
  eligible: boolean
  /** Why the period is not offered for a new submission. */
  reason?: string
}

const longDate = new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
export const formatScheduleDate = (value: string) => longDate.format(new Date(`${value}T00:00:00Z`))

/**
 * Periods for the employee's assigned payroll type, with whether each can take a NEW ordinary submission.
 * A period is offered only when no submission already exists for it and its window is Open (or not configured).
 */
export function periodOptions(config: PayrollTypeConfig, existing: ExistingSubmission[]): PeriodOption[] {
  return config.periods.map((schedule) => {
    const availability = periodAvailability(schedule)
    const prior = existing.find((item) => item.payrollType === config.name && item.period === schedule.label)
    if (prior) {
      return {
        schedule,
        availability,
        eligible: false,
        reason: prior.status === 'Returned'
          ? 'returned. Use Correct & Resubmit in My Submissions'
          : 'already submitted',
      }
    }
    if (availability === 'Upcoming') return { schedule, availability, eligible: false, reason: `opens ${formatScheduleDate(schedule.opens!)}` }
    if (availability === 'Closed') return { schedule, availability, eligible: false, reason: 'submission window closed. Contact the HR Office' }
    return { schedule, availability, eligible: true }
  })
}
