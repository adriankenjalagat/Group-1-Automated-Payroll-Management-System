export interface AttachmentRecord {
  id: number
  employeeId: number
  documentType: string
  fileName: string
  uploadedAt: string
}

const attachments: AttachmentRecord[] = [
  {
    id: 1,
    employeeId: 1,
    documentType: 'Daily Time Record (DTR)',
    fileName: 'dtr-nov-2026.pdf',
    uploadedAt: '2026-11-05T08:00:00Z',
  },
]

export const attachmentsService = {
  findAll(): AttachmentRecord[] {
    return attachments
  },
}

