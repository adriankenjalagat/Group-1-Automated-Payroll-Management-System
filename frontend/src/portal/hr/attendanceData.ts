export type AttendanceSource = 'Biometric System Import' | 'Manual Record'
export type ApprovedRecordType = 'Approved Leave' | 'Approved Official Travel' | 'Approved Compensatory Time-Off (CTO)'

export type AttendanceEntryHistory = {
  id: string
  changedAt: string
  field: 'Time In' | 'Time Out'
  previousValue: string
  newValue: string
  reason: string
  reference?: string
}

export type DailyAttendanceEntry = {
  id: string
  date: string
  timeIn: string
  timeOut: string
  source: AttendanceSource
  verification?: 'Verified' | 'Pending HR verification'
  history: AttendanceEntryHistory[]
}

export type AttendanceRecord = {
  id: string
  employeeId: string
  period: string
  source: AttendanceSource
  entries: DailyAttendanceEntry[]
  recordedLateArrivals: number
  recordedAbsences: number
  recordedUndertime: number
  reviewIndicator: 'Available' | 'Has Concerns' | 'Protected Record'
  reviewNotes: string
  includedInApprovedPayroll: boolean
}

export type AttendanceConcern = {
  id: string
  attendanceRecordId: string
  employeeId: string
  period: string
  date: string
  concern: 'Missing Time In' | 'Missing Time Out' | 'Attendance Entry Requiring Verification'
  missingField: 'Time In' | 'Time Out'
  employeeExplanation?: string
  logbookReference?: string
  supervisorVerification?: string
  hrVerification?: {
    correctedValue: string
    reason: string
    reference?: string
    reviewedAt: string
  }
  previousReviewNotes?: string
  includedInApprovedPayroll: boolean
}

export type ApprovedRecordHistory = {
  id: string
  changedAt: string
  previousValue: string
  newValue: string
  reason: string
}

export type ApprovedRecord = {
  id: string
  employeeId: string
  type: ApprovedRecordType
  leaveType?: string
  startDate: string
  endDate: string
  reference?: string
  notes?: string
  history: ApprovedRecordHistory[]
  includedInApprovedPayroll: boolean
}

export type AttendanceModuleState = {
  attendanceRecords: AttendanceRecord[]
  concerns: AttendanceConcern[]
  approvedRecords: ApprovedRecord[]
}

export const initialAttendanceState: AttendanceModuleState = {
  attendanceRecords: [],
  concerns: [],
  approvedRecords: [],
}

/** Concerns HR can still act on. Resolved concerns and approved-payroll-protected records are not pending attention. */
export const pendingConcerns = (concerns: AttendanceConcern[]) =>
  concerns.filter((concern) => !concern.hrVerification && !concern.includedInApprovedPayroll)
