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
  account_id: string | null
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
    accountId: row.account_id || `USR-${row.id}`,
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
      `SELECT id, account_id, name, email, username,
              office, cost_center, roles, status, employee_id, created_at, updated_at
       FROM users
       ORDER BY id ASC`,
    )

    return result.rows.map(mapUser)
  },

  async findById(id: number): Promise<UserAccount | undefined> {
    const result = await pool.query<UserRow>(
      `SELECT id, account_id, name, email, username,
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
      `SELECT id, account_id, name, email, username,
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
    const rawEmail = (data.email?.trim() || `${username}@msunaawan.edu.ph`).toLowerCase()
    const rawPassword = data.password?.trim()

    if (!name || !username) {
      const err = new Error('Name and username are required.')
      ;(err as any).statusCode = 400
      throw err
    }

    if (!rawPassword || rawPassword.length < 8) {
      const err = new Error('Password is required and must be at least 8 characters long.')
      ;(err as any).statusCode = 400
      throw err
    }

    // Role validation
    const candidateRoles: string[] = []
    if (Array.isArray(data.roles) && data.roles.length > 0) {
      candidateRoles.push(...data.roles)
    } else if (data.role) {
      candidateRoles.push(data.role)
    } else {
      candidateRoles.push('Employee')
    }

    const validatedRoles = candidateRoles.filter((r): r is UserRole =>
      SRS_ROLES.includes(r as UserRole),
    )

    if (validatedRoles.length === 0) {
      const err = new Error(`Invalid role. Authorized roles are: ${SRS_ROLES.join(', ')}`)
      ;(err as any).statusCode = 400
      throw err
    }

    // Duplicate check for username
    const existingUser = await pool.query(
      `SELECT id FROM users WHERE LOWER(username) = $1 LIMIT 1`,
      [username],
    )
    if (existingUser.rows.length > 0) {
      const err = new Error(`Username "${username}" is already taken.`)
      ;(err as any).statusCode = 409
      throw err
    }

    // Duplicate check for email
    const existingEmail = await pool.query(
      `SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1`,
      [rawEmail],
    )
    if (existingEmail.rows.length > 0) {
      const err = new Error(`Email "${rawEmail}" is already registered.`)
      ;(err as any).statusCode = 409
      throw err
    }

    // Resolve employeeId if passed
    let parsedEmployeeId: number | null = null
    if (data.employeeId !== undefined && data.employeeId !== null && data.employeeId !== '') {
      if (typeof data.employeeId === 'number') {
        parsedEmployeeId = data.employeeId
      } else {
        const empQuery = await pool.query(
          `SELECT id FROM employees WHERE id::text = $1 OR employee_no = $1 LIMIT 1`,
          [String(data.employeeId)],
        )
        if (empQuery.rows.length > 0) {
          parsedEmployeeId = empQuery.rows[0].id
        }
      }
    }

    const hashedPassword = await bcrypt.hash(rawPassword, 12)
    const office = data.office?.trim() || 'University Office'
    const costCenter = data.costCenter?.trim() || office

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const result = await client.query<UserRow>(
        `INSERT INTO users
          (name, username, password, email, office, cost_center, roles, status, employee_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::text[], 'active', $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id, account_id, name, username, email,
                   office, cost_center, roles, status, employee_id, created_at, updated_at`,
        [
          name,
          username,
          hashedPassword,
          rawEmail,
          office,
          costCenter,
          validatedRoles,
          parsedEmployeeId,
        ],
      )

      const row = result.rows[0]
      const createdUser = mapUser(row)

      await client.query(
        `INSERT INTO audit_logs (user_id, action, details, ip_address, logged_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
        [
          actingUserId || row.id,
          `Created user account for ${username} with role(s) ${validatedRoles.join(', ')} (Cost Center: ${costCenter})`,
          JSON.stringify({ targetUserId: row.id, username, roles: validatedRoles, costCenter }),
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
      RETURNING id, account_id, name, username, email,
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
       RETURNING id, account_id, name, username, email,
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
