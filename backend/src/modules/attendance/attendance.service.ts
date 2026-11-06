export interface AttendanceSummary {
  id: number
  employeeId: number
  period: string
  daysWorked: number
  absences: number
  verifiedBySupervisor: boolean
}

const attendanceRecords: AttendanceSummary[] = [
  {
    id: 1,
    employeeId: 1,
    period: 'November 2026',
    daysWorked: 22,
    absences: 0,
    verifiedBySupervisor: true,
  },
]

export const attendanceService = {
  findAll(): AttendanceSummary[] {
    return attendanceRecords
  },
}

