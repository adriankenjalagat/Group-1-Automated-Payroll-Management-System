import { Router } from 'express'
import { payslipsController } from './payslips.controller'

const router = Router()

router.get('/', payslipsController.getAll)
router.get('/employee/:employeeId', payslipsController.getByEmployee)
router.post('/', payslipsController.create)

export default router
