import { pool } from '../../config/db'
import { auditService } from '../audit/audit.service'

export interface DeductionItem {
  id: string
  name: string
  basis: string
  amount: number
  explanation: string
}

export interface PayrollBreakdown {
  basicPay: number
  allowances: number
  peraAllowance: number
  grossPay: number
  attendanceDeductions: {
    absencesDeduction: number
    absencesCount: number
    tardinessDeduction: number
    latenessMinutes: number
    undertimeMinutes: number
    totalAttendanceDeductions: number
  }
  mandatoryDeductions: {
    gsis: number
    philHealth: number
    pagIbig: number
    withholdingTax: number
    totalMandatoryDeductions: number
  }
  otherDeductions: DeductionItem[]
  totalDeductions: number
  netPay: number
  rates: {
    monthlySalary: number
    dailyRate: number
    hourlyRate: number
    minuteRate: number
  }
}

export interface PayrollRecord {
  id: number
  employeeId: string
  employeeName: string
  department: string
  period: string
  grossPay: number
  deductions: number
  netPay: number
  status: string
  payrollTypeId?: string
  payrollTypeName?: string
  fundSource?: string
  payBasis?: string
  basicPay?: number
  allowances?: number
  attendanceDeductions?: number
  mandatoryDeductions?: number
  otherDeductions?: number
  breakdown?: PayrollBreakdown
  locked?: boolean
  lockedAt?: string
  currentApprovalHolder?: string
  stage?: string
  readyForDv?: boolean
  computationVersion?: number
  corrections?: any[]
  createdAt?: string
  updatedAt?: string
}

function mapPayrollRow(row: any): PayrollRecord {
  return {
    id: row.id,
    employeeId: row.employee_no || String(row.employee_id),
    employeeName: row.employee_name || '',
    department: row.department || '',
    period: row.period || '',
    grossPay: parseFloat(row.gross_pay) || 0,
    deductions: parseFloat(row.deductions) || 0,
    netPay: parseFloat(row.net_pay) || 0,
    status: row.status || 'Pending',
    payrollTypeId: row.payroll_type_id,
    payrollTypeName: row.payroll_type_name,
    fundSource: row.fund_source || 'F01',
    payBasis: row.pay_basis || 'Monthly',
    basicPay: parseFloat(row.basic_pay) || 0,
    allowances: parseFloat(row.allowances) || 0,
    attendanceDeductions: parseFloat(row.attendance_deductions) || 0,
    mandatoryDeductions: parseFloat(row.mandatory_deductions) || 0,
    otherDeductions: parseFloat(row.other_deductions) || 0,
    breakdown: row.breakdown,
    locked: Boolean(row.locked),
    lockedAt: row.locked_at ? new Date(row.locked_at).toISOString() : undefined,
    currentApprovalHolder: row.current_approval_holder,
    stage: row.stage || 'Draft',
    readyForDv: Boolean(row.ready_for_dv),
    computationVersion: Number(row.computation_version) || 1,
    corrections: Array.isArray(row.corrections) ? row.corrections : [],
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
  }
}

/**
 * Standard Philippine Government / State University Payroll Calculation Engine
 */
export function computePayroll(params: {
  monthlySalary: number
  payBasis: 'Monthly' | 'Daily' | 'Hourly'
  classification: 'Faculty' | 'Staff'
  employmentType: 'Permanent' | 'Contractual' | 'Job Order' | string
  daysWorked?: number
  absences?: number
  latenessMinutes?: number
  undertimeMinutes?: number
  hoursWorked?: number
  adjustments?: number
  otherDeductions?: DeductionItem[]
  isProratedFirstSalary?: boolean
  totalWorkingDaysInPeriod?: number
}): PayrollBreakdown {
  const {
    monthlySalary,
    payBasis,
    employmentType,
    daysWorked = 22,
    absences = 0,
    latenessMinutes = 0,
    undertimeMinutes = 0,
    hoursWorked = 176,
    adjustments = 0,
    otherDeductions = [],
    isProratedFirstSalary = false,
    totalWorkingDaysInPeriod = 22,
  } = params

  const isPermanent = /permanent|regular/i.test(employmentType)
  const isContractual = /contractual/i.test(employmentType)

  /**
   * PENDING OFFICIAL CONFIRMATION: The 22-day divisor is a standard Civil Service
   * assumption. The actual number of working days may vary per university policy.
   * This value is configurable via the totalWorkingDaysInPeriod parameter.
   */
  const standardDays = totalWorkingDaysInPeriod > 0 ? totalWorkingDaysInPeriod : 22
  const dailyRate = monthlySalary > 0 ? monthlySalary / standardDays : 0
  const hourlyRate = dailyRate > 0 ? dailyRate / 8 : 0
  /**
   * PENDING OFFICIAL CONFIRMATION: Minute-based deduction method (hourlyRate / 60).
   * The university may use a different rounding or calculation method.
   */
  const minuteRate = hourlyRate > 0 ? hourlyRate / 60 : 0

  let basicPay = 0
  if (isProratedFirstSalary) {
    // Prorated first month calculation
    basicPay = Math.round(dailyRate * daysWorked * 100) / 100
  } else if (payBasis === 'Monthly') {
    basicPay = monthlySalary
  } else if (payBasis === 'Daily') {
    basicPay = Math.round(dailyRate * daysWorked * 100) / 100
  } else if (payBasis === 'Hourly') {
    basicPay = Math.round(hourlyRate * hoursWorked * 100) / 100
  }

  // Attendance Deductions
  let absencesDeduction = 0
  if (payBasis === 'Monthly' && absences > 0) {
    absencesDeduction = Math.round(dailyRate * absences * 100) / 100
  }

  const tardinessMinutes = Math.max(0, latenessMinutes) + Math.max(0, undertimeMinutes)
  const tardinessDeduction = Math.round(tardinessMinutes * minuteRate * 100) / 100
  const totalAttendanceDeductions = Math.round((absencesDeduction + tardinessDeduction) * 100) / 100

  /**
   * PERA (Personnel Economic Relief Allowance) per SRS:
   * - ₱2,000 monthly allowance (configurable via peraAmount parameter, defaults to 2000)
   * - Eligible: Permanent/Regular AND Contractual employees
   * - Requires: Full month of duty (no full-month LWOP)
   * - Job Order employees are NOT eligible
   *
   * PENDING OFFICIAL CONFIRMATION: The exact definition of "full month of duty"
   * may require further clarification from the university. Currently interpreted as
   * having zero absences equal to or exceeding the full working period.
   */
  const peraAmount = 2000.0
  const isFullMonthDuty = absences < standardDays
  let peraAllowance = 0
  if ((isPermanent || isContractual) && isFullMonthDuty) {
    peraAllowance = peraAmount
  }
  const totalAllowances = peraAllowance + adjustments

  // Gross Pay
  const grossPay = Math.round((basicPay + totalAllowances) * 100) / 100

  /**
   * Mandatory Statutory Deductions (applied to Permanent / Regular government employees).
   *
   * PENDING OFFICIAL CONFIRMATION: GSIS (9%), PhilHealth (2.5%), Pag-IBIG (₱200 cap),
   * and BIR withholding tax brackets used below are based on standard government rates.
   * These should be verified against official university and government schedules.
   * Rounding is applied as round-to-nearest-cent (Math.round(x * 100) / 100).
   */
  let gsis = 0
  let philHealth = 0
  let pagIbig = 0
  let withholdingTax = 0

  if (isPermanent) {
    // GSIS: 9% of Basic Monthly Salary
    gsis = Math.round(monthlySalary * 0.09 * 100) / 100

    // PhilHealth: 2.5% Employee Share (Min 250, Max 2500)
    const phBase = Math.min(Math.max(monthlySalary, 10000), 100000)
    philHealth = Math.round(phBase * 0.025 * 100) / 100

    // Pag-IBIG: Standard employee share capped at 200.00
    pagIbig = 200.0

    // Withholding Tax (BIR revised withholding tax brackets)
    const taxableBase = Math.max(
      0,
      basicPay - (gsis + philHealth + pagIbig + totalAttendanceDeductions),
    )

    if (taxableBase <= 20833.33) {
      withholdingTax = 0
    } else if (taxableBase <= 33333.33) {
      withholdingTax = Math.round((taxableBase - 20833.33) * 0.15 * 100) / 100
    } else if (taxableBase <= 66666.67) {
      withholdingTax = Math.round((1875.0 + (taxableBase - 33333.33) * 0.20) * 100) / 100
    } else if (taxableBase <= 166666.67) {
      withholdingTax = Math.round((8541.67 + (taxableBase - 66666.67) * 0.25) * 100) / 100
    } else {
      withholdingTax = Math.round((33541.67 + (taxableBase - 166666.67) * 0.30) * 100) / 100
    }
  }

  const totalMandatory = Math.round((gsis + philHealth + pagIbig + withholdingTax) * 100) / 100
  const totalOtherDeductions = Math.round(
    otherDeductions.reduce((sum, item) => sum + (item.amount || 0), 0) * 100,
  ) / 100

  const totalDeductions = Math.round(
    (totalAttendanceDeductions + totalMandatory + totalOtherDeductions) * 100,
  ) / 100

  const netPay = Math.max(0, Math.round((grossPay - totalDeductions) * 100) / 100)

  return {
    basicPay,
    allowances: totalAllowances,
    peraAllowance,
    grossPay,
    attendanceDeductions: {
      absencesDeduction,
      absencesCount: absences,
      tardinessDeduction,
      latenessMinutes,
      undertimeMinutes,
      totalAttendanceDeductions,
    },
    mandatoryDeductions: {
      gsis,
      philHealth,
      pagIbig,
      withholdingTax,
      totalMandatoryDeductions: totalMandatory,
    },
    otherDeductions,
    totalDeductions,
    netPay,
    rates: {
      monthlySalary,
      dailyRate: Math.round(dailyRate * 100) / 100,
      hourlyRate: Math.round(hourlyRate * 100) / 100,
      minuteRate: Math.round(minuteRate * 10000) / 10000,
    },
  }
}

export const payrollService = {
  async findAll(period?: string): Promise<PayrollRecord[]> {
    let queryText = `
      SELECT p.*, e.employee_no
      FROM payroll p
      LEFT JOIN employees e ON p.employee_id = e.id
    `
    const params: any[] = []
    if (period) {
      queryText += ` WHERE p.period = $1`
      params.push(period)
    }
    queryText += ` ORDER BY p.id ASC`

    const res = await pool.query(queryText, params)
    return res.rows.map(mapPayrollRow)
  },

  async findById(id: number): Promise<PayrollRecord | undefined> {
    const res = await pool.query(
      `SELECT p.*, e.employee_no
       FROM payroll p
       LEFT JOIN employees e ON p.employee_id = e.id
       WHERE p.id = $1
       LIMIT 1`,
      [id],
    )
    if (res.rows.length === 0) return undefined
    return mapPayrollRow(res.rows[0])
  },

  async create(
    input: {
      employeeId?: string | number
      employeeName?: string
      department?: string
      period: string
      payrollTypeId?: string
      payrollTypeName?: string
      fundSource?: string
      payBasis?: 'Monthly' | 'Daily' | 'Hourly'
      grossPay?: number
      deductions?: number
      netPay?: number
      daysWorked?: number
      absences?: number
      latenessMinutes?: number
      undertimeMinutes?: number
      adjustments?: number
      otherDeductions?: DeductionItem[]
      isProratedFirstSalary?: boolean
    },
    actingUserId?: number | null,
    ip?: string | null,
  ): Promise<PayrollRecord> {
    // Resolve employee if provided
    let empId: number | null = null
    let empName = input.employeeName?.trim() || ''
    let department = input.department?.trim() || ''
    let monthlySalary = 0
    let classification: 'Faculty' | 'Staff' = 'Staff'
    let employmentType = 'Permanent'
    let payBasis: 'Monthly' | 'Daily' | 'Hourly' = input.payBasis || 'Monthly'
    let fundSource = input.fundSource || 'F01'

    if (input.employeeId) {
      const empRes = await pool.query(
        `SELECT id, employee_no, full_name, department, monthly_salary, classification, employment_type, pay_basis, fund_source 
         FROM employees 
         WHERE employee_no = $1 OR (id::text = $1 AND $1 ~ '^[0-9]+$') 
         LIMIT 1`,
        [String(input.employeeId)],
      )
      if (empRes.rows.length > 0) {
        const emp = empRes.rows[0]
        empId = emp.id
        empName = emp.full_name
        department = emp.department
        monthlySalary = parseFloat(emp.monthly_salary) || 0
        classification = (emp.classification as any) || 'Staff'
        employmentType = emp.employment_type || 'Permanent'
        payBasis = (emp.pay_basis as any) || payBasis
        fundSource = emp.fund_source || fundSource
      }
    }

    if (!empName) {
      throw new Error('Employee name is required.')
    }

    // Compute payroll breakdown
    let breakdown: PayrollBreakdown
    if (monthlySalary > 0) {
      breakdown = computePayroll({
        monthlySalary,
        payBasis,
        classification,
        employmentType,
        daysWorked: input.daysWorked,
        absences: input.absences,
        latenessMinutes: input.latenessMinutes,
        undertimeMinutes: input.undertimeMinutes,
        adjustments: input.adjustments,
        otherDeductions: input.otherDeductions,
        isProratedFirstSalary: input.isProratedFirstSalary,
      })
    } else {
      const gross = input.grossPay || 0
      const ded = input.deductions || 0
      breakdown = {
        basicPay: gross,
        allowances: 0,
        peraAllowance: 0,
        grossPay: gross,
        attendanceDeductions: {
          absencesDeduction: 0,
          absencesCount: input.absences || 0,
          tardinessDeduction: 0,
          latenessMinutes: input.latenessMinutes || 0,
          undertimeMinutes: input.undertimeMinutes || 0,
          totalAttendanceDeductions: 0,
        },
        mandatoryDeductions: {
          gsis: 0,
          philHealth: 0,
          pagIbig: 0,
          withholdingTax: 0,
          totalMandatoryDeductions: 0,
        },
        otherDeductions: input.otherDeductions || [],
        totalDeductions: ded,
        netPay: gross - ded,
        rates: {
          monthlySalary: gross,
          dailyRate: 0,
          hourlyRate: 0,
          minuteRate: 0,
        },
      }
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const res = await client.query(
        `INSERT INTO payroll (
           employee_id, employee_name, department, period,
           gross_pay, deductions, net_pay, status,
           payroll_type_id, payroll_type_name, fund_source, pay_basis,
           basic_pay, allowances, attendance_deductions, mandatory_deductions, other_deductions,
           breakdown, locked, stage, ready_for_dv, computation_version, created_at, updated_at
         ) VALUES (
           $1, $2, $3, $4,
           $5, $6, $7, 'Pending',
           $8, $9, $10, $11,
           $12, $13, $14, $15, $16,
           $17::jsonb, FALSE, 'Draft', FALSE, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
         ) RETURNING *`,
        [
          empId,
          empName,
          department,
          input.period,
          breakdown.grossPay,
          breakdown.totalDeductions,
          breakdown.netPay,
          input.payrollTypeId || 'regular-monthly',
          input.payrollTypeName || 'Regular Monthly Payroll',
          fundSource,
          payBasis,
          breakdown.basicPay,
          breakdown.allowances,
          breakdown.attendanceDeductions.totalAttendanceDeductions,
          breakdown.mandatoryDeductions.totalMandatoryDeductions,
          breakdown.otherDeductions.reduce((s, i) => s + i.amount, 0),
          JSON.stringify(breakdown),
        ],
      )

      const row = res.rows[0]

      // Initialize approval step: HR / Cost Center Signatory
      await client.query(
        `INSERT INTO approvals (payroll_id, stage, status, updated_at)
         VALUES ($1, 'Cost Center Signatory', 'Pending', CURRENT_TIMESTAMP)`,
        [row.id],
      )

      await auditService.logAction(
        actingUserId || null,
        `Created payroll record #${row.id} for ${empName} (${input.period}) - Net Pay: ${breakdown.netPay}`,
        { payrollId: row.id, employeeId: empId, period: input.period, netPay: breakdown.netPay },
        ip || null,
      )

      await client.query('COMMIT')
      return mapPayrollRow(row)
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  },

  async updateCorrection(
    id: number,
    data: {
      action: string
      reason: string
      evidenceReference?: string
      daysWorked?: number
      absences?: number
      latenessMinutes?: number
      undertimeMinutes?: number
      adjustments?: number
      otherDeductions?: DeductionItem[]
    },
    actingUserId?: number | null,
    ip?: string | null,
  ): Promise<PayrollRecord> {
    const existing = await payrollService.findById(id)
    if (!existing) {
      const err = new Error(`Payroll record #${id} not found.`)
      ;(err as any).statusCode = 404
      throw err
    }

    if (existing.locked) {
      const err = new Error(`Payroll record #${id} is locked after approval and cannot be modified.`)
      ;(err as any).statusCode = 403
      throw err
    }

    // Load employee salary info to recompute
    let monthlySalary = existing.breakdown?.rates?.monthlySalary || existing.basicPay || 0
    let classification: 'Faculty' | 'Staff' = 'Staff'
    let employmentType = 'Permanent'
    let payBasis: any = existing.payBasis || 'Monthly'

    if (existing.employeeId) {
      const empRes = await pool.query(
        `SELECT monthly_salary, classification, employment_type, pay_basis FROM employees 
         WHERE employee_no = $1 OR (id::text = $1 AND $1 ~ '^[0-9]+$') LIMIT 1`,
        [existing.employeeId],
      )
      if (empRes.rows.length > 0) {
        monthlySalary = parseFloat(empRes.rows[0].monthly_salary) || monthlySalary
        classification = empRes.rows[0].classification || classification
        employmentType = empRes.rows[0].employment_type || employmentType
        payBasis = empRes.rows[0].pay_basis || payBasis
      }
    }

    const newBreakdown = computePayroll({
      monthlySalary,
      payBasis,
      classification,
      employmentType,
      daysWorked: data.daysWorked ?? existing.breakdown?.attendanceDeductions?.absencesCount,
      absences: data.absences ?? existing.breakdown?.attendanceDeductions?.absencesCount,
      latenessMinutes: data.latenessMinutes ?? existing.breakdown?.attendanceDeductions?.latenessMinutes,
      undertimeMinutes: data.undertimeMinutes ?? existing.breakdown?.attendanceDeductions?.undertimeMinutes,
      adjustments: data.adjustments ?? 0,
      otherDeductions: data.otherDeductions ?? existing.breakdown?.otherDeductions,
    })

    const correctionEvent = {
      id: `CORR-${Date.now()}`,
      action: data.action || 'Payroll Recalculation',
      previousValue: String(existing.netPay),
      newValue: String(newBreakdown.netPay),
      reason: data.reason || 'Attendance or deduction adjustment',
      evidenceReference: data.evidenceReference || '',
      recordedBy: actingUserId ? `User #${actingUserId}` : 'Accounting',
      recordedAt: new Date().toISOString(),
    }

    const newCorrections = [...(existing.corrections || []), correctionEvent]
    const newVersion = (existing.computationVersion || 1) + 1

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const res = await client.query(
        `UPDATE payroll SET
           gross_pay = $1,
           deductions = $2,
           net_pay = $3,
           basic_pay = $4,
           allowances = $5,
           attendance_deductions = $6,
           mandatory_deductions = $7,
           other_deductions = $8,
           breakdown = $9::jsonb,
           corrections = $10::jsonb,
           computation_version = $11,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $12
         RETURNING *`,
        [
          newBreakdown.grossPay,
          newBreakdown.totalDeductions,
          newBreakdown.netPay,
          newBreakdown.basicPay,
          newBreakdown.allowances,
          newBreakdown.attendanceDeductions.totalAttendanceDeductions,
          newBreakdown.mandatoryDeductions.totalMandatoryDeductions,
          newBreakdown.otherDeductions.reduce((s, i) => s + i.amount, 0),
          JSON.stringify(newBreakdown),
          JSON.stringify(newCorrections),
          newVersion,
          id,
        ],
      )

      await auditService.logAction(
        actingUserId || null,
        `Corrected/recalculated payroll #${id} for ${existing.employeeName} - Net Pay: ${existing.netPay} -> ${newBreakdown.netPay}`,
        { payrollId: id, previousNet: existing.netPay, newNet: newBreakdown.netPay, reason: data.reason },
        ip || null,
      )

      await client.query('COMMIT')
      return mapPayrollRow(res.rows[0])
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  },

  async lockPayroll(
    id: number,
    actingUserId?: number | null,
    ip?: string | null,
  ): Promise<PayrollRecord> {
    const existing = await payrollService.findById(id)
    if (!existing) {
      const err = new Error(`Payroll record #${id} not found.`)
      ;(err as any).statusCode = 404
      throw err
    }

    const res = await pool.query(
      `UPDATE payroll SET
         locked = TRUE,
         locked_at = CURRENT_TIMESTAMP,
         locked_by = $1,
         stage = 'Completed',
         status = 'Approved',
         ready_for_dv = TRUE,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [actingUserId || null, id],
    )

    await auditService.logAction(
      actingUserId || null,
      `Final approval and locking of payroll #${id} for ${existing.employeeName}`,
      { payrollId: id, status: 'Approved', locked: true, readyForDv: true },
      ip || null,
    )

    return mapPayrollRow(res.rows[0])
  },
}
