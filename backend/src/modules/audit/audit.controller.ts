import type { Response } from 'express'
import type { AuthenticatedRequest } from '../../middleware/auth'
import { auditService } from './audit.service'

export const auditController = {
  async getAll(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const records = await auditService.findAll()
      res.status(200).json(records)
    } catch {
      res.status(500).json({ message: 'Failed to retrieve audit logs.' })
    }
  },

  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId, action, details } = req.body as {
        userId?: number
        action?: string
        details?: Record<string, unknown>
      }
      if (!action) {
        res.status(400).json({ message: 'Action description is required.' })
        return
      }

      const actingUserId = userId ? Number(userId) : (req.user?.id ?? null)
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null

      await auditService.logAction(actingUserId, action, details, ip)
      res.status(201).json({ message: 'Audit entry created successfully.' })
    } catch {
      res.status(500).json({ message: 'Failed to create audit log.' })
    }
  },
}
