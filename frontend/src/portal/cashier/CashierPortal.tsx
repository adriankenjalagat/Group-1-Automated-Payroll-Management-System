import clsx from "clsx"
import { useMemo, useState, type Dispatch, type SetStateAction } from "react"
import { Alert, Button, Icon, TextField } from "../../MsuPayroll"
import { Modal, SelectField, Tag, usePopover } from "../../admin/ui"
import type { MockUser } from "../../auth/mockData"
import {
  cashierReadiness,
  excludedAmount,
  excludedEmployees,
  type CashierAuditEvent,
  type CashierDocument,
  type CashierNotification,
  type CashierPayroll,
} from "./cashierData"

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
})
const dateTime = new Intl.DateTimeFormat("en-PH", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <p
        id="page-title"
        role="heading"
        aria-level={1}
        tabIndex={-1}
        className="text-2xl font-semibold sm:text-3xl"
      >
        {title}
      </p>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-muted">
        {subtitle}
      </p>
    </div>
  )
}

function DemoNotice() {
  return (
    <Alert tone="info" title="Fictional demonstration workspace">
      Records and documents are non-official prototypes. Official forms,
      signatures, LandBank file format, bank submission, and payment processing
      remain outside this demo.
    </Alert>
  )
}

function DataPoint({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-text-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold leading-snug">
        {value}
      </dd>
    </div>
  )
}

function StateBadge({ state }: { state: CashierPayroll["processingState"] }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        state === "Released"
          ? "bg-success-soft text-success"
          : state === "Ready for Release"
            ? "bg-info-soft text-primary"
            : "bg-warning-soft text-warning",
      )}
    >
      <Icon
        name={
          state === "Released"
            ? "check"
            : state === "Ready for Release"
              ? "clock"
              : "alert"
        }
        size={13}
      />
      {state}
    </span>
  )
}

function SummaryCard({
  label,
  value,
  note,
  icon,
  tone,
  onClick,
}: {
  label: string
  value: number
  note: string
  icon: "check" | "alert" | "clock" | "users"
  tone: string
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={onClick}
      className="group h-auto min-h-36 w-full items-stretch rounded-card border-0 bg-surface p-5 text-left elevate hover:bg-surface"
    >
      <span className="flex w-full flex-col">
        <span className="flex items-start justify-between gap-4">
          <span
            className={clsx(
              "grid size-11 place-items-center rounded-control",
              tone,
            )}
          >
            <Icon name={icon} size={20} />
          </span>
          <span className="text-3xl font-bold leading-none">{value}</span>
        </span>
        <span className="mt-5 text-sm font-semibold">{label}</span>
        <span className="mt-1 text-sm font-normal text-text-muted">{note}</span>
      </span>
    </Button>
  )
}

function Dashboard({
  records,
  notifications,
  onNavigate,
  onSelect,
}: {
  records: CashierPayroll[]
  notifications: CashierNotification[]
  onNavigate: (page: string) => void
  onSelect: (payrollId: string) => void
}) {
  const ready = records.filter(
    (item) => item.processingState === "Ready for Release",
  )
  const attention = records.filter(
    (item) => item.processingState === "Requires Attention",
  )
  const released = records.filter((item) => item.processingState === "Released")
  const missing = records.reduce(
    (sum, item) => sum + excludedEmployees(item).length,
    0,
  )
  return (
    <div className="grid gap-7">
      <PageHeader
        title="Cashier Dashboard"
        subtitle="Review Chancellor-approved payrolls, generated documents, release readiness, exceptions, and recorded release activity."
      />
      <DemoNotice />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Ready for Release"
          value={ready.length}
          note="Eligible after review"
          icon="check"
          tone="bg-success-soft text-success"
          onClick={() => onNavigate("payroll-release")}
        />
        <SummaryCard
          label="Requires Attention"
          value={attention.length}
          note="Release safeguards active"
          icon="alert"
          tone="bg-warning-soft text-warning"
          onClick={() => onNavigate("payroll-release")}
        />
        <SummaryCard
          label="Released Payrolls"
          value={released.length}
          note="Documents locked"
          icon="clock"
          tone="bg-info-soft text-primary"
          onClick={() => onNavigate("release-history")}
        />
        <SummaryCard
          label="Employees Missing Bank Accounts"
          value={missing}
          note="Read-only follow-up list"
          icon="users"
          tone="bg-danger-soft text-danger"
          onClick={() => onNavigate("missing-bank-accounts")}
        />
      </section>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-card bg-surface p-5 elevate sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p
                role="heading"
                aria-level={2}
                className="text-lg font-semibold"
              >
                Release Queue
              </p>
              <p className="mt-1 text-sm text-text-muted">
                Chancellor-approved records not yet released
              </p>
            </div>
            <Button
              type="button"
              variant="link"
              onClick={() => onNavigate("payroll-release")}
            >
              View all
            </Button>
          </div>
          <ul className="mt-5 divide-y divide-border rounded-control border border-border">
            {records
              .filter((item) => item.processingState !== "Released")
              .slice(0, 4)
              .map((item) => (
                <li key={item.id} className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold">{item.id}</p>
                      <p className="mt-1 text-xs text-text-muted">
                        {item.payrollType} · {item.period} ·{" "}
                        {peso.format(item.net)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StateBadge state={item.processingState} />
                      <Button
                        type="button"
                        variant="link"
                        onClick={() => onSelect(item.id)}
                      >
                        Review
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        </section>
        <section className="rounded-card bg-surface p-5 elevate sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <p role="heading" aria-level={2} className="text-lg font-semibold">
              Recent Notifications
            </p>
            <Button
              type="button"
              variant="link"
              onClick={() => onNavigate("notifications")}
            >
              View all
            </Button>
          </div>
          <ul className="mt-5 grid gap-3">
            {notifications.slice(0, 4).map((item) => (
              <li key={item.id} className="rounded-control bg-canvas p-4">
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-text-muted">
                  {item.description}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

type Acknowledgments = {
  documentsReviewed: boolean
  signaturesHandledExternally: boolean
  landBankHandledExternally: boolean
}
type ReleaseResult = { ok: true; releasedBy: string; releasedAt: string } | {
  ok: false
  error: string
}

function CheckRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-control border border-border p-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 accent-primary"
      />
      <span>{label}</span>
    </label>
  )
}

function ReadinessGrid({ record }: { record: CashierPayroll }) {
  const ready = cashierReadiness(record)
  const rows = [
    ["Chancellor approval", ready.chancellorApproved],
    ["Required document references", ready.documentsReady],
    ["Approved payroll / DV / register / bank totals", ready.totalsReconcile],
    ["No unresolved bank exceptions", ready.missingCount === 0],
  ] as const
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {rows.map(([label, valid]) => (
        <li
          key={label}
          className={clsx(
            "flex items-center gap-2 rounded-control border p-3 text-sm font-medium",
            valid
              ? "border-success/30 bg-success-soft text-success"
              : "border-danger/30 bg-danger-soft text-danger",
          )}
        >
          <Icon name={valid ? "check" : "alert"} size={16} />
          {label}
        </li>
      ))}
    </ul>
  )
}

function ReleaseConfirmation({
  record,
  onClose,
  onConfirm,
}: {
  record: CashierPayroll
  onClose: () => void
  onConfirm: (
    acknowledgments: Acknowledgments,
    confirmed: boolean,
  ) => ReleaseResult
}) {
  const [ack, setAck] = useState<Acknowledgments>({
    documentsReviewed: false,
    signaturesHandledExternally: false,
    landBankHandledExternally: false,
  })
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState("")
  const readiness = cashierReadiness(record)
  const set = (key: keyof Acknowledgments, value: boolean) =>
    setAck((item) => ({ ...item, [key]: value }))
  return (
    <Modal title="Confirm Payroll Release" onClose={onClose} wide>
      <Tag kind="placeholder">
        Prototype release control — no funds transfer
      </Tag>
      <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
        <DataPoint label="Payroll Reference" value={record.id} />
        <DataPoint label="DV Reference" value={record.dvId} />
        <DataPoint
          label="Payroll Type / Period"
          value={`${record.payrollType} · ${record.period}`}
        />
        <DataPoint label="Fund" value={record.fund} />
        <DataPoint
          label="Employee Count"
          value={String(record.employees.length)}
        />
        <DataPoint label="Approved Net" value={peso.format(record.net)} />
        <DataPoint
          label="Document Readiness"
          value={
            readiness.documentsReady
              ? "Required references available"
              : "Incomplete"
          }
        />
        <DataPoint
          label="Reconciliation"
          value={readiness.totalsReconcile ? "Reconciled" : "Blocked"}
        />
      </dl>
      <div className="mt-5">
        <ReadinessGrid record={record} />
      </div>
      <div className="mt-5 grid gap-2">
        <CheckRow
          checked={ack.documentsReviewed}
          onChange={(value) => set("documentsReviewed", value)}
          label="I reviewed the available non-official document previews and references."
        />
        <CheckRow
          checked={ack.signaturesHandledExternally}
          onChange={(value) => set("signaturesHandledExternally", value)}
          label="I understand required signatures are handled outside this prototype."
        />
        <CheckRow
          checked={ack.landBankHandledExternally}
          onChange={(value) => set("landBankHandledExternally", value)}
          label="I understand LandBank submission and payment processing occur outside this prototype."
        />
        <CheckRow
          checked={confirmed}
          onChange={setConfirmed}
          label="I confirm this eligible payroll should be marked Released in the demonstration records."
        />
      </div>
      {error && (
        <div className="mt-4">
          <Alert tone="danger" title="Release unavailable">
            {error}
          </Alert>
        </div>
      )}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          disabled={!readiness.eligible}
          onClick={() => {
            const result = onConfirm(ack, confirmed)
            if (!result.ok) setError(result.error)
          }}
        >
          Confirm Release
        </Button>
      </div>
    </Modal>
  )
}

function PayrollDetails({
  record,
  onClose,
  onRelease,
}: {
  record: CashierPayroll
  onClose: () => void
  onRelease: () => void
}) {
  const readiness = cashierReadiness(record)
  return (
    <Modal title="Payroll Release Review" onClose={onClose} wide>
      <div className="flex flex-wrap items-center gap-2">
        <StateBadge state={record.processingState} />
        <Tag kind="placeholder">Fictional demonstration record</Tag>
      </div>
      {record.issue && (
        <div className="mt-5">
          <Alert tone="danger" title="Release blocked">
            {record.issue}
          </Alert>
        </div>
      )}
      <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
        <DataPoint label="Payroll Reference" value={record.id} />
        <DataPoint label="DV Reference" value={record.dvId} />
        <DataPoint label="Payroll Type" value={record.payrollType} />
        <DataPoint
          label="Period / Fund"
          value={`${record.period} · ${record.fund}`}
        />
        <DataPoint label="Employees" value={String(record.employees.length)} />
        <DataPoint
          label="Budget Approval"
          value={record.budgetApprovalReference}
        />
        <DataPoint
          label="Chancellor Approval"
          value={record.chancellorApprovalReference}
        />
        <DataPoint
          label="Approved Net / DV"
          value={`${peso.format(record.net)} / ${peso.format(record.dvAmount)}`}
        />
        <DataPoint
          label="Register / Bank"
          value={`${peso.format(record.registerTotal)} / ${peso.format(record.bankUploadTotal)}`}
        />
      </dl>
      <div className="mt-5">
        <ReadinessGrid record={record} />
      </div>
      <section className="mt-5">
        <p role="heading" aria-level={3} className="text-sm font-semibold">
          Employee-level bank readiness
        </p>
        <ul className="mt-3 divide-y divide-border rounded-control border border-border">
          {record.employees.map((item) => (
            <li
              key={item.employeeId}
              className="grid gap-2 p-3 text-sm sm:grid-cols-[1fr_auto_auto]"
            >
              <span>
                <span className="font-semibold">{item.name}</span>
                <span className="ml-2 text-xs text-text-muted">
                  {item.employeeId}
                </span>
              </span>
              <span className="font-medium">{peso.format(item.netPay)}</span>
              <span
                className={
                  item.bankAccountAvailable ? "text-success" : "text-danger"
                }
              >
                {item.bankAccountAvailable
                  ? "Bank indicator available"
                  : "Missing bank account"}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
        <Button
          type="button"
          disabled={
            !readiness.eligible || record.processingState === "Released"
          }
          onClick={onRelease}
        >
          {record.processingState === "Released"
            ? "Already Released"
            : "Mark as Released"}
        </Button>
      </div>
    </Modal>
  )
}

function PayrollRelease({
  records,
  selectedId,
  onSelected,
  onRelease,
}: {
  records: CashierPayroll[]
  selectedId: string | null
  onSelected: (id: string | null) => void
  onRelease: (
    record: CashierPayroll,
    acknowledgments: Acknowledgments,
    confirmed: boolean,
  ) => ReleaseResult
}) {
  const [query, setQuery] = useState("")
  const [state, setState] = useState("Active")
  const [confirming, setConfirming] = useState(false)
  const [success, setSuccess] = useState<{
    record: CashierPayroll
    releasedBy: string
    releasedAt: string
  } | null>(null)
  const selected = records.find((item) => item.id === selectedId) ?? null
  const filtered = records.filter((item) => {
    const haystack =
      `${item.id} ${item.dvId} ${item.payrollType} ${item.period}`.toLowerCase()
    return (
      haystack.includes(query.toLowerCase()) &&
      (state === "All" ||
        (state === "Active" && item.processingState !== "Released") ||
        item.processingState === state)
    )
  })
  const confirm = (acknowledgments: Acknowledgments, confirmed: boolean) => {
    if (!selected)
      return {
        ok: false as const,
        error: "The selected payroll was not found.",
      }
    const result = onRelease(selected, acknowledgments, confirmed)
    if (result.ok) {
      setConfirming(false)
      setSuccess({
        record: selected,
        releasedBy: result.releasedBy,
        releasedAt: result.releasedAt,
      })
      onSelected(null)
    }
    return result
  }
  return (
    <div className="grid gap-7">
      <PageHeader
        title="Payroll Release"
        subtitle="Review Chancellor-approved payrolls and mark only fully eligible batches Released. This prototype does not submit to LandBank or transfer funds."
      />
      <DemoNotice />
      <section className="overflow-hidden rounded-card bg-surface elevate">
        <div className="border-b border-border p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[1fr_15rem]">
            <TextField
              label="Search payrolls"
              icon="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Payroll, DV, type, or period"
            />
            <SelectField
              label="Release state"
              value={state}
              onChange={(event) => setState(event.target.value)}
            >
              <option>Active</option>
              <option>Ready for Release</option>
              <option>Requires Attention</option>
              <option>Released</option>
              <option>All</option>
            </SelectField>
          </div>
        </div>
        <ul className="divide-y divide-border">
          {filtered.map((item) => (
            <li key={item.id} className="p-5 sm:p-6">
              <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr_auto] xl:items-center">
                <div>
                  <p className="font-semibold">{item.id}</p>
                  <p className="mt-1 text-sm text-text-muted">
                    {item.payrollType} · {item.period} · {item.fund}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    DV {item.dvId} · {item.employees.length} employees
                  </p>
                </div>
                <div>
                  <p className="text-xl font-bold">{peso.format(item.net)}</p>
                  <div className="mt-2">
                    <StateBadge state={item.processingState} />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onSelected(item.id)}
                >
                  Review Release
                </Button>
              </div>
            </li>
          ))}
          {!filtered.length && (
            <li className="p-10 text-center text-sm text-text-muted">
              No payrolls match the selected filters.
            </li>
          )}
        </ul>
      </section>
      {selected && !confirming && (
        <PayrollDetails
          record={selected}
          onClose={() => onSelected(null)}
          onRelease={() => setConfirming(true)}
        />
      )}
      {selected && confirming && (
        <ReleaseConfirmation
          record={selected}
          onClose={() => setConfirming(false)}
          onConfirm={confirm}
        />
      )}
      {success && (
        <Modal title="Payroll Marked Released" onClose={() => setSuccess(null)}>
          <Alert tone="success" title="Release recorded">
            The shared demonstration record was updated and its document
            references were locked.
          </Alert>
          <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
            <DataPoint label="Payroll" value={success.record.id} />
            <DataPoint label="Released By" value={success.releasedBy} />
            <DataPoint
              label="Released At"
              value={dateTime.format(new Date(success.releasedAt))}
            />
            <DataPoint
              label="Employees"
              value={String(success.record.employees.length)}
            />
            <DataPoint
              label="Net Amount"
              value={peso.format(success.record.net)}
            />
            <DataPoint label="Status" value="Released · documents locked" />
          </dl>
          <Alert tone="info" title="No bank payment claimed">
            This status confirms only the local prototype release transition. It
            does not confirm LandBank submission, account crediting, signatures,
            or transfer of funds.
          </Alert>
          <Alert tone="info" title="Employee access remains account-scoped">
            Payslip records were published for the included employee IDs, but
            this transition does not create employee accounts or HR account
            links. Only an existing account linked to the same employee ID can
            view a released payslip.
          </Alert>
          <div className="mt-5 flex justify-end">
            <Button type="button" onClick={() => setSuccess(null)}>
              Done
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function documentText(document: CashierDocument, record: CashierPayroll) {
  return [
    "MSU–Naawan Payroll System",
    "NON-OFFICIAL FICTIONAL DEMONSTRATION ARTIFACT",
    "Official template and signatures: TBD / not included",
    "",
    `${document.type}: ${document.reference}`,
    `Payroll: ${record.id}`,
    `DV: ${record.dvId}`,
    `Type: ${record.payrollType}`,
    `Period: ${record.period}`,
    `Fund: ${record.fund}`,
    `Recorded amount: ${peso.format(document.amount)}`,
    "",
    "Employee rows:",
    ...record.employees.map(
      (item) =>
        `${item.employeeId} | ${item.name} | Gross ${item.grossPay.toFixed(2)} | Deductions ${item.deductions.toFixed(2)} | Net ${item.netPay.toFixed(2)} | Bank indicator ${
          item.bankAccountAvailable ? "available" : "missing / excluded"
        }`,
    ),
    "",
    "This artifact is not an official voucher, register, ADA/ADCA, or LandBank file.",
  ].join("\n")
}

function DocumentPreview({
  document,
  record,
  onClose,
  onPrint,
  onDownload,
}: {
  document: CashierDocument
  record: CashierPayroll
  onClose: () => void
  onPrint: () => void
  onDownload: () => void
}) {
  return (
    <Modal title={`${document.type} Preview`} onClose={onClose} wide>
      <div className="print-area">
        <div className="flex flex-wrap items-center gap-2">
          <Tag kind="placeholder">Non-official prototype preview</Tag>
          {document.lockedAt && (
            <Tag kind="placeholder">Locked after release</Tag>
          )}
        </div>
        <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-2">
          <DataPoint label="Document ID" value={document.id} />
          <DataPoint label="Reference" value={document.reference} />
          <DataPoint
            label="Payroll / DV"
            value={`${record.id} / ${record.dvId}`}
          />
          <DataPoint label="Amount" value={peso.format(document.amount)} />
          <DataPoint
            label="Generated"
            value={dateTime.format(new Date(document.generatedAt))}
          />
          <DataPoint label="Availability" value="Readable prototype preview" />
          <DataPoint
            label="Lock State"
            value={document.lockedAt ? "Locked — read-only" : "Read-only"}
          />
          <DataPoint label="Demo Only" value="Yes" />
        </dl>
        <section className="mt-5 rounded-control border border-border p-4">
          <p role="heading" aria-level={3} className="font-semibold">
            Recorded employee allocation
          </p>
          <ul className="mt-3 divide-y divide-border">
            {record.employees.map((item) => (
              <li
                key={item.employeeId}
                className="grid gap-1 py-3 text-sm sm:grid-cols-[1fr_auto]"
              >
                <span>
                  {item.name} · {item.employeeId}
                  {!item.bankAccountAvailable && (
                    <span className="ml-2 font-semibold text-danger">
                      Excluded from bank data
                    </span>
                  )}
                </span>
                <span className="font-semibold">
                  {peso.format(item.netPay)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      {document.type === "LandBank Upload" && (
        <div className="mt-5">
          <Alert
            tone="warning"
            title="Metadata only — file content unavailable"
          >
            Demo document reference — file content not available. A
            production-valid LandBank format has not been configured, so Print
            and Download are unavailable.
          </Alert>
        </div>
      )}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={!document.printable}
          onClick={onPrint}
        >
          Print Preview
        </Button>
        <Button
          type="button"
          disabled={!document.downloadable}
          onClick={onDownload}
        >
          Download Demo Text
        </Button>
      </div>
    </Modal>
  )
}

function GeneratedDocuments({
  records,
  user,
  setAudits,
}: {
  records: CashierPayroll[]
  user: MockUser
  setAudits: Dispatch<SetStateAction<CashierAuditEvent[]>>
}) {
  const [type, setType] = useState("")
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<{
    payroll: CashierPayroll
    document: CashierDocument
  } | null>(null)
  const all = records.flatMap((payroll) =>
    payroll.documents.map((document) => ({ payroll, document })),
  )
  const filtered = all.filter(
    ({ payroll, document }) =>
      (!type || document.type === type) &&
      `${document.id} ${document.reference} ${payroll.id} ${payroll.dvId}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  )
  const audit = (
    action: "Print Initiated" | "Download Initiated",
    result: string,
  ) => {
    if (!selected) return
    const now = new Date().toISOString()
    setAudits((items) => [
      {
        id: `${selected.document.id}-${action}-${now}`,
        actorUserId: user.accountId ?? user.username,
        actorName: user.name,
        actorRole: "Cashier",
        payrollId: selected.payroll.id,
        documentId: selected.document.id,
        documentReference: selected.document.reference,
        action,
        fileType:
          action === "Download Initiated"
            ? "text/plain; charset=utf-8"
            : undefined,
        recordedAt: now,
        result,
        demo: true,
      },
      ...items,
    ])
  }
  const print = () => {
    if (!selected?.document.printable) return
    audit(
      "Print Initiated",
      "Browser print dialog requested; physical printing was not confirmed.",
    )
    window.print()
  }
  const download = () => {
    if (!selected?.document.downloadable) return
    const blob = new Blob([documentText(selected.document, selected.payroll)], {
      type: "text/plain;charset=utf-8",
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `${selected.payroll.id}-${selected.document.type.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-demo.txt`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
    audit(
      "Download Initiated",
      "Browser download initiated for a generated non-official text artifact; completion was not confirmed.",
    )
  }
  return (
    <div className="grid gap-7">
      <PageHeader
        title="Generated Documents"
        subtitle="View read-only document metadata and supported non-official previews produced after Chancellor approval."
      />
      <DemoNotice />
      <section className="overflow-hidden rounded-card bg-surface elevate">
        <div className="grid gap-4 border-b border-border p-5 sm:grid-cols-2 sm:p-6">
          <TextField
            label="Search documents"
            icon="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Document, payroll, or DV reference"
          />
          <SelectField
            label="Document type"
            value={type}
            onChange={(event) => setType(event.target.value)}
            placeholder="All document types"
          >
            <option>Disbursement Voucher</option>
            <option>Payroll Register</option>
            <option>ADA/ADCA</option>
            <option>LandBank Upload</option>
          </SelectField>
        </div>
        <ul className="divide-y divide-border">
          {filtered.map(({ payroll, document }) => (
            <li
              key={document.id}
              className="grid gap-4 p-5 sm:p-6 xl:grid-cols-[1.2fr_1fr_1fr_auto] xl:items-center"
            >
              <div>
                <p className="font-semibold">{document.type}</p>
                <p className="mt-1 text-xs text-text-muted">{document.id}</p>
              </div>
              <div className="text-sm">
                <p className="font-medium">{payroll.id}</p>
                <p className="mt-1 text-xs text-text-muted">{payroll.dvId}</p>
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {peso.format(document.amount)}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  {document.lockedAt
                    ? "Locked after release"
                    : "Read-only generated reference"}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSelected({ payroll, document })}
              >
                View Document
              </Button>
            </li>
          ))}
        </ul>
      </section>
      <Alert tone="warning" title="Metadata-only LandBank references">
        LandBank upload references do not offer a download because the official
        file specification is not configured. The portal does not invent a bank
        file or claim submission success.
      </Alert>
      {selected && (
        <DocumentPreview
          document={selected.document}
          record={selected.payroll}
          onClose={() => setSelected(null)}
          onPrint={print}
          onDownload={download}
        />
      )}
    </div>
  )
}

function MissingBankAccounts({ records }: { records: CashierPayroll[] }) {
  const issues = records.flatMap((record) =>
    excludedEmployees(record).map((employee) => ({ record, employee })),
  )
  return (
    <div className="grid gap-7">
      <PageHeader
        title="Missing Bank Accounts"
        subtitle="Read-only follow-up list for employees excluded from generated bank data. Cashier cannot edit employee or bank information."
      />
      <DemoNotice />
      <Alert tone="warning" title="Release safeguard">
        Ordinary full-batch release remains blocked while any employee lacks
        required bank information. Follow-up rules remain TBD; no account number
        is fabricated by this prototype.
      </Alert>
      <section className="overflow-hidden rounded-card bg-surface elevate">
        <div className="border-b border-border p-5 sm:p-6">
          <p role="heading" aria-level={2} className="text-lg font-semibold">
            Employees Requiring Follow-up
          </p>
          <p className="mt-1 text-sm text-text-muted">
            {issues.length} unresolved record{issues.length === 1 ? "" : "s"}
          </p>
        </div>
        <ul className="divide-y divide-border">
          {issues.map(({ record, employee }) => (
            <li
              key={`${record.id}-${employee.employeeId}`}
              className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-4"
            >
              <DataPoint
                label="Employee"
                value={`${employee.name} · ${employee.employeeId}`}
              />
              <DataPoint
                label="Payroll / DV"
                value={`${record.id} / ${record.dvId}`}
              />
              <DataPoint
                label="Excluded Amount"
                value={peso.format(employee.netPay)}
              />
              <DataPoint
                label="Status"
                value="Bank account information missing"
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function ReleaseHistory({
  records,
  audits,
}: {
  records: CashierPayroll[]
  audits: CashierAuditEvent[]
}) {
  const releases = records
    .filter((item) => item.releaseEvent)
    .sort((a, b) =>
      (b.releaseEvent?.releasedAt ?? "").localeCompare(
        a.releaseEvent?.releasedAt ?? "",
      ),
    )
  return (
    <div className="grid gap-7">
      <PageHeader
        title="Release History"
        subtitle="Review immutable demonstration release records and document access audit events."
      />
      <DemoNotice />
      <section className="rounded-card bg-surface p-5 elevate sm:p-6">
        <p role="heading" aria-level={2} className="text-lg font-semibold">
          Recorded Releases
        </p>
        <ul className="mt-5 divide-y divide-border rounded-control border border-border">
          {releases.map((item) => (
            <li
              key={item.releaseEvent?.id}
              className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-4"
            >
              <DataPoint
                label="Payroll / DV"
                value={`${item.id} / ${item.dvId}`}
              />
              <DataPoint
                label="Released By"
                value={`${item.releaseEvent?.cashierName} · ${item.releaseEvent?.cashierUserId}`}
              />
              <DataPoint
                label="Released At"
                value={dateTime.format(new Date(item.releaseEvent!.releasedAt))}
              />
              <DataPoint
                label="Net / Employees"
                value={`${peso.format(item.net)} · ${item.employees.length}`}
              />
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-card bg-surface p-5 elevate sm:p-6">
        <p role="heading" aria-level={2} className="text-lg font-semibold">
          Release and Document Audit
        </p>
        <ul className="mt-5 grid gap-3">
          {audits.map((event) => (
            <li key={event.id} className="rounded-control bg-canvas p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">{event.action}</p>
                <Tag kind="placeholder">Demo audit event</Tag>
              </div>
              <p className="mt-1 text-xs text-text-muted">
                {event.actorName} · {event.actorUserId} ·{" "}
                {dateTime.format(new Date(event.recordedAt))}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                {event.payrollId}
                {event.documentReference ? ` · ${event.documentReference}` : ""}
              </p>
              <p className="mt-2 text-sm">{event.result}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function Notifications({
  notifications,
  setNotifications,
  onNavigate,
  onSelect,
}: {
  notifications: CashierNotification[]
  setNotifications: Dispatch<SetStateAction<CashierNotification[]>>
  onNavigate: (page: string) => void
  onSelect: (id: string) => void
}) {
  const open = (item: CashierNotification) => {
    setNotifications((items) =>
      items.map((notice) =>
        notice.id === item.id ? { ...notice, read: true } : notice,
      ),
    )
    if (item.action === "payroll" || item.action === "issues") {
      onSelect(item.payrollId)
      onNavigate("payroll-release")
    } else if (item.action === "documents") onNavigate("generated-documents")
    else onNavigate("release-history")
  }
  return (
    <div className="grid gap-7">
      <PageHeader
        title="Notifications"
        subtitle="Cashier updates derived from payroll readiness, exceptions, documents, and release activity."
      />
      <DemoNotice />
      <div className="flex justify-end">
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            setNotifications((items) =>
              items.map((item) => ({ ...item, read: true })),
            )
          }
        >
          Mark All as Read
        </Button>
      </div>
      <section className="overflow-hidden rounded-card bg-surface elevate">
        <ul className="divide-y divide-border">
          {notifications.map((item) => (
            <li
              key={item.id}
              className={clsx("p-5 sm:p-6", !item.read && "bg-info-soft/30")}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {!item.read && (
                      <span
                        className="size-2 rounded-full bg-primary"
                        aria-label="Unread"
                      />
                    )}
                    <p className="font-semibold">{item.title}</p>
                  </div>
                  <p className="mt-2 text-sm text-text-muted">
                    {item.description}
                  </p>
                  <p className="mt-2 text-xs text-text-muted">
                    {item.payrollId} ·{" "}
                    {dateTime.format(new Date(item.createdAt))}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => open(item)}
                >
                  Open Record
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export function CashierHeaderBell({
  notifications,
  onOpen,
}: {
  notifications: CashierNotification[]
  onOpen: () => void
}) {
  const { open, setOpen, ref } = usePopover()
  const unread = notifications.filter((item) => !item.read).length
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        data-trigger
        onClick={() => setOpen(!open)}
        aria-label={`Cashier notifications${
          unread ? `, ${unread} unread` : ""
        }`}
        className="relative grid size-10 place-items-center rounded-control text-text-muted hover:bg-info-soft hover:text-text"
      >
        <Icon name="bell" size={20} />
        {unread > 0 && (
          <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="elevate absolute right-0 z-30 mt-2 w-80 max-w-[calc(100vw-1.5rem)] rounded-card bg-surface p-3">
          <p className="px-2 py-1 text-sm font-semibold">
            Cashier Notifications
          </p>
          <ul className="mt-2 grid gap-1">
            {notifications.slice(0, 3).map((item) => (
              <li key={item.id} className="rounded-control bg-canvas p-3">
                <p className="text-xs font-semibold">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-text-muted">
                  {item.description}
                </p>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="link"
            className="mt-2 w-full"
            onClick={() => {
              setOpen(false)
              onOpen()
            }}
          >
            View all notifications
          </Button>
        </div>
      )}
    </div>
  )
}

export function CashierPortal({
  page,
  records,
  user,
  audits,
  setAudits,
  notifications,
  setNotifications,
  selectedId,
  setSelectedId,
  onNavigate,
  onRelease,
}: {
  page: string
  records: CashierPayroll[]
  user: MockUser
  audits: CashierAuditEvent[]
  setAudits: Dispatch<SetStateAction<CashierAuditEvent[]>>
  notifications: CashierNotification[]
  setNotifications: Dispatch<SetStateAction<CashierNotification[]>>
  selectedId: string | null
  setSelectedId: (id: string | null) => void
  onNavigate: (page: string) => void
  onRelease: (
    record: CashierPayroll,
    acknowledgments: Acknowledgments,
    confirmed: boolean,
  ) => ReleaseResult
}) {
  if (page === "dashboard")
    return (
      <Dashboard
        records={records}
        notifications={notifications}
        onNavigate={onNavigate}
        onSelect={(id) => {
          setSelectedId(id)
          onNavigate("payroll-release")
        }}
      />
    )
  if (page === "payroll-release")
    return (
      <PayrollRelease
        records={records}
        selectedId={selectedId}
        onSelected={setSelectedId}
        onRelease={onRelease}
      />
    )
  if (page === "generated-documents")
    return (
      <GeneratedDocuments records={records} user={user} setAudits={setAudits} />
    )
  if (page === "missing-bank-accounts")
    return <MissingBankAccounts records={records} />
  if (page === "release-history")
    return <ReleaseHistory records={records} audits={audits} />
  return (
    <Notifications
      notifications={notifications}
      setNotifications={setNotifications}
      onNavigate={onNavigate}
      onSelect={setSelectedId}
    />
  )
}
