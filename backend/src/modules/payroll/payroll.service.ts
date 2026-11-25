import { pool } from '../../config/db'
import { auditService } from '../audit/audit.service'
import { approvalsService } from '../approvals/approvals.service'

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
  const standardDays = totalWorkingDaysInPeriod > 0 ? totalWorkingDaysInPeriod : 22
  const dailyRate = monthlySalary > 0 ? monthlySalary / standardDays : 0
  const hourlyRate = dailyRate > 0 ? dailyRate / 8 : 0
  const minuteRate = hourlyRate > 0 ? hourlyRate / 60 : 0

  let basicPay = 0
  if (isProratedFirstSalary) {
    basicPay = Math.round(dailyRate * daysWorked * 100) / 100
  } else if (payBasis === 'Monthly') {
    basicPay = monthlySalary
  } else if (payBasis === 'Daily') {
    basicPay = Math.round(dailyRate * daysWorked * 100) / 100
  } else if (payBasis === 'Hourly') {
    basicPay = Math.round(hourlyRate * hoursWorked * 100) / 100
  }

  let absencesDeduction = 0
  if (payBasis === 'Monthly' && absences > 0) {
    absencesDeduction = Math.round(dailyRate * absences * 100) / 100
  }

  const tardinessMinutes = Math.max(0, latenessMinutes) + Math.max(0, undertimeMinutes)
  const tardinessDeduction = Math.round(tardinessMinutes * minuteRate * 100) / 100
  const totalAttendanceDeductions = Math.round((absencesDeduction + tardinessDeduction) * 100) / 100

  const peraAmount = 2000.0
  const isFullMonthDuty = absences < standardDays
  const peraAllowance = (isPermanent || isContractual) && isFullMonthDuty ? peraAmount : 0
  const totalAllowances = peraAllowance + adjustments
  const grossPay = Math.round((basicPay + totalAllowances) * 100) / 100

  let gsis = 0
  let philHealth = 0
  let pagIbig = 0
  let withholdingTax = 0

  if (isPermanent) {
    gsis = Math.round(monthlySalary * 0.09 * 100) / 100
    const phBase = Math.min(Math.max(monthlySalary, 10000), 100000)
    philHealth = Math.round(phBase * 0.025 * 100) / 100
    pagIbig = 200.0

    const taxableBase = Math.max(
      0,
      basicPay - (gsis + philHealth + pagIbig + totalAttendanceDeductions),
    )

    if (taxableBase <= 20833.33) {
      withholdingTax = 0
    } else if (taxableBase <= 33333.33) {
      withholdingTax = Math.round((taxableBase - 20833.33) * 0.15 * 100) / 100
    } else if (taxableBase <= 66666.67) {
      withholdingTax = Math.round((1875.0 + (taxableBase - 33333.33) * 0.2) * 100) / 100
    } else if (taxableBase <= 166666.67) {
      withholdingTax = Math.round((8541.67 + (taxableBase - 66666.67) * 0.25) * 100) / 100
    } else {
      withholdingTax = Math.round((33541.67 + (taxableBase - 166666.67) * 0.3) * 100) / 100
    }
  }

  const totalMandatory = Math.round((gsis + philHealth + pagIbig + withholdingTax) * 100) / 100
  const totalOtherDeductions =
    Math.round(otherDeductions.reduce((sum, item) => sum + (item.amount || 0), 0) * 100) / 100
  const totalDeductions =
    Math.round((totalAttendanceDeductions + totalMandatory + totalOtherDeductions) * 100) / 100
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

const PAYROLL_SELECT_SQL = `
  SELECT
    p.id,
    p.batch_no,
    p.gross_pay,
    p.total_deductions,
    p.net_pay,
    p.days_worked,
    p.absences,
    p.late_undertime_deduction,
    p.breakdown,
    p.employment_type AS emp_type_code,
    p.created_at,
    p.updated_at,
    st.name AS status_name,
    st.code AS status_code,
    p.period_label,
    o.name AS office_name,
    f.code AS fund_code,
    e.id AS employee_db_id,
    e.employee_no,
    TRIM(CONCAT_WS(' ', e.first_name, e.middle_name, e.last_name)) AS employee_name,
    a.monthly_rate,
    a.daily_rate,
    a.hourly_rate,
    w.step_name AS current_stage_name
  FROM payrolls p
  JOIN statuses st ON st.id = p.status_id
  JOIN offices o ON o.id = p.office_id
  JOIN funds f ON f.id = p.fund_id
  JOIN appointments a ON a.id = p.appointment_id
  JOIN employees e ON e.id = a.employee_id
  LEFT JOIN LATERAL (
    SELECT * FROM approval_requests WHERE entity_type = 'PAYROLL' AND entity_id = p.id ORDER BY id DESC LIMIT 1
  ) ar ON TRUE
  LEFT JOIN workflows w ON w.document_type = ar.document_type AND w.step_order = ar.current_step
`

function mapPayrollRow(row: any): PayrollRecord {
  const locked = row.status_code === 'APPROVED' || row.status_code === 'DISBURSED'
  return {
    id: Number(row.id),
    employeeId: row.employee_no || String(row.employee_db_id || ''),
    employeeName: row.employee_name || row.batch_no,
    department: row.office_name || '',
    period: row.period_label || 'November 2026',
    grossPay: parseFloat(row.gross_pay) || 0,
    deductions: parseFloat(row.total_deductions) || 0,
    netPay: parseFloat(row.net_pay) || 0,
    status: row.status_name || 'Pending',
    payrollTypeId: String(row.emp_type_code || 'REGULAR').toLowerCase(),
    payrollTypeName: row.emp_type_code || 'REGULAR',
    fundSource: row.fund_code || 'F01',
    payBasis: row.daily_rate ? 'Daily' : row.hourly_rate ? 'Hourly' : 'Monthly',
    basicPay: parseFloat(row.monthly_rate || row.gross_pay) || 0,
    attendanceDeductions: parseFloat(row.late_undertime_deduction) || 0,
    breakdown: row.breakdown && Object.keys(row.breakdown).length > 0 ? row.breakdown : undefined,
    locked,
    stage: locked ? 'Completed' : row.current_stage_name || 'Cost Center Signatory',
    currentApprovalHolder: locked ? 'Completed' : row.current_stage_name || 'Cost Center Signatory',
    readyForDv: locked,
    computationVersion: 1,
    corrections: [],
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
  }
}

export const payrollService = {
  async findAll(period?: string): Promise<PayrollRecord[]> {
    let queryText = PAYROLL_SELECT_SQL
    const params: any[] = []
    if (period) {
      queryText += ` WHERE LOWER(p.period_label) = LOWER($1)`
      params.push(period)
    }
    queryText += ` ORDER BY p.id ASC`

    const res = await pool.query(queryText, params)
    return res.rows.map(mapPayrollRow)
  },

  async findById(id: number): Promise<PayrollRecord | undefined> {
    const res = await pool.query(`${PAYROLL_SELECT_SQL} WHERE p.id = $1 LIMIT 1`, [id])
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
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Find employee + latest appointment
      let apptRes: any = { rows: [] }
      if (input.employeeId) {
        apptRes = await client.query(
          `SELECT a.*, e.employee_no,
                  TRIM(CONCAT_WS(' ', e.first_name, e.middle_name, e.last_name)) AS full_name,
                  COALESCE(a.employment_type, e.employment_type, 'REGULAR') AS emp_type_code
           FROM appointments a
           JOIN employees e ON e.id = a.employee_id
           WHERE e.employee_no = $1 OR (e.id::text = $1 AND $1 ~ '^[0-9]+$')
           ORDER BY a.effective_from DESC, a.id DESC
           LIMIT 1`,
          [String(input.employeeId)],
        )
      }
      if (apptRes.rows.length === 0) {
        apptRes = await client.query(
          `SELECT a.*, e.employee_no,
                  TRIM(CONCAT_WS(' ', e.first_name, e.middle_name, e.last_name)) AS full_name,
                  COALESCE(a.employment_type, e.employment_type, 'REGULAR') AS emp_type_code
           FROM appointments a
           JOIN employees e ON e.id = a.employee_id
           ORDER BY a.id ASC
           LIMIT 1`,
        )
      }
      if (apptRes.rows.length === 0) {
        throw new Error('No employee appointment found to compute payroll.')
      }

      const appt = apptRes.rows[0]
      const monthlySalary = parseFloat(appt.monthly_rate) || input.grossPay || 25000
      const empType = appt.emp_type_code === 'REGULAR' ? 'Permanent' : appt.emp_type_code

      const breakdown = computePayroll({
        monthlySalary,
        payBasis: input.payBasis || 'Monthly',
        classification: 'Staff',
        employmentType: empType,
        daysWorked: input.daysWorked,
        absences: input.absences,
        latenessMinutes: input.latenessMinutes,
        undertimeMinutes: input.undertimeMinutes,
        adjustments: input.adjustments,
        otherDeductions: input.otherDeductions,
        isProratedFirstSalary: input.isProratedFirstSalary,
      })

      const periodLabel = input.period || 'November 2026'

      const pendingStId = (
        await client.query(`SELECT id FROM statuses WHERE category = 'PAYROLL' AND code = 'PENDING' LIMIT 1`)
      ).rows[0].id
      const batchNo = `PB-${Date.now()}-${Math.floor(Math.random() * 1000)}`

      const payrollIns = await client.query(
        `INSERT INTO payrolls (
           batch_no, period_label, period_start, period_end, submission_deadline,
           office_id, cost_center_id, fund_id, appointment_id,
           employment_type, days_worked, absences, late_undertime_deduction,
           proration_factor, gross_pay, total_deductions, net_pay, breakdown, status_id
         ) VALUES (
           $1, $2, CURRENT_DATE, (CURRENT_DATE + INTERVAL '30 days')::date, (CURRENT_DATE + INTERVAL '25 days')::date,
           $3, $4, $5, $6,
           $7, $8, $9, $10,
           1.0000, $11, $12, $13, $14::jsonb, $15
         )
         RETURNING id`,
        [
          batchNo,
          periodLabel,
          appt.office_id,
          appt.cost_center_id,
          appt.fund_id,
          appt.id,
          appt.emp_type_code || 'REGULAR',
          input.daysWorked ?? 22,
          input.absences ?? 0,
          breakdown.attendanceDeductions.totalAttendanceDeductions,
          breakdown.grossPay,
          breakdown.totalDeductions,
          breakdown.netPay,
          JSON.stringify(breakdown),
          pendingStId,
        ],
      )
      const payrollId = Number(payrollIns.rows[0].id)

      // Initialize approval_request
      const appPendSt = (
        await client.query(`SELECT id FROM statuses WHERE category = 'APPROVAL' AND code = 'PENDING' LIMIT 1`)
      ).rows[0]?.id
      const reqBy =
        actingUserId ||
        Number((await client.query(`SELECT id FROM users ORDER BY id ASC LIMIT 1`)).rows[0].id)

      if (appPendSt) {
        await client.query(
          `INSERT INTO approval_requests (document_type, entity_type, entity_id, current_step, status_id, requested_by)
           VALUES ('PAYROLL', 'PAYROLL', $1, 1, $2, $3)`,
          [payrollId, appPendSt, reqBy],
        )
      }

      await auditService.logAction(
        reqBy,
        `Created payroll #${payrollId} for ${appt.full_name} (${input.period})`,
        { payrollId, period: input.period, netPay: breakdown.netPay },
        ip || null,
        'PAYROLL',
        payrollId,
      )

      await client.query('COMMIT')
      return (await payrollService.findById(payrollId))!
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

    const newBreakdown = computePayroll({
      monthlySalary: existing.basicPay || existing.grossPay || 25000,
      payBasis: (existing.payBasis as any) || 'Monthly',
      classification: 'Staff',
      employmentType: 'Permanent',
      daysWorked: data.daysWorked,
      absences: data.absences,
      latenessMinutes: data.latenessMinutes,
      undertimeMinutes: data.undertimeMinutes,
      adjustments: data.adjustments,
      otherDeductions: data.otherDeductions,
    })

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `UPDATE payrolls
         SET days_worked = COALESCE($1, days_worked),
             absences = COALESCE($2, absences),
             late_undertime_deduction = $3,
             gross_pay = $4,
             total_deductions = $5,
             net_pay = $6,
             breakdown = $7::jsonb,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $8`,
        [
          data.daysWorked ?? null,
          data.absences ?? null,
          newBreakdown.attendanceDeductions.totalAttendanceDeductions,
          newBreakdown.grossPay,
          newBreakdown.totalDeductions,
          newBreakdown.netPay,
          JSON.stringify(newBreakdown),
          id,
        ],
      )

      await auditService.logAction(
        actingUserId || null,
        `Recalculated payroll #${id} (${existing.netPay} -> ${newBreakdown.netPay})`,
        { payrollId: id, reason: data.reason, newNet: newBreakdown.netPay },
        ip || null,
        'PAYROLL',
        id,
      )

      await client.query('COMMIT')
      return (await payrollService.findById(id))!
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
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const pRes = await client.query(`SELECT * FROM payrolls WHERE id = $1 FOR UPDATE`, [id])
      if (pRes.rows.length === 0) {
        const err = new Error(`Payroll record #${id} not found.`)
        ;(err as any).statusCode = 404
        throw err
      }

      await approvalsService.validateAllStagesApproved(id, client)

      const appSt = (
        await client.query(`SELECT id FROM statuses WHERE category = 'PAYROLL' AND code = 'APPROVED' LIMIT 1`)
      ).rows[0].id
      await client.query(`UPDATE payrolls SET status_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [appSt, id])

      const schedSt = (
        await client.query(`SELECT id FROM statuses WHERE category = 'DISBURSEMENT' AND code = 'SCHEDULED' LIMIT 1`)
      ).rows[0].id
      const slipNo = `OBL-${new Date().getFullYear()}-${String(id).padStart(4, '0')}`
      await client.query(
        `INSERT INTO obligation_slips (payroll_id, slip_no, amount, status_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (slip_no) DO NOTHING`,
        [id, slipNo, pRes.rows[0].gross_pay, schedSt],
      )

      await auditService.logAction(
        actingUserId || null,
        `Locked payroll #${id}`,
        { payrollId: id, status: 'Approved', locked: true },
        ip || null,
        'PAYROLL',
        id,
      )

      await client.query('COMMIT')
      return (await payrollService.findById(id))!
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  },
}
