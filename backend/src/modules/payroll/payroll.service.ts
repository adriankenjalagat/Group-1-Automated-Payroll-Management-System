export interface PayrollRecord {
  id: number
  employeeName: string
  department: string
  period: string
  grossPay: number
  deductions: number
  netPay: number
  status: 'Draft' | 'Pending' | 'Approved' | 'Disbursed'
}

const payrollRecords: PayrollRecord[] = [
  {
    id: 1,
    employeeName: 'Juan Dela Cruz',
    department: 'College of Business and Information Technology',
    period: 'November 2026',
    grossPay: 31320,
    deductions: 2820,
    netPay: 28500,
    status: 'Approved',
  },
  {
    id: 2,
    employeeName: 'Maria Santos',
    department: 'Administration',
    period: 'November 2026',
    grossPay: 26500,
    deductions: 2500,
    netPay: 24000,
    status: 'Pending',
  },
]

export const payrollService = {
  findAll(): PayrollRecord[] {
    return payrollRecords
  },

  findById(id: number): PayrollRecord | undefined {
    return payrollRecords.find((item) => item.id === id)
  },

  create(input: {
    employeeName: string
    department: string
    period: string
    grossPay: number
    deductions?: number
  }): PayrollRecord {
    const deductions = input.deductions ?? 0
    const record: PayrollRecord = {
      id: payrollRecords.length + 1,
      employeeName: input.employeeName,
      department: input.department,
      period: input.period,
      grossPay: input.grossPay,
      deductions,
      netPay: input.grossPay - deductions,
      status: 'Pending',
    }
    payrollRecords.push(record)
    return record
  },
}

