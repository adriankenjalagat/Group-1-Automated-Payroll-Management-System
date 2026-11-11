import { pool } from '../../config/db'
import { auditService } from '../audit/audit.service'

export type EmployeeClassification = 'Faculty' | 'Staff'
export type EmploymentStatus = 'Active' | 'Inactive' | 'Resigned'
export type FundSource = 'F01' | 'F05' | 'F07'
export type PayBasis = 'Monthly' | 'Daily' | 'Hourly'

export interface PayrollAssignment {
  id: string
  payrollTypeId: string
  effectiveDate: string
  endDate?: string
  status: 'Active' | 'Previous'
  verificationNote: string
  fundSource?: FundSource
  notes?: string
}

export interface AppointmentHistoryItem {
  id: string
  effectiveDate: string
  changeType: string
  previousValue: string
  newValue: string
  notes?: string
}

export interface HrEmployee {
  id?: number
  employeeId: string
  name: string
  classification: EmployeeClassification
  employmentType: string
  position: string
  office: string
  supervisor: string
  employmentStatus: EmploymentStatus
  appointmentStart: string
  appointmentEnd: string
  fundSource: FundSource
  payBasis: PayBasis
  applicableRate: string
  assignments: PayrollAssignment[]
  history: AppointmentHistoryItem[]
  username?: string
  createdAt?: string
}

function mapEmployee(row: any): HrEmployee {
  return {
    id: row.id,
    employeeId: row.employee_no,
    name: row.full_name,
    classification: row.classification || 'Staff',
    employmentType: row.employment_type || 'Permanent',
    position: row.position,
    office: row.department,
    supervisor: row.supervisor || '',
    employmentStatus: row.employment_status || 'Active',
    appointmentStart: row.appointment_start || '',
    appointmentEnd: row.appointment_end || '',
    fundSource: row.fund_source || 'F01',
    payBasis: row.pay_basis || 'Monthly',
    applicableRate: String(row.monthly_salary || '0'),
    assignments: Array.isArray(row.assignments) ? row.assignments : [],
    history: Array.isArray(row.history) ? row.history : [],
    username: row.username || undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
  }
}

export const employeesService = {
  async findAll(): Promise<HrEmployee[]> {
    const res = await pool.query(
      `SELECT * FROM employees ORDER BY id ASC`,
    )
    return res.rows.map(mapEmployee)
  },

  async findById(idOrEmpNo: string): Promise<HrEmployee | undefined> {
    const clean = idOrEmpNo.trim()
    const res = await pool.query(
      `SELECT * FROM employees 
       WHERE employee_no = $1 
          OR (id::text = $1 AND $1 ~ '^[0-9]+$')
       LIMIT 1`,
      [clean],
    )
    if (res.rows.length === 0) return undefined
    return mapEmployee(res.rows[0])
  },

  async findByUsername(username: string): Promise<HrEmployee | undefined> {
    const clean = username.trim().toLowerCase().replace(/^@/, '')
    const res = await pool.query(
      `SELECT * FROM employees 
       WHERE LOWER(username) = $1 
          OR LOWER(full_name) = $1 
          OR employee_no = $1
       LIMIT 1`,
      [clean],
    )
    if (res.rows.length === 0) return undefined
    return mapEmployee(res.rows[0])
  },

  async create(data: HrEmployee, actingUserId?: number | null, ip?: string | null): Promise<HrEmployee> {
    const employeeNo = data.employeeId?.trim()
    const fullName = data.name?.trim()
    const department = data.office?.trim() || 'General Administration'
    const position = data.position?.trim() || 'Staff'
    const salary = parseFloat(data.applicableRate) || 0.0

    if (!employeeNo || !fullName) {
      const err = new Error('Employee ID (number) and Full Name are required.')
      ;(err as any).statusCode = 400
      throw err
    }

    // Check duplicate employee_no
    const dup = await pool.query(
      `SELECT id FROM employees WHERE employee_no = $1 LIMIT 1`,
      [employeeNo],
    )
    if (dup.rows.length > 0) {
      const err = new Error(`Employee ID ${employeeNo} already exists.`)
      ;(err as any).statusCode = 409
      throw err
    }

    const historyItems = data.history && data.history.length > 0 ? data.history : [
      {
        id: `HIST-${Date.now()}`,
        effectiveDate: data.appointmentStart || new Date().toISOString().split('T')[0],
        changeType: 'Record Created',
        previousValue: 'None',
        newValue: position,
      },
    ]

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const res = await client.query(
        `INSERT INTO employees (
           employee_no, full_name, department, position, monthly_salary,
           classification, employment_type, employment_status, fund_source,
           pay_basis, supervisor, appointment_start, appointment_end,
           assignments, history, username, created_at
         ) VALUES (
           $1, $2, $3, $4, $5,
           $6, $7, $8, $9,
           $10, $11, $12, $13,
           $14::jsonb, $15::jsonb, $16, CURRENT_TIMESTAMP
         ) RETURNING *`,
        [
          employeeNo,
          fullName,
          department,
          position,
          salary,
          data.classification || 'Staff',
          data.employmentType || 'Permanent',
          data.employmentStatus || 'Active',
          data.fundSource || 'F01',
          data.payBasis || 'Monthly',
          data.supervisor || '',
          data.appointmentStart || '',
          data.appointmentEnd || '',
          JSON.stringify(data.assignments || []),
          JSON.stringify(historyItems),
          data.username?.toLowerCase().trim() || null,
        ],
      )

      const created = mapEmployee(res.rows[0])

      await auditService.logAction(
        actingUserId || null,
        `Created employee record for ${fullName} (${employeeNo})`,
        { employeeId: created.id, employeeNo: created.employeeId, position, department },
        ip || null,
      )

      await client.query('COMMIT')
      return created
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  },

  async update(
    idOrEmpNo: string,
    data: Partial<HrEmployee>,
    actingUserId?: number | null,
    ip?: string | null,
  ): Promise<HrEmployee | undefined> {
    const existing = await employeesService.findById(idOrEmpNo)
    if (!existing) return undefined

    const updates: string[] = []
    const values: any[] = []
    let pIdx = 1

    if (data.name !== undefined) {
      updates.push(`full_name = $${pIdx++}`)
      values.push(data.name.trim())
    }
    if (data.office !== undefined) {
      updates.push(`department = $${pIdx++}`)
      values.push(data.office.trim())
    }
    if (data.position !== undefined) {
      updates.push(`position = $${pIdx++}`)
      values.push(data.position.trim())
    }
    if (data.applicableRate !== undefined) {
      updates.push(`monthly_salary = $${pIdx++}`)
      values.push(parseFloat(data.applicableRate) || 0)
    }
    if (data.classification !== undefined) {
      updates.push(`classification = $${pIdx++}`)
      values.push(data.classification)
    }
    if (data.employmentType !== undefined) {
      updates.push(`employment_type = $${pIdx++}`)
      values.push(data.employmentType)
    }
    if (data.employmentStatus !== undefined) {
      updates.push(`employment_status = $${pIdx++}`)
      values.push(data.employmentStatus)
    }
    if (data.fundSource !== undefined) {
      updates.push(`fund_source = $${pIdx++}`)
      values.push(data.fundSource)
    }
    if (data.payBasis !== undefined) {
      updates.push(`pay_basis = $${pIdx++}`)
      values.push(data.payBasis)
    }
    if (data.supervisor !== undefined) {
      updates.push(`supervisor = $${pIdx++}`)
      values.push(data.supervisor)
    }
    if (data.appointmentStart !== undefined) {
      updates.push(`appointment_start = $${pIdx++}`)
      values.push(data.appointmentStart)
    }
    if (data.appointmentEnd !== undefined) {
      updates.push(`appointment_end = $${pIdx++}`)
      values.push(data.appointmentEnd)
    }
    if (data.assignments !== undefined) {
      updates.push(`assignments = $${pIdx++}::jsonb`)
      values.push(JSON.stringify(data.assignments))
    }
    if (data.history !== undefined) {
      updates.push(`history = $${pIdx++}::jsonb`)
      values.push(JSON.stringify(data.history))
    }
    if (data.username !== undefined) {
      updates.push(`username = $${pIdx++}`)
      values.push(data.username ? data.username.toLowerCase().trim() : null)
    }

    if (updates.length === 0) return existing

    values.push(existing.id)

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const res = await client.query(
        `UPDATE employees SET ${updates.join(', ')} WHERE id = $${pIdx} RETURNING *`,
        values,
      )
      const updated = mapEmployee(res.rows[0])

      await auditService.logAction(
        actingUserId || null,
        `Updated employee record for ${updated.name} (${updated.employeeId})`,
        { employeeId: updated.id, employeeNo: updated.employeeId, updatedFields: Object.keys(data) },
        ip || null,
      )

      await client.query('COMMIT')
      return updated
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  },

  async delete(idOrEmpNo: string, actingUserId?: number | null, ip?: string | null): Promise<boolean> {
    const existing = await employeesService.findById(idOrEmpNo)
    if (!existing) return false

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(`DELETE FROM employees WHERE id = $1`, [existing.id])

      await auditService.logAction(
        actingUserId || null,
        `Deleted employee record for ${existing.name} (${existing.employeeId})`,
        { employeeId: existing.id, employeeNo: existing.employeeId },
        ip || null,
      )

      await client.query('COMMIT')
      return true
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  },
}
