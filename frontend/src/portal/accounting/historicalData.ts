export type HistoricalFund = "F01" | "F05" | "F07"

export type HistoricalPayrollRecord = {
  historicalRecordId: string
  importId: string
  originalPayrollReference?: string
  originalSourceRow: number
  employeeId: string
  employeeName: string
  payrollPeriodStart: string
  payrollPeriodEnd: string
  payrollType: string
  fundSource: HistoricalFund
  payBasis: string
  costCenter?: string
  basicPay?: number
  otherEarnings?: number
  grossPay: number
  totalDeductions: number
  netPay: number
  originalNotes?: string
  sourceType: "ImportedHistorical"
  readOnly: true
}

export type HistoricalImportBatch = {
  importId: string
  originalFilename: string
  fileType: "CSV"
  sourceSheetName?: string
  importedBy: string
  importedAt: string
  recordCount: number
  payrollPeriodCoverage: string[]
  payrollTypes: string[]
  validatedTotalGross: number
  validatedTotalDeductions: number
  validatedTotalNet: number
  validationSummary: string
  contentFingerprint: string
  importedRecordIds: string[]
  demoFixtureFlag: boolean
  importLabel?: string
}

export function historicalPeriodLabel(
  start: string,
  end: string,
  short = false,
) {
  const startDate = new Date(`${start}T00:00:00`)
  const endDate = new Date(`${end}T00:00:00`)
  if (Number.isNaN(startDate.valueOf()) || Number.isNaN(endDate.valueOf()))
    return `${start} – ${end}`
  const formatter = new Intl.DateTimeFormat("en-PH", {
    month: short ? "short" : "long",
    day: "numeric",
    year: "numeric",
  })
  if (
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth()
  ) {
    return `${startDate.toLocaleDateString("en-PH", {
      month: short ? "short" : "long",
    })} ${startDate.getDate()}–${endDate.getDate()}, ${endDate.getFullYear()}`
  }
  return `${formatter.format(startDate)} – ${formatter.format(endDate)}`
}

export const initialHistoricalRecords: HistoricalPayrollRecord[] = [
  {
    historicalRecordId: "DEMO-HREC-2026-001",
    importId: "DEMO-IMP-2026-001",
    originalPayrollReference: "FICTIONAL-SEPT-2025-01",
    originalSourceRow: 2,
    employeeId: "DEMO-HIST-101",
    employeeName: "Alex Santos",
    payrollPeriodStart: "2025-09-01",
    payrollPeriodEnd: "2025-09-30",
    payrollType: "Permanent Staff",
    fundSource: "F01",
    payBasis: "Monthly",
    grossPay: 18500,
    totalDeductions: 1500,
    netPay: 17000,
    originalNotes: "Fictional historical payroll sample.",
    sourceType: "ImportedHistorical",
    readOnly: true,
  },
  {
    historicalRecordId: "DEMO-HREC-2026-002",
    importId: "DEMO-IMP-2026-001",
    originalPayrollReference: "FICTIONAL-SEPT-2025-01",
    originalSourceRow: 3,
    employeeId: "DEMO-HIST-102",
    employeeName: "Jamie Cruz",
    payrollPeriodStart: "2025-09-01",
    payrollPeriodEnd: "2025-09-30",
    payrollType: "Contractual Staff",
    fundSource: "F05",
    payBasis: "Monthly",
    grossPay: 16000,
    totalDeductions: 800,
    netPay: 15200,
    originalNotes: "Fictional historical payroll sample.",
    sourceType: "ImportedHistorical",
    readOnly: true,
  },
  {
    historicalRecordId: "DEMO-HREC-2026-003",
    importId: "DEMO-IMP-2026-001",
    originalPayrollReference: "FICTIONAL-SEPT-2025-01",
    originalSourceRow: 4,
    employeeId: "DEMO-HIST-103",
    employeeName: "Morgan Reyes",
    payrollPeriodStart: "2025-09-01",
    payrollPeriodEnd: "2025-09-30",
    payrollType: "Job Order Staff",
    fundSource: "F07",
    payBasis: "Daily",
    grossPay: 12000,
    totalDeductions: 0,
    netPay: 12000,
    originalNotes: "Fictional historical payroll sample.",
    sourceType: "ImportedHistorical",
    readOnly: true,
  },
]

export const initialHistoricalBatches: HistoricalImportBatch[] = [
  {
    importId: "DEMO-IMP-2026-001",
    originalFilename: "DEMO_September_2025_Payroll.csv",
    fileType: "CSV",
    importedBy: "Fictional Accounting User",
    importedAt: "2026-10-01T08:30:00+08:00",
    recordCount: 3,
    payrollPeriodCoverage: ["September 1–30, 2025"],
    payrollTypes: ["Permanent Staff", "Contractual Staff", "Job Order Staff"],
    validatedTotalGross: 46500,
    validatedTotalDeductions: 2300,
    validatedTotalNet: 44200,
    validationSummary: "Validated fictional demonstration fixture",
    contentFingerprint: "fixture-demo-september-2025",
    importedRecordIds: initialHistoricalRecords.map(
      (record) => record.historicalRecordId,
    ),
    demoFixtureFlag: true,
    importLabel: "Fictional Historical Payroll Sample",
  },
]
