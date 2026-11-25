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
  bankAccountNumber?: string
  bankName?: string
  assignments: PayrollAssignment[]
  history: AppointmentHistoryItem[]
  username?: string
  createdAt?: string
}

export function maskBankAccount(accountNumber?: string | null): string | undefined {
  if (!accountNumber) return undefined
  const clean = accountNumber.trim()
  if (!clean) return undefined
  if (clean.length <= 4) return '****'
  return '*'.repeat(clean.length - 4) + clean.slice(-4)
}

function splitFullName(fullName: string): { firstName: string; middleName: string | null; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: 'Employee', middleName: null, lastName: 'Record' }
  if (parts.length === 1) return { firstName: parts[0], middleName: null, lastName: parts[0] }
  if (parts.length === 2) return { firstName: parts[0], middleName: null, lastName: parts[1] }
  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(' '),
    lastName: parts[parts.length - 1],
  }
}

const EMPLOYEE_SELECT_SQL = `
  SELECT
    e.id,
    e.employee_no,
    TRIM(CONCAT_WS(' ', e.first_name, e.middle_name, e.last_name)) AS full_name,
    e.birth_date,
    e.employment_type,
    e.bank_account_no,
    e.tin,
    e.gsis_no,
    e.philhealth_no,
    e.pagibig_no,
    st.name AS status_name,
    u.username,
    a.id AS appointment_id,
    a.position_title,
    a.monthly_rate,
    a.daily_rate,
    a.hourly_rate,
    a.effective_from,
    a.effective_to,
    o.name AS office_name,
    COALESCE(a.employment_type, e.employment_type, 'REGULAR') AS employment_type_code,
    f.code AS fund_code,
    COALESCE(
      NULLIF(TRIM(CONCAT_WS(' ', he.first_name, he.last_name)), ''),
      hu.username,
      ''
    ) AS supervisor_name
  FROM employees e
  LEFT JOIN statuses st ON st.id = e.status_id
  LEFT JOIN users u ON u.employee_id = e.id
  LEFT JOIN LATERAL (
    SELECT *
    FROM appointments
    WHERE employee_id = e.id
    ORDER BY effective_from DESC, id DESC
    LIMIT 1
  ) a ON TRUE
  LEFT JOIN offices o ON o.id = a.office_id
  LEFT JOIN users hu ON hu.id = o.head_user_id
  LEFT JOIN employees he ON he.id = hu.employee_id
  LEFT JOIN funds f ON f.id = a.fund_id
`

function mapEmployee(row: any, options?: { unmaskBank?: boolean }): HrEmployee {
  const empTypeCode = String(row.employment_type_code || 'REGULAR').toUpperCase()
  const classification: EmployeeClassification =
    empTypeCode === 'LECTURER' || /faculty|professor|instructor|dean/i.test(row.position_title || '')
      ? 'Faculty'
      : 'Staff'

  let payBasis: PayBasis = 'Monthly'
  let rate = row.monthly_rate
  if (!rate && row.daily_rate) {
    payBasis = 'Daily'
    rate = row.daily_rate
  } else if (!rate && row.hourly_rate) {
    payBasis = 'Hourly'
    rate = row.hourly_rate
  }

  const rawFund = String(row.fund_code || 'F01').toUpperCase()
  const fundSource: FundSource =
    rawFund === '05' || rawFund === 'F05'
      ? 'F05'
      : rawFund === '07' || rawFund === 'F07'
        ? 'F07'
        : 'F01'

  const statusName = String(row.status_name || 'Active')
  const employmentStatus: EmploymentStatus =
    statusName === 'Inactive' || statusName === 'Resigned' ? statusName : 'Active'

  const empTypeDisplay =
    empTypeCode === 'REGULAR'
      ? 'Permanent'
      : empTypeCode === 'CONTRACTUAL'
        ? 'Contractual'
        : empTypeCode === 'JO'
          ? 'Job Order'
          : empTypeCode === 'LECTURER'
            ? 'Lecturer'
            : 'Permanent'

  return {
    id: Number(row.id),
    employeeId: row.employee_no,
    name: row.full_name,
    classification,
    employmentType: empTypeDisplay,
    position: row.position_title || 'Staff',
    office: row.office_name || 'General Administration',
    supervisor: row.supervisor_name || '',
    employmentStatus,
    appointmentStart: row.effective_from ? new Date(row.effective_from).toISOString().split('T')[0] : '',
    appointmentEnd: row.effective_to ? new Date(row.effective_to).toISOString().split('T')[0] : '',
    fundSource,
    payBasis,
    applicableRate: String(rate || '0'),
    bankAccountNumber: options?.unmaskBank
      ? (row.bank_account_no || undefined)
      : maskBankAccount(row.bank_account_no),
    bankName: row.bank_account_no ? 'LandBank' : undefined,
    assignments: [],
    history: [],
    username: row.username || undefined,
  }
}

async function resolveLookups(client: any, data: Partial<HrEmployee>) {
  const statusCode = (data.employmentStatus || 'Active').toUpperCase()
  const statusRes = await client.query(
    `SELECT id FROM statuses WHERE category = 'EMPLOYEE' AND UPPER(code) = $1 LIMIT 1`,
    [statusCode],
  )
  const statusId = Number(
    statusRes.rows[0]?.id ||
      (await client.query(`SELECT id FROM statuses WHERE category = 'EMPLOYEE' ORDER BY id ASC LIMIT 1`)).rows[0].id,
  )

  const officeName = data.office?.trim() || 'General Administration'
  let officeRes = await client.query(
    `SELECT id FROM offices WHERE LOWER(name) = LOWER($1) OR LOWER(code) = LOWER($1) LIMIT 1`,
    [officeName],
  )
  let officeId: number
  if (officeRes.rows.length > 0) {
    officeId = Number(officeRes.rows[0].id)
  } else {
    const code = officeName.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 12) + '-' + Date.now().toString().slice(-4)
    officeId = Number((await client.query(`INSERT INTO offices (code, name) VALUES ($1, $2) RETURNING id`, [code, officeName])).rows[0].id)
  }

  let ccRes = await client.query(
    `SELECT id FROM cost_centers WHERE LOWER(name) = LOWER($1) OR LOWER(code) = LOWER($1) LIMIT 1`,
    [officeName],
  )
  let costCenterId: number
  if (ccRes.rows.length > 0) {
    costCenterId = Number(ccRes.rows[0].id)
  } else {
    const code = officeName.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 12) + '-' + Date.now().toString().slice(-4)
    costCenterId = Number((await client.query(`INSERT INTO cost_centers (code, name) VALUES ($1, $2) RETURNING id`, [code, officeName])).rows[0].id)
  }

  const fundCode = (data.fundSource || 'F01').toUpperCase()
  const fundRes = await client.query(
    `SELECT id FROM funds WHERE UPPER(code) = $1 OR UPPER(code) = $2 LIMIT 1`,
    [fundCode, fundCode.replace(/^F/, '')],
  )
  const fundId = Number(
    fundRes.rows[0]?.id || (await client.query(`SELECT id FROM funds ORDER BY id ASC LIMIT 1`)).rows[0].id,
  )

  const empTypeStr = (data.employmentType || 'Permanent').toLowerCase()
  const employmentType = empTypeStr.includes('contract')
    ? 'CONTRACTUAL'
    : empTypeStr.includes('job') || empTypeStr === 'jo'
      ? 'JO'
      : empTypeStr.includes('lect')
        ? 'LECTURER'
        : 'REGULAR'

  return { statusId, officeId, costCenterId, fundId, employmentType }
}

export const employeesService = {
  async findAll(): Promise<HrEmployee[]> {
    const res = await pool.query(`${EMPLOYEE_SELECT_SQL} ORDER BY e.id ASC`)
    return res.rows.map((row) => mapEmployee(row))
  },

  async findById(idOrEmpNo: string, options?: { unmaskBank?: boolean }): Promise<HrEmployee | undefined> {
    const clean = idOrEmpNo.trim()
    const res = await pool.query(
      `${EMPLOYEE_SELECT_SQL}
       WHERE e.employee_no = $1
          OR (e.id::text = $1 AND $1 ~ '^[0-9]+$')
       LIMIT 1`,
      [clean],
    )
    if (res.rows.length === 0) return undefined
    return mapEmployee(res.rows[0], options)
  },

  async findByUsername(username: string, options?: { unmaskBank?: boolean }): Promise<HrEmployee | undefined> {
    const clean = username.trim().toLowerCase().replace(/^@/, '')
    const res = await pool.query(
      `${EMPLOYEE_SELECT_SQL}
       WHERE LOWER(u.username) = $1
          OR LOWER(TRIM(CONCAT_WS(' ', e.first_name, e.middle_name, e.last_name))) = $1
          OR LOWER(e.employee_no) = $1
       LIMIT 1`,
      [clean],
    )
    if (res.rows.length === 0) return undefined
    return mapEmployee(res.rows[0], options)
  },

  async create(data: HrEmployee, actingUserId?: number | null, ip?: string | null): Promise<HrEmployee> {
    const employeeNo = data.employeeId?.trim()
    const fullName = data.name?.trim()
    const position = data.position?.trim() || 'Staff'
    const rate = parseFloat(data.applicableRate) || 0.0

    if (!employeeNo || !fullName) {
      const err = new Error('Employee ID (number) and Full Name are required.')
      ;(err as any).statusCode = 400
      throw err
    }

    const dup = await pool.query(`SELECT id FROM employees WHERE employee_no = $1 LIMIT 1`, [employeeNo])
    if (dup.rows.length > 0) {
      const err = new Error(`Employee ID ${employeeNo} already exists.`)
      ;(err as any).statusCode = 409
      throw err
    }

    const { firstName, middleName, lastName } = splitFullName(fullName)

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const { statusId, officeId, costCenterId, fundId, employmentType } = await resolveLookups(client, data)

      const empRes = await client.query(
        `INSERT INTO employees (
           employee_no, last_name, first_name, middle_name, birth_date,
           employment_type, bank_account_no, status_id
         ) VALUES ($1, $2, $3, $4, '1990-01-01', $5, $6, $7)
         RETURNING id`,
        [
          employeeNo,
          lastName,
          firstName,
          middleName,
          employmentType,
          data.bankAccountNumber ? data.bankAccountNumber.trim() : null,
          statusId,
        ],
      )
      const empId = Number(empRes.rows[0].id)

      const payBasis = data.payBasis || 'Monthly'
      const monthlyRate = payBasis === 'Monthly' ? rate : null
      const dailyRate = payBasis === 'Daily' ? rate : null
      const hourlyRate = payBasis === 'Hourly' ? rate : null
      const effectiveFrom = data.appointmentStart?.trim() || new Date().toISOString().split('T')[0]
      const effectiveTo = data.appointmentEnd?.trim() || null

      await client.query(
        `INSERT INTO appointments (
           employee_id, office_id, cost_center_id, fund_id, employment_type,
           position_title, monthly_rate, daily_rate, hourly_rate, effective_from, effective_to
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::date, $11::date)`,
        [
          empId,
          officeId,
          costCenterId,
          fundId,
          employmentType,
          position,
          monthlyRate,
          dailyRate,
          hourlyRate,
          effectiveFrom,
          effectiveTo,
        ],
      )

      await auditService.logAction(
        actingUserId || null,
        `Created employee record for ${fullName} (${employeeNo})`,
        { employeeId: empId, employeeNo, position, office: data.office },
        ip || null,
        'EMPLOYEE',
        empId,
      )

      await client.query('COMMIT')
      return (await employeesService.findById(String(empId)))!
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
    const existing = await employeesService.findById(idOrEmpNo, { unmaskBank: true })
    if (!existing || !existing.id) return undefined

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const empUpdates: string[] = []
      const empValues: any[] = []
      let pIdx = 1

      if (data.name !== undefined) {
        const { firstName, middleName, lastName } = splitFullName(data.name)
        empUpdates.push(`first_name = $${pIdx++}`, `middle_name = $${pIdx++}`, `last_name = $${pIdx++}`)
        empValues.push(firstName, middleName, lastName)
      }

      if (data.bankAccountNumber !== undefined && !data.bankAccountNumber.includes('*')) {
        empUpdates.push(`bank_account_no = $${pIdx++}`)
        empValues.push(data.bankAccountNumber ? data.bankAccountNumber.trim() : null)
      }

      const lookups = await resolveLookups(client, {
        employmentStatus: data.employmentStatus ?? existing.employmentStatus,
        office: data.office ?? existing.office,
        fundSource: data.fundSource ?? existing.fundSource,
        employmentType: data.employmentType ?? existing.employmentType,
      })

      if (data.employmentStatus !== undefined) {
        empUpdates.push(`status_id = $${pIdx++}`)
        empValues.push(lookups.statusId)
      }

      if (data.employmentType !== undefined) {
        empUpdates.push(`employment_type = $${pIdx++}`)
        empValues.push(lookups.employmentType)
      }

      if (empUpdates.length > 0) {
        empValues.push(existing.id)
        await client.query(
          `UPDATE employees SET ${empUpdates.join(', ')} WHERE id = $${pIdx}`,
          empValues,
        )
      }

      // Update latest appointment (or create one if none exists)
      const latestAppt = await client.query(
        `SELECT id FROM appointments WHERE employee_id = $1 ORDER BY effective_from DESC, id DESC LIMIT 1`,
        [existing.id],
      )

      const position = data.position?.trim() || existing.position || 'Staff'
      const payBasis = data.payBasis || existing.payBasis || 'Monthly'
      const rate = parseFloat(data.applicableRate ?? existing.applicableRate) || 0
      const monthlyRate = payBasis === 'Monthly' ? rate : null
      const dailyRate = payBasis === 'Daily' ? rate : null
      const hourlyRate = payBasis === 'Hourly' ? rate : null
      const effectiveFrom = (data.appointmentStart ?? existing.appointmentStart) || new Date().toISOString().split('T')[0]
      const effectiveTo = (data.appointmentEnd ?? existing.appointmentEnd) || null

      if (latestAppt.rows.length > 0) {
        await client.query(
          `UPDATE appointments
           SET office_id = $1,
               cost_center_id = $2,
               fund_id = $3,
               employment_type = $4,
               position_title = $5,
               monthly_rate = $6,
               daily_rate = $7,
               hourly_rate = $8,
               effective_from = $9::date,
               effective_to = $10::date
           WHERE id = $11`,
          [
            lookups.officeId,
            lookups.costCenterId,
            lookups.fundId,
            lookups.employmentType,
            position,
            monthlyRate,
            dailyRate,
            hourlyRate,
            effectiveFrom,
            effectiveTo,
            latestAppt.rows[0].id,
          ],
        )
      } else {
        await client.query(
          `INSERT INTO appointments (
             employee_id, office_id, cost_center_id, fund_id, employment_type,
             position_title, monthly_rate, daily_rate, hourly_rate, effective_from, effective_to
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::date, $11::date)`,
          [
            existing.id,
            lookups.officeId,
            lookups.costCenterId,
            lookups.fundId,
            lookups.employmentType,
            position,
            monthlyRate,
            dailyRate,
            hourlyRate,
            effectiveFrom,
            effectiveTo,
          ],
        )
      }

      await auditService.logAction(
        actingUserId || null,
        `Updated employee record for ${data.name || existing.name} (${existing.employeeId})`,
        { employeeId: existing.id, employeeNo: existing.employeeId, updatedFields: Object.keys(data) },
        ip || null,
        'EMPLOYEE',
        existing.id,
      )

      await client.query('COMMIT')
      return employeesService.findById(String(existing.id))
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  },

  async delete(idOrEmpNo: string, actingUserId?: number | null, ip?: string | null): Promise<boolean> {
    const existing = await employeesService.findById(idOrEmpNo)
    if (!existing || !existing.id) return false

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      // Clean up appointments before deleting employee (FK is ON DELETE RESTRICT)
      await client.query(`DELETE FROM appointments WHERE employee_id = $1`, [existing.id])
      await client.query(`DELETE FROM employees WHERE id = $1`, [existing.id])

      await auditService.logAction(
        actingUserId || null,
        `Deleted employee record for ${existing.name} (${existing.employeeId})`,
        { employeeId: existing.id, employeeNo: existing.employeeId },
        ip || null,
        'EMPLOYEE',
        existing.id,
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
