import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Alert, Button, PasswordField, PasswordRules, TextField, passwordRules } from '../MsuPayroll'
import { DEMO_PASSWORD, type MockUser } from '../auth/mockData'
import { APPROVED_DOMAINS, emailDomainOk, seedUsers } from '../admin/data'
import { Modal, Tag } from '../admin/ui'

export type AccountProfile = { name: string; employeeId: string; email: string; username: string; role: string; office: string }

export function profileFor(user: MockUser, role: string): AccountProfile {
  const seeded = seedUsers.find((s) => s.username === user.username)
  const idx = Math.max(0, ['msantos', 'jdelacruz', 'avillanueva', 'rbautista', 'etorres', 'mlim', 'tnavarro', 'caquino', 'lmercado', 'preyes'].indexOf(user.username))
  return {
    name: user.name, email: user.email, username: user.username, role, office: user.office,
    employeeId: seeded?.employeeId ?? `TEST-${String(100 + idx).padStart(4, '0')}`,
  }
}

type EmailState = { status: 'idle' } | { status: 'pending'; email: string } | { status: 'failed'; email: string }
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const card = 'elevate rounded-card bg-surface p-5 sm:p-8'

function LockedField({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold mb-1.5">{label}</label>
      <input
        id={id} readOnly value={value} aria-describedby={hint ? `${id}-h` : undefined}
        className="w-full h-12 rounded-full bg-canvas border border-border text-base sm:text-sm text-text-muted px-5 cursor-default"
      />
      {hint && <p id={`${id}-h`} className="mt-1.5 text-xs text-text-muted">{hint}</p>}
    </div>
  )
}

function NameCorrectionDialog({ current, onClose, onSubmit }: { current: string; onClose: () => void; onSubmit: (name: string) => void }) {
  const [name, setName] = useState('')
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<{ name?: string; reason?: string }>({})
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!name.trim()) next.name = 'Enter the corrected full name.'
    else if (name.trim() === current) next.name = 'This is already your official name.'
    if (!reason.trim()) next.reason = 'Tell us what needs correcting.'
    setErrors(next)
    if (Object.keys(next).length) return
    setLoading(true)
    await wait(900)
    onSubmit(name.trim())
    setSent(true)
  }

  return (
    <Modal title={sent ? 'Correction requested' : 'Request a name correction'} onClose={onClose}>
      {sent ? (
        <>
          <Alert tone="info" title="Waiting for verification (simulated)">
            The HR Office would check your supporting documents before changing your official name. Your name stays as it is until then. Nothing is sent from this prototype.
          </Alert>
          <Footer><Button onClick={onClose} className="h-11! px-5!">Done</Button></Footer>
        </>
      ) : (
        <form onSubmit={submit} noValidate className="grid gap-4">
          <p className="text-sm text-text-muted -mt-2 text-pretty">Official names are payroll records. An authorized person verifies every correction.</p>
          <TextField label="Corrected full name" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
          <div>
            <label htmlFor="name-reason" className="block text-sm font-medium mb-1.5">What needs correcting</label>
            <textarea
              id="name-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={!!errors.reason || undefined}
              className={`w-full rounded-control bg-surface border text-base sm:text-sm text-text p-3.5 ${errors.reason ? 'border-danger' : 'border-border-strong hover:border-primary'}`}
            />
            {errors.reason && <p className="mt-1.5 text-xs text-danger font-medium">{errors.reason}</p>}
            <p className="mt-1.5 text-xs text-text-muted">Bring supporting documents, such as a civil registry record, to the HR Office.</p>
          </div>
          <Footer>
            <Button type="button" variant="secondary" onClick={onClose} className="h-11! px-5!">Cancel</Button>
            <Button type="submit" loading={loading} className="h-11! px-5!">{loading ? 'Submitting…' : 'Submit request'}</Button>
          </Footer>
        </form>
      )}
    </Modal>
  )
}

function ProfilePhoto({ name }: { name: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('')

  function pick(file?: File) {
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('Choose an image file, such as a JPG or PNG.')
    if (file.size > 2 * 1024 * 1024) return setError('Choose an image under 2 MB.')
    setError('')
    setUrl(URL.createObjectURL(file))
  }

  return (
    <div className="flex items-center gap-4">
      {url
        ? <img src={url} alt="Your profile photo" className="size-16 rounded-full object-cover shrink-0" />
        : <span aria-hidden="true" className="size-16 rounded-full bg-primary/15 text-primary text-lg font-semibold grid place-items-center shrink-0">{initials}</span>}
      <div className="min-w-0">
        <p className="text-sm font-semibold">Profile photo</p>
        <div className="flex flex-wrap gap-x-4 items-center">
          <Button variant="link" onClick={() => input.current?.click()}>{url ? 'Change photo' : 'Upload photo'}</Button>
          {url && <Button variant="link" onClick={() => setUrl(null)}>Remove</Button>}
        </div>
        <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
        {error ? <p role="alert" className="text-xs text-danger font-medium">{error}</p> : <p className="text-xs text-text-muted">Shown only on this device in the prototype.</p>}
      </div>
    </div>
  )
}

function Footer({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">{children}</div>
}

function ChangeEmailDialog({ currentEmail, onClose, onRequested }: { currentEmail: string; onClose: () => void; onRequested: (email: string) => void }) {
  const [step, setStep] = useState<'reauth' | 'email' | 'sent'>('reauth')
  const [pw, setPw] = useState('')
  const [email, setEmail] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function reauth(e: FormEvent) {
    e.preventDefault()
    if (!pw) return setErr('Enter your current password.')
    setLoading(true)
    await wait(800)
    setLoading(false)
    if (pw !== DEMO_PASSWORD) return setErr('The password is incorrect. Try again.')
    setErr('')
    setStep('email')
  }

  async function submitEmail(e: FormEvent) {
    e.preventDefault()
    const v = email.trim().toLowerCase()
    if (!v) return setErr('Enter the new institutional email.')
    if (!emailDomainOk(v)) return setErr(`Use an approved institutional address, such as name@${APPROVED_DOMAINS[1]}.`)
    if (v === currentEmail.toLowerCase()) return setErr('This is already your email.')
    if (seedUsers.some((u) => u.email.toLowerCase() === v)) return setErr('Another account already uses this email.')
    setErr('')
    setLoading(true)
    await wait(900)
    setLoading(false)
    onRequested(v)
    setStep('sent')
  }

  const titles = { reauth: 'Confirm it is you', email: 'Request an email change', sent: 'Verification pending' }
  return (
    <Modal title={titles[step]} onClose={onClose}>
      {step === 'reauth' && (
        <form onSubmit={reauth} noValidate className="grid gap-4">
          <p className="text-sm text-text-muted -mt-2 text-pretty">Enter your password before changing the email you sign in with.</p>
          <PasswordField label="Current password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} error={err} />
          <p className="text-xs text-text-muted">Prototype only: the demo password is <code>{DEMO_PASSWORD}</code>.</p>
          <Footer>
            <Button type="button" variant="secondary" onClick={onClose} className="h-11! px-5!">Cancel</Button>
            <Button type="submit" loading={loading} className="h-11! px-5!">{loading ? 'Checking…' : 'Continue'}</Button>
          </Footer>
        </form>
      )}
      {step === 'email' && (
        <form onSubmit={submitEmail} noValidate className="grid gap-4">
          <p className="text-sm text-text-muted -mt-2 text-pretty">Your sign-in email changes only after you verify the new address. Your username stays the same.</p>
          <TextField label="New institutional email" type="email" inputMode="email" autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder={`name@${APPROVED_DOMAINS[1]}`} value={email} onChange={(e) => setEmail(e.target.value)} error={err} />
          <Footer>
            <Button type="button" variant="secondary" onClick={onClose} className="h-11! px-5!">Cancel</Button>
            <Button type="submit" loading={loading} className="h-11! px-5!">{loading ? 'Requesting…' : 'Request change'}</Button>
          </Footer>
        </form>
      )}
      {step === 'sent' && (
        <>
          <Alert tone="info" title="Waiting for verification (simulated)">
            In the real system, a verification link goes to <strong className="break-all">{email.trim().toLowerCase()}</strong> and a notice goes to <strong className="break-all">{currentEmail}</strong>. No email is sent from this prototype.
          </Alert>
          <p className="mt-4 text-sm text-text-muted text-pretty">Keep signing in with your current email until the new one is verified.</p>
          <Footer><Button onClick={onClose} className="h-11! px-5!">Done</Button></Footer>
        </>
      )}
    </Modal>
  )
}

function ChangePassword() {
  const [f, setF] = useState({ cur: '', next: '', confirm: '' })
  const [errors, setErrors] = useState<Partial<typeof f>>({})
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const set = (k: keyof typeof f) => (v: string) => { setDone(false); setF((s) => ({ ...s, [k]: v })) }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!f.cur) next.cur = 'Enter your current password.'
    if (!f.next) next.next = 'Enter a new password.'
    else if (!passwordRules.every((r) => r.test(f.next))) next.next = 'Your new password does not meet all requirements yet.'
    else if (f.next === f.cur) next.next = 'Choose a password different from your current one.'
    if (!f.confirm) next.confirm = 'Confirm your new password.'
    else if (f.confirm !== f.next) next.confirm = 'Passwords do not match.'
    setErrors(next)
    setDone(false)
    if (Object.keys(next).length) return
    setLoading(true)
    await wait(900)
    setLoading(false)
    if (f.cur !== DEMO_PASSWORD) return setErrors({ cur: 'Your current password is incorrect.' })
    setF({ cur: '', next: '', confirm: '' })
    setDone(true)
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      {done && <Alert tone="success" title="Password changed (simulated)">Use your new password the next time you sign in. Other devices would be signed out.</Alert>}
      <PasswordField label="Current password" autoComplete="current-password" value={f.cur} onChange={(e) => set('cur')(e.target.value)} error={errors.cur} />
      <PasswordField label="New password" autoComplete="new-password" value={f.next} onChange={(e) => set('next')(e.target.value)} error={errors.next} />
      <PasswordRules value={f.next} />
      <PasswordField label="Confirm new password" autoComplete="new-password" value={f.confirm} onChange={(e) => set('confirm')(e.target.value)} error={errors.confirm} />
      <p className="text-xs text-text-muted">Prototype only: the demo current password is <code>{DEMO_PASSWORD}</code>.</p>
      <div><Button type="submit" loading={loading} className="h-11! px-5!">{loading ? 'Saving…' : 'Change password'}</Button></div>
    </form>
  )
}

export function MyAccount({
  profile, lastSignIn, onAudit,
}: {
  profile: AccountProfile
  lastSignIn?: string
  onAudit?: (action: string, target: string, toast: string) => void
}) {
  const [email, setEmail] = useState(profile.email)
  const [emailState, setEmailState] = useState<EmailState>({ status: 'idle' })
  const [emailDialog, setEmailDialog] = useState(false)
  const [verified, setVerified] = useState(false)

  const [nameDialog, setNameDialog] = useState(false)
  const [nameRequest, setNameRequest] = useState<string | null>(null)
  const [preferred, setPreferred] = useState('')
  const [prefSaved, setPrefSaved] = useState(false)
  const prefId = useId()
  const [tab, setTab] = useState<'personal' | 'security'>('personal')
  const tabs = [['personal', 'Personal Information'], ['security', 'Security']] as const

  return (
    <div className="grid gap-6">
      <section className={card} aria-labelledby="acct-title">
        <h2 id="acct-title" className="text-lg font-semibold mb-4">My Account</h2>
        <div role="tablist" aria-label="My Account sections" className="grid grid-cols-2 rounded-full bg-canvas p-1 mb-6">
          {tabs.map(([id, label]) => (
            <button
              key={id} type="button" role="tab" id={`tab-${id}`} aria-selected={tab === id} aria-controls={`panel-${id}`}
              tabIndex={tab === id ? 0 : -1}
              onClick={() => setTab(id)}
              onKeyDown={(e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const n = id === 'personal' ? 'security' : 'personal'; setTab(n); document.getElementById(`tab-${n}`)?.focus() } }}
              className={`min-h-11 rounded-full text-sm font-medium cursor-pointer transition-colors ${tab === id ? 'bg-surface text-text elevate font-semibold' : 'text-text-muted hover:text-text'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'personal' && (
          <div role="tabpanel" id="panel-personal" aria-labelledby="tab-personal" className="grid gap-x-8 gap-y-5 md:grid-cols-2 [&>.wide]:md:col-span-2">
            <div className="wide"><ProfilePhoto name={profile.name} /></div>
            <div className="wide">
              <label htmlFor={prefId} className="block text-sm font-semibold mb-1.5">Preferred Display Name</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  id={prefId} value={preferred} autoComplete="nickname" placeholder={profile.name.split(' ')[0]}
                  onChange={(e) => { setPreferred(e.target.value); setPrefSaved(false) }}
                  className="flex-1 min-w-0 h-12 rounded-full bg-surface border border-border-strong hover:border-primary text-base sm:text-sm text-text placeholder:text-text-muted/70 px-5"
                />
                <Button className="h-12!" onClick={() => { setPrefSaved(true); onAudit?.('Updated the display name of', profile.name, 'Display name updated (simulated)') }}>Save name</Button>
              </div>
              <p className="mt-1.5 text-xs text-text-muted" role={prefSaved ? 'status' : undefined}>{prefSaved ? 'Display name saved (simulated). Your official name does not change.' : 'You can edit this yourself. It is used in greetings, not on payroll records.'}</p>
            </div>
            <LockedField label="Full Name" value={profile.name} hint="Official name changes require verification." />
            {nameRequest ? (
              <div className="wide"><Alert tone="info" title="Name correction pending">Your request to change your name to “{nameRequest}” is waiting for HR Office verification (simulated).</Alert></div>
            ) : (
              <Button fullWidth className="wide" onClick={() => setNameDialog(true)}>Request name correction</Button>
            )}
            <LockedField label="Employee ID" value={profile.employeeId} />
            <LockedField label="Username" value={profile.username} />
            <LockedField label="Assigned Role" value={profile.role} hint="Roles are assigned by a System Administrator." />
            <LockedField label="Institutional Email" value={email} hint="Use Change Email to request a verified update." />

            {verified && emailState.status === 'idle' && (
              <div className="wide"><Alert tone="success" title="Email changed (simulated)">Sign in with {email} from now on. Your username is still {profile.username}.</Alert></div>
            )}
            {emailState.status === 'pending' && (
              <div className="wide grid gap-3">
                <Alert tone="info" title="Verification pending">
                  We are waiting for you to verify <strong className="break-all">{emailState.email}</strong>. Until then, sign in with your current email.
                </Alert>
                <div className="rounded-control border border-dashed border-border-strong p-3 grid gap-2">
                  <div><Tag kind="proposed">Prototype only</Tag></div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" className="h-10! px-4!" onClick={() => { setEmail(emailState.email); setVerified(true); setEmailState({ status: 'idle' }); onAudit?.('Changed the email of', profile.name, 'Email change verified (simulated)') }}>Simulate verified link</Button>
                    <Button variant="secondary" className="h-10! px-4!" onClick={() => setEmailState({ status: 'failed', email: emailState.email })}>Simulate expired link</Button>
                    <Button variant="link" onClick={() => setEmailState({ status: 'idle' })}>Cancel request</Button>
                  </div>
                </div>
              </div>
            )}
            {emailState.status === 'failed' && (
              <div className="wide"><Alert tone="danger" title="Email not changed">
                The verification link for {emailState.email} expired or could not be confirmed. Your sign-in email is still {email}.
              </Alert></div>
            )}
            {emailState.status !== 'pending' && (
              <Button fullWidth className="wide" onClick={() => { setVerified(false); setEmailState({ status: 'idle' }); setEmailDialog(true) }}>
                {emailState.status === 'failed' ? 'Try Change Email again' : 'Change Email'}
              </Button>
            )}
            <p className="wide text-xs text-text-muted text-pretty">
              To correct your official name, employee ID, or role, contact the HR Office. An authorized person verifies the change.{lastSignIn ? ` Last sign-in: ${lastSignIn}.` : ''}
            </p>
          </div>
        )}

        {tab === 'security' && (
          <div role="tabpanel" id="panel-security" aria-labelledby="tab-security">
            <p className="text-sm text-text-muted mb-5">Change the password you use to sign in. Nobody, including administrators, can see it.</p>
            <ChangePassword />
          </div>
        )}
      </section>

      {nameDialog && <NameCorrectionDialog current={profile.name} onClose={() => setNameDialog(false)} onSubmit={setNameRequest} />}

      {emailDialog && (
        <ChangeEmailDialog
          currentEmail={email}
          onClose={() => setEmailDialog(false)}
          onRequested={(v) => setEmailState({ status: 'pending', email: v })}
        />
      )}
    </div>
  )
}
