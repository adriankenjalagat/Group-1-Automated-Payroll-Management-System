import type { Request, Response } from 'express'
import { approvalsService } from './approvals.service'

export const approvalsController = {
  getAll(_req: Request, res: Response): void {
    res.status(200).json(approvalsService.findAll())
  },
}

