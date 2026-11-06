import type { Request, Response } from 'express'
import { usersService } from './users.service'

export const usersController = {
  getAll(_req: Request, res: Response): void {
    res.status(200).json(usersService.findAll())
  },
}

