import type { Request, Response } from 'express'
import { attachmentsService } from './attachments.service'

function getParam(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return val[0] || ''
  return val || ''
}

export const attachmentsController = {
  getAll(req: Request, res: Response): void {
    const { employeeId } = req.query as { employeeId?: string }
    if (employeeId) {
      res.status(200).json(attachmentsService.findByEmployee(employeeId))
      return
    }
    res.status(200).json(attachmentsService.findAll())
  },

  getById(req: Request, res: Response): void {
    const id = getParam(req.params.id)
    const record = attachmentsService.findById(id)
    if (!record) {
      res.status(404).json({ message: 'Submission not found.' })
      return
    }
    res.status(200).json(record)
  },

  create(req: Request, res: Response): void {
    try {
      const created = attachmentsService.create(req.body)
      res.status(201).json(created)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create submission.'
      res.status(400).json({ message })
    }
  },

  update(req: Request, res: Response): void {
    const id = getParam(req.params.id)
    const updated = attachmentsService.update(id, req.body)
    if (!updated) {
      res.status(404).json({ message: 'Submission not found.' })
      return
    }
    res.status(200).json(updated)
  },
}
