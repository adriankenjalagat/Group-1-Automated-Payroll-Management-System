import { pool } from '../../config/db'
import { auditService } from '../audit/audit.service'
import type { UserRole } from '../../middleware/auth'

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

function mapPayslipRow(row: any): PayslipRecord {
  return {
    id: row.id,
    employeeId: row.employee_no || String(row.employee_id),
    employeeNo: row.employee_no,
    employeeName: row.full_name,
    department: row.department,
    period: row.period,
    grossPay: parseFloat(row.gross_pay) || 0,
    deductions: parseFloat(row.deductions) || 0,
    netPay: parseFloat(row.net_pay) || 0,
    payrollTitle: row.payroll_title || 'Regular Monthly Payroll',
    status: row.status || 'Pending',
    releasedAt: row.released_at ? new Date(row.released_at).toISOString() : undefined,
    breakdown: row.breakdown,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  }
}

export const payslipsService = {
  async findAll(options: {
    employeeId?: string
    releasedOnly?: boolean
    period?: string
  }): Promise<PayslipRecord[]> {
    let queryText = `
      SELECT p.*, e.employee_no, e.full_name, e.department
      FROM payslips p
      LEFT JOIN employees e ON p.employee_id = e.id
    `
    const conditions: string[] = []
    const params: any[] = []
    let pIdx = 1

    if (options.releasedOnly) {
      conditions.push(`p.status = 'Released'`)
    }

    if (options.employeeId) {
      conditions.push(`(e.employee_no = $${pIdx} OR (p.employee_id::text = $${pIdx} AND $${pIdx} ~ '^[0-9]+$'))`)
      params.push(options.employeeId.trim())
      pIdx++
    }

    if (options.period) {
      conditions.push(`p.period = $${pIdx++}`)
      params.push(options.period.trim())
    }

    if (conditions.length > 0) {
      queryText += ` WHERE ${conditions.join(' AND ')}`
    }

    queryText += ` ORDER BY p.id DESC`

    const res = await pool.query(queryText, params)
    return res.rows.map(mapPayslipRow)
  },

  async findByEmployee(
    employeeIdOrNo: string,
    releasedOnly = true,
  ): Promise<PayslipRecord[]> {
    return payslipsService.findAll({ employeeId: employeeIdOrNo, releasedOnly })
  },

  async findById(id: number): Promise<PayslipRecord | undefined> {
    const res = await pool.query(
      `SELECT p.*, e.employee_no, e.full_name, e.department
       FROM payslips p
       LEFT JOIN employees e ON p.employee_id = e.id
       WHERE p.id = $1
       LIMIT 1`,
      [id],
    )
    if (res.rows.length === 0) return undefined
    return mapPayslipRow(res.rows[0])
  },

  /**
   * Generates Deduction Report for a given period
   */
  async getDeductionReport(period?: string): Promise<any> {
    const records = await payslipsService.findAll({ releasedOnly: false, period })

    let totalGsis = 0
    let totalPhilHealth = 0
    let totalPagIbig = 0
    let totalTax = 0
    let totalAttendance = 0
    let totalOther = 0

    const rows = records.map((r) => {
      const bk = r.breakdown || {}
      const mand = bk.mandatoryDeductions || {}
      const att = bk.attendanceDeductions || {}

      const gsis = mand.gsis || 0
      const ph = mand.philHealth || 0
      const pagIbig = mand.pagIbig || 0
      const tax = mand.withholdingTax || 0
      const attDed = att.totalAttendanceDeductions || 0
      const other = (bk.otherDeductions || []).reduce((s: number, i: any) => s + (i.amount || 0), 0)

      totalGsis += gsis
      totalPhilHealth += ph
      totalPagIbig += pagIbig
      totalTax += tax
      totalAttendance += attDed
      totalOther += other

      return {
        employeeNo: r.employeeNo || r.employeeId,
        employeeName: r.employeeName,
        department: r.department,
        period: r.period,
        gsis,
        philHealth: ph,
        pagIbig,
        withholdingTax: tax,
        attendanceDeductions: attDed,
        otherDeductions: other,
        totalDeductions: r.deductions,
      }
    })

    return {
      period: period || 'All Periods',
      generatedAt: new Date().toISOString(),
      summary: {
        totalGsis: Math.round(totalGsis * 100) / 100,
        totalPhilHealth: Math.round(totalPhilHealth * 100) / 100,
        totalPagIbig: Math.round(totalPagIbig * 100) / 100,
        totalWithholdingTax: Math.round(totalTax * 100) / 100,
        totalAttendanceDeductions: Math.round(totalAttendance * 100) / 100,
        totalOtherDeductions: Math.round(totalOther * 100) / 100,
        grandTotalDeductions: Math.round((totalGsis + totalPhilHealth + totalPagIbig + totalTax + totalAttendance + totalOther) * 100) / 100,
      },
      rows,
    }
  },

  /**
   * Generates Payroll Register Report
   */
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
