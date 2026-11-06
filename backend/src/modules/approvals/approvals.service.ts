export interface ApprovalStep {
  id: number
  payrollId: number
  stage: 'HR' | 'Budget' | 'Accounting' | 'Executive'
  status: 'Pending' | 'Approved' | 'Rejected'
}

const approvals: ApprovalStep[] = [
  {
    id: 1,
    payrollId: 1,
    stage: 'Executive',
    status: 'Approved',
  },
]

export const approvalsService = {
  findAll(): ApprovalStep[] {
    return approvals
  },
}

