import type { Request, Response } from 'express'
import { payslipsService } from './payslips.service'

function getParam(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return val[0] || ''
  return val || ''
}

export const payslipsController = {
  getAll(req: Request, res: Response): void {
    const { employeeId } = req.query as { employeeId?: string }
    if (employeeId) {
      res.status(200).json(payslipsService.findByEmployee(employeeId))
      return
    }
    res.status(200).json(payslipsService.findAll())
  },

  getByEmployee(req: Request, res: Response): void {
    const employeeId = getParam(req.params.employeeId)
    const records = payslipsService.findByEmployee(employeeId)
    res.status(200).json(records)
  },

  create(req: Request, res: Response): void {
    const created = payslipsService.create(req.body)
    res.status(201).json(created)
  },
}
