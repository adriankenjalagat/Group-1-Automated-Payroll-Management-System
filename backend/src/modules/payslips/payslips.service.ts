export interface Payslip {
  id: number
  employeeId: number
  period: string
  grossPay: number
  deductions: number
  netPay: number
}

const payslips: Payslip[] = [
  {
    id: 1,
    employeeId: 1,
    period: 'November 2026',
    grossPay: 31320,
    deductions: 2820,
    netPay: 28500,
  },
]

export const payslipsService = {
  findAll(): Payslip[] {
    return payslips
  },
}

