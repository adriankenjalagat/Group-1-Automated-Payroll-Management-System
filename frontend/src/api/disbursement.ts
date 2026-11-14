import { apiClient } from './client'

export interface DisbursementRecord {
  id: number
  payrollId: number
  method: 'Bank Transfer' | 'Cash'
  status: 'Scheduled' | 'Released'
  dvNumber?: string
  totalAmount?: number
  releasedAt?: string
}

export const disbursementApi = {
  getAll: (): Promise<DisbursementRecord[]> => {
    return apiClient.get<DisbursementRecord[]>('/disbursement')
  },

  getByPayroll: (payrollId: number | string): Promise<DisbursementRecord[]> => {
    return apiClient.get<DisbursementRecord[]>(`/disbursement/payroll/${payrollId}`)
  },

  getDv: (payrollId: number | string): Promise<any> => {
    return apiClient.get(`/disbursement/dv/${payrollId}`)
  },

  getBudgetDoc: (payrollId: number | string): Promise<any> => {
    return apiClient.get(`/disbursement/budget-doc/${payrollId}`)
  },

  getLandbank: (payrollId: number | string): Promise<any> => {
    return apiClient.get(`/disbursement/landbank/${payrollId}`)
  },

  release: (
    payrollId: number | string,
    data?: { adaAdcaNumber?: string; method?: string },
  ): Promise<{ message: string; disbursement: DisbursementRecord }> => {
    return apiClient.post(`/disbursement/release/${payrollId}`, data || {})
  },
}

