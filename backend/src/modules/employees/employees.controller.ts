import type { Request, Response } from 'express'
import { employeesService } from './employees.service'

function getParam(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return val[0] || ''
  return val || ''
}

export const employeesController = {
  getAll(_req: Request, res: Response): void {
    res.status(200).json(employeesService.findAll())
  },

  getById(req: Request, res: Response): void {
    const id = getParam(req.params.id)
    const employee = employeesService.findById(id)
    if (!employee) {
      res.status(404).json({ message: 'Employee not found.' })
      return
    }
    res.status(200).json(employee)
  },

  getByUsername(req: Request, res: Response): void {
    const username = getParam(req.params.username)
    const employee = employeesService.findByUsername(username)
    if (!employee) {
      res.status(404).json({ message: 'Employee not found for username.' })
      return
    }
    res.status(200).json(employee)
  },

  create(req: Request, res: Response): void {
    try {
      const created = employeesService.create(req.body)
      res.status(201).json(created)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create employee.'
      res.status(400).json({ message })
    }
  },

  update(req: Request, res: Response): void {
    const id = getParam(req.params.id)
    const updated = employeesService.update(id, req.body)
    if (!updated) {
      res.status(404).json({ message: 'Employee not found.' })
      return
    }
    res.status(200).json(updated)
  },

  delete(req: Request, res: Response): void {
    const id = getParam(req.params.id)
    const success = employeesService.delete(id)
    if (!success) {
      res.status(404).json({ message: 'Employee not found.' })
      return
    }
    res.status(200).json({ message: 'Employee deleted successfully.' })
  },
}
