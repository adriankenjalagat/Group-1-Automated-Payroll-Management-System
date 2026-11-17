import { apiClient } from './client'

export interface BackendPayrollRecord {
  id: number
  employeeId?: number | null
  employeeName: string
  department: string
  period: string
  grossPay: number
  deductions: number
  netPay: number
  status: 'Draft' | 'Pending' | 'Approved' | 'Disbursed' | 'Locked' | 'Rejected'
  costCenter?: string
  basicPay?: number
  allowances?: number
  peraAllowance?: number
  stage?: string
  locked?: boolean
  computationVersion?: number
  createdAt?: string
  updatedAt?: string
}

export const payrollApi = {
  getAll: (): Promise<BackendPayrollRecord[]> => {
    return apiClient.get<BackendPayrollRecord[]>('/payroll')
  },

  getById: (id: number | string): Promise<BackendPayrollRecord> => {
    return apiClient.get<BackendPayrollRecord>(`/payroll/${id}`)
  },

  create: (payroll: Partial<BackendPayrollRecord>): Promise<BackendPayrollRecord> => {
    return apiClient.post<BackendPayrollRecord>('/payroll', payroll)
  },

  updateCorrection: (id: number | string, data: any): Promise<BackendPayrollRecord> => {
    return apiClient.put<BackendPayrollRecord>(`/payroll/${id}/recalculate`, data)
  },

  lock: (id: number | string): Promise<{ message: string; record: BackendPayrollRecord }> => {
    return apiClient.put<{ message: string; record: BackendPayrollRecord }>(`/payroll/${id}/lock`, {})
  },
}

