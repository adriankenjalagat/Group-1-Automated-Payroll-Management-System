export const COST_CENTER_SIGNATORY_ACCOUNT_ID = "DEMO-CC-SIG-001"

export type CostCenterDocumentType = "Payroll" | "ORAS" | "BURAS"
export type CostCenterFund = "F01" | "F05" | "F07"
export type CostCenterDecisionKind = "Approved" | "Returned"
export type CostCenterRequestState = "Pending" | "Approved" | "Returned"

export type CostCenterAssignment = {
  id: string
  name: string
  signatoryAccountId: string
  demo: true
}

export type CostCenterEmployeePay = {
  employeeId: string
  name: string
  payBasis: string
  basicPay: number | null
  otherEarnings: number | null
  grossPay: number
  deductions: number
  netPay: number
  breakdownAvailable: boolean
}

export type CostCenterSupportingDocument = {
  id: string
  name: string
  type: string
  reference: string
  available: boolean
}

export type CostCenterDecision = {
  id: string
  requestId: string
  documentReference: string
  documentType: CostCenterDocumentType
  relatedPayroll: string
  payrollPeriod: string
  fund: CostCenterFund
  costCenterId: string
  costCenterName: string
  actorAccountId: string
  actorName: string
  action: CostCenterDecisionKind
  recordedAt: string
  remarks?: string
  stageAtDecision: string
  currentStage: string
  returnDestination?: "Accounting Section" | "Budget Office"
  routingInstanceId: string
}

export type CostCenterApprovalRequest = {
  id: string
  documentReference: string
  documentType: CostCenterDocumentType
  relatedPayroll: string
  payrollType: string
  payrollPeriod: string
  fund: CostCenterFund
  costCenterId: string
  costCenterName: string
  assignedSignatoryAccountId: string
  approvalStage: string
  routingInstanceId: string
  state: CostCenterRequestState
  receivedAt: string
  amount: number
  basicPay: number | null
  otherEarnings: number | null
  grossPay: number | null
  deductions: number | null
  netPay: number | null
  employees: CostCenterEmployeePay[]
  supportingDocuments: CostCenterSupportingDocument[]
  requiredCostCenterIds: string[]
  completedCostCenterIds: string[]
  currentHoldingOffice: string
  preparedBy?: string
  preparedAt?: string
  previousPayrollApprovalComplete: boolean
  decisions: CostCenterDecision[]
  returnInfo?: {
    destination: "Accounting Section" | "Budget Office"
    remarks: string
    at: string
  }
  demo: true
}

export type CostCenterNotification = {
  id: string
  recipientAccountId: string
  requestId: string
  title: string
  description: string
  documentReference: string
  documentType: CostCenterDocumentType
  costCenterId: string
  costCenterName: string
  createdAt: string
  read: boolean
}

export type CostCenterDecisionResult =
  | {
      ok: true
      request: CostCenterApprovalRequest
      decision: CostCenterDecision
      allComplete: boolean
      message: string
    }
  | {
      ok: false
      error: string
    }

export const demoCostCenterAlpha: CostCenterAssignment = {
  id: "DEMO-CC-ALPHA",
  name: "Demo Cost Center Alpha",
  signatoryAccountId: COST_CENTER_SIGNATORY_ACCOUNT_ID,
  demo: true,
}

export const demoCostCenterBeta = {
  id: "DEMO-CC-BETA",
  name: "Demo Cost Center Beta",
  demo: true,
} as const

const support = (
  id: string,
  name: string,
  type: string,
  reference: string,
): CostCenterSupportingDocument => ({
  id,
  name,
  type,
  reference,
  available: true,
})

const pay501: CostCenterEmployeePay[] = [
  {
    employeeId: "DEMO-CC-EMP-501",
    name: "Nico Salazar",
    payBasis: "Recorded fictional period amount",
    basicPay: 12000,
    otherEarnings: 0,
    grossPay: 12000,
    deductions: 500,
    netPay: 11500,
    breakdownAvailable: true,
  },
  {
    employeeId: "DEMO-CC-EMP-502",
    name: "Raya Montes",
    payBasis: "Recorded fictional period amount",
    basicPay: 10000,
    otherEarnings: 0,
    grossPay: 10000,
    deductions: 300,
    netPay: 9700,
    breakdownAvailable: true,
  },
]

const pay502: CostCenterEmployeePay[] = [
  {
    employeeId: "DEMO-CC-EMP-503",
    name: "Tala Mendoza",
    payBasis: "Recorded fictional period amount",
    basicPay: null,
    otherEarnings: null,
    grossPay: 9500,
    deductions: 500,
    netPay: 9000,
    breakdownAvailable: false,
  },
]

const priorPayrollEmployees: CostCenterEmployeePay[] = [
  {
    employeeId: "DEMO-CC-EMP-504",
    name: "Fictional Alpha Payroll Member",
    payBasis: "Recorded approved payroll snapshot",
    basicPay: null,
    otherEarnings: null,
    grossPay: 42000,
    deductions: 0,
    netPay: 42000,
    breakdownAvailable: false,
  },
]

const lecturerEmployees: CostCenterEmployeePay[] = [
  {
    employeeId: "DEMO-CC-EMP-505",
    name: "Fictional Alpha Lecturer",
    payBasis: "Recorded approved payroll snapshot",
    basicPay: null,
    otherEarnings: null,
    grossPay: 18600,
    deductions: 0,
    netPay: 18600,
    breakdownAvailable: false,
  },
]

export const initialCostCenterRequests: CostCenterApprovalRequest[] = [
  {
    id: "DEMO-CC-REQ-501",
    documentReference: "DEMO-CC-PAY-501",
    documentType: "Payroll",
    relatedPayroll: "DEMO-CC-PAY-501",
    payrollType: "Job Order Staff",
    payrollPeriod: "October 16–31, 2026",
    fund: "F05",
    costCenterId: demoCostCenterAlpha.id,
    costCenterName: demoCostCenterAlpha.name,
    assignedSignatoryAccountId: COST_CENTER_SIGNATORY_ACCOUNT_ID,
    approvalStage: "Cost Center Payroll Approval",
    routingInstanceId: "DEMO-CC-ROUTE-PAY-501-V1",
    state: "Pending",
    receivedAt: "2026-11-04T09:00:00+08:00",
    amount: 21200,
    basicPay: 22000,
    otherEarnings: 0,
    grossPay: 22000,
    deductions: 800,
    netPay: 21200,
    employees: pay501,
    supportingDocuments: [
      support(
        "DEMO-DOC-501-A",
        "Payroll Summary",
        "Payroll summary metadata",
        "DEMO-CC-PAY-501-SUMMARY",
      ),
      support(
        "DEMO-DOC-501-B",
        "Payroll Computation Details",
        "Computation reference",
        "DEMO-CC-PAY-501-COMPUTATION",
      ),
    ],
    requiredCostCenterIds: [demoCostCenterAlpha.id, demoCostCenterBeta.id],
    completedCostCenterIds: [],
    currentHoldingOffice: demoCostCenterAlpha.name,
    previousPayrollApprovalComplete: false,
    decisions: [],
    demo: true,
  },
  {
    id: "DEMO-CC-REQ-502",
    documentReference: "DEMO-CC-PAY-502",
    documentType: "Payroll",
    relatedPayroll: "DEMO-CC-PAY-502",
    payrollType: "Job Order Staff",
    payrollPeriod: "October 1–15, 2026",
    fund: "F05",
    costCenterId: demoCostCenterAlpha.id,
    costCenterName: demoCostCenterAlpha.name,
    assignedSignatoryAccountId: COST_CENTER_SIGNATORY_ACCOUNT_ID,
    approvalStage: "Pending Cost Center Payroll Approval",
    routingInstanceId: "DEMO-CC-ROUTE-PAY-502-V1",
    state: "Pending",
    receivedAt: "2026-11-03T14:30:00+08:00",
    amount: 9000,
    basicPay: null,
    otherEarnings: null,
    grossPay: 9500,
    deductions: 500,
    netPay: 9000,
    employees: pay502,
    supportingDocuments: [
      support(
        "DEMO-DOC-502-A",
        "Payroll Summary",
        "Payroll summary metadata",
        "DEMO-CC-PAY-502-SUMMARY",
      ),
    ],
    requiredCostCenterIds: [demoCostCenterAlpha.id],
    completedCostCenterIds: [],
    currentHoldingOffice: demoCostCenterAlpha.name,
    previousPayrollApprovalComplete: false,
    decisions: [],
    demo: true,
  },
  {
    id: "DEMO-CC-REQ-503",
    documentReference: "DEMO-CC-ORAS-503",
    documentType: "ORAS",
    relatedPayroll: "DEMO-CC-PAY-503",
    payrollType: "Permanent Staff",
    payrollPeriod: "September 2026",
    fund: "F01",
    costCenterId: demoCostCenterAlpha.id,
    costCenterName: demoCostCenterAlpha.name,
    assignedSignatoryAccountId: COST_CENTER_SIGNATORY_ACCOUNT_ID,
    approvalStage: "Pending Cost Center ORAS Approval",
    routingInstanceId: "DEMO-CC-ROUTE-ORAS-503-V1",
    state: "Pending",
    receivedAt: "2026-11-05T08:45:00+08:00",
    amount: 42000,
    basicPay: null,
    otherEarnings: null,
    grossPay: 42000,
    deductions: 0,
    netPay: 42000,
    employees: priorPayrollEmployees,
    supportingDocuments: [
      support(
        "DEMO-DOC-503-A",
        "Approved Payroll Summary",
        "Payroll approval reference",
        "DEMO-CC-PAY-503-APPROVED",
      ),
      support(
        "DEMO-DOC-503-B",
        "Prepared ORAS Information",
        "ORAS metadata",
        "DEMO-CC-ORAS-503",
      ),
    ],
    requiredCostCenterIds: [demoCostCenterAlpha.id, demoCostCenterBeta.id],
    completedCostCenterIds: [],
    currentHoldingOffice: demoCostCenterAlpha.name,
    preparedBy: "Fictional Budget Office User",
    preparedAt: "2026-11-04T15:20:00+08:00",
    previousPayrollApprovalComplete: true,
    decisions: [],
    demo: true,
  },
  {
    id: "DEMO-CC-REQ-504",
    documentReference: "DEMO-CC-BURAS-504",
    documentType: "BURAS",
    relatedPayroll: "DEMO-CC-PAY-504",
    payrollType: "Lecturer Faculty",
    payrollPeriod: "October 2026",
    fund: "F07",
    costCenterId: demoCostCenterAlpha.id,
    costCenterName: demoCostCenterAlpha.name,
    assignedSignatoryAccountId: COST_CENTER_SIGNATORY_ACCOUNT_ID,
    approvalStage: "Pending Cost Center BURAS Approval",
    routingInstanceId: "DEMO-CC-ROUTE-BURAS-504-V1",
    state: "Pending",
    receivedAt: "2026-11-05T10:10:00+08:00",
    amount: 18600,
    basicPay: null,
    otherEarnings: null,
    grossPay: 18600,
    deductions: 0,
    netPay: 18600,
    employees: lecturerEmployees,
    supportingDocuments: [
      support(
        "DEMO-DOC-504-A",
        "Approved Payroll Summary",
        "Payroll approval reference",
        "DEMO-CC-PAY-504-APPROVED",
      ),
      support(
        "DEMO-DOC-504-B",
        "Prepared BURAS Information",
        "BURAS metadata",
        "DEMO-CC-BURAS-504",
      ),
    ],
    requiredCostCenterIds: [demoCostCenterAlpha.id],
    completedCostCenterIds: [],
    currentHoldingOffice: demoCostCenterAlpha.name,
    preparedBy: "Fictional Budget Office User",
    preparedAt: "2026-11-05T09:30:00+08:00",
    previousPayrollApprovalComplete: true,
    decisions: [],
    demo: true,
  },
  {
    id: "DEMO-BUD-REQ-704-ALPHA",
    documentReference: "DEMO-BUD-BURAS-704",
    documentType: "BURAS",
    relatedPayroll: "DEMO-BUD-PAY-704",
    payrollType: "Job Order Staff",
    payrollPeriod: "October 1–15, 2026",
    fund: "F05",
    costCenterId: demoCostCenterAlpha.id,
    costCenterName: demoCostCenterAlpha.name,
    assignedSignatoryAccountId: COST_CENTER_SIGNATORY_ACCOUNT_ID,
    approvalStage: "Returned to Budget Office",
    routingInstanceId: "DEMO-BUD-ROUTE-704-R1",
    state: "Returned",
    receivedAt: "2026-10-29T10:00:00+08:00",
    amount: 23500,
    basicPay: null,
    otherEarnings: null,
    grossPay: 24000,
    deductions: 500,
    netPay: 23500,
    employees: [
      {
        employeeId: "DEMO-BUD-EMP-709",
        name: "Robin Mercado",
        payBasis: "Recorded fictional payroll snapshot",
        basicPay: null,
        otherEarnings: null,
        grossPay: 24000,
        deductions: 500,
        netPay: 23500,
        breakdownAvailable: false,
      },
    ],
    supportingDocuments: [
      support(
        "DEMO-BUD-SUPPORT-704",
        "Approved Payroll Snapshot",
        "Payroll approval reference",
        "DEMO-BUD-PAY-704-SNAPSHOT-V1",
      ),
    ],
    requiredCostCenterIds: [demoCostCenterAlpha.id],
    completedCostCenterIds: [],
    currentHoldingOffice: "Budget Office",
    preparedBy: "Marco Lim",
    preparedAt: "2026-10-29T09:30:00+08:00",
    previousPayrollApprovalComplete: true,
    decisions: [],
    returnInfo: {
      destination: "Budget Office",
      remarks:
        "Please review the stated budget document amount and supporting payroll reference before resubmission.",
      at: "2026-11-02T14:20:00+08:00",
    },
    demo: true,
  },
  {
    id: "DEMO-BUD-REQ-705-ALPHA",
    documentReference: "DEMO-BUD-ORAS-705",
    documentType: "ORAS",
    relatedPayroll: "DEMO-BUD-PAY-705",
    payrollType: "Permanent Staff",
    payrollPeriod: "September 2026",
    fund: "F01",
    costCenterId: demoCostCenterAlpha.id,
    costCenterName: demoCostCenterAlpha.name,
    assignedSignatoryAccountId: COST_CENTER_SIGNATORY_ACCOUNT_ID,
    approvalStage: "Cost Center ORAS Approval recorded",
    routingInstanceId: "DEMO-BUD-ROUTE-705-R1",
    state: "Approved",
    receivedAt: "2026-10-21T10:00:00+08:00",
    amount: 55000,
    basicPay: null,
    otherEarnings: null,
    grossPay: 62000,
    deductions: 7000,
    netPay: 55000,
    employees: [
      {
        employeeId: "DEMO-BUD-EMP-710",
        name: "Sam Rivera",
        payBasis: "Recorded fictional payroll snapshot",
        basicPay: null,
        otherEarnings: null,
        grossPay: 32000,
        deductions: 4000,
        netPay: 28000,
        breakdownAvailable: false,
      },
    ],
    supportingDocuments: [
      support(
        "DEMO-BUD-SUPPORT-705-A",
        "Approved Payroll Snapshot",
        "Payroll approval reference",
        "DEMO-BUD-PAY-705-SNAPSHOT-V1",
      ),
    ],
    requiredCostCenterIds: [demoCostCenterAlpha.id, demoCostCenterBeta.id],
    completedCostCenterIds: [demoCostCenterAlpha.id],
    currentHoldingOffice: demoCostCenterBeta.name,
    preparedBy: "Marco Lim",
    preparedAt: "2026-10-21T09:10:00+08:00",
    previousPayrollApprovalComplete: true,
    decisions: [],
    demo: true,
  },
  {
    id: "DEMO-BUD-REQ-705-BETA",
    documentReference: "DEMO-BUD-ORAS-705",
    documentType: "ORAS",
    relatedPayroll: "DEMO-BUD-PAY-705",
    payrollType: "Permanent Staff",
    payrollPeriod: "September 2026",
    fund: "F01",
    costCenterId: demoCostCenterBeta.id,
    costCenterName: demoCostCenterBeta.name,
    assignedSignatoryAccountId: "DEMO-CC-BETA-ROUTE-NOT-CONFIGURED",
    approvalStage: "Pending Cost Center ORAS Approval",
    routingInstanceId: "DEMO-BUD-ROUTE-705-R1",
    state: "Pending",
    receivedAt: "2026-10-21T10:00:00+08:00",
    amount: 55000,
    basicPay: null,
    otherEarnings: null,
    grossPay: 30000,
    deductions: 3000,
    netPay: 27000,
    employees: [
      {
        employeeId: "DEMO-BUD-EMP-711",
        name: "Pat Garcia",
        payBasis: "Recorded fictional payroll snapshot",
        basicPay: null,
        otherEarnings: null,
        grossPay: 30000,
        deductions: 3000,
        netPay: 27000,
        breakdownAvailable: false,
      },
    ],
    supportingDocuments: [
      support(
        "DEMO-BUD-SUPPORT-705-B",
        "Approved Payroll Snapshot",
        "Payroll approval reference",
        "DEMO-BUD-PAY-705-SNAPSHOT-V1",
      ),
    ],
    requiredCostCenterIds: [demoCostCenterAlpha.id, demoCostCenterBeta.id],
    completedCostCenterIds: [demoCostCenterAlpha.id],
    currentHoldingOffice: demoCostCenterBeta.name,
    preparedBy: "Marco Lim",
    preparedAt: "2026-10-21T09:10:00+08:00",
    previousPayrollApprovalComplete: true,
    decisions: [],
    demo: true,
  },
]

export const initialCostCenterHistory: CostCenterDecision[] = [
  {
    id: "DEMO-CC-DECISION-601",
    requestId: "DEMO-CC-HIST-REQ-601",
    documentReference: "DEMO-CC-PAY-HIST-601",
    documentType: "Payroll",
    relatedPayroll: "DEMO-CC-PAY-HIST-601",
    payrollPeriod: "October 1–15, 2026",
    fund: "F05",
    costCenterId: demoCostCenterAlpha.id,
    costCenterName: demoCostCenterAlpha.name,
    actorAccountId: COST_CENTER_SIGNATORY_ACCOUNT_ID,
    actorName: "Elena Torres",
    action: "Approved",
    recordedAt: "2026-10-27T10:15:00+08:00",
    stageAtDecision: "Cost Center Payroll Approval",
    currentStage: "Fictional later workflow stage not connected",
    routingInstanceId: "DEMO-CC-HIST-PAY-601-V1",
  },
  {
    id: "DEMO-CC-DECISION-602",
    requestId: "DEMO-CC-HIST-REQ-602",
    documentReference: "DEMO-CC-BURAS-HIST-602",
    documentType: "BURAS",
    relatedPayroll: "DEMO-CC-PAY-HIST-602",
    payrollPeriod: "October 2026",
    fund: "F07",
    costCenterId: demoCostCenterAlpha.id,
    costCenterName: demoCostCenterAlpha.name,
    actorAccountId: COST_CENTER_SIGNATORY_ACCOUNT_ID,
    actorName: "Elena Torres",
    action: "Returned",
    recordedAt: "2026-10-30T14:05:00+08:00",
    remarks: "Please review the supporting budget document details.",
    stageAtDecision: "Cost Center BURAS Approval",
    currentStage: "Returned to Budget Office",
    returnDestination: "Budget Office",
    routingInstanceId: "DEMO-CC-HIST-BURAS-602-V1",
  },
]

export const initialCostCenterNotifications: CostCenterNotification[] = [
  {
    id: "DEMO-CC-NOTICE-501",
    recipientAccountId: COST_CENTER_SIGNATORY_ACCOUNT_ID,
    requestId: "DEMO-CC-REQ-501",
    title: "Payroll Approval Required",
    description:
      "A fictional payroll document requires a decision from Demo Cost Center Alpha.",
    documentReference: "DEMO-CC-PAY-501",
    documentType: "Payroll",
    costCenterId: demoCostCenterAlpha.id,
    costCenterName: demoCostCenterAlpha.name,
    createdAt: "2026-11-04T09:05:00+08:00",
    read: false,
  },
  {
    id: "DEMO-CC-NOTICE-503",
    recipientAccountId: COST_CENTER_SIGNATORY_ACCOUNT_ID,
    requestId: "DEMO-CC-REQ-503",
    title: "New ORAS Approval Request",
    description:
      "A fictional F01 ORAS document is awaiting Cost Center review.",
    documentReference: "DEMO-CC-ORAS-503",
    documentType: "ORAS",
    costCenterId: demoCostCenterAlpha.id,
    costCenterName: demoCostCenterAlpha.name,
    createdAt: "2026-11-05T08:50:00+08:00",
    read: false,
  },
  {
    id: "DEMO-CC-NOTICE-504",
    recipientAccountId: COST_CENTER_SIGNATORY_ACCOUNT_ID,
    requestId: "DEMO-CC-REQ-504",
    title: "New BURAS Approval Request",
    description:
      "A fictional F07 BURAS document is awaiting Cost Center review.",
    documentReference: "DEMO-CC-BURAS-504",
    documentType: "BURAS",
    costCenterId: demoCostCenterAlpha.id,
    costCenterName: demoCostCenterAlpha.name,
    createdAt: "2026-11-05T10:15:00+08:00",
    read: false,
  },
]

export function applyCostCenterDecision({
  request,
  actor,
  action,
  remarks,
  recordedAt,
}: {
  request: CostCenterApprovalRequest
  actor: {
    accountId: string
    name: string
  }
  action: CostCenterDecisionKind
  remarks?: string
  recordedAt: string
}): CostCenterDecisionResult {
  if (
    actor.accountId !== request.assignedSignatoryAccountId ||
    request.costCenterId !== demoCostCenterAlpha.id
  )
    return {
      ok: false,
      error: "You are not authorized to review this Cost Center's document.",
    }
  if (request.state !== "Pending")
    return {
      ok: false,
      error: "A decision has already been recorded for this approval request.",
    }
  const hasRequiredInfo =
    Boolean(request.documentReference && request.relatedPayroll) &&
    Number.isFinite(request.amount) &&
    request.supportingDocuments.length > 0 &&
    (request.documentType === "Payroll" ||
      request.previousPayrollApprovalComplete)
  if (!hasRequiredInfo)
    return {
      ok: false,
      error:
        "Required document information is unavailable. Approval cannot be completed.",
    }
  if (action === "Returned" && !remarks?.trim())
    return {
      ok: false,
      error: "Please enter a reason for returning this document.",
    }
  const returnDestination =
    request.documentType === "Payroll" ? "Accounting Section" : "Budget Office"
  const completed =
    action === "Approved"
      ? [...new Set([...request.completedCostCenterIds, request.costCenterId])]
      : request.completedCostCenterIds
  const allComplete = request.requiredCostCenterIds.every((id) =>
    completed.includes(id),
  )
  const nextStage =
    action === "Returned"
      ? `Returned to ${returnDestination}`
      : allComplete
        ? request.documentType === "Payroll"
          ? "Payroll Cost Center approvals complete — local Budget handoff state"
          : "Ready for DV — local workflow state"
        : `Awaiting ${request.requiredCostCenterIds.length - completed.length} other required Cost Center approval`
  const decision: CostCenterDecision = {
    id: `${request.id}-${action.toUpperCase()}-${recordedAt}`,
    requestId: request.id,
    documentReference: request.documentReference,
    documentType: request.documentType,
    relatedPayroll: request.relatedPayroll,
    payrollPeriod: request.payrollPeriod,
    fund: request.fund,
    costCenterId: request.costCenterId,
    costCenterName: request.costCenterName,
    actorAccountId: actor.accountId,
    actorName: actor.name,
    action,
    recordedAt,
    remarks: remarks?.trim() || undefined,
    stageAtDecision: request.approvalStage,
    currentStage: nextStage,
    returnDestination: action === "Returned" ? returnDestination : undefined,
    routingInstanceId: request.routingInstanceId,
  }
  const nextRequest: CostCenterApprovalRequest = {
    ...request,
    state: action,
    completedCostCenterIds: completed,
    approvalStage: nextStage,
    currentHoldingOffice:
      action === "Returned"
        ? returnDestination
        : allComplete
          ? request.documentType === "Payroll"
            ? "Budget Office — local handoff only"
            : "Accounting Section — Ready for DV local state only"
          : "Other required Cost Center signatories",
    decisions: [...request.decisions, decision],
    returnInfo:
      action === "Returned"
        ? {
            destination: returnDestination,
            remarks: remarks!.trim(),
            at: recordedAt,
          }
        : request.returnInfo,
  }
  const message =
    action === "Returned"
      ? request.documentType === "Payroll"
        ? "The payroll was returned to Accounting Section with your remarks in local prototype state."
        : "The budget document was returned to Budget Office with your remarks in local prototype state."
      : allComplete
        ? request.documentType === "Payroll"
          ? "All required payroll approvals are complete in local prototype state. A production integration would make the payroll available to Budget Office."
          : "All required budget-document approvals are complete in local prototype state. The related payroll is marked Ready for DV locally."
        : request.documentType === "Payroll"
          ? "Your approval was recorded. Other required Cost Center approvals are still pending."
          : "Your approval was recorded. Other required budget-document approvals are still pending."
  return {
    ok: true,
    request: nextRequest,
    decision,
    allComplete,
    message,
  }
}
