import { apiClient } from './client'
import type { PayslipRecord } from '../portal/MyPayslips'

export const payslipsApi = {
  getAll: (employeeId?: string): Promise<PayslipRecord[]> => {
    const query = employeeId ? `?employeeId=${encodeURIComponent(employeeId)}` : ''
    return apiClient.get<PayslipRecord[]>(`/payslips${query}`)
  },

  getByEmployee: (employeeId: string): Promise<PayslipRecord[]> => {
    return apiClient.get<PayslipRecord[]>(`/payslips/employee/${encodeURIComponent(employeeId)}`)
  },

  getDeductionReport: (period?: string): Promise<any> => {
    const query = period ? `?period=${encodeURIComponent(period)}` : ''
    return apiClient.get<any>(`/payslips/reports/deductions${query}`)
  },

  getPayrollRegister: (period?: string): Promise<any> => {
    const query = period ? `?period=${encodeURIComponent(period)}` : ''
    return apiClient.get<any>(`/payslips/reports/register${query}`)
  },
}
