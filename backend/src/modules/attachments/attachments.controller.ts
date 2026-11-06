import type { Request, Response } from 'express'
import { attachmentsService } from './attachments.service'

export const attachmentsController = {
  getAll(_req: Request, res: Response): void {
    res.status(200).json(attachmentsService.findAll())
  },
}

