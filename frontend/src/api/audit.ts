import { apiClient } from './client'

export interface AuditRecord {
  logId: number
  userId: number | null
  action: string
  loggedAt: string
  username: string
  name: string
  role: string
  details?: any
}

export const auditApi = {
  getAll: (): Promise<AuditRecord[]> => {
    return apiClient.get<AuditRecord[]>('/audit')
  },

  logAction: (action: string, details?: any): Promise<{ message: string }> => {
    return apiClient.post('/audit', { action, details })
  },
}

