export interface PayslipRecord {
  id: string | number
  employeeId: string | number
  period: string
  grossPay: number
  deductions: number
  netPay: number
  payrollTitle?: string
  disbursedAt?: string
  status?: string
}

const payslips: PayslipRecord[] = []

export const payslipsService = {
  findAll(): PayslipRecord[] {
    return payslips
  },

  findByEmployee(employeeId: string | number): PayslipRecord[] {
    return payslips.filter(
      (p) => String(p.employeeId).toLowerCase() === String(employeeId).toLowerCase(),
    )
  },

  create(record: PayslipRecord): PayslipRecord {
    payslips.push(record)
    return record
  },
}
