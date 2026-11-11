import type { Response } from 'express'
import type { AuthenticatedRequest } from '../../middleware/auth'
import { disbursementService } from './disbursement.service'

function getParam(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return val[0] || ''
  return val || ''
}

export const disbursementController = {
  async getAll(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const records = await disbursementService.findAll()
      res.status(200).json(records)
    } catch (err) {
      console.error('[disbursementController] getAll error:', err)
      res.status(500).json({ message: 'Failed to retrieve disbursement records.' })
    }
  },

  async getByPayroll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const payrollId = parseInt(getParam(req.params.payrollId), 10)
      if (isNaN(payrollId)) {
        res.status(400).json({ message: 'Invalid payroll ID.' })
        return
      }

      const record = await disbursementService.findByPayroll(payrollId)
      if (!record) {
        res.status(404).json({ message: 'Disbursement record not found for payroll.' })
        return
      }

      res.status(200).json(record)
    } catch (err) {
      console.error('[disbursementController] getByPayroll error:', err)
      res.status(500).json({ message: 'Failed to retrieve disbursement record.' })
    }
  },

  async getDv(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const payrollId = parseInt(getParam(req.params.payrollId), 10)
      if (isNaN(payrollId)) {
        res.status(400).json({ message: 'Invalid payroll ID.' })
        return
      }

      const dv = await disbursementService.generateDisbursementVoucher(payrollId)
      res.status(200).json(dv)
    } catch (err: any) {
      console.error('[disbursementController] getDv error:', err)
      res.status(500).json({ message: err.message || 'Failed to generate Disbursement Voucher.' })
    }
  },

  async getBudgetDoc(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const payrollId = parseInt(getParam(req.params.payrollId), 10)
      if (isNaN(payrollId)) {
        res.status(400).json({ message: 'Invalid payroll ID.' })
        return
      }

      const doc = await disbursementService.generateBudgetDocument(payrollId)
      res.status(200).json(doc)
    } catch (err: any) {
      console.error('[disbursementController] getBudgetDoc error:', err)
      res.status(500).json({ message: err.message || 'Failed to generate ORAS/BURAS document.' })
    }
  },

  async getLandBank(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const payrollId = parseInt(getParam(req.params.payrollId), 10)
      if (isNaN(payrollId)) {
        res.status(400).json({ message: 'Invalid payroll ID.' })
        return
      }

      const lb = await disbursementService.generateLandBankFile(payrollId)
      res.status(200).json(lb)
    } catch (err: any) {
      console.error('[disbursementController] getLandBank error:', err)
      res.status(500).json({ message: err.message || 'Failed to generate LandBank export file.' })
    }
  },

  async release(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const payrollId = parseInt(getParam(req.params.payrollId), 10)
      if (isNaN(payrollId)) {
        res.status(400).json({ message: 'Invalid payroll ID.' })
        return
      }

      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null
      const released = await disbursementService.releaseDisbursement(payrollId, req.user?.id, ip)

      res.status(200).json({
        message: 'Disbursement released and employee payslips published successfully.',
        disbursement: released,
      })
    } catch (err: any) {
      console.error('[disbursementController] release error:', err)
      res.status(500).json({ message: err.message || 'Failed to release disbursement.' })
    }
  },
}
