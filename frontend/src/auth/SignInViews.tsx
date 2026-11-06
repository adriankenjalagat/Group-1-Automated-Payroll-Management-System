import { useState, type FormEvent } from 'react'
import { apiClient } from '../api/client'
import { Alert, Button, PasswordField, StatusMark, TextField } from '../MsuPayroll'
import { BackLink, ViewHeader } from './AuthShell'
import { DEMO_PASSWORD, findUser, type MockUser } from './mockData'

const REMEMBER_KEY = 'msu-remembered-id'
const wait = (ms = 900) => new Promise((r) => setTimeout(r, ms))

export function SignIn({
  onForgot,
  onSuccess,
}: {
  onForgot: () => void
  onSuccess: (u: MockUser) => void
}) {
  const [identifier, setIdentifier] = useState(() => localStorage.getItem(REMEMBER_KEY) ?? '')
  const [remember, setRemember] = useState(() => localStorage.getItem(REMEMBER_KEY) !== null)
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({})
  const [formError, setFormError] = useState<{ tone: 'danger' | 'warning'; title: string; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!identifier.trim()) next.identifier = 'Enter your email or username.'
    if (!password) next.password = 'Enter your password.'
    setErrors(next)
    setFormError(null)
    if (Object.keys(next).length) return
    setLoading(true)
    try {
      const response = await apiClient.post<{ user: MockUser; status?: string }>(
        '/auth/login',
        { identifier: identifier.trim(), password },
      )
      setLoading(false)
      if (remember) localStorage.setItem(REMEMBER_KEY, identifier.trim())
      else localStorage.removeItem(REMEMBER_KEY)
      return onSuccess(response.user)
    } catch (err) {
      // Fallback to local mockData when backend is offline
      if (err instanceof TypeError) {
        await wait()
        setLoading(false)
        const user = findUser(identifier)
        if (user && user.status === 'active' && password === DEMO_PASSWORD) {
          if (remember) localStorage.setItem(REMEMBER_KEY, identifier.trim())
          else localStorage.removeItem(REMEMBER_KEY)
          return onSuccess(user)
        }
        if (user && user.status === 'locked' && password === DEMO_PASSWORD) {
          return setFormError({
            tone: 'warning',
            title: 'Account locked',
            text: 'Your account has been locked after repeated failed attempts. Contact a System Administrator to unlock it.',
          })
        }
        return setFormError({
          tone: 'danger',
          title: 'Sign-in failed',
          text: 'The email, username, or password you entered is incorrect. Check your details and try again.',
        })
      }

      setLoading(false)
      const msg = err instanceof Error ? err.message : ''
      if (msg.toLowerCase().includes('locked')) {
        return setFormError({
          tone: 'warning',
          title: 'Account locked',
          text: 'Your account has been locked after repeated failed attempts. Contact a System Administrator to unlock it.',
        })
      }
      setFormError({
        tone: 'danger',
        title: 'Sign-in failed',
        text: 'The email, username, or password you entered is incorrect. Check your details and try again.',
      })
    }
  }

  return (
    <>
      <ViewHeader title="Sign in to your account" subtitle="Enter your university email or assigned username to continue." />
      <form onSubmit={submit} noValidate className="grid gap-4">
        {formError && (
          <Alert tone={formError.tone} title={formError.title}>
            {formError.text}
          </Alert>
        )}
        <TextField
          label="Email or username"
          icon="user"
          autoComplete="username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          error={errors.identifier}
          placeholder="name@msunaawan.example"
        />
        <PasswordField
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <div className="flex items-center justify-between gap-3 -mt-1">
          <label className="flex items-center gap-3 min-h-11 cursor-pointer text-sm select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="size-5 shrink-0 rounded accent-primary cursor-pointer"
            />
            Remember me
          </label>
          <Button type="button" variant="link" onClick={onForgot} className="text-sm">
            Forgot password?
          </Button>
        </div>
        <Button type="submit" fullWidth loading={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </>
  )
}

export function ForgotPassword({ onBack, onSent }: { onBack: () => void; onSent: (id: string) => void }) {
  const [identifier, setIdentifier] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!identifier.trim()) return setError('Enter your email or username.')
    setError('')
    setLoading(true)
    await wait()
    onSent(identifier.trim())
  }

  return (
    <>
      <div className="mb-5"><BackLink onClick={onBack}>Back to sign in</BackLink></div>
      <ViewHeader title="Reset your password" subtitle="Enter your email or username and we will send reset instructions if an account matches." />
      <form onSubmit={submit} noValidate className="grid gap-4">
        <TextField label="Email or username" icon="mail" autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} error={error} />
        <Button type="submit" fullWidth loading={loading}>
          {loading ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
    </>
  )
}

export function RecoveryConfirmation({
  identifier,
  onBack,
  onAdmin,
  onOpenLink,
}: {
  identifier: string
  onBack: () => void
  onAdmin: () => void
  onOpenLink: () => void
}) {
  const [resent, setResent] = useState(false)
  return (
    <>
      <ViewHeader
        icon={<StatusMark tone="info" icon="mail" />}
        title="Check your email"
        subtitle={
          <>
            If an account matches <strong className="text-text break-all">{identifier}</strong>, a reset link has been sent. The link expires in 30 minutes.
          </>
        }
      />
      {resent && (
        <div className="mb-4"><Alert tone="success" title="Link sent again">Check your inbox and spam folder.</Alert></div>
      )}
      <div className="grid gap-3">
        <Button variant="secondary" fullWidth onClick={() => setResent(true)}>Resend link</Button>
        <Button variant="link" onClick={onAdmin}>I can’t access my email</Button>
        <Button variant="link" onClick={onBack}>Back to sign in</Button>
      </div>
      <div className="mt-6 rounded-control border border-dashed border-border-strong p-3 text-xs text-text-muted">
        <p className="font-semibold text-text mb-1">Prototype only</p>
        No email is sent. <button type="button" onClick={onOpenLink} className="text-primary underline underline-offset-2 cursor-pointer">Open the simulated reset link</button>.
      </div>
    </>
  )
}

export function AdminAssistedRecovery({ onBack }: { onBack: () => void }) {
  const steps = [
    'Contact the System Administrator (Information Systems Office).',
    'Confirm your identity with your employee ID and office.',
    'The administrator issues a new reset link to your verified email.',
  ]
  return (
    <>
      <div className="mb-5"><BackLink onClick={onBack}>Back to sign in</BackLink></div>
      <ViewHeader title="Get help from an administrator" subtitle="If you cannot receive email, an administrator can verify you and restore access." />
      <ol className="grid gap-3 mb-6">
        {steps.map((s, i) => (
          <li key={s} className="flex gap-3 text-sm">
            <span className="size-7 shrink-0 rounded-full bg-primary text-on-primary grid place-items-center text-xs font-semibold">{i + 1}</span>
            <span className="pt-0.5">{s}</span>
          </li>
        ))}
      </ol>
      <Alert tone="info" title="Contact">
        Information Systems Office · local 214 · iso@msunaawan.example
      </Alert>
    </>
  )
}
