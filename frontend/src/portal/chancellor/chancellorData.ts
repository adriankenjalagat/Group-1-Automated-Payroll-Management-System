import type {
  AccountantDecisionEvent,
  ChancellorDecisionEvent,
  DownstreamDocumentBundle,
  DvEmployeeSummary,
  DvRecord,
  SupportingDocument,
} from "../accounting/dvData"

export type ChancellorNotification = {
  id: string
  eventReference: string
  dvId: string
  payrollId: string
  title: string
  description: string
  createdAt: string
  read: boolean
  action: "review" | "decision"
  decisionId?: string
}

const accountantApproval = (
  dvId: string,
  payrollId: string,
  at: string,
): AccountantDecisionEvent => ({
  id: `${dvId}-ACCOUNTANT-APPROVED`,
  dvId,
  payrollId,
  routingInstanceId: `${dvId}-ROUTE-R1`,
  action: "Approved",
  responsibleRole: "Accountant",
  recordedUser: "Fictional Accountant User",
  recordedAt: at,
  remarks: "Fictional prior Accountant approval for Chancellor portal testing.",
  priorWorkflowStage: "Awaiting Accountant Review",
  nextWorkflowStage: "Awaiting Chancellor Review",
  nextHoldingOffice: "Office of the Chancellor",
})

const employee = (
  employeeId: string,
  name: string,
  fund: "F01" | "F05" | "F07",
  grossPay: number,
  deductions: number,
  bankAccountAvailable = true,
): DvEmployeeSummary => ({
  employeeId,
  name,
  fund,
  grossPay,
  deductions,
  netPay: grossPay - deductions,
  bankAccountAvailable,
})

const support = (
  dvId: string,
  payrollId: string,
  budgetReference: string,
  budgetType: "ORAS" | "BURAS",
  accountantAt: string,
): SupportingDocument[] => [
  {
    id: `${dvId}-DV`,
    group: "Approval",
    name: "Prepared Disbursement Voucher",
    reference: dvId,
    available: true,
    approvalInformation:
      "Fictional DV metadata only. An original university form preview is unavailable.",
  },
  {
    id: `${dvId}-PAYROLL`,
    group: "Payroll",
    name: "Approved Payroll Summary",
    reference: `${payrollId}-APPROVED-SNAPSHOT`,
    available: true,
    approvalInformation:
      "Fictional approved payroll snapshot for prototype review.",
  },
  {
    id: `${dvId}-BUDGET`,
    group: "Budget",
    name: `${budgetType} Budget Document`,
    reference: budgetReference,
    available: true,
    approvalInformation:
      "Fictional budget-document approval reference for prototype review.",
  },
  {
    id: `${dvId}-ACCOUNTANT`,
    group: "Approval",
    name: "Accountant Approval Record",
    reference: `${dvId}-ACCOUNTANT-APPROVED`,
    available: true,
    approvalInformation:
      "Fictional Accountant approval event for the current DV revision.",
    completedAt: accountantAt,
  },
]

const events = (
  dvId: string,
  payrollId: string,
  budgetReference: string,
  preparedAt: string,
  checkedAt: string,
  accountantAt: string,
) => [
  {
    id: `${dvId}-UPSTREAM`,
    at: preparedAt,
    office: "Required Cost Center roles",
    action: "Recorded required payroll and budget-document approvals",
    remarks: `Fictional prior approval chain for ${payrollId} and ${budgetReference}.`,
  },
  {
    id: `${dvId}-ACCOUNTING-CHECK`,
    at: checkedAt,
    office: "Accounting Section",
    user: "Fictional Accounting User",
    action: "Checked and forwarded DV information",
  },
  {
    id: `${dvId}-ACCOUNTANT-EVENT`,
    at: accountantAt,
    office: "Accountant",
    user: "Fictional Accountant User",
    action: "Approved DV for Chancellor review",
    remarks: "Fictional approval event for the active DV revision.",
  },
]

const journal = (dvId: string, amount: number) => [
  {
    id: `${dvId}-DEBIT`,
    description: "Fictional configured debit total",
    debit: amount,
    credit: 0,
    sourceReference: `${dvId}-DEMO-JOURNAL`,
  },
  {
    id: `${dvId}-CREDIT`,
    description: "Fictional configured credit total",
    debit: 0,
    credit: amount,
    sourceReference: `${dvId}-DEMO-JOURNAL`,
  },
]

const pending = ({
  id,
  payrollId,
  payrollType,
  period,
  fund,
  budgetReference,
  budgetType,
  gross,
  deductions,
  employees,
  preparedAt,
  checkedAt,
  accountantAt,
  receivedAt,
}: {
  id: string
  payrollId: string
  payrollType: string
  period: string
  fund: "F01" | "F05" | "F07"
  budgetReference: string
  budgetType: "ORAS" | "BURAS"
  gross: number
  deductions: number
  employees: DvEmployeeSummary[]
  preparedAt: string
  checkedAt: string
  accountantAt: string
  receivedAt: string
}): DvRecord => {
  const net = gross - deductions
  return {
    id,
    fixtureLabel: "Demo Approval Scenario — Fictional",
    payrollId,
    payrollTypeId: `chancellor-${payrollType.toLowerCase().replace(/\s+/g, "-")}`,
    payrollTypeName: payrollType,
    period,
    fund,
    stage: "Awaiting Chancellor Review",
    currentHolder: "Office of the Chancellor",
    amount: net,
    preparedBy: "Fictional Accounting User",
    generatedAt: preparedAt,
    checkedBy: "Fictional Accounting User",
    checkedAt,
    forwardedAt: accountantAt,
    accountantRouteConfigured: true,
    chancellorRouteConfigured: true,
    activeRoutingInstance: `${id}-ROUTE-R1`,
    currentRevision: 1,
    receivedByChancellorAt: receivedAt,
    accountantDecisions: [accountantApproval(id, payrollId, accountantAt)],
    chancellorDecisions: [],
    prerequisites: {
      payrollExists: true,
      payrollApprovalsComplete: true,
      budgetDocumentExists: true,
      budgetApprovalsComplete: true,
      readyForDvRecorded: true,
    },
    budgetDocument: {
      type: budgetType,
      reference: budgetReference,
      approved: true,
      completedAt: preparedAt,
    },
    payrollSnapshot: {
      includedEmployeeCount: employees.length,
      costCenters: ["Fictional approved Cost Center route"],
      basicPay: 0,
      otherEarnings: 0,
      grossPay: gross,
      deductions,
      netPay: net,
      approvalInformation:
        "Fictional required payroll and budget approvals are recorded for this isolated scenario.",
    },
    employeePayrollRows: employees,
    supportingDocuments: support(
      id,
      payrollId,
      budgetReference,
      budgetType,
      accountantAt,
    ),
    journalConfigurationReference: `${id}-DEMO-JOURNAL`,
    journalEntries: journal(id, net),
    events: events(
      id,
      payrollId,
      budgetReference,
      preparedAt,
      checkedAt,
      accountantAt,
    ),
    releaseStatus: "Not Released",
  }
}

const decision = (
  dvId: string,
  payrollId: string,
  action: "Approved" | "Returned",
  at: string,
  remarks?: string,
): ChancellorDecisionEvent => ({
  id: `${dvId}-CHANCELLOR-${action.toUpperCase()}`,
  dvId,
  payrollId,
  dvRevision: 1,
  routingInstanceId: `${dvId}-ROUTE-R1`,
  action,
  actorUserId: "tnavarro",
  recordedUser: "Dr. Teresa Navarro",
  recordedAt: at,
  remarks,
  previousStage: "Awaiting Chancellor Review",
  nextStage: action === "Approved" ? "DV Approved" : "Returned to Accounting",
  nextHoldingOffice:
    action === "Approved" ? "Cashier Office" : "Accounting Section",
})

const readyBundle: DownstreamDocumentBundle = {
  id: "DEMO-CH-BUNDLE-904",
  dvId: "DEMO-CH-DV-904",
  payrollId: "DEMO-CH-PAY-904",
  payrollRegisterReference: "DEMO-CH-REGISTER-904",
  adaAdcaReference: "DEMO-CH-ADA-ADCA-904",
  bankUploadMetadataReference: "DEMO-CH-BANK-METADATA-904",
  sourcePayrollTotal: 23500,
  dvTotal: 23500,
  generatedDocumentTotal: 23500,
  reconciliationState: "Reconciled",
  missingBankAccountEmployeeIds: [],
  state: "Ready for Cashier",
  createdAt: "2026-10-30T15:10:00+08:00",
  demoOnly: true,
}

export const initialChancellorDvRecords: DvRecord[] = [
  pending({
    id: "DEMO-CH-DV-901",
    payrollId: "DEMO-CH-PAY-901",
    payrollType: "Job Order Staff",
    period: "October 16–31, 2026",
    fund: "F05",
    budgetReference: "DEMO-CH-BURAS-901",
    budgetType: "BURAS",
    gross: 35000,
    deductions: 500,
    employees: [
      employee("DEMO-CH-EMP-901", "Avery Cruz", "F05", 12000, 200),
      employee("DEMO-CH-EMP-902", "Riley Santos", "F05", 10000, 100),
      employee("DEMO-CH-EMP-903", "Taylor Ramos", "F05", 7000, 100),
      employee("DEMO-CH-EMP-904", "Morgan Lee", "F05", 6000, 100),
    ],
    preparedAt: "2026-11-05T08:30:00+08:00",
    checkedAt: "2026-11-05T09:00:00+08:00",
    accountantAt: "2026-11-05T10:15:00+08:00",
    receivedAt: "2026-11-05T10:20:00+08:00",
  }),
  pending({
    id: "DEMO-CH-DV-902",
    payrollId: "DEMO-CH-PAY-902",
    payrollType: "Permanent Staff",
    period: "October 2026",
    fund: "F01",
    budgetReference: "DEMO-CH-ORAS-902",
    budgetType: "ORAS",
    gross: 84500,
    deductions: 9500,
    employees: [
      employee(
        "DEMO-CH-EMP-905",
        "Fictional Permanent Employee A",
        "F01",
        30000,
        4000,
      ),
      employee(
        "DEMO-CH-EMP-906",
        "Fictional Permanent Employee B",
        "F01",
        28500,
        3000,
      ),
      employee(
        "DEMO-CH-EMP-907",
        "Fictional Permanent Employee C",
        "F01",
        26000,
        2500,
      ),
    ],
    preparedAt: "2026-11-06T08:30:00+08:00",
    checkedAt: "2026-11-06T09:00:00+08:00",
    accountantAt: "2026-11-06T10:00:00+08:00",
    receivedAt: "2026-11-06T10:05:00+08:00",
  }),
  pending({
    id: "DEMO-CH-DV-903",
    payrollId: "DEMO-CH-PAY-903",
    payrollType: "Lecturer Faculty",
    period: "October 2026",
    fund: "F07",
    budgetReference: "DEMO-CH-BURAS-903",
    budgetType: "BURAS",
    gross: 18600,
    deductions: 600,
    employees: [
      employee("DEMO-CH-EMP-908", "Fictional Lecturer A", "F07", 10000, 300),
      employee(
        "DEMO-CH-EMP-909",
        "Fictional Lecturer B",
        "F07",
        8600,
        300,
        false,
      ),
    ],
    preparedAt: "2026-11-07T08:30:00+08:00",
    checkedAt: "2026-11-07T09:00:00+08:00",
    accountantAt: "2026-11-07T10:00:00+08:00",
    receivedAt: "2026-11-07T10:05:00+08:00",
  }),
  {
    ...pending({
      id: "DEMO-CH-DV-904",
      payrollId: "DEMO-CH-PAY-904",
      payrollType: "Job Order Staff",
      period: "September 16–30, 2026",
      fund: "F05",
      budgetReference: "DEMO-CH-BURAS-904",
      budgetType: "BURAS",
      gross: 24000,
      deductions: 500,
      employees: [
        employee(
          "DEMO-CH-EMP-910",
          "Fictional Job Order Employee",
          "F05",
          24000,
          500,
        ),
      ],
      preparedAt: "2026-10-30T09:00:00+08:00",
      checkedAt: "2026-10-30T10:00:00+08:00",
      accountantAt: "2026-10-30T11:00:00+08:00",
      receivedAt: "2026-10-30T11:05:00+08:00",
    }),
    stage: "DV Approved",
    currentHolder: "Cashier Office",
    chancellorDecisions: [
      decision(
        "DEMO-CH-DV-904",
        "DEMO-CH-PAY-904",
        "Approved",
        "2026-10-30T15:00:00+08:00",
        "Fictional Chancellor approval for prototype testing.",
      ),
    ],
    downstreamBundle: readyBundle,
    events: [
      ...events(
        "DEMO-CH-DV-904",
        "DEMO-CH-PAY-904",
        "DEMO-CH-BURAS-904",
        "2026-10-30T09:00:00+08:00",
        "2026-10-30T10:00:00+08:00",
        "2026-10-30T11:00:00+08:00",
      ),
      {
        id: "DEMO-CH-DV-904-CHANCELLOR-EVENT",
        at: "2026-10-30T15:00:00+08:00",
        office: "Office of the Chancellor",
        user: "Dr. Teresa Navarro",
        action: "Approved DV",
      },
      {
        id: "DEMO-CH-DV-904-HANDOFF",
        at: "2026-10-30T15:10:00+08:00",
        office: "Frontend demonstration workflow",
        action: "Prepared reconciled demo document bundle for Cashier",
        remarks: "No official LandBank file or signed document was generated.",
      },
    ],
  },
  {
    ...pending({
      id: "DEMO-CH-DV-905",
      payrollId: "DEMO-CH-PAY-905",
      payrollType: "Permanent Staff",
      period: "September 2026",
      fund: "F01",
      budgetReference: "DEMO-CH-ORAS-905",
      budgetType: "ORAS",
      gross: 62000,
      deductions: 7000,
      employees: [
        employee(
          "DEMO-CH-EMP-911",
          "Fictional Permanent Employee",
          "F01",
          62000,
          7000,
        ),
      ],
      preparedAt: "2026-11-03T08:00:00+08:00",
      checkedAt: "2026-11-03T09:00:00+08:00",
      accountantAt: "2026-11-03T10:00:00+08:00",
      receivedAt: "2026-11-03T10:05:00+08:00",
    }),
    stage: "Returned to Accounting",
    currentHolder: "Accounting Section",
    chancellorDecisions: [
      decision(
        "DEMO-CH-DV-905",
        "DEMO-CH-PAY-905",
        "Returned",
        "2026-11-03T14:00:00+08:00",
        "Please review the attached supporting records and submit a corrected DV through the required approval process.",
      ),
    ],
    returnInfo: {
      office: "Office of the Chancellor",
      at: "2026-11-03T14:00:00+08:00",
      remarks:
        "Please review the attached supporting records and submit a corrected DV through the required approval process.",
      stage: "Chancellor DV Review",
      issueSource: "Chancellor DV review",
      recheckAuthorized: true,
    },
    events: [
      ...events(
        "DEMO-CH-DV-905",
        "DEMO-CH-PAY-905",
        "DEMO-CH-ORAS-905",
        "2026-11-03T08:00:00+08:00",
        "2026-11-03T09:00:00+08:00",
        "2026-11-03T10:00:00+08:00",
      ),
      {
        id: "DEMO-CH-DV-905-CHANCELLOR-EVENT",
        at: "2026-11-03T14:00:00+08:00",
        office: "Office of the Chancellor",
        user: "Dr. Teresa Navarro",
        action: "Returned DV to Accounting Section",
        remarks:
          "Please review the attached supporting records and submit a corrected DV through the required approval process.",
      },
    ],
  },
]

export const initialChancellorNotifications: ChancellorNotification[] = [
  {
    id: "DEMO-CH-NOTICE-901",
    eventReference: "DEMO-CH-DV-901-ACCOUNTANT-APPROVED",
    dvId: "DEMO-CH-DV-901",
    payrollId: "DEMO-CH-PAY-901",
    title: "DV Awaiting Chancellor Approval",
    description: "DV DEMO-CH-DV-901 is ready for your review.",
    createdAt: "2026-11-05T10:20:00+08:00",
    read: false,
    action: "review",
  },
  {
    id: "DEMO-CH-NOTICE-902",
    eventReference: "DEMO-CH-DV-902-ACCOUNTANT-APPROVED",
    dvId: "DEMO-CH-DV-902",
    payrollId: "DEMO-CH-PAY-902",
    title: "Permanent Staff DV for Review",
    description:
      "DV DEMO-CH-DV-902 completed Accountant approval and is awaiting your decision.",
    createdAt: "2026-11-06T10:05:00+08:00",
    read: false,
    action: "review",
  },
  {
    id: "DEMO-CH-NOTICE-903",
    eventReference: "DEMO-CH-DV-903-ACCOUNTANT-APPROVED",
    dvId: "DEMO-CH-DV-903",
    payrollId: "DEMO-CH-PAY-903",
    title: "Lecturer DV for Review",
    description: "DV DEMO-CH-DV-903 is awaiting Chancellor review.",
    createdAt: "2026-11-07T10:05:00+08:00",
    read: false,
    action: "review",
  },
]

export function currentAccountantApproval(record: DvRecord) {
  return record.accountantDecisions
    ?.filter(
      (decision) =>
        decision.action === "Approved" &&
        decision.routingInstanceId === record.activeRoutingInstance,
    )
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0]
}

export function isChancellorPending(record: DvRecord) {
  return (
    record.stage === "Awaiting Chancellor Review" &&
    record.currentHolder === "Office of the Chancellor" &&
    Boolean(currentAccountantApproval(record)) &&
    !(record.chancellorDecisions ?? []).some(
      (decision) =>
        decision.routingInstanceId === record.activeRoutingInstance,
    )
  )
}

export function chancellorReconciliation(record: DvRecord) {
  const amountMatches =
    record.amount !== null &&
    record.amount === record.payrollSnapshot.netPay &&
    record.payrollSnapshot.grossPay - record.payrollSnapshot.deductions ===
      record.payrollSnapshot.netPay
  const supportAvailable =
    record.supportingDocuments.length > 0 &&
    record.supportingDocuments.every((document) => document.available)
  const prerequisites = Object.values(record.prerequisites).every(Boolean)
  return {
    amountMatches,
    supportAvailable,
    prerequisites,
    eligible: amountMatches && supportAvailable && prerequisites,
  }
}

export function createDownstreamBundle(
  record: DvRecord,
  createdAt: string,
): DownstreamDocumentBundle {
  const missing = (record.employeePayrollRows ?? [])
    .filter((employee) => !employee.bankAccountAvailable)
    .map((employee) => employee.employeeId)
  const bankTotal = (record.employeePayrollRows ?? [])
    .filter((employee) => employee.bankAccountAvailable)
    .reduce((sum, employee) => sum + employee.netPay, 0)
  const sourceTotal = record.payrollSnapshot.netPay
  const blocked =
    missing.length > 0 ||
    record.amount === null ||
    record.amount !== sourceTotal ||
    (record.employeePayrollRows?.length ? bankTotal !== sourceTotal : false)
  return {
    id: `${record.id}-DOWNSTREAM-R${record.currentRevision ?? 1}`,
    dvId: record.id,
    payrollId: record.payrollId,
    payrollRegisterReference: `${record.id}-DEMO-REGISTER`,
    adaAdcaReference: `${record.id}-DEMO-ADA-ADCA`,
    bankUploadMetadataReference: blocked
      ? undefined
      : `${record.id}-DEMO-BANK-METADATA`,
    sourcePayrollTotal: sourceTotal,
    dvTotal: record.amount ?? 0,
    generatedDocumentTotal: blocked ? bankTotal : sourceTotal,
    reconciliationState: blocked ? "Blocked" : "Reconciled",
    missingBankAccountEmployeeIds: missing,
    state: blocked ? "Requires Follow-up" : "Ready for Cashier",
    issue: blocked
      ? missing.length
        ? "One or more employees are missing required bank-account information. The downstream bank-upload process requires follow-up."
        : "The approved DV has a document-generation reconciliation issue. Cashier handoff is not complete."
      : undefined,
    createdAt,
    demoOnly: true,
  }
}

export type ChancellorDecisionResult =
  | {
      ok: true
      record: DvRecord
      decision: ChancellorDecisionEvent
      bundle?: DownstreamDocumentBundle
    }
  | { ok: false; error: string }

export function applyChancellorDecision({
  record,
  actor,
  action,
  remarks,
  recordedAt,
}: {
  record: DvRecord
  actor: { id: string; name: string; authorized: boolean }
  action: "Approved" | "Returned"
  remarks?: string
  recordedAt: string
}): ChancellorDecisionResult {
  if (!actor.authorized)
    return {
      ok: false,
      error: "You are not authorized to review this Disbursement Voucher.",
    }
  if (!isChancellorPending(record))
    return {
      ok: false,
      error: "This DV is not currently awaiting a Chancellor decision.",
    }
  if (!currentAccountantApproval(record))
    return {
      ok: false,
      error: "This DV has not completed the required Accountant approval stage.",
    }
  if (action === "Approved" && !chancellorReconciliation(record).eligible)
    return {
      ok: false,
      error:
        record.amount !== record.payrollSnapshot.netPay
          ? "The DV amount does not match the applicable approved payroll total. Refer the issue to Accounting."
          : "Required supporting information is unavailable. The DV cannot be approved yet.",
    }
  if (action === "Returned" && !remarks?.trim())
    return {
      ok: false,
      error: "Please enter a reason for returning this DV.",
    }
  const decision: ChancellorDecisionEvent = {
    id: `${record.id}-CHANCELLOR-${action.toUpperCase()}-${recordedAt}`,
    dvId: record.id,
    payrollId: record.payrollId,
    dvRevision: record.currentRevision ?? 1,
    routingInstanceId:
      record.activeRoutingInstance ?? `${record.id}-ROUTE-UNAVAILABLE`,
    action,
    actorUserId: actor.id,
    recordedUser: actor.name,
    recordedAt,
    remarks: remarks?.trim() || undefined,
    previousStage: record.stage,
    nextStage: action === "Approved" ? "DV Approved" : "Returned to Accounting",
    nextHoldingOffice:
      action === "Approved" ? "Cashier Office" : "Accounting Section",
  }
  const bundle =
    action === "Approved"
      ? createDownstreamBundle(record, recordedAt)
      : undefined
  return {
    ok: true,
    decision,
    bundle,
    record: {
      ...record,
      stage:
        action === "Approved"
          ? ("DV Approved" as const)
          : ("Returned to Accounting" as const),
      currentHolder:
        action === "Approved"
          ? bundle?.state === "Ready for Cashier"
            ? "Cashier Office"
            : "Accounting and Cashier follow-up"
          : "Accounting Section",
      chancellorDecisions: [...(record.chancellorDecisions ?? []), decision],
      downstreamBundle: bundle,
      releaseStatus: "Not Released",
      returnInfo:
        action === "Returned"
          ? {
              office: "Office of the Chancellor",
              at: recordedAt,
              remarks: remarks!.trim(),
              stage: "Chancellor DV Review",
              issueSource: "Chancellor DV review",
              recheckAuthorized: true,
            }
          : record.returnInfo,
      events: [
        ...record.events,
        {
          id: `${decision.id}-EVENT`,
          at: recordedAt,
          office: "Office of the Chancellor",
          user: actor.name,
          action:
            action === "Approved"
              ? "Approved DV"
              : "Returned DV to Accounting Section",
          remarks: remarks?.trim() || undefined,
        },
        ...(bundle
          ? [
              {
                id: `${bundle.id}-EVENT`,
                at: recordedAt,
                office: "Frontend demonstration workflow",
                action:
                  bundle.state === "Ready for Cashier"
                    ? "Prepared reconciled demo document bundle for Cashier"
                    : "Recorded downstream document preparation issue",
                remarks:
                  bundle.issue ??
                  "No official LandBank file or signed document was generated.",
              },
            ]
          : []),
      ],
    },
  }
}
