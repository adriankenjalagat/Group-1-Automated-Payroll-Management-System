import { Router } from 'express'
import { employeesController } from './employees.controller'

const router = Router()

router.get('/', employeesController.getAll)

export default router

