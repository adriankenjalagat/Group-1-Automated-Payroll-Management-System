import { Router } from 'express'
import { usersController } from './users.controller'

const router = Router()

router.get('/', usersController.getAll)
router.post('/', usersController.create)

export default router
