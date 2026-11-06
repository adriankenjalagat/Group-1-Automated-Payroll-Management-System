import clsx from "clsx"
import {
  useState,
  type Dispatch,
  type DragEvent,
  type SetStateAction,
} from "react"
import { Alert, Button, Icon, TextField } from "../../MsuPayroll"
import { Modal, SelectField, Tag } from "../../admin/ui"
import {
  historicalPeriodLabel,
  type HistoricalFund,
  type HistoricalImportBatch,
  type HistoricalPayrollRecord,
} from "./historicalData"

type ImportTab = "import" | "history" | "records"
type ImportStep = 1 | 2 | 3
type Issue = {
  row: number
  column: string
  message: string
  action: string
  severity: "error" | "warning"
  duplicate?: boolean
}
type PreviewRow = {
  sourceRow: number
  raw: Record<string, string>
  employeeId: string
  employeeName: string
  payrollPeriodStart: string
  payrollPeriodEnd: string
  payrollType: string
  fundSource: string
  payBasis: string
  grossPay: number | null
  totalDeductions: number | null
  netPay: number | null
  basicPay?: number
  otherEarnings?: number
  originalPayrollReference?: string
  costCenter?: string
  historicalNotes?: string
  issues: Issue[]
}
type ValidationResult = {
  filename: string
  fingerprint: string
  sourceSheetName: string
  rows: PreviewRow[]
  issues: Issue[]
  missingHeaders: string[]
}

const requiredHeaders = [
  "employee_id",
  "employee_name",
  "payroll_period_start",
  "payroll_period_end",
  "payroll_type",
  "fund_source",
  "pay_basis",
  "gross_pay",
  "total_deductions",
  "net_pay",
]
const optionalHeaders = [
  "original_payroll_reference",
  "cost_center",
  "basic_pay",
  "other_earnings",
  "historical_notes",
]
const templateHeaders = [...requiredHeaders, ...optionalHeaders]
const configuredPayrollTypes = new Set([
  "Permanent Staff",
  "Contractual Staff",
  "Job Order Staff",
  "Lecturer Faculty",
])
const funds = new Set(["F01", "F05", "F07"])
const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
})
const importedDate = new Intl.DateTimeFormat("en-PH", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

type DataPointProps = {
  label: string
  value: React.ReactNode
}

function DataPoint({ label, value }: DataPointProps) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-text-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium">{value}</dd>
    </div>
  )
}

function SectionTitle({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div>
      <p role="heading" aria-level={2} className="text-lg font-semibold">
        {title}
      </p>
      {description && (
        <p className="mt-1 text-sm text-text-muted">{description}</p>
      )}
    </div>
  )
}

function parseCsv(source: string) {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let quoted = false
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        cell += '"'
        index += 1
      } else if (character === '"') {
        quoted = false
      } else {
        cell += character
      }
    } else if (character === '"') {
      quoted = true
    } else if (character === ",") {
      row.push(cell)
      cell = ""
    } else if (character === "\n") {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ""
    } else if (character !== "\r") {
      cell += character
    }
  }
  if (quoted) throw new Error("An enclosed CSV value is not closed.")
  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

function fingerprint(source: string) {
  let hash = 2166136261
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `local-${(hash >>> 0).toString(16)}-${source.length}`
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return (
    !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
  )
}

function parseMoney(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (!/^-?(?:₱\s*)?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(trimmed))
    return null
  const parsed = Number(trimmed.replace(/[₱,\s]/g, ""))
  return Number.isFinite(parsed) ? parsed : null
}

function recordKey(record: {
  employeeId: string
  payrollPeriodStart: string
  payrollPeriodEnd: string
  payrollType: string
  fundSource: string
  originalPayrollReference?: string
}) {
  return [
    record.employeeId.trim().toLowerCase(),
    record.payrollPeriodStart,
    record.payrollPeriodEnd,
    record.payrollType.trim().toLowerCase(),
    record.fundSource.trim().toUpperCase(),
    record.originalPayrollReference?.trim().toLowerCase() ?? "",
  ].join("|")
}

function issue(
  row: number,
  column: string,
  message: string,
  action: string,
  severity: "error" | "warning" = "error",
  duplicate = false,
): Issue {
  return { row, column, message, action, severity, duplicate }
}

function validateCsv(
  source: string,
  filename: string,
  existing: HistoricalPayrollRecord[],
) {
  const table = parseCsv(source)
  if (!table.length)
    throw new Error("No spreadsheet table could be identified.")
  const headers = table[0].map((header, index) =>
    index === 0
      ? header
          .replace(/^\uFEFF/, "")
          .trim()
          .toLowerCase()
      : header.trim().toLowerCase(),
  )
  const missingHeaders = requiredHeaders.filter(
    (header) => !headers.includes(header),
  )
  const column = (row: string[], name: string) => {
    const index = headers.indexOf(name)
    return index >= 0 ? (row[index] ?? "").trim() : ""
  }
  const rows = table
    .slice(1)
    .map((values, index) => ({ values, sourceRow: index + 2 }))
    .filter(({ values }) => values.some((value) => value.trim() !== ""))
  const knownKeys = new Set(existing.map(recordKey))
  const currentKeys = new Set<string>()
  const previewRows = rows.map(({ values, sourceRow }) => {
    const employeeId = column(values, "employee_id")
    const employeeName = column(values, "employee_name")
    const payrollPeriodStart = column(values, "payroll_period_start")
    const payrollPeriodEnd = column(values, "payroll_period_end")
    const payrollType = column(values, "payroll_type")
    const fundSource = column(values, "fund_source").toUpperCase()
    const payBasis = column(values, "pay_basis")
    const grossRaw = column(values, "gross_pay")
    const deductionsRaw = column(values, "total_deductions")
    const netRaw = column(values, "net_pay")
    const basicRaw = column(values, "basic_pay")
    const otherEarningsRaw = column(values, "other_earnings")
    const grossPay = parseMoney(grossRaw)
    const totalDeductions = parseMoney(deductionsRaw)
    const netPay = parseMoney(netRaw)
    const basicPay = parseMoney(basicRaw)
    const otherEarnings = parseMoney(otherEarningsRaw)
    const originalPayrollReference = column(
      values,
      "original_payroll_reference",
    )
    const rowIssues: Issue[] = []
    if (!employeeId)
      rowIssues.push(
        issue(
          sourceRow,
          "employee_id",
          "Employee ID is missing.",
          "Enter the historical employee identifier in the source file.",
        ),
      )
    if (!employeeName)
      rowIssues.push(
        issue(
          sourceRow,
          "employee_name",
          "Employee name is missing.",
          "Enter the employee name recorded in the historical source.",
        ),
      )
    if (!payrollPeriodStart || !payrollPeriodEnd)
      rowIssues.push(
        issue(
          sourceRow,
          "payroll_period_start / payroll_period_end",
          "Payroll period information is incomplete.",
          "Provide both dates using YYYY-MM-DD.",
        ),
      )
    else if (!validDate(payrollPeriodStart) || !validDate(payrollPeriodEnd))
      rowIssues.push(
        issue(
          sourceRow,
          "payroll_period_start / payroll_period_end",
          "Payroll period date is invalid.",
          "Use an actual calendar date in YYYY-MM-DD format.",
        ),
      )
    else if (payrollPeriodEnd < payrollPeriodStart)
      rowIssues.push(
        issue(
          sourceRow,
          "payroll_period_end",
          "Payroll period end cannot be earlier than the start date.",
          "Correct the period range in the source file.",
        ),
      )
    if (!payrollType)
      rowIssues.push(
        issue(
          sourceRow,
          "payroll_type",
          "Payroll type is missing.",
          "Provide the original historical payroll type.",
        ),
      )
    if (!payBasis)
      rowIssues.push(
        issue(
          sourceRow,
          "pay_basis",
          "Pay basis is missing.",
          "Provide the pay basis recorded in the historical source.",
        ),
      )
    else if (!configuredPayrollTypes.has(payrollType))
      rowIssues.push(
        issue(
          sourceRow,
          "payroll_type",
          "Payroll type is not currently configured and requires mapping review.",
          "Review the source value; it will not be renamed automatically.",
          "warning",
        ),
      )
    if (!funds.has(fundSource))
      rowIssues.push(
        issue(
          sourceRow,
          "fund_source",
          "Fund source is missing or unrecognized.",
          "Use F01, F05, or F07, or await an approved historical mapping.",
        ),
      )
    ;[
      ["gross_pay", grossRaw, grossPay],
      ["total_deductions", deductionsRaw, totalDeductions],
      ["net_pay", netRaw, netPay],
    ].forEach(([name, raw, parsed]) => {
      if (parsed === null)
        rowIssues.push(
          issue(
            sourceRow,
            String(name),
            "Payroll amount must contain a valid numeric value.",
            `Correct the original ${String(name)} value; invalid content is not converted to zero.`,
          ),
        )
      if (String(raw).trim().startsWith("-"))
        rowIssues.push(
          issue(
            sourceRow,
            String(name),
            "Payroll amount cannot be negative in the provisional demo template.",
            "Review the original amount.",
          ),
        )
    })
    ;[
      ["basic_pay", basicRaw, basicPay],
      ["other_earnings", otherEarningsRaw, otherEarnings],
    ].forEach(([name, raw, parsed]) => {
      if (String(raw).trim() && parsed === null)
        rowIssues.push(
          issue(
            sourceRow,
            String(name),
            "Payroll amount must contain a valid numeric value.",
            `Correct the optional ${String(name)} value or leave it empty.`,
          ),
        )
    })
    if (
      grossPay !== null &&
      totalDeductions !== null &&
      netPay !== null &&
      Math.abs(grossPay - totalDeductions - netPay) > 0.01
    )
      rowIssues.push(
        issue(
          sourceRow,
          "net_pay",
          "Net pay does not reconcile with gross pay and deductions.",
          "Review the original source values. The importer will not rewrite them.",
        ),
      )
    const key = recordKey({
      employeeId,
      payrollPeriodStart,
      payrollPeriodEnd,
      payrollType,
      fundSource,
      originalPayrollReference,
    })
    if (knownKeys.has(key) || currentKeys.has(key))
      rowIssues.push(
        issue(
          sourceRow,
          "record",
          "Potential duplicate historical payroll entry. Review the existing record before importing.",
          "Open the existing import and remove the duplicate from the source batch.",
          "error",
          true,
        ),
      )
    currentKeys.add(key)
    const raw = Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ""]),
    )
    return {
      sourceRow,
      raw,
      employeeId,
      employeeName,
      payrollPeriodStart,
      payrollPeriodEnd,
      payrollType,
      fundSource,
      payBasis,
      grossPay,
      totalDeductions,
      netPay,
      basicPay: basicPay ?? undefined,
      otherEarnings: otherEarnings ?? undefined,
      originalPayrollReference: originalPayrollReference || undefined,
      costCenter: column(values, "cost_center") || undefined,
      historicalNotes: column(values, "historical_notes") || undefined,
      issues: rowIssues,
    }
  })
  const headerIssues = missingHeaders.map((header) =>
    issue(
      1,
      header,
      "Required demonstration columns are missing.",
      `Add the ${header} column using the provisional demo template.`,
    ),
  )
  return {
    filename,
    fingerprint: fingerprint(source),
    sourceSheetName: "CSV table",
    rows: previewRows,
    issues: [...headerIssues, ...previewRows.flatMap((row) => row.issues)],
    missingHeaders,
  } satisfies ValidationResult
}

function downloadCsv(filename: string, rows: string[][]) {
  const content = rows
    .map((row) =>
      row.map((value) => `"${value.replace(/"/g, '""')}"`).join(","),
    )
    .join("\r\n")
  const url = URL.createObjectURL(
    new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8" }),
  )
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function openFilePicker() {
  const input = document.querySelector<HTMLInputElement>(
    "[data-historical-file-input]",
  )
  if (!input) return
  input.value = ""
  input.click()
}

function PreviewTable({
  rows,
  onPage,
  page,
}: {
  rows: PreviewRow[]
  onPage: (page: number) => void
  page: number
}) {
  const pageSize = 10
  const pages = Math.max(1, Math.ceil(rows.length / pageSize))
  const visible = rows.slice((page - 1) * pageSize, page * pageSize)
  return (
    <>
      <div className="hidden overflow-x-auto xl:block">
        <table className="w-full min-w-max text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-canvas text-text-muted">
              {[
                "Source Row",
                "Employee ID",
                "Employee Name",
                "Payroll Period",
                "Payroll Type",
                "Fund",
                "Gross Pay",
                "Total Deductions",
                "Net Pay",
                "Validation Result",
              ].map((label) => (
                <th key={label} className="px-3 py-3 font-semibold">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visible.map((row) => (
              <tr key={row.sourceRow}>
                <td className="px-3 py-3">{row.sourceRow}</td>
                <td className="px-3 py-3">{row.employeeId || "Missing"}</td>
                <td className="px-3 py-3 font-medium">
                  {row.employeeName || "Missing"}
                </td>
                <td className="px-3 py-3">
                  {row.payrollPeriodStart && row.payrollPeriodEnd
                    ? `${row.payrollPeriodStart} – ${row.payrollPeriodEnd}`
                    : "Incomplete"}
                </td>
                <td className="px-3 py-3">{row.payrollType || "Missing"}</td>
                <td className="px-3 py-3">{row.fundSource || "Missing"}</td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {row.grossPay === null
                    ? row.raw.gross_pay || "Invalid"
                    : peso.format(row.grossPay)}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {row.totalDeductions === null
                    ? row.raw.total_deductions || "Invalid"
                    : peso.format(row.totalDeductions)}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {row.netPay === null
                    ? row.raw.net_pay || "Invalid"
                    : peso.format(row.netPay)}
                </td>
                <td className="px-3 py-3">
                  <Tag kind={row.issues.length ? "placeholder" : "simulated"}>
                    {row.issues.some((item) => item.severity === "error")
                      ? row.issues.some((item) => item.duplicate)
                        ? "Duplicate Detected"
                        : "Has Errors"
                      : row.issues.length
                        ? "Requires Review"
                        : "Valid"}
                  </Tag>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="divide-y divide-border xl:hidden">
        {visible.map((row) => (
          <li key={row.sourceRow} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {row.employeeName || "Employee name missing"}
                </p>
                <p className="text-xs text-text-muted">
                  Row {row.sourceRow} · {row.employeeId || "ID missing"}
                </p>
              </div>
              <Tag kind={row.issues.length ? "placeholder" : "simulated"}>
                {row.issues.some((item) => item.severity === "error")
                  ? "Has Errors"
                  : row.issues.length
                    ? "Review"
                    : "Valid"}
              </Tag>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3">
              <DataPoint
                label="Period"
                value={`${row.payrollPeriodStart || "Missing"} – ${row.payrollPeriodEnd || "Missing"}`}
              />
              <DataPoint
                label="Type / Fund"
                value={`${row.payrollType || "Missing"} · ${row.fundSource || "Missing"}`}
              />
              <DataPoint
                label="Gross"
                value={
                  row.grossPay === null
                    ? row.raw.gross_pay || "Invalid"
                    : peso.format(row.grossPay)
                }
              />
              <DataPoint
                label="Net"
                value={
                  row.netPay === null
                    ? row.raw.net_pay || "Invalid"
                    : peso.format(row.netPay)
                }
              />
            </dl>
          </li>
        ))}
      </ul>
      {pages > 1 && (
        <div className="flex items-center justify-between border-t border-border p-4">
          <Button
            type="button"
            variant="secondary"
            disabled={page === 1}
            onClick={() => onPage(page - 1)}
          >
            Previous
          </Button>
          <p className="text-xs text-text-muted">
            Page {page} of {pages}
          </p>
          <Button
            type="button"
            variant="secondary"
            disabled={page === pages}
            onClick={() => onPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </>
  )
}

function HistoricalRecordModal({
  record,
  batch,
  onClose,
  onRelated,
}: {
  record: HistoricalPayrollRecord
  batch?: HistoricalImportBatch
  onClose: () => void
  onRelated: () => void
}) {
  return (
    <Modal title="Historical Payroll Record" onClose={onClose} wide>
      <div className="flex flex-wrap gap-2">
        <Tag kind="placeholder">Imported Historical Record</Tag>
        <Tag kind="placeholder">Read Only</Tag>
      </div>
      <section className="mt-5">
        <SectionTitle title="Employee Information" />
        <dl className="mt-3 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
          <DataPoint label="Employee ID" value={record.employeeId} />
          <DataPoint label="Employee Name" value={record.employeeName} />
        </dl>
      </section>
      <section className="mt-5">
        <SectionTitle title="Historical Payroll Information" />
        <dl className="mt-3 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
          <DataPoint
            label="Original Payroll Reference"
            value={record.originalPayrollReference ?? "Not supplied"}
          />
          <DataPoint
            label="Payroll Period"
            value={historicalPeriodLabel(
              record.payrollPeriodStart,
              record.payrollPeriodEnd,
            )}
          />
          <DataPoint label="Payroll Type" value={record.payrollType} />
          <DataPoint label="Fund Source" value={record.fundSource} />
          <DataPoint label="Pay Basis" value={record.payBasis} />
          <DataPoint
            label="Historical Cost Center"
            value={record.costCenter ?? "Not supplied"}
          />
        </dl>
      </section>
      <section className="mt-5">
        <SectionTitle title="Recorded Financial Information" />
        <dl className="mt-3 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
          <DataPoint
            label="Basic Pay"
            value={
              record.basicPay === undefined
                ? "Not supplied"
                : peso.format(record.basicPay)
            }
          />
          <DataPoint
            label="Other Earnings"
            value={
              record.otherEarnings === undefined
                ? "Not supplied"
                : peso.format(record.otherEarnings)
            }
          />
          <DataPoint label="Gross Pay" value={peso.format(record.grossPay)} />
          <DataPoint
            label="Total Deductions"
            value={peso.format(record.totalDeductions)}
          />
          <DataPoint label="Net Pay" value={peso.format(record.netPay)} />
          <DataPoint
            label="Detailed Deduction Breakdown"
            value="Not present in the imported source"
          />
        </dl>
      </section>
      <section className="mt-5">
        <SectionTitle title="Record Origin" />
        <dl className="mt-3 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
          <DataPoint label="Source" value="Imported Historical Record" />
          <DataPoint label="Import Reference" value={record.importId} />
          <DataPoint
            label="Original File Name"
            value={batch?.originalFilename ?? "Recorded filename unavailable"}
          />
          <DataPoint
            label="Source Row Number"
            value={String(record.originalSourceRow)}
          />
          <DataPoint
            label="Import Date"
            value={
              batch
                ? importedDate.format(new Date(batch.importedAt))
                : "Unavailable"
            }
          />
        </dl>
      </section>
      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
        <Button type="button" onClick={onRelated}>
          View Related Import
        </Button>
      </div>
    </Modal>
  )
}

export function HistoricalImport({
  batches,
  setBatches,
  records,
  setRecords,
  user,
  initialTab,
  initialBatchId,
}: {
  batches: HistoricalImportBatch[]
  setBatches: Dispatch<SetStateAction<HistoricalImportBatch[]>>
  records: HistoricalPayrollRecord[]
  setRecords: Dispatch<SetStateAction<HistoricalPayrollRecord[]>>
  user: string
  initialTab?: ImportTab
  initialBatchId?: string | null
}) {
  const [tab, setTab] = useState<ImportTab>(initialTab ?? "import")
  const [step, setStep] = useState<ImportStep>(1)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [fileMessage, setFileMessage] = useState("")
  const [validating, setValidating] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [successBatchId, setSuccessBatchId] = useState<string | null>(null)
  const [guidelines, setGuidelines] = useState(false)
  const [previewPage, setPreviewPage] = useState(1)
  const [replaceConfirm, setReplaceConfirm] = useState(false)
  const [batchSearch, setBatchSearch] = useState("")
  const [batchDate, setBatchDate] = useState("")
  const [batchPeriod, setBatchPeriod] = useState("")
  const [batchType, setBatchType] = useState("")
  const [recordSearch, setRecordSearch] = useState("")
  const [recordPeriod, setRecordPeriod] = useState("")
  const [recordType, setRecordType] = useState("")
  const [recordFund, setRecordFund] = useState("")
  const [recordBatch, setRecordBatch] = useState("")
  const [detailBatchId, setDetailBatchId] = useState<string | null>(
    initialBatchId ?? null,
  )
  const [detailRecordId, setDetailRecordId] = useState<string | null>(null)

  const errors =
    validation?.issues.filter((item) => item.severity === "error") ?? []
  const warnings =
    validation?.issues.filter((item) => item.severity === "warning") ?? []
  const validRows =
    validation?.rows.filter(
      (row) => !row.issues.some((item) => item.severity === "error"),
    ) ?? []
  const canConfirm =
    Boolean(validation?.rows.length) &&
    errors.length === 0 &&
    validation?.missingHeaders.length === 0
  const totals = validRows.reduce(
    (sum, row) => ({
      gross: sum.gross + (row.grossPay ?? 0),
      deductions: sum.deductions + (row.totalDeductions ?? 0),
      net: sum.net + (row.netPay ?? 0),
    }),
    { gross: 0, deductions: 0, net: 0 },
  )
  const periods = [
    ...new Set(
      records.map((record) =>
        historicalPeriodLabel(
          record.payrollPeriodStart,
          record.payrollPeriodEnd,
        ),
      ),
    ),
  ]
  const payrollTypes = [...new Set(records.map((record) => record.payrollType))]
  const filteredBatches = batches.filter((batch) => {
    const search = batchSearch.trim().toLowerCase()
    return (
      (!search ||
        [batch.importId, batch.originalFilename].some((value) =>
          value.toLowerCase().includes(search),
        )) &&
      (!batchDate || batch.importedAt.slice(0, 10) === batchDate) &&
      (!batchPeriod || batch.payrollPeriodCoverage.includes(batchPeriod)) &&
      (!batchType || batch.payrollTypes.includes(batchType))
    )
  })
  const filteredRecords = records
    .filter((record) => {
      const search = recordSearch.trim().toLowerCase()
      const period = historicalPeriodLabel(
        record.payrollPeriodStart,
        record.payrollPeriodEnd,
      )
      return (
        (!search ||
          [record.employeeId, record.employeeName].some((value) =>
            value.toLowerCase().includes(search),
          )) &&
        (!recordPeriod || period === recordPeriod) &&
        (!recordType || record.payrollType === recordType) &&
        (!recordFund || record.fundSource === recordFund) &&
        (!recordBatch || record.importId === recordBatch)
      )
    })
    .sort((a, b) => b.payrollPeriodEnd.localeCompare(a.payrollPeriodEnd))
  const detailBatch = batches.find((batch) => batch.importId === detailBatchId)
  const detailBatchRecords = records.filter(
    (record) => record.importId === detailBatchId,
  )
  const detailRecord = records.find(
    (record) => record.historicalRecordId === detailRecordId,
  )
  const detailRecordBatch = batches.find(
    (batch) => batch.importId === detailRecord?.importId,
  )

  const switchTab = (next: ImportTab) => {
    setTab(next)
    setDetailBatchId(null)
    setFileMessage("")
  }
  const resetWorkflow = () => {
    setStep(1)
    setSelectedFile(null)
    setValidation(null)
    setFileMessage("")
    setSuccessBatchId(null)
    setPreviewPage(1)
  }
  const acceptFile = (file?: File) => {
    if (!file) return
    setSelectedFile(file)
    setValidation(null)
    setStep(1)
    setSuccessBatchId(null)
    setPreviewPage(1)
    const extension = file.name.split(".").pop()?.toLowerCase()
    if (extension === "xlsx")
      setFileMessage(
        "XLSX parsing is not supported in the current prototype because no compatible workbook parser is installed. Use CSV for a real local import.",
      )
    else if (extension !== "csv")
      setFileMessage(
        "This file format is not supported by the current import tool.",
      )
    else setFileMessage("")
  }
  const removeFile = () => {
    setSelectedFile(null)
    setValidation(null)
    setStep(1)
    setFileMessage("")
    setSuccessBatchId(null)
  }
  const validateFile = async () => {
    if (!selectedFile) {
      setFileMessage("Select a supported payroll spreadsheet to continue.")
      return
    }
    if (selectedFile.name.split(".").pop()?.toLowerCase() !== "csv") {
      setFileMessage(
        "This file format is not supported by the current import tool.",
      )
      return
    }
    setValidating(true)
    setFileMessage("")
    try {
      const source = await selectedFile.text()
      if (!source.trim())
        throw new Error("The selected file does not contain spreadsheet data.")
      const result = validateCsv(source, selectedFile.name, records)
      setValidation(result)
      setStep(2)
      setPreviewPage(1)
      if (!result.rows.length)
        setFileMessage(
          "The file does not contain at least one usable payroll data row.",
        )
      else if (result.missingHeaders.length)
        setFileMessage(
          "The file does not match the selected demonstration import template.",
        )
      else if (result.issues.some((item) => item.severity === "error"))
        setFileMessage(
          "The spreadsheet contains validation errors. Review the listed rows before importing.",
        )
    } catch {
      setValidation(null)
      setFileMessage(
        "The selected file could not be read. Please check the file and try again.",
      )
    } finally {
      setValidating(false)
    }
  }
  const confirmImport = () => {
    if (!validation || !canConfirm || !selectedFile || confirming) return
    setConfirming(true)
    if (validation.filename !== selectedFile.name) {
      setFileMessage(
        "The validated preview no longer matches the selected file. Validate the file again.",
      )
      setConfirmOpen(false)
      setConfirming(false)
      return
    }
    const duplicateBatch = batches.find(
      (batch) => batch.contentFingerprint === validation.fingerprint,
    )
    const duplicateRow = validRows.some((row) =>
      records.some((record) => recordKey(record) === recordKey(row)),
    )
    if (duplicateBatch || duplicateRow) {
      setFileMessage(
        "Matching historical payroll records already exist. Review the existing import before continuing.",
      )
      setConfirmOpen(false)
      setConfirming(false)
      return
    }
    try {
      const sequence =
        Math.max(
          1,
          ...batches
            .map((batch) => Number(batch.importId.split("-").pop()))
            .filter(Number.isFinite),
        ) + 1
      const importId = `DEMO-IMP-${new Date().getFullYear()}-${String(sequence).padStart(3, "0")}`
      const createdAt = new Date().toISOString()
      const newRecords: HistoricalPayrollRecord[] = validRows.map(
        (row, index) => ({
          historicalRecordId: `${importId}-ROW-${String(index + 1).padStart(3, "0")}`,
          importId,
          originalPayrollReference: row.originalPayrollReference,
          originalSourceRow: row.sourceRow,
          employeeId: row.employeeId,
          employeeName: row.employeeName,
          payrollPeriodStart: row.payrollPeriodStart,
          payrollPeriodEnd: row.payrollPeriodEnd,
          payrollType: row.payrollType,
          fundSource: row.fundSource as HistoricalFund,
          payBasis: row.payBasis,
          costCenter: row.costCenter,
          basicPay: row.basicPay,
          otherEarnings: row.otherEarnings,
          grossPay: row.grossPay as number,
          totalDeductions: row.totalDeductions as number,
          netPay: row.netPay as number,
          originalNotes: row.historicalNotes,
          sourceType: "ImportedHistorical",
          readOnly: true,
        }),
      )
      const coverage = [
        ...new Set(
          newRecords.map((record) =>
            historicalPeriodLabel(
              record.payrollPeriodStart,
              record.payrollPeriodEnd,
            ),
          ),
        ),
      ]
      const batch: HistoricalImportBatch = {
        importId,
        originalFilename: selectedFile.name,
        fileType: "CSV",
        sourceSheetName: validation.sourceSheetName,
        importedBy: user,
        importedAt: createdAt,
        recordCount: newRecords.length,
        payrollPeriodCoverage: coverage,
        payrollTypes: [
          ...new Set(newRecords.map((record) => record.payrollType)),
        ],
        validatedTotalGross: totals.gross,
        validatedTotalDeductions: totals.deductions,
        validatedTotalNet: totals.net,
        validationSummary:
          warnings.length > 0
            ? `Validated with ${warnings.length} mapping review warning(s)`
            : "Validated with no row errors",
        contentFingerprint: validation.fingerprint,
        importedRecordIds: newRecords.map(
          (record) => record.historicalRecordId,
        ),
        demoFixtureFlag: false,
      }
      setRecords((current) => [...current, ...newRecords])
      setBatches((current) => [...current, batch])
      setSuccessBatchId(importId)
      setStep(3)
      setConfirmOpen(false)
      setFileMessage(
        "Historical payroll records were saved successfully as read-only records.",
      )
    } catch {
      setFileMessage(
        "The historical records could not be saved. No incomplete import batch was committed.",
      )
    } finally {
      setConfirming(false)
    }
  }
  const showBatch = (id: string) => {
    setTab("history")
    setDetailBatchId(id)
    setDetailRecordId(null)
  }

  const renderImport = () => (
    <div className="grid gap-6">
      <div className="grid gap-2 rounded-card bg-surface p-4 elevate sm:grid-cols-3">
        {[
          [1, "Upload File"],
          [2, "Validate & Preview"],
          [3, "Confirm Import"],
        ].map(([number, label]) => (
          <div
            key={number}
            className={clsx(
              "flex items-center gap-3 rounded-control p-3",
              step === number ? "bg-primary text-on-primary" : "bg-canvas",
            )}
          >
            <span
              className={clsx(
                "grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold",
                step === number
                  ? "bg-accent text-on-accent"
                  : "border border-border-strong",
              )}
            >
              {number}
            </span>
            <span className="text-sm font-semibold">
              Step {number} — {label}
            </span>
          </div>
        ))}
      </div>

      {step === 1 && (
        <section className="rounded-card bg-surface p-5 elevate sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <SectionTitle
              title="Upload Historical Payroll Spreadsheet"
              description="Select an existing payroll spreadsheet to prepare historical records for import."
            />
            <Tag kind="placeholder">Provisional Demo Template</Tag>
          </div>
          <TextField
            label="Historical payroll file"
            type="file"
            accept=".csv,.xlsx"
            data-historical-file-input
            className="sr-only"
            onChange={(event) => acceptFile(event.target.files?.[0])}
          />
          <div
            className="mt-5 rounded-card border border-dashed border-border-strong bg-canvas p-8 text-center"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event: DragEvent<HTMLDivElement>) => {
              event.preventDefault()
              if (validation) {
                setFileMessage(
                  "Use Replace File to confirm discarding the current validation preview.",
                )
                return
              }
              acceptFile(event.dataTransfer.files[0])
            }}
          >
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-info-soft text-primary">
              <Icon name="clipboard" size={25} />
            </span>
            <p className="mt-4 font-semibold">
              Drag and drop your payroll spreadsheet here, or browse files.
            </p>
            <p className="mt-2 text-sm text-text-muted">
              CSV is parsed locally. XLSX selection is accepted only to explain
              that workbook parsing is unavailable.
            </p>
            <Button type="button" onClick={openFilePicker} className="mt-5">
              Browse Files
            </Button>
          </div>

          {selectedFile ? (
            <div className="mt-5 rounded-control border border-border p-4">
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <DataPoint label="File Name" value={selectedFile.name} />
                <DataPoint
                  label="File Type"
                  value={
                    selectedFile.name.split(".").pop()?.toUpperCase() ??
                    "Unknown"
                  }
                />
                <DataPoint
                  label="File Size"
                  value={`${(selectedFile.size / 1024).toFixed(1)} KB`}
                />
                <DataPoint
                  label="Selection Status"
                  value={
                    selectedFile.name.toLowerCase().endsWith(".csv")
                      ? "Ready for CSV validation"
                      : "Unsupported for parsing"
                  }
                />
              </dl>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    validation ? setReplaceConfirm(true) : openFilePicker()
                  }
                >
                  Change File
                </Button>
                <Button type="button" variant="secondary" onClick={removeFile}>
                  Remove File
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-text-muted">
              Select a supported payroll spreadsheet to continue.
            </p>
          )}

          {fileMessage && (
            <div className="mt-4">
              <Alert tone="warning" title="File status">
                {fileMessage}
              </Alert>
            </div>
          )}

          <div className="mt-6 rounded-control bg-info-soft p-4">
            <p className="font-semibold">
              Provisional Demo Historical Payroll Template
            </p>
            <p className="mt-1 text-sm text-text-muted">
              Use the provisional demo template to test Historical Import. The
              official payroll import template will be configured when
              confirmed.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  downloadCsv("PROVISIONAL_DEMO_Historical_Payroll.csv", [
                    templateHeaders,
                    [
                      "DEMO-HIST-201",
                      "Fictional Sample Employee",
                      "2025-08-01",
                      "2025-08-31",
                      "Permanent Staff",
                      "F01",
                      "Monthly",
                      "10000.00",
                      "500.00",
                      "9500.00",
                      "FICTIONAL-AUG-2025",
                      "Fictional Cost Center",
                      "",
                      "",
                      "Provisional fictional test row only",
                    ],
                  ])
                }
              >
                Download Demo Template
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  downloadCsv("DEMO_Invalid_Historical_Payroll.csv", [
                    templateHeaders,
                    [
                      "",
                      "Missing ID Example",
                      "2025-13-01",
                      "2025-09-30",
                      "Permanent Staff",
                      "F01",
                      "Monthly",
                      "not-a-number",
                      "500.00",
                      "9900.00",
                      "INVALID-TEST-01",
                      "",
                      "",
                      "",
                      "Fictional invalid validation scenario",
                    ],
                    [
                      "DEMO-HIST-101",
                      "Alex Santos",
                      "2025-09-01",
                      "2025-09-30",
                      "Permanent Staff",
                      "F01",
                      "Monthly",
                      "18500.00",
                      "1500.00",
                      "17000.00",
                      "FICTIONAL-SEPT-2025-01",
                      "",
                      "",
                      "",
                      "Potential duplicate of seeded fixture",
                    ],
                    [
                      "DEMO-INVALID-103",
                      "Mismatch Example",
                      "2025-09-01",
                      "2025-09-30",
                      "Job Order Staff",
                      "F07",
                      "Daily",
                      "10000.00",
                      "500.00",
                      "9900.00",
                      "INVALID-TEST-03",
                      "",
                      "",
                      "",
                      "Fictional gross and net mismatch scenario",
                    ],
                  ])
                }
              >
                Download Invalid Test CSV
              </Button>
              <Button
                type="button"
                variant="link"
                aria-expanded={guidelines}
                onClick={() => setGuidelines((open) => !open)}
              >
                View Template Guidelines
              </Button>
            </div>
            {guidelines && (
              <div className="mt-4 grid gap-4 border-t border-border pt-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="font-semibold">
                    Recognized demonstration columns
                  </p>
                  <p className="mt-1 break-words text-text-muted">
                    Required: {requiredHeaders.join(", ")}.
                  </p>
                  <p className="mt-1 break-words text-text-muted">
                    Optional: {optionalHeaders.join(", ")}.
                  </p>
                </div>
                <div>
                  <p className="font-semibold">Supported demo formats</p>
                  <p className="mt-1 text-text-muted">
                    Dates use YYYY-MM-DD and are never month/day swapped.
                    Monetary values may use two decimals and standard thousands
                    separators. Gross pay is the source gross amount; total
                    deductions are source deductions; net pay must equal gross
                    less deductions within ₱0.01 display precision.
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="font-semibold">Fictional example row</p>
                  <p className="mt-1 break-words text-text-muted">
                    DEMO-HIST-201, Fictional Sample Employee, 2025-08-01,
                    2025-08-31, Permanent Staff, F01, Monthly, 10000.00, 500.00,
                    9500.00.
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="mt-6 flex justify-end">
            <Button
              type="button"
              disabled={
                !selectedFile ||
                !selectedFile.name.toLowerCase().endsWith(".csv") ||
                validating
              }
              onClick={validateFile}
            >
              {validating ? "Validating File..." : "Validate File"}
            </Button>
          </div>
        </section>
      )}

      {step === 2 && validation && (
        <div className="grid gap-6">
          <section className="rounded-card bg-surface p-5 elevate sm:p-6">
            <SectionTitle
              title="Validation & Preview"
              description="Review the parsed payroll information and resolve errors before importing."
            />
            <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2 lg:grid-cols-4">
              <DataPoint label="Selected File" value={validation.filename} />
              <DataPoint
                label="Worksheet Name"
                value={validation.sourceSheetName}
              />
              <DataPoint
                label="Total Data Rows"
                value={String(validation.rows.length)}
              />
              <DataPoint label="Valid Rows" value={String(validRows.length)} />
              <DataPoint
                label="Rows with Errors"
                value={String(
                  validation.rows.filter((row) =>
                    row.issues.some((item) => item.severity === "error"),
                  ).length,
                )}
              />
              <DataPoint
                label="Potential Duplicate Records"
                value={String(
                  validation.issues.filter((item) => item.duplicate).length,
                )}
              />
              <DataPoint
                label="Validation Result"
                value={
                  errors.length
                    ? "Has Errors"
                    : warnings.length
                      ? "Requires Review"
                      : "Valid"
                }
              />
            </dl>
            {fileMessage && (
              <div className="mt-4">
                <Alert
                  tone={errors.length ? "danger" : "warning"}
                  title="Validation result"
                >
                  {fileMessage}
                </Alert>
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-card bg-surface elevate">
            <div className="border-b border-border p-5">
              <SectionTitle
                title="Parsed Payroll Preview"
                description="Original source values remain visible when validation fails; no amount is silently corrected."
              />
            </div>
            <PreviewTable
              rows={validation.rows}
              page={previewPage}
              onPage={setPreviewPage}
            />
          </section>

          <section className="rounded-card bg-surface p-5 elevate sm:p-6">
            <SectionTitle
              title="Validation Issues"
              description="Every error must be corrected in the source file before this batch can be imported."
            />
            {validation.issues.length ? (
              <ul className="mt-5 divide-y divide-border rounded-control border border-border">
                {validation.issues.map((item, index) => (
                  <li
                    key={`${item.row}-${item.column}-${index}`}
                    className="grid gap-3 p-4 text-sm sm:grid-cols-4"
                  >
                    <DataPoint label="Source Row" value={String(item.row)} />
                    <DataPoint label="Affected Column" value={item.column} />
                    <DataPoint label="Error Description" value={item.message} />
                    <DataPoint label="Required Action" value={item.action} />
                  </li>
                ))}
              </ul>
            ) : (
              <Alert tone="success" title="Validation passed">
                All parsed rows passed the provisional demonstration validation
                checks.
              </Alert>
            )}
          </section>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep(1)}
            >
              Back to Upload
            </Button>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setReplaceConfirm(true)}
              >
                Replace File
              </Button>
              <Button
                type="button"
                disabled={!canConfirm}
                onClick={() => setConfirmOpen(true)}
              >
                Confirm Import
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && successBatchId && (
        <section className="rounded-card bg-surface p-6 elevate">
          <span className="grid size-14 place-items-center rounded-full bg-success-soft text-success">
            <Icon name="check" size={26} />
          </span>
          <p
            role="heading"
            aria-level={2}
            className="mt-5 text-xl font-semibold"
          >
            Historical Records Imported
          </p>
          <p className="mt-2 text-sm text-text-muted">
            The validated historical payroll records were saved in this
            demonstration as read-only records.
          </p>
          <div className="mt-5">
            <Alert tone="success" title="Import completed">
              Historical payroll records were saved successfully as read-only
              records.
            </Alert>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button type="button" onClick={() => showBatch(successBatchId)}>
              View Import Details
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => switchTab("records")}
            >
              View Historical Records
            </Button>
            <Button type="button" variant="secondary" onClick={resetWorkflow}>
              Import Another File
            </Button>
          </div>
        </section>
      )}
    </div>
  )

  const renderBatchDetail = () => {
    if (!detailBatch) return null
    return (
      <section className="overflow-hidden rounded-card bg-surface elevate">
        <div className="border-b border-border p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <SectionTitle
              title="Import Details"
              description="Recorded metadata and read-only records for this local demonstration import."
            />
            {detailBatch.demoFixtureFlag && (
              <Tag kind="placeholder">Fictional Historical Payroll Sample</Tag>
            )}
          </div>
        </div>
        <div className="grid gap-6 p-5">
          <section>
            <SectionTitle title="Import Information" />
            <dl className="mt-3 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2 lg:grid-cols-4">
              <DataPoint
                label="Import Reference"
                value={detailBatch.importId}
              />
              <DataPoint
                label="Source File Name"
                value={detailBatch.originalFilename}
              />
              <DataPoint
                label="Source File Type"
                value={detailBatch.fileType}
              />
              <DataPoint
                label="Date Imported"
                value={importedDate.format(new Date(detailBatch.importedAt))}
              />
              <DataPoint label="Imported By" value={detailBatch.importedBy} />
              <DataPoint
                label="Imported Record Count"
                value={String(detailBatch.recordCount)}
              />
              <DataPoint
                label="Payroll Periods Covered"
                value={detailBatch.payrollPeriodCoverage.join(", ")}
              />
            </dl>
          </section>
          <section>
            <SectionTitle title="Financial Summary" />
            <dl className="mt-3 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-3">
              <DataPoint
                label="Total Gross Pay"
                value={peso.format(detailBatch.validatedTotalGross)}
              />
              <DataPoint
                label="Total Deductions"
                value={peso.format(detailBatch.validatedTotalDeductions)}
              />
              <DataPoint
                label="Total Net Pay"
                value={peso.format(detailBatch.validatedTotalNet)}
              />
            </dl>
          </section>
          <section>
            <SectionTitle title="Included Historical Records" />
            <ul className="mt-3 divide-y divide-border rounded-control border border-border">
              {detailBatchRecords.map((record) => (
                <li
                  key={record.historicalRecordId}
                  className="grid gap-3 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4"
                >
                  <DataPoint
                    label="Employee"
                    value={`${record.employeeName} (${record.employeeId})`}
                  />
                  <DataPoint
                    label="Period / Type"
                    value={`${historicalPeriodLabel(record.payrollPeriodStart, record.payrollPeriodEnd)} · ${record.payrollType}`}
                  />
                  <DataPoint
                    label="Fund / Financial Summary"
                    value={`${record.fundSource} · Gross ${peso.format(record.grossPay)} · Deductions ${peso.format(record.totalDeductions)} · Net ${peso.format(record.netPay)}`}
                  />
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => setDetailRecordId(record.historicalRecordId)}
                  >
                    View Record
                  </Button>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <SectionTitle title="Provenance" />
            <Alert tone="info" title="Recorded metadata only">
              The filename, source row, original payroll reference, and import
              identifier are retained. The original physical file is not stored
              as a downloadable binary attachment in this frontend prototype.
            </Alert>
          </section>
          <div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDetailBatchId(null)}
            >
              Back to Import History
            </Button>
          </div>
        </div>
      </section>
    )
  }

  const renderHistory = () =>
    detailBatch ? (
      renderBatchDetail()
    ) : (
      <section className="overflow-hidden rounded-card bg-surface elevate">
        <div className="border-b border-border p-5">
          <SectionTitle
            title="Import History"
            description="View previously imported payroll spreadsheets and their recorded import results."
          />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <TextField
              label="Search"
              icon="search"
              placeholder="Search by file name or import reference..."
              value={batchSearch}
              onChange={(event) => setBatchSearch(event.target.value)}
            />
            <TextField
              label="Import Date"
              type="date"
              value={batchDate}
              onChange={(event) => setBatchDate(event.target.value)}
            />
            <SelectField
              label="Payroll Period"
              placeholder="All historical periods"
              value={batchPeriod}
              onChange={(event) => setBatchPeriod(event.target.value)}
            >
              {periods.map((period) => (
                <option key={period} value={period}>
                  {period}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Payroll Type"
              placeholder="All historical types"
              value={batchType}
              onChange={(event) => setBatchType(event.target.value)}
            >
              {payrollTypes.map((payrollType) => (
                <option key={payrollType} value={payrollType}>
                  {payrollType}
                </option>
              ))}
            </SelectField>
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setBatchSearch("")
                setBatchDate("")
                setBatchPeriod("")
                setBatchType("")
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>
        {filteredBatches.length ? (
          <ul className="divide-y divide-border">
            {filteredBatches.map((batch) => (
              <li
                key={batch.importId}
                className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4"
              >
                <DataPoint
                  label="Import Reference"
                  value={
                    <span>
                      {batch.importId}
                      {batch.demoFixtureFlag && (
                        <span className="mt-1 block">
                          <Tag kind="placeholder">Fictional Sample</Tag>
                        </span>
                      )}
                    </span>
                  }
                />
                <DataPoint
                  label="Source File / Date Imported"
                  value={`${batch.originalFilename} · ${importedDate.format(new Date(batch.importedAt))}`}
                />
                <DataPoint
                  label="Imported By / Records"
                  value={`${batch.importedBy} · ${batch.recordCount} records`}
                />
                <div>
                  <DataPoint
                    label="Period Coverage / Result"
                    value={`${batch.payrollPeriodCoverage.join(", ")} · ${batch.validationSummary}`}
                  />
                  <Button
                    type="button"
                    variant="link"
                    className="mt-2"
                    onClick={() => setDetailBatchId(batch.importId)}
                  >
                    View Details
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : batches.length ? (
          <div className="p-8 text-center">
            <p className="font-semibold">
              No import batches match your search or filters.
            </p>
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="font-semibold">
              No historical payroll files have been imported yet.
            </p>
            <Button
              type="button"
              className="mt-4"
              onClick={() => switchTab("import")}
            >
              Import Payroll
            </Button>
          </div>
        )}
      </section>
    )

  const renderRecords = () => (
    <section className="overflow-hidden rounded-card bg-surface elevate">
      <div className="border-b border-border p-5">
        <SectionTitle
          title="Historical Payroll Records"
          description="Search and view imported payroll information from previous periods."
        />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <TextField
            label="Search Employee"
            icon="search"
            placeholder="Search employee name or employee ID..."
            value={recordSearch}
            onChange={(event) => setRecordSearch(event.target.value)}
          />
          <SelectField
            label="Payroll Period"
            placeholder="All historical periods"
            value={recordPeriod}
            onChange={(event) => setRecordPeriod(event.target.value)}
          >
            {periods.map((period) => (
              <option key={period} value={period}>
                {period}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Payroll Type"
            placeholder="All historical types"
            value={recordType}
            onChange={(event) => setRecordType(event.target.value)}
          >
            {payrollTypes.map((payrollType) => (
              <option key={payrollType} value={payrollType}>
                {payrollType}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Fund Source"
            placeholder="All funds"
            value={recordFund}
            onChange={(event) => setRecordFund(event.target.value)}
          >
            <option value="F01">F01</option>
            <option value="F05">F05</option>
            <option value="F07">F07</option>
          </SelectField>
          <SelectField
            label="Import Batch"
            placeholder="All import batches"
            value={recordBatch}
            onChange={(event) => setRecordBatch(event.target.value)}
          >
            {batches.map((batch) => (
              <option key={batch.importId} value={batch.importId}>
                {batch.importId}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setRecordSearch("")
              setRecordPeriod("")
              setRecordType("")
              setRecordFund("")
              setRecordBatch("")
            }}
          >
            Clear Filters
          </Button>
        </div>
      </div>
      {filteredRecords.length ? (
        <ul className="divide-y divide-border">
          {filteredRecords.map((record) => (
            <li
              key={record.historicalRecordId}
              className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-5"
            >
              <DataPoint
                label="Employee"
                value={`${record.employeeName} (${record.employeeId})`}
              />
              <DataPoint
                label="Payroll Period / Type"
                value={`${historicalPeriodLabel(record.payrollPeriodStart, record.payrollPeriodEnd)} · ${record.payrollType}`}
              />
              <DataPoint
                label="Fund / Gross Pay"
                value={`${record.fundSource} · ${peso.format(record.grossPay)}`}
              />
              <DataPoint
                label="Deductions / Net Pay"
                value={`${peso.format(record.totalDeductions)} · ${peso.format(record.netPay)}`}
              />
              <div>
                <DataPoint label="Source Import" value={record.importId} />
                <Button
                  type="button"
                  variant="link"
                  className="mt-2"
                  onClick={() => setDetailRecordId(record.historicalRecordId)}
                >
                  View Record
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : records.length ? (
        <div className="p-8 text-center">
          <p className="font-semibold">
            No historical records match your search or filters.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-4"
            onClick={() => {
              setRecordSearch("")
              setRecordPeriod("")
              setRecordType("")
              setRecordFund("")
              setRecordBatch("")
            }}
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <p className="p-8 text-center font-semibold">
          No historical payroll records are available.
        </p>
      )}
    </section>
  )

  return (
    <>
      <div className="grid gap-6">
        <div>
          <p
            id="page-title"
            role="heading"
            aria-level={1}
            tabIndex={-1}
            className="text-2xl font-semibold sm:text-3xl"
          >
            Historical Import
          </p>
          <p className="mt-2 text-sm text-text-muted">
            Import and review previous payroll records from existing
            spreadsheets.
          </p>
          <div className="mt-3">
            <Tag kind="placeholder">
              Historical Records — Read Only After Import
            </Tag>
          </div>
        </div>
        <Alert tone="info" title="Historical reference only">
          Imported payroll records are retained for historical reference only.
          They do not create new payroll drafts, approvals, or payment
          transactions.
        </Alert>
        <div
          role="tablist"
          aria-label="Historical import sections"
          className="grid gap-1 rounded-control bg-surface p-1 elevate sm:grid-cols-3"
        >
          {([
            ["import", "Import Payroll"],
            ["history", "Import History"],
            ["records", "Historical Records"],
          ] as const).map(([id, label]) => (
            <Button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              variant={tab === id ? "primary" : "secondary"}
              onClick={() => switchTab(id)}
              className={clsx(
                "h-11 border-0 shadow-none",
                tab !== id && "bg-transparent text-text-muted",
              )}
            >
              {label}
            </Button>
          ))}
        </div>
        {tab === "import"
          ? renderImport()
          : tab === "history"
            ? renderHistory()
            : renderRecords()}
        <Alert tone="warning" title="Prototype storage and security">
          Imported data is stored only in shared frontend session state. It is
          not uploaded to a production database. Production authorization,
          encryption, retention, backups, and authorized correction procedures
          remain unimplemented.
        </Alert>
      </div>

      {confirmOpen && validation && selectedFile && (
        <Modal
          title="Confirm Historical Payroll Import"
          onClose={() => setConfirmOpen(false)}
          wide
        >
          <p className="text-sm text-text-muted">
            You are about to save these payroll records as read-only historical
            information.
          </p>
          <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
            <DataPoint label="File Name" value={selectedFile.name} />
            <DataPoint
              label="Valid Employee Records"
              value={String(validRows.length)}
            />
            <DataPoint
              label="Distinct Employees"
              value={String(
                new Set(validRows.map((row) => row.employeeId)).size,
              )}
            />
            <DataPoint
              label="Payroll Periods Covered"
              value={[
                ...new Set(
                  validRows.map((row) =>
                    historicalPeriodLabel(
                      row.payrollPeriodStart,
                      row.payrollPeriodEnd,
                    ),
                  ),
                ),
              ].join(", ")}
            />
            <DataPoint
              label="Available Payroll Types"
              value={[...new Set(validRows.map((row) => row.payrollType))].join(
                ", ",
              )}
            />
            <DataPoint
              label="Total Gross Pay"
              value={peso.format(totals.gross)}
            />
            <DataPoint
              label="Total Deductions"
              value={peso.format(totals.deductions)}
            />
            <DataPoint label="Total Net Pay" value={peso.format(totals.net)} />
          </dl>
          <div className="mt-5">
            <Alert tone="warning" title="Important">
              After confirmation, the imported records will be stored as
              historical references. They will not create active payroll drafts,
              trigger approvals, release payments, or change employee salary
              records. Imported records are read-only. Corrections to historical
              imports require a separately authorized procedure, which has not
              yet been specified.
            </Alert>
          </div>
          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={confirming} onClick={confirmImport}>
              {confirming ? "Saving Historical Records..." : "Confirm Import"}
            </Button>
          </div>
        </Modal>
      )}

      {replaceConfirm && (
        <Modal
          title="Replace Selected File?"
          onClose={() => setReplaceConfirm(false)}
        >
          <p className="text-sm text-text-muted">
            Replacing the file will discard the current unsaved validation
            preview. Previously imported historical records will not be
            affected.
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setReplaceConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                setReplaceConfirm(false)
                setValidation(null)
                setStep(1)
                openFilePicker()
              }}
            >
              Replace File
            </Button>
          </div>
        </Modal>
      )}

      {detailRecord && (
        <HistoricalRecordModal
          record={detailRecord}
          batch={detailRecordBatch}
          onClose={() => setDetailRecordId(null)}
          onRelated={() => showBatch(detailRecord.importId)}
        />
      )}
    </>
  )
}
