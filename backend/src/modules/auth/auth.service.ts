import {
  DEMO_PASSWORD,
  usersService,
  type UserAccount,
} from '../users/users.service'

export type AuthOutcome =
  | { ok: true; token: string; user: UserAccount }
  | { ok: false; reason: 'locked' | 'invalid' }

export const authService = {
  login(identifier: string, password: string): AuthOutcome {
    const user = usersService.findByIdentifier(identifier)
    const expectedPassword = user?.password || DEMO_PASSWORD

    if (!user || password !== expectedPassword) {
      return { ok: false, reason: 'invalid' }
    }

    if (user.status === 'locked') {
      return { ok: false, reason: 'locked' }
    }

    if (user.status !== 'active') {
      return { ok: false, reason: 'invalid' }
    }

    return {
      ok: true,
      token: `demo-jwt-${user.username}`,
      user,
    }
  },
}
