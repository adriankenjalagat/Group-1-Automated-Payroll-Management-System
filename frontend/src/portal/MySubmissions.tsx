import clsx from "clsx"
import { useEffect, useMemo, useRef, useState } from "react"
import { Alert, Button, Icon, TextField, type IconName } from "../MsuPayroll"
import { Modal, SelectField, Tag } from "../admin/ui"
import { NewSubmissionForm } from "./newSubmission/NewSubmissionForm"
import { DEMO_TODAY } from "./newSubmission/config"
import { toEmployeeRecord } from "./newSubmission/employeeAdapter"
import type { HrEmployee } from "./hr/hrData"
import { demoFlag } from "./demoFlags"

const STATUSES = [
  "Submitted",
  "Incomplete",
  "Late",
  "Returned",
  "Validated",
  "Verified",
  "Transmitted",
] as const
export type Status = typeof STATUSES[number]

export type DocumentVersion = {
  version: number
  submittedOn: string
  files: string[]
}

export type Submission = {
  id: string
  /** Owner. Employees only ever see their own submissions. */
  employeeId: string
  payrollType: string
  period: string
  submittedOn: string // ISO date, used for newest-first ordering
  status: Status
  remark?: string
  /** Who returned the submission and when, when recorded. */
  returnInfo?: {
    by: string
    at: string
    remarks: string
    affected?: string
  }
  /** Every document version ever submitted. Earlier versions are never removed. */
  versions?: DocumentVersion[]
  /** Dates the employee resubmitted after a return. */
  resubmittedOn?: string[]
  /** True for records created through the prototype New Submission form. */
  prototype?: boolean
}

// Clearly fictional prototype records for the signed-in demo employee. Not MSU–Naawan data.
// Permanent staff attendance for a period is submitted in the following month, so each record is dated
// after its period ends. This is not a universal schedule for every payroll type.
export const initialSubmissions: Submission[] = [
  {
    id: "DEMO-SUP-SUB-003",
    employeeId: "EMP-005",
    payrollType: "Payroll for Permanent Staff Employees",
    period: "December 2026",
    submittedOn: "2027-01-06",
    status: "Submitted",
    remark:
      "Please review the attached fictional logbook reference for the missing time entry.",
    versions: [
      {
        version: 1,
        submittedOn: "2027-01-04",
        files: ["DEMO_Maria_DTR_Dec2026_v1.pdf"],
      },
      {
        version: 2,
        submittedOn: "2027-01-06",
        files: ["DEMO_Maria_DTR_Dec2026.pdf"],
      },
    ],
  },
  {
    id: "DEMO-SUB-0005",
    employeeId: "EMP-005",
    payrollType: "Payroll for Permanent Staff Employees",
    period: "October 2026",
    submittedOn: "2026-11-03",
    status: "Returned",
    remark:
      "Sample remark: the reviewer asked for a correction before the submission can continue.",
    returnInfo: {
      by: "Immediate Supervisor",
      at: "2026-11-05T10:20:00+08:00",
      remarks:
        "Sample remark: the reviewer asked for a correction before the submission can continue.",
    },
    versions: [
      {
        version: 1,
        submittedOn: "2026-11-03",
        files: ["DEMO_DTR_Oct2026_v1.pdf"],
      },
    ],
  },
  {
    id: "DEMO-SUB-0004",
    employeeId: "EMP-005",
    payrollType: "Payroll for Permanent Staff Employees",
    period: "September 2026",
    submittedOn: "2026-10-05",
    status: "Submitted",
  },
  {
    id: "DEMO-SUB-0003",
    employeeId: "EMP-005",
    payrollType: "Payroll for Permanent Staff Employees",
    period: "August 2026",
    submittedOn: "2026-09-02",
    status: "Verified",
  },
  {
    id: "DEMO-SUB-0002",
    employeeId: "EMP-005",
    payrollType: "Payroll for Permanent Staff Employees",
    period: "July 2026",
    submittedOn: "2026-08-03",
    status: "Verified",
  },
  {
    id: "DEMO-SUB-0001",
    employeeId: "EMP-005",
    payrollType: "Payroll for Permanent Staff Employees",
    period: "June 2026",
    submittedOn: "2026-07-02",
    status: "Verified",
  },
]

// Icon + label per status so meaning never depends on color alone.
const statusStyle: Record<Status, {
  icon: IconName
  tone: string
  note: string
}> = {
  Submitted: {
    icon: "clipboard",
    tone: "bg-info-soft text-primary",
    note: "Informational",
  },
  Incomplete: {
    icon: "alert",
    tone: "bg-warning-soft text-warning",
    note: "Needs attention",
  },
  Late: {
    icon: "clock",
    tone: "bg-warning-soft text-warning",
    note: "Late submission",
  },
  Returned: {
    icon: "arrowLeft",
    tone: "bg-danger-soft text-danger",
    note: "Correction required",
  },
  Validated: {
    icon: "check",
    tone: "bg-success-soft text-success",
    note: "Supervisor validation recorded",
  },
  Verified: {
    icon: "shield",
    tone: "bg-success-soft text-success",
    note: "HR verification recorded",
  },
  Transmitted: {
    icon: "arrowRight",
    tone: "bg-primary/10 text-primary",
    note: "Forwarded to Accounting",
  },
}

const dateFormat = new Intl.DateTimeFormat("en-PH", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
})
const formatDate = (iso: string) =>
  dateFormat.format(new Date(`${iso}T00:00:00Z`))

export function StatusBadge({ status }: { status: Status }) {
  const s = statusStyle[status]
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold leading-none",
        s.tone,
      )}
    >
      <Icon name={s.icon} size={13} strokeWidth={2.2} />
      {status}
    </span>
  )
}

type DataState = "data" | "empty" | "error"

function StateMessage({
  icon,
  title,
  detail,
  children,
}: {
  icon: IconName
  title: string
  detail: string
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
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-muted">
        {detail}
      </p>
      {children && <div className="mt-6 flex justify-center">{children}</div>}
    </div>
  )
}

export function MySubmissions({
  submissions,
  onAddSubmission,
  onResubmit,
  employee,
  onViewStatus,
  initialDetailId,
  initialResubmitId,
  onDetailOpened,
  /** HR-linked record of the signed-in employee, or null when HR has not linked one. */
  /** Corrects and resubmits an existing returned submission in place. */
  /** Opens the Correct & Resubmit form for this returned submission (used by the Dashboard). */
}: {
  submissions: Submission[]
  employee: HrEmployee | null
  onAddSubmission: (submission: Submission) => void
  onResubmit: (id: string, files: string[]) => void
  onViewStatus?: (id: string) => void
  initialDetailId?: string | null
  initialResubmitId?: string | null
  onDetailOpened?: () => void
}) {
  const [resubmitId, setResubmitId] = useState<string | null>(() =>
    submissions.some(
      (item) =>
        item.id === initialResubmitId &&
        item.status === "Returned" &&
        item.employeeId === employee?.employeeId,
    )
      ? (initialResubmitId ?? null)
      : null,
  )
  const [view, setView] = useState<"list" | "new">(resubmitId ? "new" : "list")
  const previewStates = demoFlag("states")
  const [dataState, setDataState] = useState<DataState>("data")
  const [retrying, setRetrying] = useState(false)
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("")
  const [period, setPeriod] = useState("")
  const [selected, setSelected] = useState<Submission | null>(
    () => submissions.find((item) => item.id === initialDetailId) ?? null,
  )
  const firstView = useRef(true)

  useEffect(() => {
    onDetailOpened?.()
  }, [])

  useEffect(() => {
    if (firstView.current) {
      firstView.current = false
      return
    }
    document.getElementById("page-title")?.focus()
  }, [view])

  useEffect(() => {
    if (!retrying) return
    const t = setTimeout(() => {
      setRetrying(false)
      setDataState("data")
    }, 700)
    return () => clearTimeout(t)
  }, [retrying])

  // Employees only ever see their own submissions.
  const mine = useMemo(
    () =>
      submissions.filter((item) => item.employeeId === employee?.employeeId),
    [submissions, employee],
  )

  const records = useMemo(
    () =>
      dataState === "data"
        ? [...mine].sort(
            (a, b) =>
              b.submittedOn.localeCompare(a.submittedOn) ||
              b.id.localeCompare(a.id),
          )
        : [],
    [dataState, mine],
  )
  const periods = useMemo(() => [...new Set(mine.map((s) => s.period))], [mine])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return records.filter(
      (s) =>
        (!status || s.status === status) &&
        (!period || s.period === period) &&
        (!q ||
          [s.id, s.payrollType, s.period, s.status].some((v) =>
            v.toLowerCase().includes(q),
          )),
    )
  }, [records, query, status, period])

  const filtersActive = Boolean(query || status || period)
  const clearFilters = () => {
    setQuery("")
    setStatus("")
    setPeriod("")
  }

  // Simulated, local-only creation of a prototype record with the SRS status "Submitted".
  const createPrototypeSubmission = ({
    payrollType,
    period: submissionPeriod,
    files,
  }: {
    payrollType: string
    period: string
    files: string[]
  }) => {
    if (resubmitId) {
      onResubmit(resubmitId, files)
      return { id: resubmitId }
    }
    // One ordinary submission per employee, payroll type and period.
    const duplicate = mine.find(
      (item) =>
        item.payrollType === payrollType && item.period === submissionPeriod,
    )
    if (duplicate) return { id: duplicate.id }
    const number =
      submissions.reduce(
        (max, s) => Math.max(max, Number(s.id.split("-").pop()) || 0),
        0,
      ) + 1
    const record: Submission = {
      id: `DEMO-SUB-${String(number).padStart(4, "0")}`,
      employeeId: employee!.employeeId,
      payrollType,
      period: submissionPeriod,
      submittedOn: DEMO_TODAY,
      status: "Submitted",
      prototype: true,
      versions: [{ version: 1, submittedOn: DEMO_TODAY, files }],
    }
    onAddSubmission(record)
    return record
  }

  const leaveForm = () => {
    setView("list")
    setResubmitId(null)
  }
  const resubmitting = resubmitId
    ? mine.find((item) => item.id === resubmitId)
    : undefined

  if (view === "new") {
    return (
      <NewSubmissionForm
        employee={employee ? toEmployeeRecord(employee) : null}
        existing={mine}
        resubmit={
          resubmitting && {
            id: resubmitting.id,
            period: resubmitting.period,
            remarks: resubmitting.returnInfo?.remarks ?? resubmitting.remark,
            affected: resubmitting.returnInfo?.affected,
          }
        }
        onBack={leaveForm}
        onSubmit={createPrototypeSubmission}
      />
    )
  }

  const startResubmit = (id: string) => {
    setResubmitId(id)
    setView("new")
  }

  const newButton = (
    <Button
      type="button"
      onClick={() => {
        setResubmitId(null)
        setView("new")
      }}
      disabled={!employee}
      className="w-full sm:w-auto"
    >
      <Icon name="plus" size={18} />
      New Submission
    </Button>
  )

  return (
    <>
      <div className="grid gap-7 font-sans">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p
              id="page-title"
              role="heading"
              aria-level={1}
              tabIndex={-1}
              className="text-2xl font-semibold leading-tight text-balance sm:text-3xl"
            >
              My Submissions
            </p>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">
              View and manage your payroll document submissions.
            </p>
          </div>
          {newButton}
        </section>

        {!employee && (
          <Alert
            tone="warning"
            title="No employee record is linked to your account"
          >
            Your submissions cannot be shown yet. Please contact the HR Office
            so your employee record can be linked.
          </Alert>
        )}

        <section
          className="overflow-hidden rounded-card bg-surface elevate"
          aria-labelledby="submission-history-title"
        >
          <div className="flex flex-col gap-2 border-b border-border p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
            <div>
              <p
                id="submission-history-title"
                role="heading"
                aria-level={2}
                className="text-lg font-semibold leading-snug"
              >
                Submission History
              </p>
              <p className="mt-1 text-sm leading-relaxed text-text-muted">
                View your submitted payroll requirements and review their
                current status.
              </p>
            </div>
            <Tag kind="placeholder">Fictional demonstration data</Tag>
          </div>

          {dataState === "data" && (
            <div className="grid gap-4 border-b border-border p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
              <TextField
                label="Search"
                icon="search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search submissions..."
                className="sm:col-span-2 lg:col-span-1"
              />
              <SelectField
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                placeholder="All statuses"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Payroll Period"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="All periods"
              >
                {periods.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </SelectField>
              <Button
                type="button"
                variant="secondary"
                onClick={clearFilters}
                disabled={!filtersActive}
                className="w-full sm:col-span-2 lg:col-span-1 lg:w-auto"
              >
                Clear Filters
              </Button>
            </div>
          )}

          {dataState === "error" && (
            <StateMessage
              icon="alert"
              title="Unable to load submissions"
              detail="Please try again."
            >
              <Button
                type="button"
                onClick={() => setRetrying(true)}
                loading={retrying}
              >
                Retry
              </Button>
            </StateMessage>
          )}

          {dataState === "empty" && (
            <StateMessage
              icon="clipboard"
              title="No submissions yet"
              detail="Your payroll document submissions will appear here."
            >
              <Button type="button" onClick={() => setView("new")}>
                <Icon name="plus" size={18} />
                New Submission
              </Button>
            </StateMessage>
          )}

          {dataState === "data" && filtered.length === 0 && (
            <StateMessage
              icon="search"
              title="No matching submissions"
              detail="Try adjusting your search or filters."
            >
              <Button type="button" variant="secondary" onClick={clearFilters}>
                Clear Filters
              </Button>
            </StateMessage>
          )}

          {dataState === "data" && filtered.length > 0 && (
            <>
              <p role="status" className="sr-only">
                Showing {filtered.length} of {records.length} submissions.
              </p>

              <div className="hidden 2xl:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-text-muted">
                      {[
                        "Submission ID",
                        "Payroll Type",
                        "Payroll Period",
                        "Date Submitted",
                        "Submission Status",
                      ].map((h) => (
                        <th
                          key={h}
                          scope="col"
                          className="px-6 py-3 font-medium"
                        >
                          {h}
                        </th>
                      ))}
                      <th
                        scope="col"
                        className="px-6 py-3 text-right font-medium"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((s) => (
                      <tr key={s.id} className="hover:bg-info-soft/40">
                        <td className="whitespace-nowrap px-6 py-4 font-semibold tabular-nums">
                          {s.id}
                          {s.prototype && (
                            <p className="mt-1 text-xs font-medium text-text-muted">
                              Prototype submission
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4">{s.payrollType}</td>
                        <td className="px-6 py-4">{s.period}</td>
                        <td className="px-6 py-4 text-text-muted">
                          {formatDate(s.submittedOn)}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={s.status} />
                          {s.status === "Returned" && (
                            <p className="mt-1.5 text-xs font-medium text-danger">
                              Correction required
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex flex-wrap justify-end gap-x-3 gap-y-1">
                            {s.status === "Returned" && (
                              <Button
                                type="button"
                                variant="link"
                                onClick={() => startResubmit(s.id)}
                                className="whitespace-nowrap font-semibold"
                              >
                                Correct &amp; Resubmit
                                <span className="sr-only"> {s.id}</span>
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="link"
                              onClick={() => setSelected(s)}
                              className="whitespace-nowrap"
                            >
                              View Details
                              <span className="sr-only"> for {s.id}</span>
                            </Button>
                            {onViewStatus && (
                              <Button
                                type="button"
                                variant="link"
                                onClick={() => onViewStatus(s.id)}
                                className="whitespace-nowrap"
                              >
                                View Status
                                <span className="sr-only"> for {s.id}</span>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-border 2xl:hidden">
                {filtered.map((s) => (
                  <li key={s.id} className="p-5 sm:px-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold tabular-nums">
                          {s.id}
                        </p>
                        {s.prototype && (
                          <p className="mt-1 text-xs font-medium text-text-muted">
                            Prototype submission
                          </p>
                        )}
                      </div>
                      <StatusBadge status={s.status} />
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                      <div className="col-span-2">
                        <dt className="text-xs text-text-muted">
                          Payroll Type
                        </dt>
                        <dd className="mt-0.5 font-medium">{s.payrollType}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-text-muted">
                          Payroll Period
                        </dt>
                        <dd className="mt-0.5 font-medium">{s.period}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-text-muted">
                          Date Submitted
                        </dt>
                        <dd className="mt-0.5 font-medium">
                          {formatDate(s.submittedOn)}
                        </dd>
                      </div>
                    </dl>
                    {s.status === "Returned" && (
                      <p className="mt-3 text-xs font-medium text-danger">
                        Correction required
                      </p>
                    )}
                    {s.status === "Returned" && (
                      <Button
                        type="button"
                        onClick={() => startResubmit(s.id)}
                        className="mt-4 w-full"
                      >
                        Correct &amp; Resubmit
                        <span className="sr-only"> {s.id}</span>
                      </Button>
                    )}
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setSelected(s)}
                        className="w-full"
                      >
                        View Details<span className="sr-only"> for {s.id}</span>
                      </Button>
                      {onViewStatus && (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => onViewStatus(s.id)}
                          className="w-full"
                        >
                          View Status
                          <span className="sr-only"> for {s.id}</span>
                          <Icon name="arrowRight" size={16} />
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {previewStates && (
          <div className="flex flex-col gap-3 rounded-control border border-dashed border-border-strong p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-relaxed text-text-muted">
              <span className="font-semibold text-text">Prototype only.</span>{" "}
              Preview how this page looks in each data state. Nothing here is
              connected to a database or university records.
            </p>
            <div
              role="group"
              aria-label="Preview data state"
              className="grid shrink-0 grid-cols-3 gap-1 rounded-control bg-canvas p-1"
            >
              {([
                ["data", "Records"],
                ["empty", "No records"],
                ["error", "Load error"],
              ] as const).map(([id, label]) => (
                <Button
                  key={id}
                  type="button"
                  variant="secondary"
                  aria-pressed={dataState === id}
                  onClick={() => {
                    setDataState(id)
                    setRetrying(false)
                    clearFilters()
                  }}
                  className={clsx(
                    "h-10 rounded-control border-0 px-3 shadow-none",
                    dataState === id
                      ? "bg-surface font-semibold elevate"
                      : "bg-transparent text-text-muted hover:bg-surface",
                  )}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {selected && (
        <Modal title="Submission preview" onClose={() => setSelected(null)}>
          <dl className="grid gap-4 text-sm">
            <div>
              <dt className="text-xs text-text-muted">Submission ID</dt>
              <dd className="mt-0.5 font-semibold tabular-nums">
                {selected.id}
              </dd>
            </div>
            {selected.prototype && (
              <div>
                <Tag kind="simulated">Prototype submission</Tag>
              </div>
            )}
            <div>
              <dt className="text-xs text-text-muted">Payroll Type</dt>
              <dd className="mt-0.5 font-medium">{selected.payrollType}</dd>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-text-muted">Payroll Period</dt>
                <dd className="mt-0.5 font-medium">{selected.period}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">Date Submitted</dt>
                <dd className="mt-0.5 font-medium">
                  {formatDate(selected.submittedOn)}
                </dd>
              </div>
            </div>
            <div>
              <dt className="text-xs text-text-muted">Current Status</dt>
              <dd className="mt-1">
                <StatusBadge status={selected.status} />
              </dd>
            </div>
            {selected.status === "Returned" &&
              (selected.returnInfo || selected.remark) && (
                <div className="rounded-control border border-danger/30 bg-danger-soft p-4">
                  <dt className="flex items-center gap-2 text-xs font-semibold text-danger">
                    <Icon name="arrowLeft" size={14} /> Reviewer remarks
                    <Tag kind="placeholder">Demonstration content</Tag>
                  </dt>
                  <dd className="mt-2 leading-relaxed text-text">
                    {selected.returnInfo?.remarks ?? selected.remark}
                  </dd>
                  <dd className="mt-2 text-xs text-text-muted">
                    Returned by{" "}
                    {selected.returnInfo?.by ?? "a reviewer (not recorded)"} ·
                    Affected requirement:{" "}
                    {selected.returnInfo?.affected ?? "Not recorded"}
                  </dd>
                </div>
              )}
            {selected.versions && selected.versions.length > 0 && (
              <div>
                <dt className="text-xs text-text-muted">Document versions</dt>
                <dd className="mt-1">
                  <ul className="grid gap-1.5">
                    {[...selected.versions]
                      .sort((a, b) => b.version - a.version)
                      .map((item) => (
                        <li
                          key={item.version}
                          className="rounded-control bg-canvas px-3 py-2 text-xs"
                        >
                          <span className="font-semibold">
                            Version {item.version}
                          </span>{" "}
                          · {formatDate(item.submittedOn)} ·{" "}
                          {item.files.join(", ") || "No filenames recorded"}
                        </li>
                      ))}
                  </ul>
                </dd>
              </div>
            )}
          </dl>
          <p className="mt-5 text-xs leading-relaxed text-text-muted">
            Read-only preview using fictional data. Earlier document versions
            and return remarks are kept when a submission is corrected and
            resubmitted.
          </p>
          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSelected(null)}
            >
              Close
            </Button>
            {selected.status === "Returned" && (
              <Button
                type="button"
                onClick={() => {
                  const id = selected.id
                  setSelected(null)
                  startResubmit(id)
                }}
              >
                Correct &amp; Resubmit
              </Button>
            )}
          </div>
        </Modal>
      )}
    </>
  )
}
