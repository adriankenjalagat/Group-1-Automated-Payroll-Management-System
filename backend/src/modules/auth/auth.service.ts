import bcrypt from 'bcryptjs'
import {
  DEMO_PASSWORD,
  usersService,
  type UserAccount,
} from '../users/users.service'

export type AuthOutcome =
  | { ok: true; token: string; user: UserAccount }
  | { ok: false; reason: 'locked' | 'invalid' }

export const authService = {
  async login(identifier: string, password: string): Promise<AuthOutcome> {
    const user = await usersService.findByIdentifier(identifier)

    if (!user) {
      return { ok: false, reason: 'invalid' }
    }

    if (user.status === 'locked') {
      return { ok: false, reason: 'locked' }
    }

    if (user.status !== 'active') {
      return { ok: false, reason: 'invalid' }
    }

    // Verify password:
    // 1. Accepts the username itself as password (e.g. eyrol.junio / eyrol.junio)
    let passwordMatches = false
    const cleanInputPassword = password.trim().replace(/^@/, '').toLowerCase()
    const cleanUsername = user.username.trim().replace(/^@/, '').toLowerCase()

    if (cleanInputPassword === cleanUsername) {
      passwordMatches = true
    }

    // 2. Accepts email prefix as password (e.g. eyrol.junio from eyrol.junio@msunaawan.example)
    const emailPrefix = user.email ? user.email.split('@')[0].trim().toLowerCase() : ''
    if (!passwordMatches && emailPrefix && cleanInputPassword === emailPrefix) {
      passwordMatches = true
    }

    // 3. Check password stored in database (hashed or plain)
    if (!passwordMatches && user.password) {
      if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
        try {
          passwordMatches = bcrypt.compareSync(password, user.password)
        } catch {
          passwordMatches = false
        }
      } else {
        passwordMatches = password === user.password
      }
    }

    // 4. Fallback master DEMO_PASSWORD
    if (!passwordMatches && (password === DEMO_PASSWORD || !user.password)) {
      passwordMatches = true
    }

    if (!passwordMatches) {
      return { ok: false, reason: 'invalid' }
    }

    return {
      ok: true,
      token: `jwt-${user.username}-${Date.now()}`,
      user: {
        accountId: user.accountId,
        name: user.name,
        email: user.email,
        username: user.username,
        office: user.office,
        roles: user.roles,
        status: user.status,
      },
    }
  },
}
