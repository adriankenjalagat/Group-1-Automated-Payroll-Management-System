import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { usersService, type UserAccount } from '../users/users.service'
import { auditService } from '../audit/audit.service'
import { getJwtSecret } from '../../middleware/auth'

export type AuthOutcome =
  | { ok: true; token: string; user: UserAccount }
  | { ok: false; reason: 'locked' | 'pending' | 'inactive' | 'invalid' }

export const authService = {
  async login(
    identifier: string,
    password: string,
    ipAddress?: string | null,
  ): Promise<AuthOutcome> {
    const user = await usersService.findByIdentifier(identifier)

    if (!user) {
      await auditService.logAction(
        null,
        `Failed sign-in attempt for identifier "${identifier}" (user not found)`,
        { identifier },
        ipAddress,
      )
      return { ok: false, reason: 'invalid' }
    }

    if (user.status === 'locked') {
      await auditService.logAction(
        user.id ?? null,
        `Failed sign-in attempt for locked user "${user.username}"`,
        { username: user.username, reason: 'account_locked' },
        ipAddress,
      )
      return { ok: false, reason: 'locked' }
    }

    if (user.status === 'pending') {
      return { ok: false, reason: 'pending' }
    }

    if (user.status !== 'active' || !user.password) {
      return { ok: false, reason: 'inactive' }
    }

    // Verify password strictly against bcrypt hash
    const isBcryptHash = /^\$2[aby]\$\d{2}\$/.test(user.password)
    if (!isBcryptHash) {
      await auditService.logAction(
        user.id ?? null,
        `Failed sign-in attempt for user "${user.username}" (invalid hash format in database)`,
        { username: user.username },
        ipAddress,
      )
      return { ok: false, reason: 'invalid' }
    }

    const passwordMatches = await bcrypt.compare(password, user.password)
    if (!passwordMatches) {
      await auditService.logAction(
        user.id ?? null,
        `Failed sign-in attempt for user "${user.username}" (incorrect password)`,
        { username: user.username },
        ipAddress,
      )
      return { ok: false, reason: 'invalid' }
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        roles: user.roles,
      },
      getJwtSecret(),
      {
        subject: user.id ? String(user.id) : user.username,
        expiresIn: '8h',
        issuer: 'msu-naawan-payroll-api',
        audience: 'msu-naawan-payroll-client',
      },
    )

    await auditService.logAction(
      user.id ?? null,
      `Successful sign-in for user "${user.username}" with role ${user.roles.join(', ')}`,
      { username: user.username, roles: user.roles },
      ipAddress,
    )

    return {
      ok: true,
      token,
      user: {
        id: user.id,
        accountId: user.accountId,
        name: user.name,
        email: user.email,
        username: user.username,
        office: user.office,
        roles: user.roles,
        status: user.status,
        employeeId: user.employeeId,
      },
    }
  },
}
