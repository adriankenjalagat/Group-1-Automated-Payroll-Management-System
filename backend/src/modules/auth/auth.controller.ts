import type { Request, Response } from 'express'
import { authService } from './auth.service'

export const authController = {
  async login(req: Request, res: Response): Promise<void> {
    const { identifier, username, password } = req.body as {
      identifier?: string
      username?: string
      password?: string
    }

    const loginId = identifier || username
    if (!loginId || !password) {
      res
        .status(400)
        .json({ message: 'Email/username and password are required.' })
      return
    }

    try {
      const outcome = await authService.login(loginId, password)

      if (!outcome.ok) {
        if (outcome.reason === 'locked') {
          res.status(423).json({ message: 'Account locked.' })
          return
        }
        res.status(401).json({ message: 'Invalid email, username, or password.' })
        return
      }

      res.status(200).json({
        message: 'Login successful.',
        token: outcome.token,
        user: outcome.user,
      })
    } catch (error) {
      console.error('[authController] Login error:', error)
      res.status(500).json({ message: 'Internal server error during login.' })
    }
  },
}
