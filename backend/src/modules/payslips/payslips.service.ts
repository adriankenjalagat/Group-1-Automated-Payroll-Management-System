import { pool } from '../../config/db'

export interface PayslipRecord {
  id: string | number
  employeeId: string | number
  employeeNo?: string
  employeeName?: string
  department?: string
  period: string
  grossPay: number
  deductions: number
  netPay: number
  payrollTitle?: string
  status: string
  releasedAt?: string
  breakdown?: any
  createdAt?: string
}

const PAYSLIP_SELECT_SQL = `
  SELECT
    ps.id,
    ps.published_at,
    ps.viewed_at,
    pi.gross_pay,
    pi.total_deductions AS deductions,
    pi.net_pay,
    pi.late_undertime_deduction,
    e.id AS employee_db_id,
    e.employee_no,
    TRIM(CONCAT_WS(' ', e.first_name, e.middle_name, e.last_name)) AS full_name,
    o.name AS department,
    pp.label AS period,
    et.name AS payroll_title
  FROM payslips ps
  JOIN payroll_items pi ON pi.id = ps.payroll_item_id
  JOIN payroll_batches pb ON pb.id = pi.batch_id
  JOIN payroll_periods pp ON pp.id = pb.period_id
  JOIN employment_types et ON et.id = pb.employment_type_id
  JOIN appointments a ON a.id = pi.appointment_id
  JOIN employees e ON e.id = a.employee_id
  JOIN offices o ON o.id = a.office_id
`

function mapPayslipRow(row: any): PayslipRecord {
  return {
    id: Number(row.id),
    employeeId: row.employee_no || String(row.employee_db_id),
    employeeNo: row.employee_no,
    employeeName: row.full_name,
    department: row.department,
    period: row.period,
    grossPay: parseFloat(row.gross_pay) || 0,
    deductions: parseFloat(row.deductions) || 0,
    netPay: parseFloat(row.net_pay) || 0,
    payrollTitle: row.payroll_title || 'Regular Monthly Payroll',
    status: 'Released',
    releasedAt: row.published_at ? new Date(row.published_at).toISOString() : undefined,
    createdAt: row.published_at ? new Date(row.published_at).toISOString() : new Date().toISOString(),
  }
}

export const payslipsService = {
  async findAll(options: {
    employeeId?: string
    releasedOnly?: boolean
    period?: string
  }): Promise<PayslipRecord[]> {
    let queryText = PAYSLIP_SELECT_SQL
    const conditions: string[] = []
    const params: any[] = []
    let pIdx = 1

    if (options.employeeId) {
      conditions.push(
        `(e.employee_no = $${pIdx} OR (e.id::text = $${pIdx} AND $${pIdx} ~ '^[0-9]+$'))`,
      )
      params.push(options.employeeId.trim())
      pIdx++
    }

    if (options.period) {
      conditions.push(`LOWER(pp.label) = LOWER($${pIdx++})`)
      params.push(options.period.trim())
    }

    if (conditions.length > 0) {
      queryText += ` WHERE ${conditions.join(' AND ')}`
    }

    queryText += ` ORDER BY ps.id DESC`
    const res = await pool.query(queryText, params)
    return res.rows.map(mapPayslipRow)
  },

  async findByEmployee(employeeIdOrNo: string, releasedOnly = true): Promise<PayslipRecord[]> {
    return payslipsService.findAll({ employeeId: employeeIdOrNo, releasedOnly })
  },

  async findById(id: number): Promise<PayslipRecord | undefined> {
    const res = await pool.query(`${PAYSLIP_SELECT_SQL} WHERE ps.id = $1 LIMIT 1`, [id])
    if (res.rows.length === 0) return undefined
    return mapPayslipRow(res.rows[0])
  },

  async getDeductionReport(period?: string): Promise<any> {
    const records = await payslipsService.findAll({ releasedOnly: false, period })
    const totalDeductions = Math.round(records.reduce((s, r) => s + r.deductions, 0) * 100) / 100

    return {
      period: period || 'All Periods',
      generatedAt: new Date().toISOString(),
      summary: {
        totalGsis: 0,
        totalPhilHealth: 0,
        totalPagIbig: 0,
        totalWithholdingTax: 0,
        totalAttendanceDeductions: 0,
        totalOtherDeductions: 0,
        grandTotalDeductions: totalDeductions,
      },
      rows: records.map((r) => ({
        employeeNo: r.employeeNo || r.employeeId,
        employeeName: r.employeeName,
        department: r.department,
        period: r.period,
        totalDeductions: r.deductions,
      })),
    }
  },

  async getPayrollRegister(period?: string): Promise<any> {
    const records = await payslipsService.findAll({ releasedOnly: false, period })
    const totalGross = records.reduce((s, r) => s + r.grossPay, 0)
    const totalDeductions = records.reduce((s, r) => s + r.deductions, 0)
    const totalNet = records.reduce((s, r) => s + r.netPay, 0)

    return {
      period: period || 'November 2026',
      generatedAt: new Date().toISOString(),
      institution: 'Mindanao State University at Naawan',
      totalEmployees: records.length,
      totalGross: Math.round(totalGross * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      totalNet: Math.round(totalNet * 100) / 100,
      records,
    }
  },
}
