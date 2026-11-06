import { Router } from 'express'
import { attendanceController } from './attendance.controller'

const router = Router()

router.get('/', attendanceController.getAll)

export default router

