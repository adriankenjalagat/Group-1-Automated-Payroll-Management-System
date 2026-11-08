import { Router } from 'express'
import { employeesController } from './employees.controller'

const router = Router()

router.get('/', employeesController.getAll)
router.get('/username/:username', employeesController.getByUsername)
router.get('/:id', employeesController.getById)
router.post('/', employeesController.create)
router.put('/:id', employeesController.update)
router.delete('/:id', employeesController.delete)

export default router
