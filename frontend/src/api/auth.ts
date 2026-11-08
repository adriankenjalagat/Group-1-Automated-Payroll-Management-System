import { apiClient } from './client'
import type { MockUser } from '../auth/mockData'

export interface LoginResponse {
  message: string
  token: string
  user: MockUser
}

export const authApi = {
  login: (identifier: string, password: string): Promise<LoginResponse> => {
    return apiClient.post<LoginResponse>('/auth/login', {
      identifier: identifier.trim(),
      password,
    })
  },
}
