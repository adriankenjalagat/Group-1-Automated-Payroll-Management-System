import type { UserRole } from '../../middleware/auth'

export interface UserAccount {
  accountId?: string
  name: string
  email: string
  username: string
  password?: string
  office: string
  roles: UserRole[]
  status: 'active' | 'locked' | 'pending'
}

export const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Payroll#2026'

const users: UserAccount[] = [
  {
    name: 'Angel Queen Catian',
    email: 'angelqueen.catian@msunaawan.edu.ph',
    username: 'angelqueen.catian',
    password: 'AN1021176an',
    office: 'College of Business and Information Technology',
    roles: ['Employee'],
    status: 'active',
  },
  {
    name: 'Maria Santos',
    email: 'maria.santos@msunaawan.example',
    username: 'msantos',
    office: 'College of Fisheries',
    roles: ['Employee'],
    status: 'active',
  },
  {
    accountId: 'DEMO-SUP-001',
    name: 'Alex Rivera',
    email: 'alex.supervisor@demo.invalid',
    username: 'arivera',
    office: 'Fictional Demonstration Account',
    roles: ['Immediate Supervisor'],
    status: 'active',
  },
  {
    name: 'Jose Dela Cruz',
    email: 'jose.delacruz@msunaawan.example',
    username: 'jdelacruz',
    office: 'Accounting Office',
    roles: ['Accounting'],
    status: 'active',
  },
  {
    name: 'Fictional Accountant User',
    email: 'fictional.accountant@msunaawan.example',
    username: 'accountant.demo',
    office: 'Accountant Review Office',
    roles: ['Accountant'],
    status: 'active',
  },
  {
    name: 'Ana Villanueva',
    email: 'ana.villanueva@msunaawan.example',
    username: 'avillanueva',
    office: 'Human Resource Office',
    roles: ['HR Office'],
    status: 'active',
  },
  {
    name: 'Ramon Bautista',
    email: 'ramon.bautista@msunaawan.example',
    username: 'rbautista',
    office: 'Information Systems Office',
    roles: ['System Administrator'],
    status: 'active',
  },
  {
    accountId: 'DEMO-CC-SIG-001',
    name: 'Elena Torres',
    email: 'elena.torres@msunaawan.example',
    username: 'etorres',
    office: 'College of Fisheries',
    roles: ['Cost Center Signatory'],
    status: 'active',
  },
  {
    name: 'Marco Lim',
    email: 'marco.lim@msunaawan.example',
    username: 'mlim',
    office: 'Budget Office',
    roles: ['Budget Office'],
    status: 'active',
  },
  {
    name: 'Dr. Teresa Navarro',
    email: 'teresa.navarro@msunaawan.example',
    username: 'tnavarro',
    office: 'Office of the Chancellor',
    roles: ['Office of the Chancellor'],
    status: 'active',
  },
  {
    name: 'Carlo Aquino',
    email: 'carlo.aquino@msunaawan.example',
    username: 'caquino',
    office: 'Cashier Office',
    roles: ['Cashier'],
    status: 'active',
  },
  {
    name: 'Lia Mercado',
    email: 'lia.mercado@msunaawan.example',
    username: 'lmercado',
    office: 'Cashier Office',
    roles: ['Cashier'],
    status: 'locked',
  },
  {
    name: 'Paolo Reyes',
    email: 'paolo.reyes@msunaawan.example',
    username: 'preyes',
    office: 'College of Arts and Sciences',
    roles: ['Employee'],
    status: 'pending',
  },
]

export const usersService = {
  findAll(): UserAccount[] {
    return users
  },

  findByIdentifier(identifier: string): UserAccount | undefined {
    const id = identifier.trim().toLowerCase()
    return users.find(
      (u) =>
        u.email.toLowerCase() === id ||
        u.username.toLowerCase() === id ||
        u.email.toLowerCase().split('@')[0] === id,
    )
  },
}
