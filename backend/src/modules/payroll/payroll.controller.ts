import type { Response } from 'express'
import type { AuthenticatedRequest } from '../../middleware/auth'
import { payrollService } from './payroll.service'

function getParam(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return val[0] || ''
  return val || ''
}

export const payrollController = {
  async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const period = req.query.period as string | undefined
      const records = await payrollService.findAll(period)
      res.status(200).json(records)
    } catch (err) {
      console.error('[payrollController] getAll error:', err)
      res.status(500).json({ message: 'Failed to retrieve payroll records.' })
    }
  },

  async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(getParam(req.params.id), 10)
      if (isNaN(id)) {
        res.status(400).json({ message: 'Invalid payroll ID.' })
        return
      }

      const record = await payrollService.findById(id)
      if (!record) {
        res.status(404).json({ message: 'Payroll record not found.' })
        return
      }

      res.status(200).json(record)
    } catch (err) {
      console.error('[payrollController] getById error:', err)
      res.status(500).json({ message: 'Failed to retrieve payroll record.' })
    }
  },

  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null
      const created = await payrollService.create(req.body, req.user?.id, ip)
      res.status(201).json(created)
    } catch (err: any) {
      console.error('[payrollController] create error:', err)
      res.status(400).json({ message: err.message || 'Failed to create payroll record.' })
    }
  },

  async updateCorrection(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(getParam(req.params.id), 10)
      if (isNaN(id)) {
        res.status(400).json({ message: 'Invalid payroll ID.' })
        return
      }

      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null
      const updated = await payrollService.updateCorrection(id, req.body, req.user?.id, ip)
      res.status(200).json({
        message: 'Payroll recalculated and correction logged successfully.',
        record: updated,
      })
    } catch (err: any) {
      console.error('[payrollController] updateCorrection error:', err)
      const status = err.statusCode || 500
      res.status(status).json({ message: err.message || 'Failed to correct payroll record.' })
    }
  },

  async lock(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(getParam(req.params.id), 10)
      if (isNaN(id)) {
        res.status(400).json({ message: 'Invalid payroll ID.' })
        return
      }

      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null
      const locked = await payrollService.lockPayroll(id, req.user?.id, ip)
      res.status(200).json({
        message: 'Payroll record successfully locked and marked Ready for DV.',
        record: locked,
      })
    } catch (err: any) {
      console.error('[payrollController] lock error:', err)
      const status = err.statusCode || 500
      res.status(status).json({ message: err.message || 'Failed to lock payroll.' })
    }
  },
}
