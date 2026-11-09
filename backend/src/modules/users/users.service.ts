import bcrypt from 'bcryptjs'
import { pool } from '../../config/db'
import type { UserRole } from '../../middleware/auth'

export interface UserAccount {
  accountId?: string
  name: string
  email: string
  username: string
  password?: string
  office: string
  roles: UserRole[]
  status: 'active' | 'locked' | 'pending'
  employeeId?: string | null
}

export const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Payroll#2026'

const defaultUsers: UserAccount[] = [
  {
    name: 'Eyrol Clayford Junio',
    email: 'eyrolclayford.junio@msunaawan.example',
    username: 'eyrolclayford.junio',
    password: 'eyrolclayford.junio',
    office: 'Information Systems Office',
    roles: ['System Administrator'],
    status: 'active',
  },
  {
    name: 'Ramon Bautista',
    email: 'ramon.bautista@msunaawan.example',
    username: 'rbautista',
    password: 'rbautista',
    office: 'Information Systems Office',
    roles: ['System Administrator'],
    status: 'active',
  },
]

export const usersService = {
  async findAll(): Promise<UserAccount[]> {
    try {
      const res = await pool.query(
        'SELECT user_id, name, username, email, role, status, employee_id FROM users ORDER BY user_id ASC',
      )
      if (res.rows.length > 0) {
        return res.rows.map((r: any) => ({
          accountId: `USR-${r.user_id}`,
          name: r.name || r.username,
          email: r.email,
          username: r.username,
          office: 'University Office',
          roles: Array.isArray(r.roles) ? r.roles : [r.role as UserRole],
          status: (r.status as 'active' | 'locked' | 'pending') || 'active',
          employeeId: r.employee_id ? String(r.employee_id) : null,
        }))
      }
    } catch (err) {
      console.warn('[DB usersService] findAll error:', err)
    }
    return defaultUsers
  },

  async findByIdentifier(identifier: string): Promise<UserAccount | undefined> {
    const raw = identifier.trim().toLowerCase()
    const cleanId = raw.replace(/^@/, '')

    try {
      const res = await pool.query(
        `SELECT * FROM users 
         WHERE LOWER(username) = $1 
            OR LOWER(email) = $1 
            OR LOWER(split_part(email, '@', 1)) = $1 
         LIMIT 1`,
        [cleanId],
      )

      if (res.rows.length > 0) {
        const row = res.rows[0]
        return {
          accountId: row.account_id || `USR-${row.user_id}`,
          name: row.name || row.username,
          email: row.email,
          username: row.username,
          password: row.password,
          office: 'University Office',
          roles: Array.isArray(row.roles)
            ? row.roles
            : [row.role as UserRole],
          status: (row.status as 'active' | 'locked' | 'pending') || 'active',
          employeeId: row.employee_id ? String(row.employee_id) : null,
        }
      }
    } catch (err) {
      console.warn('[DB usersService] Query error, falling back to local data:', err)
    }

    // Fallback to local default users
    return defaultUsers.find(
      (u) =>
        u.email.toLowerCase() === cleanId ||
        u.username.toLowerCase() === cleanId ||
        u.email.toLowerCase().split('@')[0] === cleanId,
    )
  },

  async create(data: {
    name: string
    username: string
    role: string
    email?: string
    password?: string
    employeeId?: string | number | null
  }): Promise<UserAccount> {
    const cleanUser = data.username.replace(/^@/, '').trim().toLowerCase()
    const email = (data.email?.trim() || `${cleanUser}@msunaawan.example`).toLowerCase()
    const rawPassword = data.password?.trim() || cleanUser
    const hashedPassword = bcrypt.hashSync(rawPassword, 10)
    let empIdNum = data.employeeId ? parseInt(String(data.employeeId).replace(/\D/g, ''), 10) || null : null

    try {
      // If no employee_id was selected, automatically create a matching employee record
      if (!empIdNum) {
        try {
          const empRes = await pool.query(
            `INSERT INTO employees (full_name, payroll_type, status, created_at)
             VALUES ($1, $2, 'Active', CURRENT_TIMESTAMP)
             RETURNING employee_id`,
            [data.name.trim(), data.role === 'Employee' ? 'Staff' : 'Permanent Staff'],
          )
          if (empRes.rows.length > 0) {
            empIdNum = empRes.rows[0].employee_id
          }
        } catch (empErr) {
          console.warn('[DB usersService] Auto-create employee notice:', empErr)
        }
      }

      const res = await pool.query(
        `INSERT INTO users (name, username, password, email, role, status, employee_id, created_at)
         VALUES ($1, $2, $3, $4, $5, 'active', $6, CURRENT_TIMESTAMP)
         RETURNING user_id, name, username, email, role, status, employee_id`,
        [data.name.trim(), cleanUser, hashedPassword, email, data.role, empIdNum],
      )

      const row = res.rows[0]

      // Record audit log for account creation
      try {
        await pool.query(
          `INSERT INTO audit_logs (user_id, action, logged_at) VALUES ($1, $2, CURRENT_TIMESTAMP)`,
          [row.user_id, `Created user account for ${cleanUser} with role ${data.role}`],
        )
      } catch (logErr) {
        console.warn('[DB usersService] Failed to insert audit log for user creation:', logErr)
      }

      return {
        accountId: `USR-${row.user_id}`,
        name: row.name || data.name.trim(),
        email: row.email,
        username: row.username,
        office: 'University Office',
        roles: [row.role as UserRole],
        status: 'active',
        employeeId: row.employee_id ? String(row.employee_id) : null,
      }
    } catch (err) {
      console.warn('[DB usersService] Create failed, fallback to in-memory:', err)
      const newUser: UserAccount = {
        name: data.name.trim(),
        email,
        username: cleanUser,
        password: rawPassword,
        office: 'University Office',
        roles: [data.role as UserRole],
        status: 'active',
        employeeId: data.employeeId ? String(data.employeeId) : null,
      }
      defaultUsers.unshift(newUser)
      return newUser
    }
  },
}
