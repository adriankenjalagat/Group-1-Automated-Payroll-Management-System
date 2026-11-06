import type { Request, Response } from 'express'
import { employeesService } from './employees.service'

export const employeesController = {
  getAll(_req: Request, res: Response): void {
    res.status(200).json(employeesService.findAll())
  },
}

