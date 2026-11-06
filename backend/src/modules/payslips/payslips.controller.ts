import type { Request, Response } from 'express'
import { payslipsService } from './payslips.service'

export const payslipsController = {
  getAll(_req: Request, res: Response): void {
    res.status(200).json(payslipsService.findAll())
  },
}

