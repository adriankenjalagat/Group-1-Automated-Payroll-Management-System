import { Router } from 'express'
import { usersController } from './users.controller'
import { authenticate, authorize } from '../../middleware/auth'

const router = Router()

// All user management routes require an active System Administrator session
router.use(authenticate, authorize('System Administrator'))

router.get('/', usersController.getAll)
router.get('/:id', usersController.getById)
router.post('/', usersController.create)
router.put('/:id', usersController.update)
router.patch('/:id/status', usersController.setStatus)
router.put('/:id/lock', usersController.lock)
router.put('/:id/unlock', usersController.unlock)

export default router
