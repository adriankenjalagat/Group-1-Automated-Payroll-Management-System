import { apiClient } from './client'

export interface UserAccountItem {
  id?: number
  accountId?: string
  name: string
  email: string
  username: string
  office: string
  costCenter?: string
  roles: string[]
  status: 'active' | 'locked' | 'pending'
  employeeId?: number | null
}

export const usersApi = {
  getAll: (): Promise<UserAccountItem[]> => {
    return apiClient.get<UserAccountItem[]>('/users')
  },

  getById: (id: number | string): Promise<UserAccountItem> => {
    return apiClient.get<UserAccountItem>(`/users/${id}`)
  },

  create: (user: {
    name: string
    username: string
    role?: string
    roles?: string[]
    email?: string
    password?: string
    office?: string
    costCenter?: string
    employeeId?: number | string | null
  }): Promise<{ message: string; user: UserAccountItem }> => {
    return apiClient.post('/users', user)
  },

  update: (id: number | string, data: Partial<UserAccountItem>): Promise<UserAccountItem> => {
    return apiClient.put(`/users/${id}`, data)
  },

  setStatus: (id: number | string, status: 'active' | 'locked' | 'pending'): Promise<UserAccountItem> => {
    return apiClient.patch(`/users/${id}/status`, { status })
  },

  lock: (id: number | string): Promise<UserAccountItem> => {
    return apiClient.put(`/users/${id}/lock`, {})
  },

  unlock: (id: number | string): Promise<UserAccountItem> => {
    return apiClient.put(`/users/${id}/unlock`, {})
  },
}

