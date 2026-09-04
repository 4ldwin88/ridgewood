import { FormEvent, useEffect, useState } from 'react';
import { beginTotpEnrollment, getStrongVerificationState, verifyStrongFactor, type StrongVerificationState } from '../../infrastructure/auth/strongVerification';

export const STRONG_VERIFICATION_CHANGED = 'ridgewood:strong-verification-changed';

function message(error: unknown) {
  return error instanceof Error ? error.message : 'Strong verification could not be completed.';
}

function publish(state: StrongVerificationState) {
  window.dispatchEvent(new CustomEvent(STRONG_VERIFICATION_CHANGED, { detail: state }));
}

export function StrongVerificationPanel() {
  const [state, setState] = useState<StrongVerificationState | null>(null);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try { const next = await getStrongVerificationState(); setState(next); publish(next); }
    catch (caught) { setError(message(caught)); }
  }

  useEffect(() => {
    let active = true;
    void getStrongVerificationState().then((next) => {
      if (!active) return;
      setState(next);
      publish(next);
    }).catch((caught) => {
      if (active) setError(message(caught));
    });
    return () => { active = false; };
  }, []);

  async function enroll() {
    setBusy(true); setError(null);
    try {
      const enrollment = await beginTotpEnrollment();
      const next: StrongVerificationState = { currentLevel: state?.currentLevel ?? 'aal1', nextLevel: 'aal2', verifiedFactorId: state?.verifiedFactorId, enrollment };
      setState(next); publish(next);
    } catch (caught) { setError(message(caught)); }
    finally { setBusy(false); }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    const factorId = state?.verifiedFactorId ?? state?.enrollment?.factorId;
    if (!factorId || !code.trim()) return;
    setBusy(true); setError(null);
    try {
      await verifyStrongFactor(factorId, code);
      setCode('');
      await refresh();
    } catch (caught) { setError(message(caught)); }
    finally { setBusy(false); }
  }

  const verified = state?.currentLevel === 'aal2';
  return <div className="verification-control">
    <button type="button" className={verified ? 'verified-control' : ''} onClick={() => setOpen((value) => !value)}>{verified ? 'Identity verified' : 'Verify identity'}</button>
    {open ? <section className="verification-popover" aria-label="Strong verification">
      <strong>{verified ? 'Strong verification active' : 'Strong verification required'}</strong>
      {verified ? <p>This session is AAL2 and can execute governed Project Authorization, subject to business authority.</p> : <>
        <p>Project Authorization requires a second factor. This verification confirms identity; it does not grant business authority.</p>
        {!state?.verifiedFactorId && !state?.enrollment ? <button type="button" disabled={busy} onClick={() => void enroll()}>{busy ? 'Preparing…' : 'Set up authenticator'}</button> : null}
        {state?.enrollment ? <div className="verification-enrollment"><p>Scan this QR code with an authenticator app, or enter the secret manually.</p><img src={state.enrollment.qrCode} alt="Authenticator enrollment QR code"/><code>{state.enrollment.secret}</code></div> : null}
        {(state?.verifiedFactorId || state?.enrollment) ? <form onSubmit={verify}><label>6-digit authenticator code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} required /></label><button type="submit" disabled={busy || code.length !== 6}>{busy ? 'Verifying…' : 'Verify session'}</button></form> : null}
      </>}
      {error ? <p className="error-message" role="alert">{error}</p> : null}
    </section> : null}
  </div>;
}
