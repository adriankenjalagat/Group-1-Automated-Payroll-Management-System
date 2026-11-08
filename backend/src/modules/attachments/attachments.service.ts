export type SubmissionStatus =
  | 'Submitted'
  | 'Incomplete'
  | 'Late'
  | 'Returned'
  | 'Validated'
  | 'Verified'
  | 'Transmitted'

export interface DocumentVersion {
  version: number
  submittedOn: string
  files: string[]
}

export interface VerificationAttachment {
  requirementId: string
  filename: string
  documentType: string
  available: boolean
  previewAvailable: boolean
  uploadedAt?: string
}

export interface SubmissionRecord {
  id: string
  employeeId: string
  payrollType: string
  period: string
  submittedOn: string
  status: SubmissionStatus
  remark?: string
  returnInfo?: {
    by: string
    at: string
    remarks: string
    affected?: string
  }
  versions?: DocumentVersion[]
  resubmittedOn?: string[]
  attachments?: VerificationAttachment[]
  supervisorValidation?: {
    supervisor: string
    status: 'Validated'
    validatedAt?: string
    remarks?: string
  }
  hrVerification?: {
    verifiedBy: string
    verifiedAt: string
    remarks?: string
  }
}

const submissions: SubmissionRecord[] = []

export const attachmentsService = {
  findAll(): SubmissionRecord[] {
    return submissions
  },

  findById(id: string): SubmissionRecord | undefined {
    return submissions.find((s) => s.id === id)
  },

  findByEmployee(employeeId: string): SubmissionRecord[] {
    return submissions.filter((s) => s.employeeId === employeeId)
  },

  create(data: Omit<SubmissionRecord, 'id' | 'submittedOn' | 'status'> & { id?: string; status?: SubmissionStatus }): SubmissionRecord {
    const newSubmission: SubmissionRecord = {
      id: data.id || `SUB-${Date.now()}`,
      employeeId: data.employeeId,
      payrollType: data.payrollType,
      period: data.period,
      submittedOn: new Date().toISOString().split('T')[0],
      status: data.status || 'Submitted',
      remark: data.remark,
      versions: data.versions || [
        {
          version: 1,
          submittedOn: new Date().toISOString().split('T')[0],
          files: (data.attachments || []).map((a) => a.filename),
        },
      ],
      attachments: data.attachments || [],
    }
    submissions.unshift(newSubmission)
    return newSubmission
  },

  update(id: string, updateData: Partial<SubmissionRecord>): SubmissionRecord | undefined {
    const index = submissions.findIndex((s) => s.id === id)
    if (index === -1) return undefined
    submissions[index] = { ...submissions[index], ...updateData }
    return submissions[index]
  },
}
