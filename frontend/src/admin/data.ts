import type { Role } from "../auth/mockData"

export type AccountStatus = "active" | "pending" | "locked" | "deactivated"

export type AdminUser = {
  employeeId: string
  name: string
  email: string
  username: string
  office: string
  role: Role
  status: AccountStatus
  lastSignIn: string | null
  invite?: "sent" | "expired" | "failed"
  simulated?: string
}

export type Activity = {
  id: string
  actor: string
  action: string
  target: string
  at: string
  simulated?: boolean
  category?: "Account management" | "Payroll configuration"
  record?: string
}

export type ConfigEntry = {
  id: string
  category: "Basic salary rate" | "Salary grade" | "Step increment" | "Deduction rule"
  name: string
}

export const ROLES: Role[] = [
  "Employee",
  "Immediate Supervisor",
  "HR Office",
  "Accounting",
  "Accountant",
  "Cost Center Signatory",
  "Budget Office",
  "Office of the Chancellor",
  "Cashier",
  "System Administrator",
]

export const roleLabel = (r: Role) =>
  r === "Accounting"
    ? "Accounting Office"
    : r === "Office of the Chancellor"
      ? "Chancellor"
      : r

export const statusLabel: Record<AccountStatus, string> = {
  active: "Active",
  pending: "Pending activation",
  locked: "Locked",
  deactivated: "Deactivated",
}

export const EMAIL_DOMAIN = "@msunaawan.example"
export const APPROVED_DOMAINS = ["msunaawan.example", "msunaawan.edu.ph"]
export const emailDomainOk = (v: string) =>
  /^[a-z0-9._-]+$/i.test(v.split("@")[0] ?? "") &&
  v.split("@").length === 2 &&
  APPROVED_DOMAINS.includes(v.split("@")[1].trim().toLowerCase())
export const usernameFromEmail = (v: string) =>
  v.trim().toLowerCase().split("@")[0]

const u = (
  employeeId: string,
  name: string,
  username: string,
  office: string,
  role: Role,
  status: AccountStatus,
  lastSignIn: string | null,
  invite?: AdminUser["invite"],
): AdminUser => ({
  employeeId,
  name,
  username,
  office,
  role,
  status,
  lastSignIn,
  invite,
  email: `${name
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .replace(/ /g, ".")}${EMAIL_DOMAIN}`,
})

export const seedUsers: AdminUser[] = [
  u(
    "TEST-0001",
    "Ramon Bautista",
    "rbautista",
    "Information Systems Office",
    "System Administrator",
    "active",
    "2026-10-26T08:12:00",
  ),
  u(
    "TEST-0002",
    "Ana Villanueva",
    "avillanueva",
    "Human Resource Office",
    "HR Office",
    "active",
    "2026-10-26T07:48:00",
  ),
  u(
    "TEST-0003",
    "Jose Dela Cruz",
    "jdelacruz",
    "Accounting Office",
    "Accounting",
    "active",
    "2026-10-25T16:30:00",
  ),
  u(
    "TEST-0012",
    "Fictional Accountant User",
    "accountant.demo",
    "Accountant Review Office",
    "Accountant",
    "active",
    null,
  ),
  u(
    "TEST-0004",
    "Lia Mercado",
    "lmercado",
    "Cashier Office",
    "Cashier",
    "locked",
    "2026-10-23T09:05:00",
  ),
  u(
    "TEST-0005",
    "Paolo Reyes",
    "preyes",
    "College of Arts and Sciences",
    "Employee",
    "pending",
    null,
    "expired",
  ),
  u(
    "TEST-0006",
    "Maria Santos",
    "msantos",
    "College of Fisheries",
    "Employee",
    "active",
    "2026-10-26T06:55:00",
  ),
  u(
    "TEST-0013",
    "Jordan Reyes",
    "supervisor.demo",
    "Fictional Supervisor Office",
    "Immediate Supervisor",
    "deactivated",
    null,
  ),
  {
    employeeId: "DEMO-SUP-001",
    name: "Alex Rivera",
    email: "alex.supervisor@demo.invalid",
    username: "arivera",
    office: "Fictional Demonstration Account",
    role: "Immediate Supervisor",
    status: "active",
    lastSignIn: null,
    simulated: "Supervisor demo profile",
  },
  u(
    "TEST-0007",
    "Elena Cabrera",
    "ecabrera",
    "College of Fisheries",
    "Employee",
    "active",
    "2026-10-24T13:20:00",
  ),
  u(
    "TEST-0008",
    "Daniel Ocampo",
    "docampo",
    "Budget Office",
    "Budget Office",
    "active",
    "2026-10-25T10:02:00",
  ),
  u(
    "TEST-0009",
    "Carmen Dizon",
    "cdizon",
    "Office of the Chancellor",
    "Office of the Chancellor",
    "active",
    "2026-10-22T15:41:00",
  ),
  u(
    "TEST-0010",
    "Rafael Tan",
    "rtan",
    "College of Arts and Sciences",
    "Cost Center Signatory",
    "active",
    "2026-10-25T09:14:00",
  ),
  u(
    "TEST-0011",
    "Isabel Navarro",
    "inavarro",
    "College of Education",
    "Employee",
    "pending",
    null,
  ),
  u(
    "TEST-0012",
    "Miguel Aquino",
    "maquino",
    "College of Education",
    "Immediate Supervisor",
    "active",
    "2026-10-21T11:37:00",
  ),
  u(
    "TEST-0013",
    "Teresa Lim",
    "tlim",
    "Cashier Office",
    "Cashier",
    "active",
    "2026-10-26T08:01:00",
  ),
  u(
    "TEST-0014",
    "Nestor Flores",
    "nflores",
    "Human Resource Office",
    "HR Office",
    "deactivated",
    "2026-08-14T14:00:00",
  ),
  u(
    "TEST-0015",
    "Grace Mendoza",
    "gmendoza",
    "Accounting Office",
    "Accounting",
    "active",
    "2026-10-24T08:44:00",
  ),
  u(
    "TEST-0016",
    "Victor Salazar",
    "vsalazar",
    "College of Fisheries",
    "Employee",
    "active",
    "2026-10-20T17:10:00",
  ),
]

const dayAt = (daysAgo: number, hour: number, minute: number) => {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(hour, minute, 0, 0)
  return (d > new Date() ? new Date() : d).toISOString()
}

const templates: Omit<Activity, "id" | "at">[] = [
  {
    actor: "Ramon Bautista",
    action: "Sent an activation link",
    target: "Isabel Navarro",
    category: "Account management",
    record: "User account · Isabel Navarro",
  },
  {
    actor: "Ramon Bautista",
    action: "Changed a user role",
    target: "Grace Mendoza",
    category: "Account management",
    record: "User account · Grace Mendoza",
  },
  {
    actor: "Ramon Bautista",
    action: "Updated a configuration entry",
    target: "Salary grade entry 03",
    category: "Payroll configuration",
    record: "Salary grade · Entry 03",
  },
  {
    actor: "Ramon Bautista",
    action: "Unlocked an account",
    target: "Teresa Lim",
    category: "Account management",
    record: "User account · Teresa Lim",
  },
  {
    actor: "Ramon Bautista",
    action: "Added a configuration entry",
    target: "Deduction rule entry 05",
    category: "Payroll configuration",
    record: "Deduction rule · Entry 05",
  },
  {
    actor: "Ramon Bautista",
    action: "Deactivated an account",
    target: "Nestor Flores",
    category: "Account management",
    record: "User account · Nestor Flores",
  },
  {
    actor: "Ramon Bautista",
    action: "Updated a configuration entry",
    target: "Step increment entry 02",
    category: "Payroll configuration",
    record: "Step increment · Entry 02",
  },
  {
    actor: "Ramon Bautista",
    action: "Created a user account",
    target: "Victor Salazar",
    category: "Account management",
    record: "User account · Victor Salazar",
  },
]

const perDay = [3, 6, 3, 5, 1, 4, 2]
const olderDays = [9, 12, 15, 18, 21, 24, 27, 29]

export const seedActivity: Activity[] = (() => {
  const days = [
    ...perDay.map((n, i) => ({ n, d: i })),
    ...olderDays.map((d) => ({ n: 1, d })),
  ]
  let k = 0
  return days
    .flatMap(({ n, d }) => Array.from({ length: n }, (_, i) => ({ d, i })))
    .map(({ d, i }) => {
      const t = templates[k % templates.length]
      return { ...t, id: `a${++k}`, at: dayAt(d, 16 - i * 2, (k * 17) % 60) }
    })
    .sort((x, y) => y.at.localeCompare(x.at))
})()

export const seedConfigEntries: ConfigEntry[] = [
  ["Basic salary rate", 6],
  ["Salary grade", 8],
  ["Step increment", 8],
  ["Deduction rule", 5],
].flatMap(([category, n]) =>
  Array.from({ length: n as number }, (_, i) => ({
    id: `${category}-${i + 1}`,
    category: category as ConfigEntry["category"],
    name: `${category} entry ${String(i + 1).padStart(2, "0")}`,
  })),
)

export const seedNotifications = [
  {
    id: "n1",
    title: "2 accounts waiting for activation",
    text: "Paolo Reyes and Isabel Navarro have not activated their accounts.",
  },
  {
    id: "n2",
    title: "1 locked account",
    text: "Lia Mercado was locked after repeated failed sign-ins.",
  },
]

const dt = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
})
export const formatDateTime = (iso: string) => dt.format(new Date(iso))
const d = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
})
export const formatDate = (iso: string) => d.format(new Date(iso))
