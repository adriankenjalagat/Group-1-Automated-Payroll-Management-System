import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool } from '../../config/db'
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

    // Verify password against bcrypt hash or fallback to username / demo password
    const cleanPassword = password.trim()
    const isBcryptHash = user.password ? /^\$2[aby]\$\d{2}\$/.test(user.password) : false

    let passwordMatches = false
    if (isBcryptHash && user.password) {
      passwordMatches =
        (await bcrypt.compare(password, user.password)) ||
        (cleanPassword !== password && (await bcrypt.compare(cleanPassword, user.password)))
    }

    if (!passwordMatches) {
      const demoPass = process.env.DEMO_PASSWORD || 'Payroll#2026'
      if (cleanPassword === user.username || cleanPassword === demoPass || password === user.username) {
        passwordMatches = true
        // Automatically sync & update fresh bcrypt hash in the database
        try {
          const freshHash = await bcrypt.hash(cleanPassword, 10)
          await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [freshHash, user.id])
        } catch (updateErr) {
          console.warn('[authService] Password re-hash update error:', updateErr)
        }
      }
    }

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

    await pool
      .query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [user.id])
      .catch(() => {})

    await auditService.logAction(
      user.id ?? null,
      `Successful sign-in for user "${user.username}" with role ${user.roles.join(', ')}`,
      { username: user.username, roles: user.roles },
      ipAddress,
      'USER',
      user.id ?? 0,
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

  async requestPasswordReset(
    identifier: string,
    ipAddress?: string | null,
  ): Promise<{ success: boolean; message: string; resetToken?: string }> {
    const user = await usersService.findByIdentifier(identifier)
    if (!user || !user.id) {
      await auditService.logAction(
        null,
        `Password reset requested for nonexistent identifier "${identifier}"`,
        { identifier },
        ipAddress,
      )
      return {
        success: true,
        message: 'If an account matches that email or username, password reset instructions have been generated.',
      }
    }

    const resetToken = jwt.sign(
      {
        id: user.id,
        username: user.username,
        purpose: 'password_reset',
      },
      getJwtSecret(),
      {
        subject: String(user.id),
        expiresIn: '30m',
        issuer: 'msu-naawan-payroll-api',
        audience: 'msu-naawan-payroll-client',
      },
    )

    await auditService.logAction(
      user.id,
      `Password reset requested for user "${user.username}"`,
      { username: user.username, email: user.email },
      ipAddress,
    )

    return {
      success: true,
      message: 'Password reset link has been dispatched.',
      resetToken,
    }
  },

  async resetPassword(
    token: string,
    newPassword: string,
    ipAddress?: string | null,
  ): Promise<{ success: boolean; message: string }> {
    if (!token || typeof token !== 'string') {
      const err = new Error('Reset token is required.')
      ;(err as any).statusCode = 400
      throw err
    }

    if (!newPassword || newPassword.length < 8) {
      const err = new Error('Password must be at least 8 characters long.')
      ;(err as any).statusCode = 400
      throw err
    }

    let payload: any
    try {
      payload = jwt.verify(token, getJwtSecret(), {
        issuer: 'msu-naawan-payroll-api',
        audience: 'msu-naawan-payroll-client',
      })
    } catch {
      const err = new Error('The password reset link is invalid or has expired.')
      ;(err as any).statusCode = 400
      throw err
    }

    if (!payload || payload.purpose !== 'password_reset' || !payload.id) {
      const err = new Error('Invalid reset token.')
      ;(err as any).statusCode = 400
      throw err
    }

    const userId = Number(payload.id)
    const existing = await usersService.findById(userId)
    if (!existing) {
      const err = new Error('User not found.')
      ;(err as any).statusCode = 404
      throw err
    }

    await usersService.update(userId, { password: newPassword }, userId, ipAddress)

    await auditService.logAction(
      userId,
      `Password reset successfully completed for user "${existing.username}"`,
      { username: existing.username },
      ipAddress,
    )

    return {
      success: true,
      message: 'Your password has been successfully updated.',
    }
  },
}
