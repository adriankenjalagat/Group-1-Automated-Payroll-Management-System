import { Router } from 'express'
import { payslipsController } from './payslips.controller'

const router = Router()

router.get('/', payslipsController.getAll)

export default router

