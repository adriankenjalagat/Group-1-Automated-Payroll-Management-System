import type { PayslipRecord } from "../MyPayslips"
import type { DvRecord } from "../accounting/dvData"

export type CashierProcessingState = "Ready for Release" | "Requires Attention" | "Released"

export type CashierEmployee = {
  employeeId: string
  name: string
  costCenter: string
  payBasis: "Monthly" | "Daily" | "Hourly"
  grossPay: number
  deductions: number
  netPay: number
  bankAccountAvailable: boolean
}

export type CashierDocument = {
  id: string
  payrollId: string
  dvId: string
  type: "Disbursement Voucher" | "Payroll Register" | "ADA/ADCA" | "LandBank Upload"
  reference: string
  generatedAt: string
  amount: number
  previewAvailable: boolean
  printable: boolean
  downloadable: boolean
  lockedAt?: string
  demoOnly: true
}

export type CashierAuditEvent = {
  id: string
  actorUserId: string
  actorName: string
  actorRole: "Cashier"
  payrollId: string
  documentId?: string
  documentReference?: string
  action: "Print Initiated" | "Download Initiated" | "Payroll Released"
  fileType?: string
  recordedAt: string
  result: string
  demo: true
}

export type CashierReleaseEvent = {
  id: string
  payrollId: string
  cashierUserId: string
  cashierName: string
  releasedAt: string
  previousStatus: string
  nextStatus: "Released"
  documentBundleId: string
  acknowledgments: {
    documentsReviewed: true
    signaturesHandledExternally: true
    landBankHandledExternally: true
    finalConfirmation: true
  }
}

export type CashierPayroll = {
  id: string
  dvId: string
  payrollType: string
  period: string
  periodKey: string
  fund: "F01" | "F05" | "F07"
  costCenters: string[]
  gross: number
  deductions: number
  net: number
  dvAmount: number
  registerTotal: number
  bankUploadTotal: number
  employees: CashierEmployee[]
  budgetApprovalReference: string
  chancellorApprovalReference: string
  chancellorApprovedAt: string
  bundleId: string
  documents: CashierDocument[]
  processingState: CashierProcessingState
  currentStage: string
  currentHolder: string
  issue?: string
  releaseEvent?: CashierReleaseEvent
  sourceDvId?: string
  demo: true
}

export type CashierNotification = {
  id: string
  eventReference: string
  payrollId: string
  dvId: string
  title: string
  description: string
  createdAt: string
  read: boolean
  action: "payroll" | "documents" | "issues" | "history"
}

const employee = (
  employeeId: string,
  name: string,
  costCenter: string,
  grossPay: number,
  deductions: number,
  bankAccountAvailable = true,
  payBasis: CashierEmployee["payBasis"] = "Monthly",
): CashierEmployee => ({
  employeeId,
  name,
  costCenter,
  payBasis,
  grossPay,
  deductions,
  netPay: grossPay - deductions,
  bankAccountAvailable,
})

function documents(
  payrollId: string,
  dvId: string,
  generatedAt: string,
  amount: number,
  bankReady: boolean,
  lockedAt?: string,
): CashierDocument[] {
  return [
    {
      id: `${payrollId}-DV`,
      payrollId,
      dvId,
      type: "Disbursement Voucher",
      reference: dvId,
      generatedAt,
      amount,
      previewAvailable: true,
      printable: true,
      downloadable: true,
      lockedAt,
      demoOnly: true,
    },
    {
      id: `${payrollId}-REGISTER`,
      payrollId,
      dvId,
      type: "Payroll Register",
      reference: `${payrollId}-DEMO-REGISTER`,
      generatedAt,
      amount,
      previewAvailable: true,
      printable: true,
      downloadable: true,
      lockedAt,
      demoOnly: true,
    },
    {
      id: `${payrollId}-ADA`,
      payrollId,
      dvId,
      type: "ADA/ADCA",
      reference: `${payrollId}-DEMO-ADA-ADCA`,
      generatedAt,
      amount,
      previewAvailable: true,
      printable: true,
      downloadable: true,
      lockedAt,
      demoOnly: true,
    },
    {
      id: `${payrollId}-BANK`,
      payrollId,
      dvId,
      type: "LandBank Upload",
      reference: bankReady
        ? `${payrollId}-DEMO-BANK-METADATA`
        : `${payrollId}-BANK-FOLLOW-UP`,
      generatedAt,
      amount,
      previewAvailable: true,
      printable: false,
      downloadable: false,
      lockedAt,
      demoOnly: true,
    },
  ]
}

export function excludedEmployees(record: CashierPayroll) {
  return record.employees.filter((item) => !item.bankAccountAvailable)
}

export function excludedAmount(record: CashierPayroll) {
  return excludedEmployees(record).reduce((sum, item) => sum + item.netPay, 0)
}

export function cashierReadiness(record: CashierPayroll) {
  const missing = excludedEmployees(record)
  const requiredDocuments = record.documents.filter(
    (document) => document.type !== "LandBank Upload",
  )
  const documentsReady =
    requiredDocuments.length === 3 &&
    requiredDocuments.every((document) => document.previewAvailable)
  const chancellorApproved = Boolean(
    record.chancellorApprovalReference && record.chancellorApprovedAt,
  )
  const totalsReconcile =
    record.gross - record.deductions === record.net &&
    record.dvAmount === record.net &&
    record.registerTotal === record.net &&
    record.bankUploadTotal === record.net
  return {
    chancellorApproved,
    documentsReady,
    totalsReconcile,
    missingCount: missing.length,
    missingAmount: excludedAmount(record),
    eligible:
      record.processingState !== "Released" &&
      chancellorApproved &&
      documentsReady &&
      totalsReconcile &&
      missing.length === 0,
  }
}

const releasedAt = "2026-10-30T15:30:00+08:00"

export const initialCashierPayrolls: CashierPayroll[] = [
  {
    id: "DEMO-CASH-PAY-1001",
    dvId: "DEMO-CASH-DV-1001",
    payrollType: "Job Order Staff",
    period: "October 16–31, 2026",
    periodKey: "2026-10",
    fund: "F05",
    costCenters: ["Fictional Cashier Cost Center"],
    gross: 35000,
    deductions: 500,
    net: 34500,
    dvAmount: 34500,
    registerTotal: 34500,
    bankUploadTotal: 34500,
    employees: [
      employee(
        "DEMO-CASH-EMP-101",
        "Mara Santos",
        "Fictional Cashier Cost Center",
        14000,
        200,
      ),
      employee(
        "DEMO-CASH-EMP-102",
        "Leo Dela Cruz",
        "Fictional Cashier Cost Center",
        12000,
        150,
      ),
      employee(
        "DEMO-CASH-EMP-103",
        "Alex Mendoza",
        "Fictional Cashier Cost Center",
        9000,
        150,
      ),
    ],
    budgetApprovalReference: "DEMO-CASH-PAY-1001-BURAS-APPROVED",
    chancellorApprovalReference: "DEMO-CASH-DV-1001-CHANCELLOR-APPROVED",
    chancellorApprovedAt: "2026-11-08T14:00:00+08:00",
    bundleId: "DEMO-CASH-BUNDLE-1001",
    documents: documents(
      "DEMO-CASH-PAY-1001",
      "DEMO-CASH-DV-1001",
      "2026-11-08T14:10:00+08:00",
      34500,
      true,
    ),
    processingState: "Ready for Release",
    currentStage: "Approved / Awaiting Cashier Release",
    currentHolder: "Cashier Office",
    demo: true,
  },
  {
    id: "DEMO-CASH-PAY-1002",
    dvId: "DEMO-CASH-DV-1002",
    payrollType: "Permanent Staff",
    period: "September 2026",
    periodKey: "2026-09",
    fund: "F01",
    costCenters: ["Fictional Permanent Staff Cost Center"],
    gross: 84500,
    deductions: 9500,
    net: 75000,
    dvAmount: 75000,
    registerTotal: 75000,
    bankUploadTotal: 51500,
    employees: [
      employee(
        "DEMO-CASH-EMP-201",
        "Avery Cruz",
        "Fictional Permanent Staff Cost Center",
        30000,
        4000,
      ),
      employee(
        "DEMO-CASH-EMP-202",
        "Riley Santos",
        "Fictional Permanent Staff Cost Center",
        28500,
        3000,
      ),
      employee(
        "DEMO-CASH-EMP-203",
        "Casey Ramos",
        "Fictional Permanent Staff Cost Center",
        26000,
        2500,
        false,
      ),
    ],
    budgetApprovalReference: "DEMO-CASH-PAY-1002-ORAS-APPROVED",
    chancellorApprovalReference: "DEMO-CASH-DV-1002-CHANCELLOR-APPROVED",
    chancellorApprovedAt: "2026-11-09T14:00:00+08:00",
    bundleId: "DEMO-CASH-BUNDLE-1002",
    documents: documents(
      "DEMO-CASH-PAY-1002",
      "DEMO-CASH-DV-1002",
      "2026-11-09T14:10:00+08:00",
      75000,
      false,
    ),
    processingState: "Requires Attention",
    currentStage: "Requires Attention — Missing Bank Account",
    currentHolder: "Accounting and Cashier follow-up",
    issue:
      "Some employees are missing required LandBank account information. Full-batch release is blocked by a provisional demo safeguard while follow-up rules remain TBD.",
    demo: true,
  },
  {
    id: "DEMO-CASH-PAY-1003",
    dvId: "DEMO-CASH-DV-1003",
    payrollType: "Lecturer Faculty",
    period: "October 2026",
    periodKey: "2026-10",
    fund: "F07",
    costCenters: ["Fictional Lecturer Cost Center"],
    gross: 18600,
    deductions: 600,
    net: 18000,
    dvAmount: 18000,
    registerTotal: 18000,
    bankUploadTotal: 17500,
    employees: [
      employee(
        "DEMO-CASH-EMP-301",
        "Fictional Lecturer A",
        "Fictional Lecturer Cost Center",
        10000,
        300,
      ),
      employee(
        "DEMO-CASH-EMP-302",
        "Fictional Lecturer B",
        "Fictional Lecturer Cost Center",
        8600,
        300,
      ),
    ],
    budgetApprovalReference: "DEMO-CASH-PAY-1003-ORAS-APPROVED",
    chancellorApprovalReference: "DEMO-CASH-DV-1003-CHANCELLOR-APPROVED",
    chancellorApprovedAt: "2026-11-10T14:00:00+08:00",
    bundleId: "DEMO-CASH-BUNDLE-1003",
    documents: documents(
      "DEMO-CASH-PAY-1003",
      "DEMO-CASH-DV-1003",
      "2026-11-10T14:10:00+08:00",
      18000,
      false,
    ),
    processingState: "Requires Attention",
    currentStage: "Requires Attention — Reconciliation Error",
    currentHolder: "Accounting Section",
    issue:
      "Generated-document totals do not reconcile with the approved payroll. The recorded difference is ₱500.00.",
    demo: true,
  },
  {
    id: "DEMO-CASH-PAY-1004",
    dvId: "DEMO-CASH-DV-1004",
    payrollType: "Job Order Staff",
    period: "September 16–30, 2026",
    periodKey: "2026-09",
    fund: "F05",
    costCenters: ["Fictional Released Payroll Cost Center"],
    gross: 24000,
    deductions: 500,
    net: 23500,
    dvAmount: 23500,
    registerTotal: 23500,
    bankUploadTotal: 23500,
    employees: [
      employee(
        "DEMO-CASH-EMP-401",
        "Jordan Flores",
        "Fictional Released Payroll Cost Center",
        16000,
        300,
      ),
      employee(
        "DEMO-CASH-EMP-402",
        "Taylor Reyes",
        "Fictional Released Payroll Cost Center",
        8000,
        200,
      ),
    ],
    budgetApprovalReference: "DEMO-CASH-PAY-1004-BURAS-APPROVED",
    chancellorApprovalReference: "DEMO-CASH-DV-1004-CHANCELLOR-APPROVED",
    chancellorApprovedAt: "2026-10-30T14:00:00+08:00",
    bundleId: "DEMO-CASH-BUNDLE-1004",
    documents: documents(
      "DEMO-CASH-PAY-1004",
      "DEMO-CASH-DV-1004",
      "2026-10-30T14:10:00+08:00",
      23500,
      true,
      releasedAt,
    ),
    processingState: "Released",
    currentStage: "Released — Documents Locked",
    currentHolder: "Cashier Office — Released",
    releaseEvent: {
      id: "DEMO-CASH-RELEASE-1004",
      payrollId: "DEMO-CASH-PAY-1004",
      cashierUserId: "caquino",
      cashierName: "Carlo Aquino",
      releasedAt,
      previousStatus: "Approved / Awaiting Cashier Release",
      nextStatus: "Released",
      documentBundleId: "DEMO-CASH-BUNDLE-1004",
      acknowledgments: {
        documentsReviewed: true,
        signaturesHandledExternally: true,
        landBankHandledExternally: true,
        finalConfirmation: true,
      },
    },
    demo: true,
  },
]

export const initialCashierAuditEvents: CashierAuditEvent[] = [
  {
    id: "DEMO-CASH-AUDIT-RELEASE-1004",
    actorUserId: "caquino",
    actorName: "Carlo Aquino",
    actorRole: "Cashier",
    payrollId: "DEMO-CASH-PAY-1004",
    action: "Payroll Released",
    recordedAt: releasedAt,
    result: "Fictional demonstration release event recorded.",
    demo: true,
  },
]

export const initialCashierNotifications: CashierNotification[] = [
  {
    id: "DEMO-CASH-NOTICE-1001",
    eventReference: "DEMO-CASH-BUNDLE-1001-READY",
    payrollId: "DEMO-CASH-PAY-1001",
    dvId: "DEMO-CASH-DV-1001",
    title: "Payroll Documents Ready",
    description:
      "Payroll DEMO-CASH-PAY-1001 has generated disbursement documents ready for Cashier processing.",
    createdAt: "2026-11-08T14:15:00+08:00",
    read: false,
    action: "payroll",
  },
  {
    id: "DEMO-CASH-NOTICE-1002",
    eventReference: "DEMO-CASH-BUNDLE-1002-MISSING",
    payrollId: "DEMO-CASH-PAY-1002",
    dvId: "DEMO-CASH-DV-1002",
    title: "Missing LandBank Account",
    description:
      "Payroll DEMO-CASH-PAY-1002 includes an employee without required bank-account information.",
    createdAt: "2026-11-09T14:15:00+08:00",
    read: false,
    action: "issues",
  },
  {
    id: "DEMO-CASH-NOTICE-1003",
    eventReference: "DEMO-CASH-BUNDLE-1003-RECONCILIATION",
    payrollId: "DEMO-CASH-PAY-1003",
    dvId: "DEMO-CASH-DV-1003",
    title: "Document Reconciliation Issue",
    description:
      "Generated totals for payroll DEMO-CASH-PAY-1003 require reconciliation.",
    createdAt: "2026-11-10T14:15:00+08:00",
    read: false,
    action: "issues",
  },
]

export function payslipsForRelease(
  record: CashierPayroll,
  releasedAt: string,
): PayslipRecord[] {
  return record.employees.map((item) => ({
    id: `${record.id}-${item.employeeId}-PAYSLIP`,
    employeeId: item.employeeId,
    payrollType: record.payrollType,
    period: record.period,
    periodKey: record.periodKey,
    payBasis: item.payBasis,
    releaseStatus: "Released",
    releaseDate: releasedAt.slice(0, 10),
    earnings: [
      { name: "Recorded fictional earnings total", amount: item.grossPay },
    ],
    grossPay: item.grossPay,
    deductions: [
      { name: "Recorded fictional deductions total", amount: item.deductions },
    ],
    netPay: item.netPay,
  }))
}

export const initialCashierPayslips: PayslipRecord[] =
  initialCashierPayrolls.flatMap((record) =>
    record.processingState === "Released" && record.releaseEvent
      ? payslipsForRelease(record, record.releaseEvent.releasedAt)
      : [],
  )

export function releaseCashierPayroll({
  record,
  actor,
  acknowledgments,
  confirmed,
  releasedAt,
}: {
  record: CashierPayroll
  actor: { id: string; name: string; authorized: boolean }
  acknowledgments: {
    documentsReviewed: boolean
    signaturesHandledExternally: boolean
    landBankHandledExternally: boolean
  }
  confirmed: boolean
  releasedAt: string
}): {
  ok: true
  record: CashierPayroll
  event: CashierReleaseEvent
  audit: CashierAuditEvent
  payslips: PayslipRecord[]
} | { ok: false; error: string } {
  if (!actor.authorized)
    return {
      ok: false,
      error: "You are not authorized to release this payroll.",
    }
  if (record.processingState === "Released" || record.releaseEvent)
    return {
      ok: false,
      error: "This payroll has already been marked Released.",
    }
  if (!cashierReadiness(record).eligible)
    return {
      ok: false,
      error:
        "This payroll is not eligible for release. Review the outstanding issues.",
    }
  if (
    !acknowledgments.documentsReviewed ||
    !acknowledgments.signaturesHandledExternally ||
    !acknowledgments.landBankHandledExternally ||
    !confirmed
  )
    return {
      ok: false,
      error: "Complete the external processing acknowledgments before release.",
    }
  const event: CashierReleaseEvent = {
    id: `${record.id}-RELEASE-${releasedAt}`,
    payrollId: record.id,
    cashierUserId: actor.id,
    cashierName: actor.name,
    releasedAt,
    previousStatus: record.currentStage,
    nextStatus: "Released",
    documentBundleId: record.bundleId,
    acknowledgments: {
      documentsReviewed: true,
      signaturesHandledExternally: true,
      landBankHandledExternally: true,
      finalConfirmation: true,
    },
  }
  const next: CashierPayroll = {
    ...record,
    processingState: "Released",
    currentStage: "Released — Documents Locked",
    currentHolder: "Cashier Office — Released",
    releaseEvent: event,
    documents: record.documents.map((document) => ({
      ...document,
      lockedAt: releasedAt,
    })),
  }
  return {
    ok: true,
    record: next,
    event,
    payslips: payslipsForRelease(next, releasedAt),
    audit: {
      id: `${event.id}-AUDIT`,
      actorUserId: actor.id,
      actorName: actor.name,
      actorRole: "Cashier",
      payrollId: record.id,
      action: "Payroll Released",
      recordedAt: releasedAt,
      result:
        "Payroll release recorded in local demonstration state; no bank transfer was performed.",
      demo: true,
    },
  }
}

export function cashierRecordFromDv(record: DvRecord): CashierPayroll | null {
  const decision = record.chancellorDecisions
    ?.filter((item) => item.action === "Approved")
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0]
  const bundle = record.downstreamBundle
  if (!decision || !bundle) return null
  const rows = record.employeePayrollRows ?? []
  const employees: CashierEmployee[] = rows.map((item) => ({
    employeeId: item.employeeId,
    name: item.name,
    costCenter:
      record.payrollSnapshot.costCenters[0] ?? "Cost Center unavailable",
    payBasis: "Monthly",
    grossPay: item.grossPay,
    deductions: item.deductions,
    netPay: item.netPay,
    bankAccountAvailable: item.bankAccountAvailable,
  }))
  return {
    id: record.payrollId,
    dvId: record.id,
    payrollType: record.payrollTypeName,
    period: record.period,
    periodKey: record.period.match(/\d{4}/)?.[0]
      ? `${record.period.match(/\d{4}/)?.[0]}-01`
      : "2026-01",
    fund: record.fund,
    costCenters: record.payrollSnapshot.costCenters,
    gross: record.payrollSnapshot.grossPay,
    deductions: record.payrollSnapshot.deductions,
    net: record.payrollSnapshot.netPay,
    dvAmount: record.amount ?? 0,
    registerTotal: bundle.sourcePayrollTotal,
    bankUploadTotal: bundle.generatedDocumentTotal,
    employees,
    budgetApprovalReference:
      record.budgetDocument.reference ??
      `${record.payrollId}-${record.budgetDocument.type}-APPROVED`,
    chancellorApprovalReference: decision.id,
    chancellorApprovedAt: decision.recordedAt,
    bundleId: bundle.id,
    documents: documents(
      record.payrollId,
      record.id,
      bundle.createdAt,
      record.payrollSnapshot.netPay,
      bundle.state === "Ready for Cashier",
      record.releaseStatus === "Released" ? decision.recordedAt : undefined,
    ),
    processingState:
      record.releaseStatus === "Released"
        ? "Released"
        : bundle.state === "Ready for Cashier"
          ? "Ready for Release"
          : "Requires Attention",
    currentStage:
      record.releaseStatus === "Released"
        ? "Released — Documents Locked"
        : bundle.state === "Ready for Cashier"
          ? "Approved / Awaiting Cashier Release"
          : "Requires Attention — Downstream Document Issue",
    currentHolder: record.currentHolder,
    issue: bundle.issue,
    sourceDvId: record.id,
    demo: true,
  }
}
