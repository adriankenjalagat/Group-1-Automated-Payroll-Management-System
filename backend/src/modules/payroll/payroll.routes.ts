import { Router } from 'express'
import { payrollController } from './payroll.controller'
import { authenticate, authorize } from '../../middleware/auth'

const router = Router()

// All payroll routes require authentication
router.use(authenticate)

router.get(
  '/',
  authorize(
    'Accounting',
    'Accountant',
    'Budget Office',
    'Office of the Chancellor',
    'Cost Center Signatory',
    'Cashier',
    'HR Office',
    'System Administrator',
  ),
  payrollController.getAll,
)

router.get(
  '/:id',
  authorize(
    'Accounting',
    'Accountant',
    'Budget Office',
    'Office of the Chancellor',
    'Cost Center Signatory',
    'Cashier',
    'HR Office',
    'System Administrator',
  ),
  payrollController.getById,
)

router.post(
  '/',
  authorize('Accounting', 'System Administrator'),
  payrollController.create,
)

router.put(
  '/:id/recalculate',
  authorize('Accounting', 'System Administrator'),
  payrollController.updateCorrection,
)

router.put(
  '/:id',
  authorize('Accounting', 'System Administrator'),
  payrollController.updateCorrection,
)

router.put(
  '/:id/lock',
  authorize('Accounting', 'Accountant', 'Office of the Chancellor', 'System Administrator'),
  payrollController.lock,
)

export default router
