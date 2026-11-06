import type { Request, Response } from 'express'
import { payrollService } from './payroll.service'

export const payrollController = {
  getAll(_req: Request, res: Response): void {
    res.status(200).json(payrollService.findAll())
  },

  getById(req: Request, res: Response): void {
    const id = Number(req.params.id)
    const record = payrollService.findById(id)

    if (!record) {
      res.status(404).json({ message: 'Payroll record not found.' })
      return
    }

    res.status(200).json(record)
  },

  create(req: Request, res: Response): void {
    const { employeeName, department, period, grossPay, deductions } =
      req.body as {
        employeeName?: string
        department?: string
        period?: string
        grossPay?: number
        deductions?: number
      }

    if (!employeeName || !department || !period || grossPay === undefined) {
      res.status(400).json({
        message: 'employeeName, department, period, and grossPay are required.',
      })
      return
    }

    const created = payrollService.create({
      employeeName,
      department,
      period,
      grossPay: Number(grossPay),
      deductions: deductions !== undefined ? Number(deductions) : 0,
    })

    res.status(201).json(created)
  },
}

