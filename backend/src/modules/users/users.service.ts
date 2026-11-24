import bcrypt from 'bcryptjs'
import { pool } from '../../config/db'
import { auditService } from '../audit/audit.service'
import { SRS_ROLES, type UserRole } from '../../middleware/auth'

export interface UserAccount {
  id?: number
  accountId?: string
  name: string
  email: string
  username: string
  password?: string
  office: string
  costCenter?: string
  roles: UserRole[]
  status: 'active' | 'locked' | 'pending'
  employeeId?: number | null
  createdAt?: string
  updatedAt?: string
}

type UserRow = {
  id: number
  name: string
  email: string
  username: string
  password?: string
  office: string | null
  cost_center: string | null
  roles: UserRole[]
  status: string
  employee_id: number | null
  created_at?: Date
  updated_at?: Date
}

function mapUser(row: UserRow): UserAccount {
  const validStatuses = ['active', 'locked', 'pending'] as const
  const status = validStatuses.includes(
    row.status as (typeof validStatuses)[number],
  )
    ? (row.status as UserAccount['status'])
    : 'pending'

  const safeRoles = Array.isArray(row.roles)
    ? (row.roles.filter((r) => SRS_ROLES.includes(r as UserRole)) as UserRole[])
    : []

  const office = row.office || 'University Office'
  const costCenter = row.cost_center || office

  return {
    id: row.id,
    accountId: `USR-${row.id}`,
    name: row.name || row.username,
    email: row.email,
    username: row.username,
    office,
    costCenter,
    roles: safeRoles.length > 0 ? safeRoles : ['Employee'],
    status,
    employeeId: row.employee_id,
    createdAt: row.created_at ? row.created_at.toISOString() : undefined,
    updatedAt: row.updated_at ? row.updated_at.toISOString() : undefined,
  }
}

export const usersService = {
  async findAll(): Promise<UserAccount[]> {
    const result = await pool.query<UserRow>(
      `SELECT id, name, email, username,
              office, cost_center,
              COALESCE(roles, ARRAY[role]::text[]) as roles,
              status, employee_id, created_at, updated_at
       FROM users
       ORDER BY id ASC`,
    )

    return result.rows.map(mapUser)
  },

  async findById(id: number): Promise<UserAccount | undefined> {
    const result = await pool.query<UserRow>(
      `SELECT id, name, email, username,
              office, cost_center, roles, status, employee_id, created_at, updated_at
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [id],
    )

    if (result.rows.length === 0) return undefined
    return mapUser(result.rows[0])
  },

  async findByIdentifier(
    identifier: string,
  ): Promise<UserAccount | undefined> {
    const cleanId = identifier.trim().toLowerCase().replace(/^@/, '')

    if (!cleanId) return undefined

    const result = await pool.query<UserRow>(
      `SELECT id, name, email, username,
              password, office, cost_center, roles, status, employee_id, created_at, updated_at
       FROM users
       WHERE LOWER(username) = $1
          OR LOWER(email) = $1
          OR LOWER(split_part(email, '@', 1)) = $1
       LIMIT 1`,
      [cleanId],
    )

    if (result.rows.length === 0) return undefined

    return {
      ...mapUser(result.rows[0]),
      password: result.rows[0].password,
    }
  },

  async create(
    data: {
      name: string
      username: string
      role?: string
      roles?: string[]
      email?: string
      password: string
      office?: string
      costCenter?: string
      employeeId?: number | string | null
    },
    actingUserId?: number | null,
    ip?: string | null,
  ): Promise<UserAccount> {
    const name = data.name.trim()
    const username = data.username.trim().replace(/^@/, '').toLowerCase()
    const rawEmail = (data.email?.trim() || `${username}@msunaawan.example`).toLowerCase()
    const rawPassword = data.password?.trim() || username

    if (!name || !username) {
      const err = new Error('Name and username are required.')
      ;(err as any).statusCode = 400
      throw err
    }

    if (!rawPassword) {
      const err = new Error('Password is required.')
      ;(err as any).statusCode = 400
      throw err
    }

    // Role validation with normalization (Administrator -> System Administrator, Accounting Section -> Accounting)
    const candidateRoles: string[] = []
    if (Array.isArray(data.roles) && data.roles.length > 0) {
      candidateRoles.push(...data.roles)
    } else if (data.role) {
      candidateRoles.push(data.role)
    } else {
      candidateRoles.push('Employee')
    }

    const normalizedCandidateRoles = candidateRoles.map((r) => {
      const trimmed = String(r || '').trim()
      if (trimmed === 'Administrator' || /system\s*admin/i.test(trimmed)) return 'System Administrator'
      if (trimmed === 'Accounting Section' || /accounting/i.test(trimmed)) return 'Accounting'
      return trimmed
    })

    const validatedRoles = normalizedCandidateRoles.filter((r): r is UserRole =>
      SRS_ROLES.includes(r as UserRole),
    )

    const finalRoles = validatedRoles.length > 0 ? validatedRoles : (['Employee'] as UserRole[])
    const primaryRole = finalRoles[0]

    // Duplicate check for username and email
    const existingUser = await pool.query(
      `SELECT id, username, email FROM users WHERE LOWER(username) = $1 OR LOWER(email) = $2 LIMIT 1`,
      [username, rawEmail],
    )
    if (existingUser.rows.length > 0) {
      const match = existingUser.rows[0]
      const message =
        match.username?.toLowerCase() === username
          ? `Username "${username}" is already taken.`
          : `Email "${rawEmail}" is already in use.`
      const err = new Error(message)
      ;(err as any).statusCode = 409
      throw err
    }

    // Resolve employeeId if provided
    let parsedEmployeeId: number | null = null
    if (data.employeeId !== undefined && data.employeeId !== null && data.employeeId !== '') {
      if (typeof data.employeeId === 'number') {
        parsedEmployeeId = data.employeeId
      } else {
        const empQuery = await pool.query(
          `SELECT id, employee_id FROM employees WHERE id::text = $1 OR employee_id::text = $1 OR employee_no = $1 LIMIT 1`,
          [String(data.employeeId)],
        )
        if (empQuery.rows.length > 0) {
          parsedEmployeeId = empQuery.rows[0].id || empQuery.rows[0].employee_id
        }
      }
    }

    const office = data.office?.trim() || 'University Office'
    const costCenter = data.costCenter?.trim() || office
    const hashedPassword = await bcrypt.hash(rawPassword, 10)

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // If no linked employee was specified, auto-create one inside the transaction so employee_id is never NULL
      if (!parsedEmployeeId) {
        const tempEmpNo = `EMP-TMP-${Date.now()}-${Math.floor(Math.random() * 10000)}`
        const empRes = await client.query(
          `INSERT INTO employees (employee_no, full_name, department, position, monthly_salary, payroll_type, status, created_at)
           VALUES ($1, $2, $3, $4, 25000.00, $5, 'Active', CURRENT_TIMESTAMP)
           RETURNING id, employee_id`,
          [
            tempEmpNo,
            name,
            office,
            primaryRole,
            primaryRole === 'Employee' ? 'Staff' : 'Permanent Staff',
          ],
        )
        if (empRes.rows.length > 0) {
          parsedEmployeeId = empRes.rows[0].id || empRes.rows[0].employee_id
          let finalEmpNo = `EMP-${String(parsedEmployeeId).padStart(3, '0')}`
          const dupEmpNo = await client.query(
            `SELECT 1 FROM employees WHERE employee_no = $1 AND COALESCE(id, employee_id) != $2 LIMIT 1`,
            [finalEmpNo, parsedEmployeeId],
          )
          if (dupEmpNo.rows.length > 0) {
            finalEmpNo = `${finalEmpNo}-${Date.now().toString().slice(-4)}`
          }
          await client.query(
            `UPDATE employees SET id = $1, employee_id = $1, employee_no = $2 WHERE id = $1 OR employee_id = $1`,
            [parsedEmployeeId, finalEmpNo],
          )
        }
      }

      const result = await client.query<UserRow>(
        `INSERT INTO users
          (name, username, password, email, role, office, cost_center, roles, status, employee_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::text[], 'active', $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id, name, username, email, role,
                   office, cost_center, roles, status, employee_id, created_at, updated_at`,
        [
          name,
          username,
          hashedPassword,
          rawEmail,
          primaryRole,
          office,
          costCenter,
          finalRoles,
          parsedEmployeeId,
        ],
      )

      const row = result.rows[0]
      const actualId = row.id
      const createdUser = mapUser(row)

      await client.query(
        `INSERT INTO audit_logs (user_id, action, details, ip_address, logged_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
        [
          actingUserId || actualId,
          `Created user account for ${username} with role(s) ${finalRoles.join(', ')} (Cost Center: ${costCenter})`,
          JSON.stringify({ targetUserId: actualId, username, roles: finalRoles, costCenter }),
          ip || null,
        ],
      )

      await client.query('COMMIT')
      return createdUser
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  },

  async update(
    id: number,
    data: {
      name?: string
      email?: string
      office?: string
      costCenter?: string
      role?: string
      roles?: string[]
      employeeId?: number | string | null
      password?: string
    },
    actingUserId?: number | null,
    ip?: string | null,
  ): Promise<UserAccount> {
    const existing = await usersService.findById(id)
    if (!existing) {
      const err = new Error(`User with ID ${id} not found.`)
      ;(err as any).statusCode = 404
      throw err
    }

    const updates: string[] = []
    const values: any[] = []
    let pIdx = 1

    if (data.name !== undefined) {
      updates.push(`name = $${pIdx++}`)
      values.push(data.name.trim())
    }

    if (data.email !== undefined) {
      const cleanEmail = data.email.trim().toLowerCase()
      // Check duplicate email
      const dup = await pool.query(
        `SELECT id FROM users WHERE LOWER(email) = $1 AND id != $2 LIMIT 1`,
        [cleanEmail, id],
      )
      if (dup.rows.length > 0) {
        const err = new Error(`Email "${cleanEmail}" is already in use by another account.`)
        ;(err as any).statusCode = 409
        throw err
      }
      updates.push(`email = $${pIdx++}`)
      values.push(cleanEmail)
    }

    if (data.office !== undefined) {
      updates.push(`office = $${pIdx++}`)
      values.push(data.office.trim())
    }

    if (data.costCenter !== undefined) {
      updates.push(`cost_center = $${pIdx++}`)
      values.push(data.costCenter.trim())
    }

    // Role assignment
    const candidateRoles: string[] = []
    if (Array.isArray(data.roles) && data.roles.length > 0) {
      candidateRoles.push(...data.roles)
    } else if (data.role) {
      candidateRoles.push(data.role)
    }

    if (candidateRoles.length > 0) {
      const validatedRoles = candidateRoles.filter((r): r is UserRole =>
        SRS_ROLES.includes(r as UserRole),
      )
      if (validatedRoles.length === 0) {
        const err = new Error(`Invalid role. Authorized roles: ${SRS_ROLES.join(', ')}`)
        ;(err as any).statusCode = 400
        throw err
      }
      updates.push(`roles = $${pIdx++}::text[]`)
      values.push(validatedRoles)
    }

    if (data.employeeId !== undefined) {
      let parsedEmpId: number | null = null
      if (data.employeeId !== null && data.employeeId !== '') {
        if (typeof data.employeeId === 'number') {
          parsedEmpId = data.employeeId
        } else {
          const empQuery = await pool.query(
            `SELECT id FROM employees WHERE id::text = $1 OR employee_no = $1 LIMIT 1`,
            [String(data.employeeId)],
          )
          if (empQuery.rows.length > 0) {
            parsedEmpId = empQuery.rows[0].id
          }
        }
      }
      updates.push(`employee_id = $${pIdx++}`)
      values.push(parsedEmpId)
    }

    if (data.password) {
      if (data.password.length < 8) {
        const err = new Error('Password must be at least 8 characters long.')
        ;(err as any).statusCode = 400
        throw err
      }
      const hashedPassword = await bcrypt.hash(data.password, 12)
      updates.push(`password = $${pIdx++}`)
      values.push(hashedPassword)
    }

    if (updates.length === 0) {
      return existing
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(id)

    const queryText = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${pIdx}
      RETURNING id, name, username, email,
                office, cost_center, roles, status, employee_id, created_at, updated_at
    `

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const result = await client.query<UserRow>(queryText, values)
      const updatedUser = mapUser(result.rows[0])

      await auditService.logAction(
        actingUserId || id,
        `Updated user account for ${updatedUser.username}`,
        { targetUserId: id, updatedFields: Object.keys(data) },
        ip || null,
      )

      await client.query('COMMIT')
      return updatedUser
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  },

  async setStatus(
    id: number,
    status: 'active' | 'locked' | 'pending',
    actingUserId?: number | null,
    ip?: string | null,
  ): Promise<UserAccount> {
    const existing = await usersService.findById(id)
    if (!existing) {
      const err = new Error(`User with ID ${id} not found.`)
      ;(err as any).statusCode = 404
      throw err
    }

    const result = await pool.query<UserRow>(
      `UPDATE users
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, name, username, email,
                 office, cost_center, roles, status, employee_id, created_at, updated_at`,
      [status, id],
    )

    const updated = mapUser(result.rows[0])
    const actionDesc =
      status === 'locked'
        ? `Locked user account for ${updated.username}`
        : status === 'active'
          ? `Activated/unlocked user account for ${updated.username}`
          : `Set status to ${status} for ${updated.username}`

    await auditService.logAction(
      actingUserId || id,
      actionDesc,
      { targetUserId: id, previousStatus: existing.status, newStatus: status },
      ip || null,
    )

    return updated
  },
}
