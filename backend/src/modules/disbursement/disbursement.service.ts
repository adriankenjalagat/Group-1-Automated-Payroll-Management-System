export interface DisbursementRecord {
  id: number
  payrollId: number
  method: 'Bank Transfer' | 'Cash'
  status: 'Scheduled' | 'Released'
  releasedAt?: string
}

const disbursements: DisbursementRecord[] = [
  {
    id: 1,
    payrollId: 1,
    method: 'Bank Transfer',
    status: 'Scheduled',
  },
]

export const disbursementService = {
  findAll(): DisbursementRecord[] {
    return disbursements
  },
}

