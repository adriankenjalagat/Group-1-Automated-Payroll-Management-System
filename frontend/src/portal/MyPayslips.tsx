import clsx from "clsx"
import { useEffect, useMemo, useState } from "react"
import { Alert, Button, Icon, TextField } from "../MsuPayroll"
import { SelectField, Tag } from "../admin/ui"
import type { EmployeeRecord } from "./newSubmission/config"
import { demoFlag } from "./demoFlags"

// ---------------------------------------------------------------------------------------------
// Reusable payslip record model. In production these records are generated from approved and
// Released payroll. All figures below are fictional and are not MSU–Naawan rates or deductions.
// ---------------------------------------------------------------------------------------------

type PayrollReleaseStatus = "Released" | "Under Review"
type LineItem = { name: string; amount: number }

export type PayslipRecord = {
  /** Payroll record identifier. */
  id: string
  employeeId: string
  payrollType: string
  period: string
  /** YYYY-MM, used only for sorting and the year filter. */
  periodKey: string
  payBasis: "Monthly" | "Daily" | "Hourly"
  releaseStatus: PayrollReleaseStatus
  releaseDate?: string
  // Itemized amounts exist only on Released records. Unreleased payroll data is never loaded.
  earnings?: LineItem[]
  grossPay?: number
  deductions?: LineItem[]
  netPay?: number
}

const TYPE = "Payroll for Permanent Staff Employees"

export const payslipRecords: PayslipRecord[] = []


const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
})
const dateFormat = new Intl.DateTimeFormat("en-PH", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
})
const formatDate = (value?: string) =>
  value ? dateFormat.format(new Date(`${value}T00:00:00Z`)) : "Not recorded"

type DataState = "loaded" | "none" | "error"

/** Access rule: own record AND Released AND itemized data present. Production must enforce this on the backend. */
function canView(record: PayslipRecord | undefined, employee: EmployeeRecord) {
  return Boolean(
    record &&
      record.employeeId === employee.employeeId &&
      record.releaseStatus === "Released" &&
      record.earnings &&
      record.deductions &&
      record.grossPay !== undefined &&
      record.netPay !== undefined,
  )
}

function ReleasedBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success">
      <Icon name="check" size={13} strokeWidth={2.5} /> Released
    </span>
  )
}

function StateMessage({
  icon,
  title,
  detail,
  children,
}: {
  icon: "mail" | "search" | "alert"
  title: string
  detail?: string
  children?: React.ReactNode
}) {
  return (
    <div className="px-5 py-14 text-center sm:py-16">
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-info-soft text-primary">
        <Icon name={icon} size={28} />
      </span>
      <p
        role="heading"
        aria-level={3}
        className="mt-5 text-lg font-semibold leading-snug"
      >
        {title}
      </p>
      {detail && (
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-muted">
          {detail}
        </p>
      )}
      {children && <div className="mt-6 flex justify-center">{children}</div>}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-semibold leading-snug">{value}</dd>
    </div>
  )
}

function LineItems({
  title,
  items,
  totalLabel,
  total,
}: {
  title: string
  items: LineItem[]
  totalLabel: string
  total: number
}) {
  return (
    <section>
      <p role="heading" aria-level={3} className="text-sm font-semibold">
        {title}
      </p>
      <ul className="mt-3 divide-y divide-border rounded-control border border-border">
        {items.length ? (
          items.map((item) => (
            <li
              key={item.name}
              className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
            >
              <span>{item.name}</span>
              <span className="font-medium tabular-nums">
                {peso.format(item.amount)}
              </span>
            </li>
          ))
        ) : (
          <li className="px-4 py-3 text-sm text-text-muted">None recorded</li>
        )}
        <li className="flex items-center justify-between gap-4 bg-canvas px-4 py-3 text-sm font-semibold">
          <span>{totalLabel}</span>
          <span className="tabular-nums">{peso.format(total)}</span>
        </li>
      </ul>
    </section>
  )
}

function PayslipView({
  record,
  employee,
  onBack,
  onPrint,
}: {
  record: PayslipRecord
  employee: EmployeeRecord
  onBack: () => void
  onPrint: () => void
}) {
  const totalDeductions = (record.deductions ?? []).reduce(
    (sum, item) => sum + item.amount,
    0,
  )
  return (
    <div className="grid gap-6 font-sans">
      <div className="print:hidden">
        <Button
          type="button"
          variant="link"
          onClick={onBack}
          className="-ml-1 mb-3"
        >
          <Icon name="arrowLeft" size={16} /> Back to My Payslips
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p
              id="page-title"
              role="heading"
              aria-level={1}
              tabIndex={-1}
              className="text-2xl font-semibold leading-tight sm:text-3xl"
            >
              Payslip · {record.period}
            </p>
            <p className="mt-2 text-sm text-text-muted">
              Read-only. Fictional demonstration payslip.
            </p>
          </div>
          <Button type="button" onClick={onPrint} className="w-full sm:w-auto">
            <Icon name="clipboard" size={17} /> Print Payslip
          </Button>
        </div>
      </div>

      <article
        className="print-area rounded-card bg-surface p-5 elevate sm:p-8"
        aria-label={`Payslip for ${record.period}`}
      >
        <header className="flex flex-col gap-2 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-lg font-semibold">MSU–Naawan Payslip</p>
            <p className="mt-1 text-xs text-text-muted">
              Prototype layout. The official university payslip layout remains
              subject to confirmation.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <ReleasedBadge />
            <Tag kind="placeholder">Fictional demonstration data</Tag>
          </div>
        </header>

        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Employee Name" value={employee.name} />
          <Field label="Employee ID" value={record.employeeId} />
          <Field label="Payroll Type" value={record.payrollType} />
          <Field label="Payroll Period" value={record.period} />
          <Field label="Pay Basis" value={record.payBasis} />
          <Field label="Release Date" value={formatDate(record.releaseDate)} />
        </dl>

        <div className="mt-6 grid gap-6">
          <LineItems
            title="Earnings"
            items={record.earnings ?? []}
            totalLabel="Gross Pay"
            total={record.grossPay ?? 0}
          />
          <LineItems
            title="Deductions"
            items={record.deductions ?? []}
            totalLabel="Total Deductions"
            total={totalDeductions}
          />
          <div className="flex items-center justify-between gap-4 rounded-control bg-accent px-4 py-4 text-on-accent">
            <span className="text-base font-semibold">Net Pay</span>
            <span className="text-xl font-bold tabular-nums">
              {peso.format(record.netPay ?? 0)}
            </span>
          </div>
        </div>

        <p className="mt-6 border-t border-border pt-4 text-xs leading-relaxed text-text-muted">
          Amounts are fictional and are not MSU–Naawan rates. Released reflects
          the recorded payroll release only; it is not confirmation that any
          bank account has been credited.
        </p>
      </article>
    </div>
  )
}

export function MyPayslips({
  employee,
  records = payslipRecords,
}: {
  employee: EmployeeRecord | null
  records?: PayslipRecord[]
}) {
  const [query, setQuery] = useState("")
  const [payrollType, setPayrollType] = useState("")
  const [year, setYear] = useState("")
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [printRequested, setPrintRequested] = useState(false)
  const [notice, setNotice] = useState("")
  const [dataState, setDataState] = useState<DataState>("loaded")

  // Only the signed-in employee's Released payslips are ever listed.
  const available = useMemo(
    () =>
      dataState === "loaded" && employee
        ? records
            .filter(
              (record) =>
                record.employeeId === employee.employeeId &&
                canView(record, employee),
            )
            .sort((a, b) => b.periodKey.localeCompare(a.periodKey))
        : [],
    [dataState, employee, records],
  )
  const types = useMemo(
    () => [...new Set(available.map((record) => record.payrollType))],
    [available],
  )
  const years = useMemo(
    () =>
      [...new Set(available.map((record) => record.periodKey.slice(0, 4)))]
        .sort()
        .reverse(),
    [available],
  )
  const filtered = available.filter(
    (record) =>
      (!payrollType || record.payrollType === payrollType) &&
      (!year || record.periodKey.startsWith(year)) &&
      (!query.trim() ||
        record.period.toLowerCase().includes(query.trim().toLowerCase())),
  )
  const filtering = Boolean(query || payrollType || year)
  const clearFilters = () => {
    setQuery("")
    setPayrollType("")
    setYear("")
  }

  const viewing = viewingId
    ? records.find((record) => record.id === viewingId)
    : undefined

  useEffect(() => {
    if (!printRequested || !viewingId) return
    // Wait for the payslip view to render before printing. Reset the request inside the timer so the effect cleanup does not cancel it.
    const timer = setTimeout(() => {
      setPrintRequested(false)
      try {
        window.print()
        setNotice(
          "Print dialog requested for this payslip. If no dialog appeared, printing may be blocked in this preview environment.",
        )
      } catch {
        setNotice(
          "Printing is unavailable in this environment. No print job was started.",
        )
      }
    }, 80)
    return () => clearTimeout(timer)
  }, [printRequested, viewingId])

  if (!employee) {
    return (
      <div className="grid gap-7 font-sans">
        <div>
          <p
            id="page-title"
            role="heading"
            aria-level={1}
            tabIndex={-1}
            className="text-2xl font-semibold leading-tight sm:text-3xl"
          >
            My Payslips
          </p>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">
            View and print your available payroll payslips.
          </p>
        </div>
        <Alert
          tone="warning"
          title="No employee record is linked to your account"
        >
          No payslips can be shown yet. Please contact the HR Office so your
          employee record can be linked.
        </Alert>
      </div>
    )
  }

  const open = (id: string) => {
    setNotice("")
    setViewingId(id)
  }
  const print = (id: string) => {
    setViewingId(id)
    setPrintRequested(true)
  }

  if (viewingId) {
    if (!viewing || !canView(viewing, employee)) {
      return (
        <div className="grid gap-6 font-sans">
          <div>
            <Button
              type="button"
              variant="link"
              onClick={() => setViewingId(null)}
              className="-ml-1 mb-3"
            >
              <Icon name="arrowLeft" size={16} /> Back to My Payslips
            </Button>
            <p
              id="page-title"
              role="heading"
              aria-level={1}
              tabIndex={-1}
              className="text-2xl font-semibold leading-tight sm:text-3xl"
            >
              Payslip
            </p>
          </div>
          <section className="rounded-card bg-surface elevate">
            <StateMessage
              icon="alert"
              title="This payslip is not available for viewing."
              detail="The corresponding payroll has not been marked Released, or you do not have access to this record."
            >
              <Button
                type="button"
                variant="secondary"
                onClick={() => setViewingId(null)}
              >
                Back to My Payslips
              </Button>
            </StateMessage>
          </section>
        </div>
      )
    }
    return (
      <div className="grid gap-4">
        {notice && (
          <div className="print:hidden">
            <Alert tone="info" title="Print status">
              {notice}
            </Alert>
          </div>
        )}
        <PayslipView
          record={viewing}
          employee={employee}
          onBack={() => setViewingId(null)}
          onPrint={() => print(viewing.id)}
        />
      </div>
    )
  }

  return (
    <div className="grid gap-7 font-sans">
      <div>
        <p
          id="page-title"
          role="heading"
          aria-level={1}
          tabIndex={-1}
          className="text-2xl font-semibold leading-tight sm:text-3xl"
        >
          My Payslips
        </p>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          View and print your available payroll payslips.
        </p>
      </div>

      {notice && (
        <Alert tone="info" title="Print status">
          {notice}
        </Alert>
      )}

      <section
        className="overflow-hidden rounded-card bg-surface elevate"
        aria-labelledby="available-title"
      >
        <div className="border-b border-border p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p
                id="available-title"
                role="heading"
                aria-level={2}
                className="text-lg font-semibold"
              >
                Available Payslips
              </p>
              <p className="mt-1 text-sm text-text-muted">
                Payslips appear here only after the corresponding payroll is
                marked Released.
              </p>
            </div>
            <Tag kind="placeholder">Fictional demonstration data</Tag>
          </div>
          {dataState === "loaded" && available.length > 0 && (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:items-end">
              <TextField
                label="Search"
                icon="search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search payslips..."
                className="sm:col-span-2 xl:col-span-1"
              />
              <SelectField
                label="Payroll Type"
                value={payrollType}
                onChange={(event) => setPayrollType(event.target.value)}
                placeholder="All payroll types"
              >
                {types.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Year"
                value={year}
                onChange={(event) => setYear(event.target.value)}
                placeholder="All years"
              >
                {years.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </SelectField>
              <Button
                type="button"
                variant="secondary"
                onClick={clearFilters}
                disabled={!filtering}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>

        {dataState === "error" ? (
          <StateMessage
            icon="alert"
            title="Unable to load your payslips. Please try again."
          >
            <Button type="button" onClick={() => setDataState("loaded")}>
              Retry
            </Button>
          </StateMessage>
        ) : available.length === 0 ? (
          <StateMessage
            icon="mail"
            title="No payslips are available yet."
            detail="Your payslips will appear here after the corresponding payroll is marked Released."
          />
        ) : filtered.length === 0 ? (
          <StateMessage
            icon="search"
            title="No matching payslips found."
            detail="Try adjusting your search or filters."
          >
            <Button type="button" variant="secondary" onClick={clearFilters}>
              Clear Filters
            </Button>
          </StateMessage>
        ) : (
          <>
            <p role="status" className="sr-only">
              Showing {filtered.length} of {available.length} payslips.
            </p>
            <div className="hidden xl:block">
              <table className="w-full table-fixed text-left text-sm">
                <colgroup>
                  <col className="w-[16%]" />
                  <col className="w-[28%]" />
                  <col className="w-[11%]" />
                  <col className="w-[16%]" />
                  <col className="w-[11%]" />
                  <col className="w-[18%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-border bg-canvas text-xs text-text-muted">
                    {[
                      "Payroll Period",
                      "Payroll Type",
                      "Pay Basis",
                      "Release Date",
                      "Status",
                    ].map((heading) => (
                      <th
                        key={heading}
                        scope="col"
                        className="px-4 py-3 font-semibold"
                      >
                        {heading}
                      </th>
                    ))}
                    <th
                      scope="col"
                      className="px-4 py-3 text-right font-semibold"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((record) => (
                    <tr key={record.id} className="hover:bg-info-soft/30">
                      <td className="px-4 py-4 font-semibold">
                        {record.period}
                      </td>
                      <td className="px-4 py-4 leading-snug">
                        {record.payrollType}
                      </td>
                      <td className="px-4 py-4">{record.payBasis}</td>
                      <td className="px-4 py-4 text-text-muted">
                        {formatDate(record.releaseDate)}
                      </td>
                      <td className="px-4 py-4">
                        <ReleasedBadge />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-3">
                          <Button
                            type="button"
                            variant="link"
                            onClick={() => open(record.id)}
                            aria-label={`View Payslip for ${record.period}`}
                          >
                            View
                          </Button>
                          <Button
                            type="button"
                            variant="link"
                            onClick={() => print(record.id)}
                            aria-label={`Print Payslip for ${record.period}`}
                          >
                            Print
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-border xl:hidden">
              {filtered.map((record) => (
                <li key={record.id} className="p-5 sm:px-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="text-sm font-semibold">{record.period}</p>
                    <ReleasedBadge />
                  </div>
                  <p className="mt-2 text-sm">{record.payrollType}</p>
                  <p className="mt-1 text-xs text-text-muted">
                    {record.payBasis} · Released{" "}
                    {formatDate(record.releaseDate)}
                  </p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => open(record.id)}
                      className="w-full"
                    >
                      View Payslip
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => print(record.id)}
                      className="w-full"
                    >
                      Print Payslip
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <Alert
        tone="info"
        title="Payslips follow payroll release, not submission status"
      >
        A Transmitted submission does not mean salary has been released.
        Payslips are published only after the Cashier records the payroll as
        Released, and Released does not confirm that a bank account has been
        credited. You can only see your own payslips.
      </Alert>

      {demoFlag("payslip-states") && (
        <div className="flex flex-col gap-3 rounded-control border border-dashed border-border-strong p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-text-muted">
            <span className="font-semibold text-text">Prototype only.</span>{" "}
            Preview payslip states. These controls do not change any payroll
            record.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="grid grid-cols-3 gap-1 rounded-control bg-canvas p-1"
              role="group"
              aria-label="Preview payslip data state"
            >
              {([
                ["loaded", "Payslips"],
                ["none", "None released"],
                ["error", "Load error"],
              ] as const).map(([id, label]) => (
                <Button
                  key={id}
                  type="button"
                  variant="secondary"
                  aria-pressed={dataState === id}
                  onClick={() => {
                    setDataState(id)
                    clearFilters()
                  }}
                  className={clsx(
                    "h-10 border-0 px-3 shadow-none",
                    dataState === id
                      ? "bg-surface font-semibold elevate"
                      : "bg-transparent text-text-muted",
                  )}
                >
                  {label}
                </Button>
              ))}
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => open("DEMO-PAYROLL-2026-09")}
              className="h-10"
            >
              Try opening an unreleased payroll
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
