export type AttendanceSource = 'MyWork Demonstration Import' | 'Manual Record'
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
  /** Set when HR verification or a supervisor signature status is recorded. Unverified manual entries are not used for payroll. */
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
  attendanceRecords: [
    {
      id: 'DEMO-ATT-001',
      employeeId: 'EMP-001',
      period: 'November 2026',
      source: 'MyWork Demonstration Import',
      entries: [
        { id: 'ENTRY-001', date: '2026-11-03', timeIn: '08:02', timeOut: '17:01', source: 'MyWork Demonstration Import', history: [] },
        { id: 'ENTRY-002', date: '2026-11-04', timeIn: '08:10', timeOut: '17:03', source: 'MyWork Demonstration Import', history: [] },
        { id: 'ENTRY-003', date: '2026-11-06', timeIn: '08:05', timeOut: '', source: 'MyWork Demonstration Import', history: [] },
      ],
      recordedLateArrivals: 1,
      recordedAbsences: 0,
      recordedUndertime: 0,
      reviewIndicator: 'Has Concerns',
      reviewNotes: 'Recorded values only. No unconfigured schedule or grace-rule calculations are applied.',
      includedInApprovedPayroll: false,
    },
    {
      id: 'DEMO-ATT-002',
      employeeId: 'EMP-002',
      period: 'November 2026',
      source: 'Manual Record',
      entries: [
        { id: 'ENTRY-004', date: '2026-11-07', timeIn: '', timeOut: '17:00', source: 'Manual Record', history: [] },
        { id: 'ENTRY-005', date: '2026-11-08', timeIn: '08:00', timeOut: '17:00', source: 'Manual Record', history: [] },
      ],
      recordedLateArrivals: 0,
      recordedAbsences: 1,
      recordedUndertime: 0,
      reviewIndicator: 'Has Concerns',
      reviewNotes: 'Manual entry requires HR verification before future payroll use.',
      includedInApprovedPayroll: false,
    },
    {
      id: 'DEMO-ATT-003',
      employeeId: 'EMP-003',
      period: 'October 2026',
      source: 'MyWork Demonstration Import',
      entries: [
        { id: 'ENTRY-006', date: '2026-10-04', timeIn: '08:15', timeOut: '17:00', source: 'MyWork Demonstration Import', history: [] },
      ],
      recordedLateArrivals: 1,
      recordedAbsences: 0,
      recordedUndertime: 0,
      reviewIndicator: 'Protected Record',
      reviewNotes: 'This fictional record is marked as already included in an approved payroll and is read-only.',
      includedInApprovedPayroll: true,
    },
    {
      id: 'DEMO-ATT-004',
      employeeId: 'EMP-004',
      period: 'November 2026',
      source: 'MyWork Demonstration Import',
      entries: [
        { id: 'ENTRY-007', date: '2026-11-03', timeIn: '07:58', timeOut: '17:05', source: 'MyWork Demonstration Import', history: [] },
      ],
      recordedLateArrivals: 0,
      recordedAbsences: 0,
      recordedUndertime: 0,
      reviewIndicator: 'Available',
      reviewNotes: 'Fictional imported attendance record.',
      includedInApprovedPayroll: false,
    },
  ],
  concerns: [
    {
      id: 'DEMO-CONCERN-001',
      attendanceRecordId: 'DEMO-ATT-001',
      employeeId: 'EMP-001',
      period: 'November 2026',
      date: '2026-11-06',
      concern: 'Missing Time Out',
      missingField: 'Time Out',
      employeeExplanation: 'The fictional time-out entry was not reflected in the attendance export.',
      logbookReference: 'DEMO-LOGBOOK-006',
      supervisorVerification: 'Fictional supervisor verification recorded with a supporting logbook reference.',
      previousReviewNotes: 'Awaiting HR review.',
      includedInApprovedPayroll: false,
    },
    {
      id: 'DEMO-CONCERN-002',
      attendanceRecordId: 'DEMO-ATT-002',
      employeeId: 'EMP-002',
      period: 'November 2026',
      date: '2026-11-07',
      concern: 'Missing Time In',
      missingField: 'Time In',
      employeeExplanation: 'No time-in value was available in the fictional manual record.',
      previousReviewNotes: 'No corresponding logbook reference; HR verification is required.',
      includedInApprovedPayroll: false,
    },
    {
      id: 'DEMO-CONCERN-003',
      attendanceRecordId: 'DEMO-ATT-003',
      employeeId: 'EMP-003',
      period: 'October 2026',
      date: '2026-10-04',
      concern: 'Attendance Entry Requiring Verification',
      missingField: 'Time In',
      employeeExplanation: 'Fictional entry was flagged for review.',
      previousReviewNotes: 'Protected because the record is included in an approved payroll.',
      includedInApprovedPayroll: true,
    },
  ],
  approvedRecords: [
    {
      id: 'DEMO-APPROVED-001',
      employeeId: 'EMP-002',
      type: 'Approved Leave',
      leaveType: 'Fictional approved leave category',
      startDate: '2026-11-10',
      endDate: '2026-11-12',
      reference: 'DEMO-LEAVE-001',
      notes: 'Recorded approval reference only; no leave-credit or pay treatment is represented.',
      history: [],
      includedInApprovedPayroll: false,
    },
    {
      id: 'DEMO-APPROVED-002',
      employeeId: 'EMP-001',
      type: 'Approved Official Travel',
      startDate: '2026-11-03',
      endDate: '2026-11-04',
      reference: 'DEMO-TRAVEL-104',
      notes: 'Fictional already-approved travel reference.',
      history: [],
      includedInApprovedPayroll: false,
    },
    {
      id: 'DEMO-APPROVED-003',
      employeeId: 'EMP-003',
      type: 'Approved Compensatory Time-Off (CTO)',
      startDate: '2026-10-10',
      endDate: '2026-10-10',
      reference: 'DEMO-CTO-010',
      notes: 'Fictional already-approved CTO reference; no salary conversion is represented.',
      history: [],
      includedInApprovedPayroll: true,
    },
  ],
}

/** Concerns HR can still act on. Resolved concerns and approved-payroll-protected records are not pending attention. */
export const pendingConcerns = (concerns: AttendanceConcern[]) =>
  concerns.filter((concern) => !concern.hrVerification && !concern.includedInApprovedPayroll)
