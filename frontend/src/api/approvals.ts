import { apiClient } from './client'

export interface ApprovalStep {
  id: number
  payrollId: number
  stage: string
  status: 'Pending' | 'Approved' | 'Rejected'
  approverName?: string
  costCenter?: string
  remarks?: string
  updatedAt?: string
}

export interface ApprovalRouteItem {
  id: number
  stageName: string
  sequenceOrder: number
  requiredRole: string
  costCenter?: string
  fundSource?: string
  isActive: boolean
}

export const approvalsApi = {
  getAll: (): Promise<ApprovalStep[]> => {
    return apiClient.get<ApprovalStep[]>('/approvals')
  },

  getByPayroll: (payrollId: number | string): Promise<ApprovalStep[]> => {
    return apiClient.get<ApprovalStep[]>(`/approvals/payroll/${payrollId}`)
  },

  getRoutes: (): Promise<ApprovalRouteItem[]> => {
    return apiClient.get<ApprovalRouteItem[]>('/approvals/routes')
  },

  createRoute: (route: Partial<ApprovalRouteItem>): Promise<ApprovalRouteItem> => {
    return apiClient.post<ApprovalRouteItem>('/approvals/routes', route)
  },

  deactivateRoute: (id: number | string): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(`/approvals/routes/${id}`)
  },

  submitDecision: (payload: {
    payrollId: number | string
    decision: 'Approved' | 'Rejected' | 'Returned'
    remarks?: string
  }): Promise<{ message: string; step?: any }> => {
    return apiClient.post('/approvals/decision', payload)
  },
}

