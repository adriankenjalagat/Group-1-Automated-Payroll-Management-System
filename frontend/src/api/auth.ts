import { apiClient } from './client'
import type { MockUser } from '../auth/mockData'

export interface LoginResponse {
  message: string
  token: string
  user: MockUser
}

export interface ForgotPasswordResponse {
  success: boolean
  message: string
  resetToken?: string
}

export interface ResetPasswordResponse {
  success: boolean
  message: string
}

export const authApi = {
  login: (identifier: string, password: string): Promise<LoginResponse> => {
    return apiClient.post<LoginResponse>('/auth/login', {
      identifier: identifier.trim(),
      password,
    })
  },

  forgotPassword: (identifier: string): Promise<ForgotPasswordResponse> => {
    return apiClient.post<ForgotPasswordResponse>('/auth/forgot-password', {
      identifier: identifier.trim(),
    })
  },

  resetPassword: (token: string, password: string): Promise<ResetPasswordResponse> => {
    return apiClient.post<ResetPasswordResponse>('/auth/reset-password', {
      token,
      password,
    })
  },
}
