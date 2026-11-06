import { Router } from 'express'
import { payrollController } from './payroll.controller'

const router = Router()

router.get('/', payrollController.getAll)
router.get('/:id', payrollController.getById)
router.post('/', payrollController.create)

export default router

