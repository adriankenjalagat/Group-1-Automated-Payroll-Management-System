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

function splitFullName(fullName: string): { firstName: string; middleName: string | null; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: 'User', middleName: null, lastName: 'Account' }
  if (parts.length === 1) return { firstName: parts[0], middleName: null, lastName: parts[0] }
  if (parts.length === 2) return { firstName: parts[0], middleName: null, lastName: parts[1] }
  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(' '),
    lastName: parts[parts.length - 1],
  }
}

function normalizeRoles(inputRoles: string[]): UserRole[] {
  const normalized = inputRoles.map((r) => {
    const trimmed = String(r || '').trim()
    if (trimmed === 'Administrator' || trimmed === 'Admin' || /system\s*admin/i.test(trimmed)) {
      return 'System Administrator'
    }
    if (trimmed === 'Accounting Section' || /^accounting$/i.test(trimmed)) {
      return 'Accounting'
    }
    if (/^hr$/i.test(trimmed)) return 'HR Office'
    if (/^budget$/i.test(trimmed)) return 'Budget Office'
    if (/^chancellor$/i.test(trimmed)) return 'Office of the Chancellor'
    return trimmed
  })

  const valid = normalized.filter((r): r is UserRole => SRS_ROLES.includes(r as UserRole))
  return valid.length > 0 ? Array.from(new Set(valid)) : ['Employee']
}

const USER_SELECT_SQL = `
  SELECT
    u.id,
    u.employee_id,
    u.role_id,
    u.username,
    u.password_hash,
    u.email,
    u.is_active,
    u.last_login_at,
    COALESCE(
      NULLIF(TRIM(CONCAT_WS(' ', e.first_name, e.middle_name, e.last_name)), ''),
      u.username
    ) AS full_name,
    COALESCE(o.name, 'University Office') AS office,
    COALESCE(cc.name, o.name, 'University Office') AS cost_center,
    ARRAY[COALESCE(r.name, 'Employee')]::text[] AS roles
  FROM users u
  LEFT JOIN roles r ON r.id = u.role_id
  LEFT JOIN employees e ON e.id = u.employee_id
  LEFT JOIN LATERAL (
    SELECT office_id, cost_center_id
    FROM appointments
    WHERE employee_id = e.id
    ORDER BY effective_from DESC, id DESC
    LIMIT 1
  ) a ON TRUE
  LEFT JOIN offices o ON o.id = a.office_id
  LEFT JOIN cost_centers cc ON cc.id = a.cost_center_id
`

const USER_GROUP_BY_SQL = ``

function mapUserRow(row: any, includePassword = false): UserAccount {
  const safeRoles = Array.isArray(row.roles)
    ? (row.roles.filter((r: string) => SRS_ROLES.includes(r as UserRole)) as UserRole[])
    : []

  const id = Number(row.id)
  const office = row.office || 'University Office'

  const account: UserAccount = {
    id,
    accountId: `USR-${id}`,
    name: row.full_name || row.username,
    email: row.email,
    username: row.username,
    office,
    costCenter: row.cost_center || office,
    roles: safeRoles.length > 0 ? safeRoles : ['Employee'],
    status: row.is_active ? 'active' : 'locked',
    employeeId: row.employee_id ? Number(row.employee_id) : null,
    updatedAt: row.last_login_at ? new Date(row.last_login_at).toISOString() : undefined,
  }

  if (includePassword) {
    account.password = row.password_hash
  }

  return account
}

async function ensureOfficeAndCostCenter(
  client: any,
  officeName: string,
  costCenterName: string,
): Promise<{ officeId: number; costCenterId: number }> {
  const cleanOffice = officeName.trim() || 'General Administration'
  const cleanCc = costCenterName.trim() || cleanOffice

  let officeRes = await client.query(
    `SELECT id FROM offices WHERE LOWER(name) = LOWER($1) OR LOWER(code) = LOWER($1) LIMIT 1`,
    [cleanOffice],
  )
  let officeId: number
  if (officeRes.rows.length > 0) {
    officeId = Number(officeRes.rows[0].id)
  } else {
    const code = cleanOffice.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 12) + '-' + Date.now().toString().slice(-4)
    const ins = await client.query(
      `INSERT INTO offices (code, name) VALUES ($1, $2) RETURNING id`,
      [code, cleanOffice],
    )
    officeId = Number(ins.rows[0].id)
  }

  let ccRes = await client.query(
    `SELECT id FROM cost_centers WHERE LOWER(name) = LOWER($1) OR LOWER(code) = LOWER($1) LIMIT 1`,
    [cleanCc],
  )
  let costCenterId: number
  if (ccRes.rows.length > 0) {
    costCenterId = Number(ccRes.rows[0].id)
  } else {
    const code = cleanCc.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 12) + '-' + Date.now().toString().slice(-4)
    const ins = await client.query(
      `INSERT INTO cost_centers (code, name) VALUES ($1, $2) RETURNING id`,
      [code, cleanCc],
    )
    costCenterId = Number(ins.rows[0].id)
  }

  return { officeId, costCenterId }
}

export const usersService = {
  async findAll(): Promise<UserAccount[]> {
    const result = await pool.query(`${USER_SELECT_SQL} ${USER_GROUP_BY_SQL} ORDER BY u.id ASC`)
    return result.rows.map((r) => mapUserRow(r, false))
  },

  async findById(id: number): Promise<UserAccount | undefined> {
    const result = await pool.query(
      `${USER_SELECT_SQL} WHERE u.id = $1 ${USER_GROUP_BY_SQL} LIMIT 1`,
      [id],
    )
    if (result.rows.length === 0) return undefined
    return mapUserRow(result.rows[0], false)
  },

  async findByIdentifier(identifier: string): Promise<UserAccount | undefined> {
    const cleanId = identifier.trim().toLowerCase().replace(/^@/, '')
    if (!cleanId) return undefined

    const result = await pool.query(
      `${USER_SELECT_SQL}
       WHERE LOWER(u.username) = $1
          OR LOWER(u.email) = $1
          OR LOWER(split_part(u.email, '@', 1)) = $1
       ${USER_GROUP_BY_SQL}
       LIMIT 1`,
      [cleanId],
    )
    if (result.rows.length === 0) return undefined
    return mapUserRow(result.rows[0], true)
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

    const candidateRoles =
      Array.isArray(data.roles) && data.roles.length > 0
        ? data.roles
        : data.role
          ? [data.role]
          : ['Employee']
    const finalRoles = normalizeRoles(candidateRoles)
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

    const office = data.office?.trim() || 'Information Systems Office'
    const costCenter = data.costCenter?.trim() || office
    const hashedPassword = await bcrypt.hash(rawPassword, 10)

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Resolve or auto-create employee record
      let parsedEmployeeId: number | null = null
      if (data.employeeId !== undefined && data.employeeId !== null && data.employeeId !== '') {
        const empQuery = await client.query(
          `SELECT id FROM employees WHERE id::text = $1 OR employee_no = $1 LIMIT 1`,
          [String(data.employeeId)],
        )
        if (empQuery.rows.length > 0) {
          parsedEmployeeId = Number(empQuery.rows[0].id)
        }
      }

      if (!parsedEmployeeId) {
        const activeStatusRes = await client.query(
          `SELECT id FROM statuses WHERE category = 'EMPLOYEE' AND code = 'ACTIVE' LIMIT 1`,
        )
        const activeStatusId = Number(activeStatusRes.rows[0].id)
        const { firstName, middleName, lastName } = splitFullName(name)
        const tempEmpNo = `EMP-TMP-${Date.now()}-${Math.floor(Math.random() * 10000)}`

        const empRes = await client.query(
          `INSERT INTO employees (employee_no, last_name, first_name, middle_name, birth_date, employment_type, status_id)
           VALUES ($1, $2, $3, $4, '1990-01-01', 'REGULAR', $5)
           RETURNING id`,
          [tempEmpNo, lastName, firstName, middleName, activeStatusId],
        )
        parsedEmployeeId = Number(empRes.rows[0].id)

        let finalEmpNo = `EMP-${String(parsedEmployeeId).padStart(3, '0')}`
        const dupEmpNo = await client.query(
          `SELECT 1 FROM employees WHERE employee_no = $1 AND id != $2 LIMIT 1`,
          [finalEmpNo, parsedEmployeeId],
        )
        if (dupEmpNo.rows.length > 0) {
          finalEmpNo = `${finalEmpNo}-${Date.now().toString().slice(-4)}`
        }
        await client.query(`UPDATE employees SET employee_no = $1 WHERE id = $2`, [
          finalEmpNo,
          parsedEmployeeId,
        ])

        const { officeId, costCenterId } = await ensureOfficeAndCostCenter(client, office, costCenter)
        const fundId = Number((await client.query(`SELECT id FROM funds ORDER BY id ASC LIMIT 1`)).rows[0].id)

        await client.query(
          `INSERT INTO appointments (
             employee_id, office_id, cost_center_id, fund_id, employment_type,
             position_title, monthly_rate, effective_from
           ) VALUES ($1, $2, $3, $4, 'REGULAR', $5, 25000.00, CURRENT_DATE)`,
          [parsedEmployeeId, officeId, costCenterId, fundId, primaryRole],
        )
      }

      const roleRes = await client.query(
        `SELECT id FROM roles WHERE name = $1 ORDER BY id ASC LIMIT 1`,
        [primaryRole],
      )
      const roleId = Number(
        roleRes.rows[0]?.id ||
          (await client.query(`SELECT id FROM roles WHERE name = 'Employee' LIMIT 1`)).rows[0].id,
      )

      const userIns = await client.query(
        `INSERT INTO users (employee_id, role_id, username, password_hash, email, is_active)
         VALUES ($1, $2, $3, $4, $5, TRUE)
         RETURNING id`,
        [parsedEmployeeId, roleId, username, hashedPassword, rawEmail],
      )
      const userId = Number(userIns.rows[0].id)

      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address, created_at)
         VALUES ($1, $2, 'USER', $3, $4::jsonb, $5, CURRENT_TIMESTAMP)`,
        [
          actingUserId || userId,
          `Created user account for ${username}`.slice(0, 100),
          userId,
          JSON.stringify({ targetUserId: userId, username, roles: finalRoles, costCenter }),
          ip ? ip.slice(0, 45) : null,
        ],
      )

      await client.query('COMMIT')
      const created = await usersService.findById(userId)
      return created!
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

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const userUpdates: string[] = []
      const userValues: any[] = []
      let pIdx = 1

      if (data.email !== undefined) {
        const cleanEmail = data.email.trim().toLowerCase()
        const dup = await client.query(
          `SELECT id FROM users WHERE LOWER(email) = $1 AND id != $2 LIMIT 1`,
          [cleanEmail, id],
        )
        if (dup.rows.length > 0) {
          const err = new Error(`Email "${cleanEmail}" is already in use by another account.`)
          ;(err as any).statusCode = 409
          throw err
        }
        userUpdates.push(`email = $${pIdx++}`)
        userValues.push(cleanEmail)
      }

      if (data.password) {
        if (data.password.length < 8) {
          const err = new Error('Password must be at least 8 characters long.')
          ;(err as any).statusCode = 400
          throw err
        }
        const hashedPassword = await bcrypt.hash(data.password, 12)
        userUpdates.push(`password_hash = $${pIdx++}`)
        userValues.push(hashedPassword)
      }

      if (data.employeeId !== undefined) {
        let parsedEmpId: number | null = null
        if (data.employeeId !== null && data.employeeId !== '') {
          const empQuery = await client.query(
            `SELECT id FROM employees WHERE id::text = $1 OR employee_no = $1 LIMIT 1`,
            [String(data.employeeId)],
          )
          if (empQuery.rows.length > 0) {
            parsedEmpId = Number(empQuery.rows[0].id)
          }
        }
        userUpdates.push(`employee_id = $${pIdx++}`)
        userValues.push(parsedEmpId)
      }

      if (userUpdates.length > 0) {
        userValues.push(id)
        await client.query(
          `UPDATE users SET ${userUpdates.join(', ')} WHERE id = $${pIdx}`,
          userValues,
        )
      }

      if (data.name !== undefined && existing.employeeId) {
        const { firstName, middleName, lastName } = splitFullName(data.name)
        await client.query(
          `UPDATE employees SET first_name = $1, middle_name = $2, last_name = $3 WHERE id = $4`,
          [firstName, middleName, lastName, existing.employeeId],
        )
      }

      if ((data.office !== undefined || data.costCenter !== undefined) && existing.employeeId) {
        const { officeId, costCenterId } = await ensureOfficeAndCostCenter(
          client,
          data.office ?? existing.office,
          data.costCenter ?? data.office ?? existing.costCenter ?? existing.office,
        )
        await client.query(
          `UPDATE appointments
           SET office_id = $1, cost_center_id = $2
           WHERE id = (
             SELECT id FROM appointments WHERE employee_id = $3 ORDER BY effective_from DESC, id DESC LIMIT 1
           )`,
          [officeId, costCenterId, existing.employeeId],
        )
      }

      const candidateRoles =
        Array.isArray(data.roles) && data.roles.length > 0
          ? data.roles
          : data.role
            ? [data.role]
            : []

      if (candidateRoles.length > 0) {
        const validatedRoles = candidateRoles.filter((r): r is UserRole =>
          SRS_ROLES.includes(r as UserRole),
        )
        if (validatedRoles.length === 0) {
          const err = new Error(`Invalid role. Authorized roles: ${SRS_ROLES.join(', ')}`)
          ;(err as any).statusCode = 400
          throw err
        }
        const roleRes = await client.query(
          `SELECT id FROM roles WHERE name = $1 ORDER BY id ASC LIMIT 1`,
          [validatedRoles[0]],
        )
        if (roleRes.rows.length > 0) {
          await client.query(`UPDATE users SET role_id = $1 WHERE id = $2`, [roleRes.rows[0].id, id])
        }
      }

      await auditService.logAction(
        actingUserId || id,
        `Updated user account for ${existing.username}`,
        { targetUserId: id, updatedFields: Object.keys(data) },
        ip || null,
        'USER',
        id,
      )

      await client.query('COMMIT')
      return (await usersService.findById(id))!
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

    const isActive = status === 'active'
    await pool.query(`UPDATE users SET is_active = $1 WHERE id = $2`, [isActive, id])

    const updated = (await usersService.findById(id))!
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
      'USER',
      id,
    )

    return updated
  },
}
