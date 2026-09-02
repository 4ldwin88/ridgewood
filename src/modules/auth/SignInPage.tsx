import { FormEvent, useState } from 'react';

export interface SignInPageProps {
  onSignIn: (email: string, password: string) => Promise<void>;
  version: string;
}

export function SignInPage({ onSignIn, version }: SignInPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSignIn(email.trim(), password);
    } catch {
      setError('Unable to sign in. Check your credentials and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="sign-in-title">
        <div className="auth-brand">RIDGEWOOD</div>
        <p className="auth-eyebrow">OPERATING SYSTEM</p>
        <h1 id="sign-in-title">Sign in</h1>
        <p className="auth-copy">Access is provided to subscribed Ridgewood OS organizations and invited team members.</p>

        <form onSubmit={submit} className="auth-form">
          <label>
            Email
            <input
              autoComplete="username"
              inputMode="email"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Password
            <input
              autoComplete="current-password"
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error ? <p className="auth-error" role="alert">{error}</p> : null}
          <button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>

        <p className="auth-help">Need access? Contact your Ridgewood OS organization administrator.</p>
        <small className="build-version">Beta {version}</small>
      </section>
    </main>
  );
}
