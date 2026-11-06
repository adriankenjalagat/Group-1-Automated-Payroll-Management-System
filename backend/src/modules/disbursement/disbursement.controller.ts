import type { Request, Response } from 'express'
import { disbursementService } from './disbursement.service'

export const disbursementController = {
  getAll(_req: Request, res: Response): void {
    res.status(200).json(disbursementService.findAll())
  },
}

