import { apiClient } from './client'
import type { AttendanceModuleState } from '../portal/hr/attendanceData'

export const attendanceApi = {
  getState: (): Promise<AttendanceModuleState> => {
    return apiClient.get<AttendanceModuleState>('/attendance')
  },

  updateState: (state: Partial<AttendanceModuleState>): Promise<AttendanceModuleState> => {
    return apiClient.post<AttendanceModuleState>('/attendance/state', state)
  },

  resolveConcern: (concernId: string, resolution: any): Promise<{ message: string }> => {
    return apiClient.put<{ message: string }>(`/attendance/concerns/${concernId}`, resolution)
  },
}
