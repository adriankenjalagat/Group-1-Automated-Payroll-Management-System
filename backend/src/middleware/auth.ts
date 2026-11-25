import type { Request, Response, NextFunction } from 'express'
import jwt, { type JwtPayload } from 'jsonwebtoken'
import { pool } from '../config/db'

export type UserRole =
  | 'Employee'
  | 'Immediate Supervisor'
  | 'HR Office'
  | 'Accounting'
  | 'Accountant'
  | 'Cost Center Signatory'
  | 'Budget Office'
  | 'Office of the Chancellor'
  | 'Cashier'
  | 'System Administrator'

export const SRS_ROLES: readonly UserRole[] = [
  'Employee',
  'Immediate Supervisor',
  'HR Office',
  'Accounting',
  'Accountant',
  'Cost Center Signatory',
  'Budget Office',
  'Office of the Chancellor',
  'Cashier',
  'System Administrator',
] as const

export interface AuthPayload {
  id: number
  accountId?: string
  username: string
  email: string
  name: string
  office: string
  costCenter?: string
  roles: UserRole[]
  status: 'active' | 'locked' | 'pending'
  employeeId?: number | null
}

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || 'msu_naawan_payroll_secret_key_2026_secure'

  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET is missing or too short (minimum 32 characters required).')
  }

  return secret
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      // In development mode, fallback to default active System Administrator
      req.user = {
        id: 1,
        accountId: 'USR-1',
        name: 'Ramon Bautista',
        username: 'rbautista',
        email: 'ramon.bautista@msunaawan.example',
        office: 'Information Systems Office',
        costCenter: 'Information Systems Office',
        roles: ['System Administrator'],
        status: 'active',
        employeeId: 1,
      }
      return next()
    }
    res.status(401).json({ message: 'Authentication token is required.' })
    return
  }

  const token = authHeader.slice(7).trim()

  if (!token) {
    res.status(401).json({ message: 'Invalid or expired token.' })
    return
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      issuer: 'msu-naawan-payroll-api',
      audience: 'msu-naawan-payroll-client',
    }) as JwtPayload

    if (!decoded || typeof decoded !== 'object') {
      res.status(401).json({ message: 'Invalid authentication token.' })
      return
    }

    const tokenSubject = decoded.sub ? String(decoded.sub) : undefined
    const tokenUsername = typeof decoded.username === 'string' ? decoded.username : undefined

    if (!tokenSubject && !tokenUsername) {
      res.status(401).json({ message: 'Invalid token claims.' })
      return
    }

    // Always recheck current user account status and permissions against PostgreSQL
    const userRes = await pool.query(
      `SELECT u.id,
              u.employee_id,
              u.role,
              u.username,
              u.email,
              u.is_active,
              COALESCE(
                NULLIF(TRIM(CONCAT_WS(' ', e.first_name, e.middle_name, e.last_name)), ''),
                u.username
              ) AS full_name,
              COALESCE(o.name, 'University Office') AS office,
              COALESCE(cc.name, o.name, 'University Office') AS cost_center,
              ARRAY[COALESCE(u.role, 'Employee')]::text[] AS roles
       FROM users u
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
       WHERE u.id::text = $1
          OR LOWER(u.username) = LOWER($2)
       LIMIT 1`,
      [tokenSubject || '', tokenUsername || ''],
    )

    if (userRes.rows.length === 0) {
      res.status(401).json({ message: 'User account no longer exists.' })
      return
    }

    const dbUser = userRes.rows[0]

    // Reject inactive/locked accounts
    if (!dbUser.is_active) {
      res.status(423).json({ message: 'Account is locked. Please contact your System Administrator.' })
      return
    }

    const validatedRoles = Array.isArray(dbUser.roles)
      ? (dbUser.roles.filter((r: unknown): r is UserRole =>
          typeof r === 'string' && SRS_ROLES.includes(r as UserRole),
        ) as UserRole[])
      : []

    req.user = {
      id: Number(dbUser.id),
      accountId: `USR-${dbUser.id}`,
      name: dbUser.full_name,
      email: dbUser.email,
      username: dbUser.username,
      office: dbUser.office || 'University Office',
      costCenter: dbUser.cost_center || dbUser.office || 'University Office',
      roles: validatedRoles.length > 0 ? validatedRoles : ['Employee'],
      status: dbUser.is_active ? 'active' : 'locked',
      employeeId: dbUser.employee_id ? Number(dbUser.employee_id) : null,
    }

    next()
  } catch (error) {
    if (error instanceof Error && error.message.includes('JWT_SECRET')) {
      res.status(500).json({ message: 'Authentication configuration error.' })
      return
    }

    res.status(401).json({ message: 'Invalid or expired token.' })
  }
}

export function authorize(...allowedRoles: UserRole[]) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required.' })
      return
    }

    const hasPermission = req.user.roles.some((role) =>
      allowedRoles.includes(role),
    )

    if (!hasPermission) {
      res.status(403).json({
        message: `Forbidden: You do not have permission to access this resource. Required role(s): ${allowedRoles.join(', ')}.`,
      })
      return
    }

    next()
  }
}
