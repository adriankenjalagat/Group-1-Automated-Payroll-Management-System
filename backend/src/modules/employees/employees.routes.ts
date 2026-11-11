import { Router } from 'express'
import { employeesController } from './employees.controller'
import { authenticate, authorize } from '../../middleware/auth'

const router = Router()

// All employee routes require authentication
router.use(authenticate)

// Read endpoints
router.get('/', employeesController.getAll)
router.get('/username/:username', employeesController.getByUsername)
router.get('/:id', employeesController.getById)

// Modification endpoints: HR Office and System Administrator only
router.post('/', authorize('HR Office', 'System Administrator'), employeesController.create)
router.put('/:id', authorize('HR Office', 'System Administrator'), employeesController.update)
router.delete('/:id', authorize('HR Office', 'System Administrator'), employeesController.delete)

export default router
