import type { Response } from 'express'
import type { AuthenticatedRequest } from '../../middleware/auth'
import { payslipsService } from './payslips.service'

function getParam(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return val[0] || ''
  return val || ''
}

export const payslipsController = {
  async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      let targetEmployeeId = req.query.employeeId as string | undefined
      const isEmployeeOnly =
        req.user && req.user.roles.length === 1 && req.user.roles[0] === 'Employee'

      // Strict enforcement: Employees can ONLY view their own released payslips
      if (isEmployeeOnly && req.user) {
        targetEmployeeId = req.user.accountId || String(req.user.employeeId) || req.user.username
      }

      const records = await payslipsService.findAll({
        employeeId: targetEmployeeId,
        releasedOnly: isEmployeeOnly ? true : false,
        period: req.query.period as string | undefined,
      })

      res.status(200).json(records)
    } catch (err) {
      console.error('[payslipsController] getAll error:', err)
      res.status(500).json({ message: 'Failed to retrieve payslips.' })
    }
  },

  async getByEmployee(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const paramEmp = getParam(req.params.employeeId)
      const isEmployeeOnly =
        req.user && req.user.roles.length === 1 && req.user.roles[0] === 'Employee'

      // Restrict employee to own payslips
      if (
        isEmployeeOnly &&
        req.user &&
        paramEmp !== req.user.accountId &&
        paramEmp !== String(req.user.employeeId) &&
        paramEmp.toLowerCase() !== req.user.username.toLowerCase()
      ) {
        res.status(403).json({ message: 'Access denied: You may only view your own payslips.' })
        return
      }

      const records = await payslipsService.findByEmployee(paramEmp, Boolean(isEmployeeOnly))
      res.status(200).json(records)
    } catch (err) {
      console.error('[payslipsController] getByEmployee error:', err)
      res.status(500).json({ message: 'Failed to retrieve payslips.' })
    }
  },

  async getDeductionReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const period = req.query.period as string | undefined
      const report = await payslipsService.getDeductionReport(period)
      res.status(200).json(report)
    } catch (err) {
      console.error('[payslipsController] getDeductionReport error:', err)
      res.status(500).json({ message: 'Failed to generate deduction report.' })
    }
  },

  async getPayrollRegister(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const period = req.query.period as string | undefined
      const register = await payslipsService.getPayrollRegister(period)
      res.status(200).json(register)
    } catch (err) {
      console.error('[payslipsController] getPayrollRegister error:', err)
      res.status(500).json({ message: 'Failed to generate payroll register.' })
    }
  },
}
