import type { Request, Response } from 'express'
import { attendanceService } from './attendance.service'

export const attendanceController = {
  getAll(_req: Request, res: Response): void {
    res.status(200).json(attendanceService.findAll())
  },
}

