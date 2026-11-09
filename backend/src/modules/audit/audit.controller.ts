import type { Request, Response } from 'express'
import { auditService } from './audit.service'

export const auditController = {
  async getAll(_req: Request, res: Response): Promise<void> {
    try {
      const records = await auditService.findAll()
      res.status(200).json(records)
    } catch {
      res.status(500).json({ message: 'Failed to retrieve audit logs.' })
    }
  },

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { userId, action } = req.body as { userId?: number; action?: string }
      if (!action) {
        res.status(400).json({ message: 'Action description is required.' })
        return
      }

      await auditService.logAction(userId ? Number(userId) : null, action)
      res.status(201).json({ message: 'Audit entry created successfully.' })
    } catch {
      res.status(500).json({ message: 'Failed to create audit log.' })
    }
  },
}

