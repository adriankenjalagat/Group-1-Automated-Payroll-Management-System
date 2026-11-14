import type { Response } from 'express'
import type { AuthenticatedRequest } from '../../middleware/auth'
import { approvalsService } from './approvals.service'

function getParam(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return val[0] || ''
  return val || ''
}

export const approvalsController = {
  async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const payrollId = req.query.payrollId ? parseInt(req.query.payrollId as string, 10) : undefined
      const steps = await approvalsService.findAll(isNaN(payrollId as any) ? undefined : payrollId)
      res.status(200).json(steps)
    } catch (err) {
      console.error('[approvalsController] getAll error:', err)
      res.status(500).json({ message: 'Failed to retrieve approvals.' })
    }
  },

  async getByPayroll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const payrollId = parseInt(getParam(req.params.payrollId), 10)
      if (isNaN(payrollId)) {
        res.status(400).json({ message: 'Invalid payroll ID.' })
        return
      }

      const steps = await approvalsService.findByPayroll(payrollId)
      res.status(200).json(steps)
    } catch (err) {
      console.error('[approvalsController] getByPayroll error:', err)
      res.status(500).json({ message: 'Failed to retrieve approvals for payroll.' })
    }
  },

  /**
   * GET /api/approvals/routes — List configured approval route rules.
   */
  async getRoutes(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const filters = {
        payrollTypeId: req.query.payrollTypeId as string | undefined,
        fundSource: req.query.fundSource as string | undefined,
        costCenter: req.query.costCenter as string | undefined,
      }
      const routes = await approvalsService.getRoutes(filters)
      res.status(200).json(routes)
    } catch (err) {
      console.error('[approvalsController] getRoutes error:', err)
      res.status(500).json({ message: 'Failed to retrieve approval routes.' })
    }
  },

  /**
   * POST /api/approvals/routes — Create a new approval route rule.
   */
  async createRoute(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { payrollTypeId, fundSource, costCenter, stageName, sequenceOrder, requiredRole } = req.body as {
        payrollTypeId?: string
        fundSource?: string
        costCenter?: string
        stageName?: string
        sequenceOrder?: number
        requiredRole?: string
      }

      if (!stageName || sequenceOrder === undefined || !requiredRole) {
        res.status(400).json({ message: 'stageName, sequenceOrder, and requiredRole are required.' })
        return
      }

      const route = await approvalsService.createRoute({
        payrollTypeId,
        fundSource,
        costCenter,
        stageName,
        sequenceOrder,
        requiredRole,
      })

      res.status(201).json(route)
    } catch (err: any) {
      console.error('[approvalsController] createRoute error:', err)
      res.status(400).json({ message: err.message || 'Failed to create approval route.' })
    }
  },

  /**
   * DELETE /api/approvals/routes/:id — Deactivate an approval route rule.
   */
  async deactivateRoute(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(getParam(req.params.id), 10)
      if (isNaN(id)) {
        res.status(400).json({ message: 'Invalid route ID.' })
        return
      }

      const success = await approvalsService.deactivateRoute(id)
      if (!success) {
        res.status(404).json({ message: 'Approval route not found.' })
        return
      }

      res.status(200).json({ message: 'Approval route deactivated.' })
    } catch (err) {
      console.error('[approvalsController] deactivateRoute error:', err)
      res.status(500).json({ message: 'Failed to deactivate approval route.' })
    }
  },

  async decision(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required.' })
        return
      }

      const { payrollId, decision, remarks, costCenter } = req.body as {
        payrollId?: number | string
        decision?: 'Approved' | 'Returned' | 'Rejected'
        remarks?: string
        costCenter?: string
      }

      let pId = typeof payrollId === 'number' ? payrollId : parseInt(String(payrollId), 10)
      if (isNaN(pId) && payrollId) {
        const match = String(payrollId).match(/\d+/)
        if (match) {
          pId = parseInt(match[0], 10)
        }
      }
      if (!pId || isNaN(pId)) {
        res.status(400).json({ message: 'Valid payroll ID is required.' })
        return
      }

      if (!decision || !['Approved', 'Returned', 'Rejected'].includes(decision)) {
        res.status(400).json({ message: "Decision must be 'Approved', 'Returned', or 'Rejected'." })
        return
      }

      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null
      const outcome = await approvalsService.processDecision({
        payrollId: pId,
        decision,
        remarks,
        costCenter,
        actorUser: req.user,
        ip,
      })

      res.status(200).json({
        message: `Payroll decision '${decision}' successfully recorded.`,
        ...outcome,
      })
    } catch (err: any) {
      console.error('[approvalsController] decision error:', err)
      const status = err.statusCode || 500
      res.status(status).json({ message: err.message || 'Failed to record approval decision.' })
    }
  },
}
