import clsx from 'clsx'
import { useMemo, useState, type FormEvent } from 'react'
import { Alert, Button, Icon, TextField, type IconName } from '../MsuPayroll'
import { Modal, SelectField, Tag } from './ui'

type Classification = 'Faculty' | 'Staff'
type RequirementType = 'Mandatory' | 'Conditional'
type Trigger = 'Official Travel' | 'Leave of Absence' | 'Compensatory Time-Off (CTO)'
type Confirmation = 'Pending Confirmation' | 'Confirmed'

type Requirement = {
  id: string
  name: string
  description: string
  type: RequirementType
  trigger: Trigger | null
  source: string
  office: string
  confirmation: Confirmation
  effectiveDate: string
  active: boolean
  history: string[]
}

type PayrollType = {
  id: string
  name: string
  classification: Classification
  employmentType: string
  schedule: string
  requirements: Requirement[]
}

const generalSource = 'General employee submission procedure'
const pendingOffice = 'Concerned university office'

const facultyRequirements: Requirement[] = [
  {
    id: 'fsr',
    name: 'Faculty Service Record (FSR)',
    description: 'Primary faculty service record referenced by the general employee submission procedure.',
    type: 'Mandatory',
    trigger: null,
    source: generalSource,
    office: pendingOffice,
    confirmation: 'Pending Confirmation',
    effectiveDate: '',
    active: true,
    history: ['Added to the fictional configuration from the general procedure reference.'],
  },
  {
    id: 'travel-order',
    name: 'Approved Travel Order',
    description: 'Conditional supporting document associated with Official Travel.',
    type: 'Conditional',
    trigger: 'Official Travel',
    source: generalSource,
    office: pendingOffice,
    confirmation: 'Pending Confirmation',
    effectiveDate: '',
    active: true,
    history: ['Added to the fictional configuration from the general procedure reference.'],
  },
  {
    id: 'appearance',
    name: 'Certificate of Appearance',
    description: 'Conditional supporting document associated with Official Travel.',
    type: 'Conditional',
    trigger: 'Official Travel',
    source: generalSource,
    office: pendingOffice,
    confirmation: 'Pending Confirmation',
    effectiveDate: '',
    active: true,
    history: ['Added to the fictional configuration from the general procedure reference.'],
  },
  {
    id: 'leave',
    name: 'Approved Leave Application',
    description: 'Conditional supporting document associated with Leave of Absence.',
    type: 'Conditional',
    trigger: 'Leave of Absence',
    source: generalSource,
    office: pendingOffice,
    confirmation: 'Pending Confirmation',
    effectiveDate: '',
    active: true,
    history: ['Added to the fictional configuration from the general procedure reference.'],
  },
  {
    id: 'cto',
    name: 'Approved CTO Form',
    description: 'Conditional supporting document associated with Compensatory Time-Off.',
    type: 'Conditional',
    trigger: 'Compensatory Time-Off (CTO)',
    source: generalSource,
    office: pendingOffice,
    confirmation: 'Pending Confirmation',
    effectiveDate: '',
    active: true,
    history: ['Added to the fictional configuration from the general procedure reference.'],
  },
]

const referenceTypes: Omit<PayrollType, 'requirements'>[] = [
  ['permanent-faculty', 'Payroll for Permanent Faculty Employees', 'Faculty', 'Permanent'],
  ['permanent-staff', 'Payroll for Permanent Staff Employees', 'Staff', 'Permanent'],
  ['contractual-faculty', 'Payroll for Contractual Faculty Employees', 'Faculty', 'Contractual'],
  ['contractual-staff', 'Payroll for Contractual Staff Employees', 'Staff', 'Contractual'],
  ['job-order-faculty', 'Payroll for Job Order Faculty Employees', 'Faculty', 'Job Order'],
  ['job-order-staff', 'Payroll for Job Order Staff Employees', 'Staff', 'Job Order'],
  ['temporary-faculty', 'Payroll for Temporary Faculty Employees', 'Faculty', 'Temporary'],
  ['temporary-staff', 'Payroll for Temporary Staff Employees', 'Staff', 'Temporary'],
  ['lecturer-faculty', 'Payroll for Lecturer Faculty Employees', 'Faculty', 'Lecturer'],
  ['incentive-faculty', 'Payroll Incentives for Faculty Employees', 'Faculty', 'Not specified by reference configuration'],
  ['incentive-staff', 'Payroll Incentives for Staff Employees', 'Staff', 'Not specified by reference configuration'],
  ['overtime-faculty', 'Payroll for Overtime of Faculty Employees', 'Faculty', 'Not specified by reference configuration'],
  ['overtime-staff', 'Payroll for Overtime of Staff Employees', 'Staff', 'Not specified by reference configuration'],
].map(([id, name, classification, employmentType]) => ({
  id,
  name,
  classification: classification as Classification,
  employmentType,
  schedule: 'Not yet configured',
}))

const initialTypes: PayrollType[] = referenceTypes.map((type) => ({
  ...type,
  requirements: type.id === 'permanent-faculty' ? facultyRequirements : [],
}))

const triggerOptions: Trigger[] = ['Official Travel', 'Leave of Absence', 'Compensatory Time-Off (CTO)']

const emptyRequirement = {
  name: '',
  description: '',
  type: 'Mandatory' as RequirementType,
  trigger: '' as Trigger | '',
  source: '',
  office: '',
  confirmation: 'Pending Confirmation' as Confirmation,
  effectiveDate: '',
}

type RequirementDraft = typeof emptyRequirement
type Editor = { mode: 'add' | 'edit'; payrollTypeId: string; requirementId?: string } | null

function RequirementTypeBadge({ type }: { type: RequirementType }) {
  return (
    <span className={clsx(
      'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
      type === 'Mandatory' ? 'bg-primary/10 text-primary' : 'bg-info-soft text-primary',
    )}>
      {type}
    </span>
  )
}

function Detail({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-semibold leading-snug">{value}</dd>
      {note && <p className="mt-1 text-xs leading-relaxed text-text-muted">{note}</p>}
    </div>
  )
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label htmlFor="requirement-description" className="mb-1.5 block text-sm font-medium">{label}</label>
      <textarea
        id="requirement-description"
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full resize-y rounded-control border border-border-strong bg-surface px-3.5 py-3 text-base text-text placeholder:text-text-muted/70 hover:border-primary sm:text-sm"
      />
    </div>
  )
}

function RequirementEditor({
  editor,
  payrollType,
  onClose,
  onSave,
}: {
  editor: NonNullable<Editor>
  payrollType: PayrollType
  onClose: () => void
  onSave: (draft: RequirementDraft) => string | null
}) {
  const existing = editor.requirementId
    ? payrollType.requirements.find((requirement) => requirement.id === editor.requirementId)
    : undefined
  const [draft, setDraft] = useState<RequirementDraft>(() => existing ? {
    name: existing.name,
    description: existing.description,
    type: existing.type,
    trigger: existing.trigger ?? '',
    source: existing.source,
    office: existing.office,
    confirmation: existing.confirmation,
    effectiveDate: existing.effectiveDate,
  } : emptyRequirement)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = <K extends keyof RequirementDraft>(key: K, value: RequirementDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!draft.name.trim()) nextErrors.name = 'Enter a document name.'
    if (draft.type === 'Conditional' && !draft.trigger) nextErrors.trigger = 'Select a triggering condition.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    const duplicate = onSave(draft)
    if (duplicate) setErrors({ duplicate })
  }

  return (
    <Modal title={editor.mode === 'add' ? 'Add Document Requirement' : 'Edit Document Requirement'} onClose={onClose} wide>
      <form onSubmit={submit} noValidate className="grid gap-4">
        <div className="-mt-2 rounded-control bg-canvas p-3 text-sm">
          <p className="text-xs text-text-muted">Payroll Type</p>
          <p className="mt-1 font-semibold">{payrollType.name}</p>
        </div>
        <TextField
          label="Document Name"
          value={draft.name}
          onChange={(event) => set('name', event.target.value)}
          error={errors.name}
          placeholder="Enter the verified document name"
        />
        <TextAreaField
          label="Description / Instructions"
          value={draft.description}
          onChange={(value) => set('description', value)}
          placeholder="Describe how this document applies."
        />
        <SelectField
          label="Requirement Type"
          value={draft.type}
          onChange={(event) => set('type', event.target.value as RequirementType)}
        >
          <option value="Mandatory">Mandatory</option>
          <option value="Conditional">Conditional</option>
        </SelectField>
        {draft.type === 'Conditional' && (
          <SelectField
            label="Triggering Condition"
            value={draft.trigger}
            onChange={(event) => set('trigger', event.target.value as Trigger)}
            placeholder="Select a condition"
            error={errors.trigger}
            hint="Use another condition only after verification by the concerned office."
          >
            {triggerOptions.map((trigger) => <option key={trigger} value={trigger}>{trigger}</option>)}
          </SelectField>
        )}
        <TextField
          label="Source / Reference"
          value={draft.source}
          onChange={(event) => set('source', event.target.value)}
          placeholder="Approved procedure, template, or office reference"
        />
        <TextField
          label="Responsible Confirming Office"
          value={draft.office}
          onChange={(event) => set('office', event.target.value)}
          placeholder="Office responsible for confirming this requirement"
        />
        <TextField
          label="Effective Date (optional)"
          type="date"
          value={draft.effectiveDate}
          onChange={(event) => set('effectiveDate', event.target.value)}
          hint="Effective-date behavior is still pending confirmation."
        />
        {errors.duplicate && <Alert tone="danger" title="Duplicate requirement">{errors.duplicate}</Alert>}
        <Alert tone="info" title="Local demonstration change">
          Saving updates this browser session only. It does not update official university requirements.
        </Alert>
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save Requirement</Button>
        </div>
      </form>
    </Modal>
  )
}

function RequirementDetails({
  requirement,
  onClose,
}: {
  requirement: Requirement
  onClose: () => void
}) {
  return (
    <Modal title="Requirement Details" onClose={onClose} wide>
      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Detail label="Document Name" value={requirement.name} /></div>
        <Detail label="Requirement Type" value={requirement.type} />
        <Detail label="Triggering Condition" value={requirement.trigger ?? 'Not applicable'} />
        <Detail label="Active Demonstration Checklist" value={requirement.active ? 'Active' : 'Deactivated'} />
        <Detail label="Source / Reference" value={requirement.source || 'Not provided'} />
        <Detail label="Responsible Confirming Office" value={requirement.office || 'Not provided'} />
        <Detail label="Effective Date" value={requirement.effectiveDate || 'Not set'} />
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium text-text-muted">Description / Instructions</dt>
          <dd className="mt-1 text-sm leading-relaxed">{requirement.description || 'No description provided.'}</dd>
        </div>
      </dl>
      <div className="mt-5 border-t border-border pt-5">
        <p className="text-sm font-semibold">Conceptual audit history</p>
        <ul className="mt-2 grid gap-2 text-xs leading-relaxed text-text-muted">
          {requirement.history.map((entry, index) => <li key={`${entry}-${index}`}>• {entry}</li>)}
        </ul>
      </div>
      <div className="mt-5 flex justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  )
}

export function PayrollConfiguration({ record }: { record?: (action: string, target: string, toast: string) => void }) {
  const [types, setTypes] = useState(initialTypes)
  const [selectedId, setSelectedId] = useState('permanent-faculty')
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState<Editor>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [deactivateId, setDeactivateId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')

  const selected = types.find((type) => type.id === selectedId) ?? types[0]
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return types.filter((type) =>
      !normalized ||
      type.name.toLowerCase().includes(normalized) ||
      type.classification.toLowerCase().includes(normalized) ||
      type.employmentType.toLowerCase().includes(normalized),
    )
  }, [types, query])

  const updateRequirements = (payrollTypeId: string, update: (requirements: Requirement[]) => Requirement[]) =>
    setTypes((current) => current.map((type) =>
      type.id === payrollTypeId ? { ...type, requirements: update(type.requirements) } : type,
    ))

  const saveRequirement = (draft: RequirementDraft): string | null => {
    if (!editor) return null
    const normalizedName = draft.name.trim().toLowerCase()
    const normalizedTrigger = draft.type === 'Conditional' ? draft.trigger : ''
    const duplicate = selected.requirements.some((requirement) =>
      requirement.id !== editor.requirementId &&
      requirement.name.trim().toLowerCase() === normalizedName &&
      (requirement.trigger ?? '') === normalizedTrigger,
    )
    if (duplicate) return 'This payroll type already has the same document and triggering condition.'

    const event = editor.mode === 'add'
      ? 'Added locally for demonstration.'
      : 'Configuration edited locally for demonstration.'
    updateRequirements(editor.payrollTypeId, (requirements) => {
      if (editor.mode === 'add') {
        return [...requirements, {
          id: `demo-${Date.now()}`,
          name: draft.name.trim(),
          description: draft.description.trim(),
          type: draft.type,
          trigger: draft.type === 'Conditional' ? draft.trigger as Trigger : null,
          source: draft.source.trim(),
          office: draft.office.trim(),
          confirmation: draft.confirmation,
          effectiveDate: draft.effectiveDate,
          active: true,
          history: [event],
        }]
      }
      return requirements.map((requirement) => requirement.id === editor.requirementId ? {
        ...requirement,
        name: draft.name.trim(),
        description: draft.description.trim(),
        type: draft.type,
        trigger: draft.type === 'Conditional' ? draft.trigger as Trigger : null,
        source: draft.source.trim(),
        office: draft.office.trim(),
        confirmation: draft.confirmation,
        effectiveDate: draft.effectiveDate,
        history: [...requirement.history, event],
      } : requirement)
    })
    const message = editor.mode === 'add'
      ? 'Requirement added locally for demonstration.'
      : 'Requirement configuration updated locally for demonstration.'
    setNotice(message)
    record?.(
      editor.mode === 'add' ? 'Added a document requirement to' : 'Updated a document requirement for',
      selected.name,
      message,
    )
    setEditor(null)
    return null
  }

  const deactivate = () => {
    if (!deactivateId) return
    const requirement = selected.requirements.find((item) => item.id === deactivateId)
    updateRequirements(selected.id, (requirements) => requirements.map((item) =>
      item.id === deactivateId
        ? { ...item, active: false, history: [...item.history, 'Deactivated locally for demonstration; retained for historical reference.'] }
        : item,
    ))
    setNotice('Requirement deactivated locally and retained in the demonstration history.')
    record?.('Deactivated a document requirement for', selected.name, `Deactivation proposed for ${requirement?.name ?? 'a requirement'}`)
    setDeactivateId(null)
  }

  const detailRequirement = selected.requirements.find((requirement) => requirement.id === detailId)
  const deactivateRequirement = selected.requirements.find((requirement) => requirement.id === deactivateId)
  return (
    <>
      <div className="grid gap-6 font-sans">
        <div>
          <p role="heading" aria-level={2} className="text-xl font-semibold leading-tight">Payroll Types &amp; Document Requirements</p>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-muted">
            Maintain local reference configurations that can later drive the Employee New Submission checklist.
          </p>
        </div>

        {notice && (
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1"><Alert tone="success" title="Local demonstration saved">{notice}</Alert></div>
            <Button type="button" variant="link" onClick={() => setNotice('')}>Dismiss</Button>
          </div>
        )}

        <section className="overflow-hidden rounded-card bg-surface elevate" aria-labelledby="payroll-types-title">
          <div className="border-b border-border p-5 sm:p-6">
            <p id="payroll-types-title" role="heading" aria-level={3} className="text-lg font-semibold">Select Payroll Type</p>
            <p className="mt-1 text-sm leading-relaxed text-text-muted">
              Search the reference list, then choose the payroll type you want to configure.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <TextField
                label="Search payroll types"
                icon="search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name or category..."
              />
              <SelectField
                label="Payroll Type"
                value={filtered.some((type) => type.id === selected.id) ? selected.id : ''}
                onChange={(event) => {
                  if (!event.target.value) return
                  setSelectedId(event.target.value)
                  setNotice('')
                }}
                placeholder={filtered.length ? 'Select a payroll type' : 'No matching payroll types'}
                disabled={!filtered.length}
              >
                {filtered.map((type) => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </SelectField>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
              <span>{filtered.length} of {types.length} payroll types shown</span>
              {query && <Button type="button" variant="link" onClick={() => setQuery('')}>Clear search</Button>}
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <p id="payroll-details-title" role="heading" aria-level={3} className="text-lg font-semibold leading-snug">{selected.name}</p>
            <p className="mt-1 text-sm text-text-muted">Selected payroll type details</p>
            <dl className="mt-5 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-3">
              <Detail label="Employee Classification" value={selected.classification} />
              <Detail
                label="Employment Type"
                value={selected.employmentType}
                note={selected.employmentType === 'Lecturer' ? 'Lecturer is retained as its own reference category.' : undefined}
              />
              <Detail label="Submission Schedule" value={selected.schedule} />
            </dl>
            <p className="mt-4 text-xs leading-relaxed text-text-muted">
              This classification is descriptive only. Employee eligibility must be verified through HR-maintained employee and appointment records.
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-card bg-surface elevate" aria-labelledby="requirements-title">
          <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
            <div>
              <p id="requirements-title" role="heading" aria-level={3} className="text-lg font-semibold leading-snug">Document Requirements</p>
              <p className="mt-1 text-sm leading-relaxed text-text-muted">
                Configure documents for <span className="font-medium text-text">{selected.name}</span>.
              </p>
            </div>
            <Button type="button" onClick={() => setEditor({ mode: 'add', payrollTypeId: selected.id })} className="w-full sm:w-auto">
              <Icon name="plus" size={17} />
              Add Requirement
            </Button>
          </div>

          {selected.id === 'permanent-faculty' && (
            <div className="border-b border-border bg-info-soft/50 px-5 py-3 text-xs leading-relaxed text-text sm:px-6">
              <span className="font-semibold">Source note:</span> These entries are supported by the general employee submission procedure. They are not presented as the complete approved Permanent Faculty checklist.
            </div>
          )}

          {selected.requirements.length === 0 ? (
            <div className="px-5 py-14 text-center sm:py-16">
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-info-soft text-primary"><Icon name="clipboard" size={24} /></span>
              <p className="mt-4 text-sm font-semibold">No document requirements have been configured for this payroll type.</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-muted">Add requirements after confirmation by the concerned university office.</p>
              <Button type="button" variant="secondary" onClick={() => setEditor({ mode: 'add', payrollTypeId: selected.id })} className="mt-5">
                <Icon name="plus" size={16} /> Add Requirement
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-6xl w-full table-fixed text-left text-sm">
                <colgroup>
                  <col className="w-[42%]" />
                  <col className="w-[18%]" />
                  <col className="w-[20%]" />
                  <col className="w-[20%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-border bg-canvas text-xs text-text-muted">
                    <th scope="col" className="px-5 py-3 font-semibold">Requirement</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Requirement Type</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Triggering Condition</th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {selected.requirements.map((requirement) => (
                    <tr key={requirement.id} className={clsx('align-top', !requirement.active && 'opacity-60')}>
                      <td className="px-5 py-4">
                        <p className="font-semibold leading-snug">{requirement.name}</p>
                        {requirement.description && (
                          <p className="mt-1.5 text-xs leading-relaxed text-text-muted">{requirement.description}</p>
                        )}
                        {!requirement.active && (
                          <p className="mt-2 text-xs font-medium text-danger">Deactivated · retained for history</p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <RequirementTypeBadge type={requirement.type} />
                      </td>
                      <td className="px-5 py-4 leading-relaxed text-text-muted">
                        {requirement.trigger ?? 'Not applicable'}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                          <Button type="button" variant="link" onClick={() => setDetailId(requirement.id)}>View</Button>
                          <span className="text-border-strong" aria-hidden="true">·</span>
                          <Button type="button" variant="link" onClick={() => setEditor({ mode: 'edit', payrollTypeId: selected.id, requirementId: requirement.id })}>Edit</Button>
                          <span className="text-border-strong" aria-hidden="true">·</span>
                          <Button
                            type="button"
                            variant="link"
                            onClick={() => setDeactivateId(requirement.id)}
                            disabled={!requirement.active}
                            className="text-danger hover:text-danger"
                          >
                            Deactivate
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {editor && (
        <RequirementEditor
          key={`${editor.mode}-${editor.requirementId ?? 'new'}-${editor.payrollTypeId}`}
          editor={editor}
          payrollType={types.find((type) => type.id === editor.payrollTypeId) ?? selected}
          onClose={() => setEditor(null)}
          onSave={saveRequirement}
        />
      )}
      {detailRequirement && <RequirementDetails requirement={detailRequirement} onClose={() => setDetailId(null)} />}
      {deactivateRequirement && (
        <Modal title="Deactivate Requirement?" onClose={() => setDeactivateId(null)}>
          <Alert tone="warning" title="Keep the history intact">
            Deactivating removes <span className="font-semibold">{deactivateRequirement.name}</span> from the active demonstration checklist. It remains visible for conceptual audit history and is not erased.
          </Alert>
          <p className="mt-4 text-xs leading-relaxed text-text-muted">Prototype only. No official configuration or historical record is changed.</p>
          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setDeactivateId(null)}>Cancel</Button>
            <Button type="button" onClick={deactivate}>Confirm Deactivation</Button>
          </div>
        </Modal>
      )}
    </>
  )
}
