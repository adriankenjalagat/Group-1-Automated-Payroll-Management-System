import { apiClient } from './client'
import type { Submission } from '../portal/MySubmissions'
import type { VerificationSubmission } from '../portal/hr/DocumentVerification'

export const submissionsApi = {
  getAll: (employeeId?: string): Promise<Submission[]> => {
    const query = employeeId ? `?employeeId=${encodeURIComponent(employeeId)}` : ''
    return apiClient.get<Submission[]>(`/attachments${query}`)
  },

  getVerificationSubmissions: (): Promise<VerificationSubmission[]> => {
    return apiClient.get<VerificationSubmission[]>('/attachments')
  },

  getById: (id: string): Promise<Submission> => {
    return apiClient.get<Submission>(`/attachments/${id}`)
  },

  create: (submission: Partial<Submission>): Promise<Submission> => {
    return apiClient.post<Submission>('/attachments', submission)
  },

  update: (id: string, updateData: Partial<Submission | VerificationSubmission>): Promise<Submission> => {
    return apiClient.put<Submission>(`/attachments/${id}`, updateData)
  },

  uploadFile: (formData: FormData): Promise<{ id: number; filename: string; originalName: string; mimeType: string }> => {
    return apiClient.post('/attachments/upload', formData)
  },

  downloadFileUrl: (id: string | number): string => {
    const base = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
    return `${base}/attachments/${id}/download`
  },
}
