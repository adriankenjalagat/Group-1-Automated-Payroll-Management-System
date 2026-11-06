export const DEMO_PASSWORD = "Payroll#2026"

export type Role = "Employee" | "Immediate Supervisor" | "HR Office" | "Accounting" | "Accountant" | "Cost Center Signatory" | "Budget Office" | "Office of the Chancellor" | "Cashier" | "System Administrator"

export const roleHome: Record<Role, string> = {
  Employee: "My Submissions",
  "Immediate Supervisor": "Pending Verification",
  "HR Office": "Employee Records",
  Accounting: "Payroll Runs",
  Accountant: "DV Review",
  "Cost Center Signatory": "Payroll Approvals",
  "Budget Office": "Approved Payrolls",
  "Office of the Chancellor": "DV Approvals",
  Cashier: "Approved for Payment",
  "System Administrator": "User Roles",
}

export type MockUser = {
  /** Stable account reference; usernames may change without changing ownership. */
  accountId?: string
  name: string
  email: string
  username: string
  office: string
  roles: Role[]
  status: "active" | "locked" | "pending"
}

export const users: MockUser[] = [
  {
    name: "Maria Santos",
    email: "maria.santos@msunaawan.example",
    username: "msantos",
    office: "College of Fisheries",
    roles: ["Employee"],
    status: "active",
  },
  {
    accountId: "DEMO-SUP-001",
    name: "Alex Rivera",
    email: "alex.supervisor@demo.invalid",
    username: "arivera",
    office: "Fictional Demonstration Account",
    roles: ["Immediate Supervisor"],
    status: "active",
  },
  {
    name: "Jose Dela Cruz",
    email: "jose.delacruz@msunaawan.example",
    username: "jdelacruz",
    office: "Accounting Office",
    roles: ["Accounting"],
    status: "active",
  },
  {
    name: "Fictional Accountant User",
    email: "fictional.accountant@msunaawan.example",
    username: "accountant.demo",
    office: "Accountant Review Office",
    roles: ["Accountant"],
    status: "active",
  },
  {
    name: "Ana Villanueva",
    email: "ana.villanueva@msunaawan.example",
    username: "avillanueva",
    office: "Human Resource Office",
    roles: ["HR Office"],
    status: "active",
  },
  {
    name: "Ramon Bautista",
    email: "ramon.bautista@msunaawan.example",
    username: "rbautista",
    office: "Information Systems Office",
    roles: ["System Administrator"],
    status: "active",
  },
  {
    accountId: "DEMO-CC-SIG-001",
    name: "Elena Torres",
    email: "elena.torres@msunaawan.example",
    username: "etorres",
    office: "College of Fisheries",
    roles: ["Cost Center Signatory"],
    status: "active",
  },
  {
    name: "Marco Lim",
    email: "marco.lim@msunaawan.example",
    username: "mlim",
    office: "Budget Office",
    roles: ["Budget Office"],
    status: "active",
  },
  {
    name: "Dr. Teresa Navarro",
    email: "teresa.navarro@msunaawan.example",
    username: "tnavarro",
    office: "Office of the Chancellor",
    roles: ["Office of the Chancellor"],
    status: "active",
  },
  {
    name: "Carlo Aquino",
    email: "carlo.aquino@msunaawan.example",
    username: "caquino",
    office: "Cashier Office",
    roles: ["Cashier"],
    status: "active",
  },
  {
    name: "Lia Mercado",
    email: "lia.mercado@msunaawan.example",
    username: "lmercado",
    office: "Cashier Office",
    roles: ["Cashier"],
    status: "locked",
  },
  {
    name: "Paolo Reyes",
    email: "paolo.reyes@msunaawan.example",
    username: "preyes",
    office: "College of Arts and Sciences",
    roles: ["Employee"],
    status: "pending",
  },
]

export function findUser(identifier: string) {
  const id = identifier.trim().toLowerCase()
  return users.find((u) => u.email === id || u.username === id)
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
}
