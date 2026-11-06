export type DvStage = "Ready for Accounting Review" | "Checked — Ready to Forward" | "Awaiting Accountant Review" | "Awaiting Chancellor Review" | "Returned to Accounting" | "DV Approved" | "Configuration Required"

export type DvEvent = {
  id: string
  at: string
  office: string
  user?: string
  action: string
  remarks?: string
}

export type AccountantDecisionEvent = {
  id: string
  dvId: string
  payrollId: string
  routingInstanceId: string
  action: "Approved" | "Returned"
  responsibleRole: "Accountant"
  recordedUser: string
  recordedAt: string
  remarks?: string
  priorWorkflowStage: string
  nextWorkflowStage: string
  nextHoldingOffice: string
}

export type ChancellorDecisionEvent = {
  id: string
  dvId: string
  payrollId: string
  dvRevision: number
  routingInstanceId: string
  action: "Approved" | "Returned"
  actorUserId: string
  recordedUser: string
  recordedAt: string
  remarks?: string
  previousStage: string
  nextStage: string
  nextHoldingOffice: string
}

export type DownstreamDocumentBundle = {
  id: string
  dvId: string
  payrollId: string
  payrollRegisterReference: string
  adaAdcaReference: string
  bankUploadMetadataReference?: string
  sourcePayrollTotal: number
  dvTotal: number
  generatedDocumentTotal: number
  reconciliationState: "Reconciled" | "Blocked"
  missingBankAccountEmployeeIds: string[]
  state: "Ready for Cashier" | "Requires Follow-up"
  issue?: string
  createdAt: string
  demoOnly: true
}

export type DvEmployeeSummary = {
  employeeId: string
  name: string
  fund: "F01" | "F05" | "F07"
  grossPay: number
  deductions: number
  netPay: number
  bankAccountAvailable: boolean
}

export type SupportingDocument = {
  id: string
  group: "Payroll" | "Budget" | "Approval"
  name: string
  reference?: string
  available: boolean
  approvalInformation?: string
  completedAt?: string
}

export type JournalEntry = {
  id: string
  description: string
  accountCode?: string
  debit: number
  credit: number
  sourceReference: string
}

export type DvRecord = {
  id: string
  fixtureLabel: "Demo Approval Scenario — Fictional"
  payrollId: string
  payrollTypeId: string
  payrollTypeName: string
  period: string
  fund: "F01" | "F05" | "F07"
  stage: DvStage
  currentHolder: string
  amount: number | null
  preparedBy?: string
  generatedAt?: string
  checkedBy?: string
  checkedAt?: string
  forwardedAt?: string
  accountantRouteConfigured: boolean
  chancellorRouteConfigured?: boolean
  activeRoutingInstance?: string
  accountantDecisions?: AccountantDecisionEvent[]
  currentRevision?: number
  receivedByChancellorAt?: string
  chancellorDecisions?: ChancellorDecisionEvent[]
  employeePayrollRows?: DvEmployeeSummary[]
  downstreamBundle?: DownstreamDocumentBundle
  releaseStatus?: "Not Released" | "Released"
  prerequisites: {
    payrollExists: boolean
    payrollApprovalsComplete: boolean
    budgetDocumentExists: boolean
    budgetApprovalsComplete: boolean
    readyForDvRecorded: boolean
  }
  budgetDocument: {
    type: "ORAS" | "BURAS"
    reference?: string
    approved: boolean
    completedAt?: string
  }
  payrollSnapshot: {
    includedEmployeeCount: number
    costCenters: string[]
    basicPay: number
    otherEarnings: number
    grossPay: number
    deductions: number
    netPay: number
    approvalInformation: string
  }
  supportingDocuments: SupportingDocument[]
  journalConfigurationReference?: string
  journalEntries: JournalEntry[]
  events: DvEvent[]
  returnInfo?: {
    office: string
    at: string
    remarks: string
    stage: string
    issueSource: "Accounting DV review" | "Chancellor DV review" | "Payroll source" | "Budget source"
    recheckAuthorized: boolean
  }
}

const payrollSnapshot = {
  includedEmployeeCount: 4,
  costCenters: ["Demo Cost Center A", "Demo Cost Center B"],
  basicPay: 32150,
  otherEarnings: 250,
  grossPay: 32400,
  deductions: 0,
  netPay: 32400,
  approvalInformation:
    "Isolated fictional prerequisite approvals recorded for DV interface testing only.",
}

const documents = (dv: string, budget: string): SupportingDocument[] => [
  {
    id: `${dv}-PAYROLL`,
    group: "Payroll",
    name: "Approved payroll calculation snapshot",
    reference: `${dv}-PAYROLL-SNAPSHOT`,
    available: true,
    approvalInformation:
      "Fictional prerequisite approval completion represented by the isolated fixture.",
    completedAt: "2026-11-03T09:00:00+08:00",
  },
  {
    id: `${dv}-BUDGET`,
    group: "Budget",
    name: "BURAS — F05",
    reference: budget,
    available: true,
    approvalInformation:
      "Fictional BURAS preparation and required Cost Center approvals completed in the isolated fixture.",
    completedAt: "2026-11-04T13:30:00+08:00",
  },
  {
    id: `${dv}-APPROVALS`,
    group: "Approval",
    name: "Prerequisite approval history",
    reference: `${dv}-APPROVAL-HISTORY`,
    available: true,
    approvalInformation:
      "Contains fictional payroll and BURAS approval events for interface testing.",
  },
]

const accountantDocuments = (
  dv: string,
  budget: string,
  budgetType: "ORAS" | "BURAS",
): SupportingDocument[] => [
  {
    id: `${dv}-PAYROLL`,
    group: "Payroll",
    name: "Approved payroll snapshot — fictional workflow demonstration",
    reference: `${dv}-PAYROLL-SNAPSHOT`,
    available: true,
    approvalInformation:
      "Fictional prerequisite payroll approvals recorded for isolated Accountant workflow testing.",
    completedAt: "2026-11-10T09:00:00+08:00",
  },
  {
    id: `${dv}-BUDGET`,
    group: "Budget",
    name: `${budgetType} — fictional workflow demonstration`,
    reference: budget,
    available: true,
    approvalInformation:
      "Fictional budget-document and Cost Center approval references for interface testing only.",
    completedAt: "2026-11-10T11:30:00+08:00",
  },
  {
    id: `${dv}-ACCOUNTING`,
    group: "Approval",
    name: "Accounting checked and forwarded record",
    reference: `${dv}-ACCOUNTING-CHECK`,
    available: true,
    approvalInformation:
      "Checked and forwarded by the fictional Accounting user in this isolated demonstration.",
    completedAt: "2026-11-10T14:15:00+08:00",
  },
]

const accountantSnapshot = (amount: number, costCenter: string) => ({
  includedEmployeeCount: 1,
  costCenters: [costCenter],
  basicPay: amount,
  otherEarnings: 0,
  grossPay: amount,
  deductions: 0,
  netPay: amount,
  approvalInformation:
    "Isolated fictional approved-payroll snapshot for Accountant workflow testing. Component values are not official salary or deduction rules.",
})

const journalEntries = (dv: string, amount: number): JournalEntry[] => [
  {
    id: `${dv}-JE-DR`,
    description:
      "Configured demonstration debit total — no official account assignment",
    debit: amount,
    credit: 0,
    sourceReference: `${dv}-DEMO-JE-CONFIG`,
  },
  {
    id: `${dv}-JE-CR`,
    description:
      "Configured demonstration credit total — no official account assignment",
    debit: 0,
    credit: amount,
    sourceReference: `${dv}-DEMO-JE-CONFIG`,
  },
]

export const initialDvRecords: DvRecord[] = [
  {
    id: "DEMO-DV-001",
    fixtureLabel: "Demo Approval Scenario — Fictional",
    payrollId: "DEMO-PAY-DV-001",
    payrollTypeId: "isolated-job-order-dv",
    payrollTypeName: "Fictional Approved Job Order Payroll Scenario",
    period: "November 1–15, 2026",
    fund: "F05",
    stage: "Ready for Accounting Review",
    currentHolder: "Accounting Section",
    amount: 32400,
    preparedBy: "Fictional system-generated fixture",
    generatedAt: "2026-11-04T14:00:00+08:00",
    accountantRouteConfigured: true,
    prerequisites: {
      payrollExists: true,
      payrollApprovalsComplete: true,
      budgetDocumentExists: true,
      budgetApprovalsComplete: true,
      readyForDvRecorded: true,
    },
    budgetDocument: {
      type: "BURAS",
      reference: "DEMO-BURAS-DV-001",
      approved: true,
      completedAt: "2026-11-04T13:30:00+08:00",
    },
    payrollSnapshot,
    supportingDocuments: documents("DEMO-DV-001", "DEMO-BURAS-DV-001"),
    journalConfigurationReference: "DEMO-DV-001-DEMO-JE-CONFIG",
    journalEntries: journalEntries("DEMO-DV-001", 32400),
    events: [
      {
        id: "DEMO-DV-001-GENERATED",
        at: "2026-11-04T14:00:00+08:00",
        office: "Frontend demonstration fixture",
        action: "DV information generated for isolated UI testing",
        remarks:
          "No official university DV, accounting entry, or signature was produced.",
      },
    ],
  },
  {
    id: "DEMO-DV-002",
    fixtureLabel: "Demo Approval Scenario — Fictional",
    payrollId: "DEMO-PAY-DV-002",
    payrollTypeId: "isolated-permanent-dv",
    payrollTypeName: "Fictional Approved Permanent Payroll Scenario",
    period: "November 2026",
    fund: "F05",
    stage: "Awaiting Accountant Review",
    currentHolder: "Accountant",
    amount: 32400,
    preparedBy: "Fictional system-generated fixture",
    generatedAt: "2026-11-05T09:00:00+08:00",
    checkedBy: "Fictional Accounting User",
    checkedAt: "2026-11-05T10:00:00+08:00",
    forwardedAt: "2026-11-05T10:15:00+08:00",
    accountantRouteConfigured: true,
    prerequisites: {
      payrollExists: true,
      payrollApprovalsComplete: true,
      budgetDocumentExists: true,
      budgetApprovalsComplete: true,
      readyForDvRecorded: true,
    },
    budgetDocument: {
      type: "BURAS",
      reference: "DEMO-BURAS-DV-002",
      approved: true,
      completedAt: "2026-11-05T08:30:00+08:00",
    },
    payrollSnapshot,
    supportingDocuments: documents("DEMO-DV-002", "DEMO-BURAS-DV-002"),
    journalConfigurationReference: "DEMO-DV-002-DEMO-JE-CONFIG",
    journalEntries: journalEntries("DEMO-DV-002", 32400),
    events: [
      {
        id: "DEMO-DV-002-GENERATED",
        at: "2026-11-05T09:00:00+08:00",
        office: "Frontend demonstration fixture",
        action: "DV information generated for isolated UI testing",
      },
      {
        id: "DEMO-DV-002-CHECKED",
        at: "2026-11-05T10:00:00+08:00",
        office: "Accounting Section",
        user: "Fictional Accounting User",
        action: "Marked DV as checked in the local demonstration",
        remarks: "No official certification or signature occurred.",
      },
      {
        id: "DEMO-DV-002-FORWARDED",
        at: "2026-11-05T10:15:00+08:00",
        office: "Accounting Section",
        user: "Fictional Accounting User",
        action: "Forwarded locally to Accountant",
        remarks: "No document was delivered to a real office.",
      },
    ],
  },
  {
    id: "DEMO-DV-003",
    fixtureLabel: "Demo Approval Scenario — Fictional",
    payrollId: "DEMO-PAY-DV-003",
    payrollTypeId: "isolated-lecturer-dv",
    payrollTypeName: "Fictional Approved Lecturer Payroll Scenario",
    period: "November 2026",
    fund: "F07",
    stage: "Returned to Accounting",
    currentHolder: "Accounting Section",
    amount: 32400,
    preparedBy: "Fictional system-generated fixture",
    generatedAt: "2026-11-06T09:00:00+08:00",
    checkedBy: "Fictional Accounting User",
    checkedAt: "2026-11-06T09:45:00+08:00",
    forwardedAt: "2026-11-06T10:00:00+08:00",
    accountantRouteConfigured: true,
    prerequisites: {
      payrollExists: true,
      payrollApprovalsComplete: true,
      budgetDocumentExists: true,
      budgetApprovalsComplete: true,
      readyForDvRecorded: true,
    },
    budgetDocument: {
      type: "BURAS",
      reference: "DEMO-BURAS-DV-003",
      approved: true,
      completedAt: "2026-11-06T08:30:00+08:00",
    },
    payrollSnapshot,
    supportingDocuments: documents("DEMO-DV-003", "DEMO-BURAS-DV-003"),
    journalConfigurationReference: "DEMO-DV-003-DEMO-JE-CONFIG",
    journalEntries: journalEntries("DEMO-DV-003", 32400),
    events: [
      {
        id: "DEMO-DV-003-GENERATED",
        at: "2026-11-06T09:00:00+08:00",
        office: "Frontend demonstration fixture",
        action: "DV information generated for isolated UI testing",
      },
      {
        id: "DEMO-DV-003-CHECKED",
        at: "2026-11-06T09:45:00+08:00",
        office: "Accounting Section",
        user: "Fictional Accounting User",
        action: "Marked DV as checked in the local demonstration",
      },
      {
        id: "DEMO-DV-003-FORWARDED",
        at: "2026-11-06T10:00:00+08:00",
        office: "Accounting Section",
        user: "Fictional Accounting User",
        action: "Forwarded locally to Accountant",
      },
      {
        id: "DEMO-DV-003-RETURNED",
        at: "2026-11-06T15:20:00+08:00",
        office: "Fictional Accountant role",
        action: "Returned DV to Accounting",
        remarks:
          "Please review the supporting-document reference recorded for this fictional voucher.",
      },
    ],
    returnInfo: {
      office: "Fictional Accountant role",
      at: "2026-11-06T15:20:00+08:00",
      remarks:
        "Please review the supporting-document reference recorded for this fictional voucher.",
      stage: "Accountant DV Review",
      issueSource: "Accounting DV review",
      recheckAuthorized: true,
    },
  },
  {
    id: "DEMO-DV-2026-A01",
    fixtureLabel: "Demo Approval Scenario — Fictional",
    payrollId: "DEMO-PAY-APPROVAL-A01",
    payrollTypeId: "accountant-demo-job-order",
    payrollTypeName: "Payroll for Job Order Staff Employees",
    period: "October 1–15, 2026",
    fund: "F05",
    stage: "Awaiting Accountant Review",
    currentHolder: "Accountant",
    amount: 24000,
    preparedBy: "Fictional Accounting User",
    generatedAt: "2026-11-10T13:30:00+08:00",
    checkedBy: "Fictional Accounting User",
    checkedAt: "2026-11-10T14:00:00+08:00",
    forwardedAt: "2026-11-10T14:15:00+08:00",
    accountantRouteConfigured: true,
    chancellorRouteConfigured: true,
    activeRoutingInstance: "DEMO-DV-2026-A01-ROUTE-01",
    accountantDecisions: [],
    prerequisites: {
      payrollExists: true,
      payrollApprovalsComplete: true,
      budgetDocumentExists: true,
      budgetApprovalsComplete: true,
      readyForDvRecorded: true,
    },
    budgetDocument: {
      type: "BURAS",
      reference: "DEMO-BURAS-A01",
      approved: true,
      completedAt: "2026-11-10T11:30:00+08:00",
    },
    payrollSnapshot: accountantSnapshot(24000, "Fictional Cost Center A"),
    supportingDocuments: accountantDocuments(
      "DEMO-DV-2026-A01",
      "DEMO-BURAS-A01",
      "BURAS",
    ),
    journalConfigurationReference: "DEMO-DV-2026-A01-JOURNAL-REFERENCE",
    journalEntries: journalEntries("DEMO-DV-2026-A01", 24000),
    events: [
      {
        id: "DEMO-DV-2026-A01-GENERATED",
        at: "2026-11-10T13:30:00+08:00",
        office: "Frontend demonstration fixture",
        action: "Fictional DV information prepared",
      },
      {
        id: "DEMO-DV-2026-A01-CHECKED",
        at: "2026-11-10T14:00:00+08:00",
        office: "Accounting Section",
        user: "Fictional Accounting User",
        action: "Checked fictional DV information",
      },
      {
        id: "DEMO-DV-2026-A01-FORWARDED",
        at: "2026-11-10T14:15:00+08:00",
        office: "Accounting Section",
        user: "Fictional Accounting User",
        action: "Forwarded fictional DV to Accountant",
        remarks:
          "Fictional Workflow Demonstration — no actual university document was delivered.",
      },
    ],
  },
  {
    id: "DEMO-DV-2026-A02",
    fixtureLabel: "Demo Approval Scenario — Fictional",
    payrollId: "DEMO-PAY-APPROVAL-A02",
    payrollTypeId: "accountant-demo-permanent",
    payrollTypeName: "Payroll for Permanent Staff Employees",
    period: "September 2026",
    fund: "F01",
    stage: "Awaiting Accountant Review",
    currentHolder: "Accountant",
    amount: 38500,
    preparedBy: "Fictional Accounting User",
    generatedAt: "2026-11-11T08:30:00+08:00",
    checkedBy: "Fictional Accounting User",
    checkedAt: "2026-11-11T09:00:00+08:00",
    forwardedAt: "2026-11-11T09:15:00+08:00",
    accountantRouteConfigured: true,
    chancellorRouteConfigured: true,
    activeRoutingInstance: "DEMO-DV-2026-A02-ROUTE-01",
    accountantDecisions: [],
    prerequisites: {
      payrollExists: true,
      payrollApprovalsComplete: true,
      budgetDocumentExists: true,
      budgetApprovalsComplete: true,
      readyForDvRecorded: true,
    },
    budgetDocument: {
      type: "ORAS",
      reference: "DEMO-ORAS-A02",
      approved: true,
      completedAt: "2026-11-11T08:00:00+08:00",
    },
    payrollSnapshot: accountantSnapshot(38500, "Fictional Cost Center B"),
    supportingDocuments: accountantDocuments(
      "DEMO-DV-2026-A02",
      "DEMO-ORAS-A02",
      "ORAS",
    ),
    journalConfigurationReference: "DEMO-DV-2026-A02-JOURNAL-REFERENCE",
    journalEntries: journalEntries("DEMO-DV-2026-A02", 38500),
    events: [
      {
        id: "DEMO-DV-2026-A02-GENERATED",
        at: "2026-11-11T08:30:00+08:00",
        office: "Frontend demonstration fixture",
        action: "Fictional DV information prepared",
      },
      {
        id: "DEMO-DV-2026-A02-CHECKED",
        at: "2026-11-11T09:00:00+08:00",
        office: "Accounting Section",
        user: "Fictional Accounting User",
        action: "Checked fictional DV information",
      },
      {
        id: "DEMO-DV-2026-A02-FORWARDED",
        at: "2026-11-11T09:15:00+08:00",
        office: "Accounting Section",
        user: "Fictional Accounting User",
        action: "Forwarded fictional DV to Accountant",
        remarks:
          "Fictional Workflow Demonstration — no actual university document was delivered.",
      },
    ],
  },
]

export function dvTotals(record: DvRecord) {
  const debit = record.journalEntries.reduce(
    (sum, entry) => sum + entry.debit,
    0,
  )
  const credit = record.journalEntries.reduce(
    (sum, entry) => sum + entry.credit,
    0,
  )
  return { debit, credit }
}
