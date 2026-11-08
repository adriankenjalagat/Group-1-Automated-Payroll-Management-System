export interface AttendanceModuleState {
  records: any[]
  concerns: any[]
  approvedRecords: any[]
}

const attendanceState: AttendanceModuleState = {
  records: [],
  concerns: [],
  approvedRecords: [],
}

export const attendanceService = {
  getState(): AttendanceModuleState {
    return attendanceState
  },

  updateState(partial: Partial<AttendanceModuleState>): AttendanceModuleState {
    if (partial.records) attendanceState.records = partial.records
    if (partial.concerns) attendanceState.concerns = partial.concerns
    if (partial.approvedRecords) attendanceState.approvedRecords = partial.approvedRecords
    return attendanceState
  },

  resolveConcern(concernId: string, resolution: any): boolean {
    const idx = attendanceState.concerns.findIndex((c) => c.id === concernId)
    if (idx === -1) return false
    attendanceState.concerns[idx] = { ...attendanceState.concerns[idx], ...resolution }
    return true
  },
}
