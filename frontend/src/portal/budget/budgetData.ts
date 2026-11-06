import type {
  CostCenterDecision,
  CostCenterFund,
} from "../costCenter/costCenterData"

export type BudgetDocumentType = "ORAS" | "BURAS"
export type BudgetDocumentStage =
  | "Draft"
  | "Returned to Budget Office"
  | "Awaiting Cost Center Approval"
  | "Ready for DV"

export type BudgetPayrollEmployee = {
  employeeId: string
  name: string
  costCenterId: string
  costCenterName: string
  payBasis: string
  grossPay: number
  deductions: number
  netPay: number
}

export type PayrollApprovalEvent = {
  id: string
  costCenterId: string
  costCenterName: string
  action: "Approved"
  recordedAt: string
  actor: string
  remarks?: string
}

export type BudgetApprovedPayroll = {
  id: string
  reference: string
  payrollType: string
  payrollPeriod: string
  fund: CostCenterFund
  gross: number
  deductions: number
  net: number
  employees: BudgetPayrollEmployee[]
  requiredCostCenters: {
    id: string
    name: string
    routeConfigured: boolean
  }[]
  approvalEvents: PayrollApprovalEvent[]
  currentStage: string
  approvedAt: string
  snapshotVersion: string
  superseded: boolean
  demo: true
}

export type BudgetDocumentRevision = {
  id: string
  revision: number
  amount: number
  particulars: string
  notes: string
  correctionExplanation?: string
  updatedBy: string
  updatedAt: string
  relatedReturnEventId?: string
}

export type BudgetDocumentEvent = {
  id: string
  action: string
  actor: string
  office: string
  recordedAt: string
  remarks?: string
  revision: number
}

export type BudgetDocument = {
  id: string
  reference: string
  type: BudgetDocumentType
  payrollId: string
  payrollReference: string
  sourceSnapshotVersion: string
  fund: CostCenterFund
  amount: number
  particulars: string
  notes: string
  supportReferences: string[]
  preparedBy: string
  createdAt: string
  updatedAt: string
  revision: number
  stage: BudgetDocumentStage
  currentHolder: string
  requiredCostCenterIds: string[]
  routingInstanceId?: string
  revisions: BudgetDocumentRevision[]
  events: BudgetDocumentEvent[]
  returnInfo?: {
    eventId: string
    costCenterId: string
    costCenterName: string
    actor: string
    recordedAt: string
    remarks: string
  }
  demo: true
}

export type BudgetNotification = {
  id: string
  eventReference: string
  title: string
  description: string
  payrollId?: string
  documentId?: string
  createdAt: string
  read: boolean
  action: "payroll" | "prepare" | "return" | "tracking"
}

export function documentTypeForFund(fund: string): BudgetDocumentType | null {
  if (fund === "F01") return "ORAS"
  if (fund === "F05" || fund === "F07") return "BURAS"
  return null
}

const employee = (
  employeeId: string,
  name: string,
  costCenterId: string,
  costCenterName: string,
  grossPay: number,
  deductions: number,
  payBasis = "Recorded fictional payroll snapshot",
): BudgetPayrollEmployee => ({
  employeeId,
  name,
  costCenterId,
  costCenterName,
  payBasis,
  grossPay,
  deductions,
  netPay: grossPay - deductions,
})

const alpha = {
  id: "DEMO-CC-ALPHA",
  name: "Demo Cost Center Alpha",
  routeConfigured: true,
}
const beta = {
  id: "DEMO-CC-BETA",
  name: "Demo Cost Center Beta",
  routeConfigured: true,
}

const approved = (
  payroll: string,
  costCenter: typeof alpha,
  recordedAt: string,
): PayrollApprovalEvent => ({
  id: `${payroll}-${costCenter.id}-PAYROLL-APPROVED`,
  costCenterId: costCenter.id,
  costCenterName: costCenter.name,
  action: "Approved",
  recordedAt,
  actor: "Fictional authorized Cost Center role",
  remarks: "Fictional payroll-stage approval event for prototype testing.",
})

export const initialBudgetPayrolls: BudgetApprovedPayroll[] = [
  {
    id: "DEMO-BUD-PAY-701",
    reference: "DEMO-BUD-PAY-701",
    payrollType: "Permanent Staff",
    payrollPeriod: "October 2026",
    fund: "F01",
    gross: 84500,
    deductions: 9500,
    net: 75000,
    employees: [
      employee(
        "DEMO-BUD-EMP-701",
        "Avery Cruz",
        alpha.id,
        alpha.name,
        30000,
        4000,
      ),
      employee(
        "DEMO-BUD-EMP-702",
        "Riley Santos",
        alpha.id,
        alpha.name,
        28500,
        3000,
      ),
      employee(
        "DEMO-BUD-EMP-703",
        "Casey Ramos",
        beta.id,
        beta.name,
        26000,
        2500,
      ),
    ],
    requiredCostCenters: [alpha, beta],
    approvalEvents: [
      approved("DEMO-BUD-PAY-701", alpha, "2026-11-03T09:20:00+08:00"),
      approved("DEMO-BUD-PAY-701", beta, "2026-11-03T13:45:00+08:00"),
    ],
    currentStage: "Cost Center payroll approvals complete",
    approvedAt: "2026-11-03T13:45:00+08:00",
    snapshotVersion: "DEMO-BUD-PAY-701-SNAPSHOT-V1",
    superseded: false,
    demo: true,
  },
  {
    id: "DEMO-BUD-PAY-702",
    reference: "DEMO-BUD-PAY-702",
    payrollType: "Job Order Staff",
    payrollPeriod: "October 16–31, 2026",
    fund: "F05",
    gross: 35000,
    deductions: 500,
    net: 34500,
    employees: [
      employee(
        "DEMO-BUD-EMP-704",
        "Morgan Lee",
        alpha.id,
        alpha.name,
        9000,
        100,
      ),
      employee(
        "DEMO-BUD-EMP-705",
        "Jamie Flores",
        alpha.id,
        alpha.name,
        9000,
        100,
      ),
      employee(
        "DEMO-BUD-EMP-706",
        "Taylor Reyes",
        alpha.id,
        alpha.name,
        8500,
        150,
      ),
      employee(
        "DEMO-BUD-EMP-707",
        "Sky Navarro",
        alpha.id,
        alpha.name,
        8500,
        150,
      ),
    ],
    requiredCostCenters: [alpha],
    approvalEvents: [
      approved("DEMO-BUD-PAY-702", alpha, "2026-11-04T11:15:00+08:00"),
    ],
    currentStage: "Cost Center payroll approvals complete",
    approvedAt: "2026-11-04T11:15:00+08:00",
    snapshotVersion: "DEMO-BUD-PAY-702-SNAPSHOT-V1",
    superseded: false,
    demo: true,
  },
  {
    id: "DEMO-BUD-PAY-703",
    reference: "DEMO-BUD-PAY-703",
    payrollType: "Lecturer Faculty",
    payrollPeriod: "October 2026",
    fund: "F07",
    gross: 18600,
    deductions: 600,
    net: 18000,
    employees: [
      employee(
        "DEMO-BUD-EMP-708",
        "Drew Velasco",
        beta.id,
        beta.name,
        18600,
        600,
      ),
    ],
    requiredCostCenters: [beta],
    approvalEvents: [
      approved("DEMO-BUD-PAY-703", beta, "2026-11-04T15:35:00+08:00"),
    ],
    currentStage: "Cost Center payroll approvals complete",
    approvedAt: "2026-11-04T15:35:00+08:00",
    snapshotVersion: "DEMO-BUD-PAY-703-SNAPSHOT-V1",
    superseded: false,
    demo: true,
  },
  {
    id: "DEMO-BUD-PAY-704",
    reference: "DEMO-BUD-PAY-704",
    payrollType: "Job Order Staff",
    payrollPeriod: "October 1–15, 2026",
    fund: "F05",
    gross: 24000,
    deductions: 500,
    net: 23500,
    employees: [
      employee(
        "DEMO-BUD-EMP-709",
        "Robin Mercado",
        alpha.id,
        alpha.name,
        24000,
        500,
      ),
    ],
    requiredCostCenters: [alpha],
    approvalEvents: [
      approved("DEMO-BUD-PAY-704", alpha, "2026-10-28T10:00:00+08:00"),
    ],
    currentStage: "Budget document returned for correction",
    approvedAt: "2026-10-28T10:00:00+08:00",
    snapshotVersion: "DEMO-BUD-PAY-704-SNAPSHOT-V1",
    superseded: false,
    demo: true,
  },
  {
    id: "DEMO-BUD-PAY-705",
    reference: "DEMO-BUD-PAY-705",
    payrollType: "Permanent Staff",
    payrollPeriod: "September 2026",
    fund: "F01",
    gross: 62000,
    deductions: 7000,
    net: 55000,
    employees: [
      employee(
        "DEMO-BUD-EMP-710",
        "Sam Rivera",
        alpha.id,
        alpha.name,
        32000,
        4000,
      ),
      employee(
        "DEMO-BUD-EMP-711",
        "Pat Garcia",
        beta.id,
        beta.name,
        30000,
        3000,
      ),
    ],
    requiredCostCenters: [alpha, beta],
    approvalEvents: [
      approved("DEMO-BUD-PAY-705", alpha, "2026-10-20T09:00:00+08:00"),
      approved("DEMO-BUD-PAY-705", beta, "2026-10-20T14:00:00+08:00"),
    ],
    currentStage: "Awaiting remaining ORAS Cost Center approval",
    approvedAt: "2026-10-20T14:00:00+08:00",
    snapshotVersion: "DEMO-BUD-PAY-705-SNAPSHOT-V1",
    superseded: false,
    demo: true,
  },
]

const returnedAt = "2026-11-02T14:20:00+08:00"
const returnRemarks =
  "Please review the stated budget document amount and supporting payroll reference before resubmission."

export const initialBudgetDocuments: BudgetDocument[] = [
  {
    id: "DEMO-BUD-DOC-704",
    reference: "DEMO-BUD-BURAS-704",
    type: "BURAS",
    payrollId: "DEMO-BUD-PAY-704",
    payrollReference: "DEMO-BUD-PAY-704",
    sourceSnapshotVersion: "DEMO-BUD-PAY-704-SNAPSHOT-V1",
    fund: "F05",
    amount: 23500,
    particulars: "Fictional Job Order payroll budget-document preparation.",
    notes: "Prepared for the returned-document demonstration.",
    supportReferences: ["DEMO-BUD-PAY-704-APPROVED-SNAPSHOT"],
    preparedBy: "Marco Lim",
    createdAt: "2026-10-29T09:30:00+08:00",
    updatedAt: returnedAt,
    revision: 1,
    stage: "Returned to Budget Office",
    currentHolder: "Budget Office",
    requiredCostCenterIds: [alpha.id],
    routingInstanceId: "DEMO-BUD-ROUTE-704-R1",
    revisions: [
      {
        id: "DEMO-BUD-DOC-704-R1",
        revision: 1,
        amount: 23500,
        particulars: "Fictional Job Order payroll budget-document preparation.",
        notes: "Prepared for the returned-document demonstration.",
        updatedBy: "Marco Lim",
        updatedAt: "2026-10-29T09:30:00+08:00",
      },
    ],
    events: [
      {
        id: "DEMO-BUD-EVENT-704-PREPARED",
        action: "BURAS prepared",
        actor: "Marco Lim",
        office: "Budget Office",
        recordedAt: "2026-10-29T09:30:00+08:00",
        revision: 1,
      },
      {
        id: "DEMO-BUD-EVENT-704-FORWARDED",
        action: "Budget document marked for approval",
        actor: "Marco Lim",
        office: "Budget Office",
        recordedAt: "2026-10-29T10:00:00+08:00",
        revision: 1,
      },
      {
        id: "DEMO-BUD-EVENT-704-RETURNED",
        action: "Budget document returned",
        actor: "Fictional authorized Cost Center role",
        office: alpha.name,
        recordedAt: returnedAt,
        remarks: returnRemarks,
        revision: 1,
      },
    ],
    returnInfo: {
      eventId: "DEMO-BUD-EVENT-704-RETURNED",
      costCenterId: alpha.id,
      costCenterName: alpha.name,
      actor: "Fictional authorized Cost Center role",
      recordedAt: returnedAt,
      remarks: returnRemarks,
    },
    demo: true,
  },
  {
    id: "DEMO-BUD-DOC-705",
    reference: "DEMO-BUD-ORAS-705",
    type: "ORAS",
    payrollId: "DEMO-BUD-PAY-705",
    payrollReference: "DEMO-BUD-PAY-705",
    sourceSnapshotVersion: "DEMO-BUD-PAY-705-SNAPSHOT-V1",
    fund: "F01",
    amount: 55000,
    particulars: "Fictional September Permanent Staff payroll obligation.",
    notes: "",
    supportReferences: ["DEMO-BUD-PAY-705-APPROVED-SNAPSHOT"],
    preparedBy: "Marco Lim",
    createdAt: "2026-10-21T09:10:00+08:00",
    updatedAt: "2026-10-22T11:30:00+08:00",
    revision: 1,
    stage: "Awaiting Cost Center Approval",
    currentHolder: "Demo Cost Center Beta",
    requiredCostCenterIds: [alpha.id, beta.id],
    routingInstanceId: "DEMO-BUD-ROUTE-705-R1",
    revisions: [
      {
        id: "DEMO-BUD-DOC-705-R1",
        revision: 1,
        amount: 55000,
        particulars: "Fictional September Permanent Staff payroll obligation.",
        notes: "",
        updatedBy: "Marco Lim",
        updatedAt: "2026-10-21T09:10:00+08:00",
      },
    ],
    events: [
      {
        id: "DEMO-BUD-EVENT-705-PREPARED",
        action: "ORAS prepared",
        actor: "Marco Lim",
        office: "Budget Office",
        recordedAt: "2026-10-21T09:10:00+08:00",
        revision: 1,
      },
      {
        id: "DEMO-BUD-EVENT-705-FORWARDED",
        action: "Budget document marked for approval",
        actor: "Marco Lim",
        office: "Budget Office",
        recordedAt: "2026-10-21T10:00:00+08:00",
        revision: 1,
      },
      {
        id: "DEMO-BUD-EVENT-705-ALPHA",
        action: "Cost Center approved current revision",
        actor: "Fictional authorized Cost Center role",
        office: alpha.name,
        recordedAt: "2026-10-22T11:30:00+08:00",
        remarks: "Fictional current-stage ORAS approval.",
        revision: 1,
      },
    ],
    demo: true,
  },
]

export const initialBudgetNotifications: BudgetNotification[] = [
  {
    id: "DEMO-BUD-NOTICE-701",
    eventReference: "DEMO-BUD-PAY-701-APPROVED",
    title: "Approved Payroll Ready for Budget Processing",
    description:
      "Payroll DEMO-BUD-PAY-701 has completed the required Cost Center payroll approvals.",
    payrollId: "DEMO-BUD-PAY-701",
    createdAt: "2026-11-03T13:50:00+08:00",
    read: false,
    action: "prepare",
  },
  {
    id: "DEMO-BUD-NOTICE-702",
    eventReference: "DEMO-BUD-PAY-702-APPROVED",
    title: "Approved Job Order Payroll",
    description: "Payroll DEMO-BUD-PAY-702 is ready for BURAS preparation.",
    payrollId: "DEMO-BUD-PAY-702",
    createdAt: "2026-11-04T11:20:00+08:00",
    read: false,
    action: "prepare",
  },
  {
    id: "DEMO-BUD-NOTICE-704",
    eventReference: "DEMO-BUD-DOC-704-RETURNED",
    title: "Budget Document Returned",
    description:
      "BURAS DEMO-BUD-BURAS-704 was returned to Budget Office with remarks.",
    payrollId: "DEMO-BUD-PAY-704",
    documentId: "DEMO-BUD-DOC-704",
    createdAt: returnedAt,
    read: false,
    action: "return",
  },
  {
    id: "DEMO-BUD-NOTICE-705",
    eventReference: "DEMO-BUD-DOC-705-IN-PROGRESS",
    title: "ORAS Approval in Progress",
    description:
      "ORAS DEMO-BUD-ORAS-705 is awaiting another required Cost Center approval.",
    payrollId: "DEMO-BUD-PAY-705",
    documentId: "DEMO-BUD-DOC-705",
    createdAt: "2026-10-22T11:35:00+08:00",
    read: true,
    action: "tracking",
  },
]

export function decisionsForDocument(
  reference: string,
  decisions: CostCenterDecision[],
) {
  return decisions.filter(
    (decision) =>
      decision.documentReference === reference &&
      decision.documentType !== "Payroll",
  )
}
