import type { Response } from 'express'
import type { AuthenticatedRequest } from '../../middleware/auth'
import { usersService } from './users.service'

function parseId(param: string | string[] | undefined): number | null {
  const raw = Array.isArray(param) ? param[0] : param
  if (!raw) return null
  const num = parseInt(raw, 10)
  return isNaN(num) ? null : num
}

export const usersController = {
  async getAll(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const users = await usersService.findAll()
      res.status(200).json(users)
    } catch (error) {
      console.error('[usersController] getAll error:', error)
      res.status(500).json({ message: 'Failed to retrieve users.' })
    }
  },

  async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = parseId(req.params.id)
      if (id === null) {
        res.status(400).json({ message: 'Invalid user ID.' })
        return
      }

      const user = await usersService.findById(id)
      if (!user) {
        res.status(404).json({ message: 'User not found.' })
        return
      }

      res.status(200).json(user)
    } catch (error) {
      console.error('[usersController] getById error:', error)
      res.status(500).json({ message: 'Failed to retrieve user.' })
    }
  },

  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { name, username, role, roles, email, password, office, employeeId } = req.body as {
        name?: string
        username?: string
        role?: string
        roles?: string[]
        email?: string
        password?: string
        office?: string
        employeeId?: string | number | null
      }

      if (!username || typeof username !== 'string') {
        res.status(400).json({ message: 'Username is required.' })
        return
      }

      // If password is not provided in demo body, use username as fallback if acceptable, or enforce password
      // Note: for safety, enforce minimum 8 chars
      const pwd = password || (username.length >= 8 ? username : `${username}#2026`)

      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null
      const created = await usersService.create(
        {
          name: name || username,
          username,
          role,
          roles,
          email,
          password: pwd,
          office,
          employeeId,
        },
        req.user?.id,
        ip,
      )

      res.status(201).json({
        message: 'User created successfully.',
        user: created,
      })
    } catch (error: any) {
      console.error('[usersController] Create user error:', error)
      const status = error.statusCode || 500
      res.status(status).json({ message: error.message || 'Failed to create user.' })
    }
  },

  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = parseId(req.params.id)
      if (id === null) {
        res.status(400).json({ message: 'Invalid user ID.' })
        return
      }

      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null
      const updated = await usersService.update(id, req.body, req.user?.id, ip)

      res.status(200).json({
        message: 'User updated successfully.',
        user: updated,
      })
    } catch (error: any) {
      console.error('[usersController] update user error:', error)
      const status = error.statusCode || 500
      res.status(status).json({ message: error.message || 'Failed to update user.' })
    }
  },

  async setStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = parseId(req.params.id)
      if (id === null) {
        res.status(400).json({ message: 'Invalid user ID.' })
        return
      }

      const { status } = req.body as { status?: string }
      if (!status || !['active', 'locked', 'pending'].includes(status)) {
        res.status(400).json({ message: "Status must be 'active', 'locked', or 'pending'." })
        return
      }

      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null
      const updated = await usersService.setStatus(
        id,
        status as 'active' | 'locked' | 'pending',
        req.user?.id,
        ip,
      )

      res.status(200).json({
        message: `User status updated to ${status}.`,
        user: updated,
      })
    } catch (error: any) {
      console.error('[usersController] setStatus error:', error)
      const status = error.statusCode || 500
      res.status(status).json({ message: error.message || 'Failed to update user status.' })
    }
  },

  async lock(req: AuthenticatedRequest, res: Response): Promise<void> {
    req.body = { status: 'locked' }
    return usersController.setStatus(req, res)
  },

  async unlock(req: AuthenticatedRequest, res: Response): Promise<void> {
    req.body = { status: 'active' }
    return usersController.setStatus(req, res)
  },
}
