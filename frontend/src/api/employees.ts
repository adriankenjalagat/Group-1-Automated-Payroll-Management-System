import { apiClient } from './client'
import type { HrEmployee } from '../portal/hr/hrData'

export const employeesApi = {
  getAll: (): Promise<HrEmployee[]> => {
    return apiClient.get<HrEmployee[]>('/employees')
  },

  getById: (id: string): Promise<HrEmployee> => {
    return apiClient.get<HrEmployee>(`/employees/${id}`)
  },

  getByUsername: (username: string): Promise<HrEmployee> => {
    return apiClient.get<HrEmployee>(`/employees/username/${username}`)
  },

  create: (employee: HrEmployee): Promise<HrEmployee> => {
    return apiClient.post<HrEmployee>('/employees', employee)
  },

  update: (id: string, employee: Partial<HrEmployee>): Promise<HrEmployee> => {
    return apiClient.put<HrEmployee>(`/employees/${id}`, employee)
  },

  delete: (id: string): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(`/employees/${id}`)
  },
}
