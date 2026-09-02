import { FormEvent, useState } from 'react';
import { isTestingSignupEnabled } from '../../infrastructure/auth/authMode';
import { supabase } from '../../infrastructure/auth/supabaseClient';

type AuthView = 'sign-in' | 'sign-up';

export function AuthPortal() {
  const [view, setView] = useState<AuthView>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    const result = view === 'sign-up' && isTestingSignupEnabled
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    setBusy(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (view === 'sign-up' && !result.data.session) {
      setMessage('Account created. Check your email to confirm your address, then sign in.');
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <img src="/assets/ridgewood-horizontal-light.svg" alt="Ridgewood" className="auth-logo" />
        <p className="eyebrow">Ridgewood OS · Beta 0.1</p>
        <h1 id="auth-title">{view === 'sign-in' ? 'Sign in' : 'Create testing account'}</h1>
        <p className="auth-copy">
          {view === 'sign-in'
            ? 'Access the Ridgewood operating system.'
            : 'Testing access only. Production accounts will be provisioned through subscribed organizations.'}
        </p>
        <form onSubmit={submit}>
          <label>Email<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label>Password<input type="password" autoComplete={view === 'sign-in' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required /></label>
          <button type="submit" disabled={busy}>{busy ? 'Working…' : view === 'sign-in' ? 'Sign in' : 'Create account'}</button>
        </form>
        {message && <p role="status" className="auth-message">{message}</p>}
        {isTestingSignupEnabled && (
          <button className="auth-switch" type="button" onClick={() => { setMessage(null); setView(view === 'sign-in' ? 'sign-up' : 'sign-in'); }}>
            {view === 'sign-in' ? 'Need a testing account? Sign up' : 'Already have an account? Sign in'}
          </button>
        )}
        {!isTestingSignupEnabled && <p className="auth-footnote">New access is provisioned by your organization administrator.</p>}
      </section>
    </main>
  );
}
