import type { Request, Response } from 'express'
import { usersService } from './users.service'

export const usersController = {
  async getAll(_req: Request, res: Response): Promise<void> {
    try {
      const users = await usersService.findAll()
      res.status(200).json(users)
    } catch {
      res.status(500).json({ message: 'Failed to retrieve users.' })
    }
  },

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { name, username, role, email, password, employeeId } = req.body as {
        name?: string
        username?: string
        role?: string
        email?: string
        password?: string
        employeeId?: string | number | null
      }

      if (!username || !role) {
        res.status(400).json({ message: 'Username and role are required.' })
        return
      }

      const created = await usersService.create({
        name: name || username,
        username,
        role,
        email,
        password: password || username,
        employeeId,
      })

      res.status(201).json({
        message: 'User created successfully.',
        user: created,
      })
    } catch (error) {
      console.error('[usersController] Create user error:', error)
      res.status(500).json({ message: 'Failed to create user.' })
    }
  },
}
