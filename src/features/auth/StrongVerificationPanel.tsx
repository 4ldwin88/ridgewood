import { FormEvent, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { beginTotpEnrollment, getStrongVerificationState, verifyStrongFactor, type StrongVerificationState } from '../../infrastructure/auth/strongVerification';

export const STRONG_VERIFICATION_CHANGED = 'ridgewood:strong-verification-changed';

function message(error: unknown) { return error instanceof Error ? error.message : 'Strong verification could not be completed.'; }
function publish(state: StrongVerificationState) { window.dispatchEvent(new CustomEvent(STRONG_VERIFICATION_CHANGED, { detail: state })); }

export function StrongVerificationPanel() {
  const [state, setState] = useState<StrongVerificationState | null>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() { const next = await getStrongVerificationState(); setState(next); publish(next); }

  useEffect(() => {
    let active = true;
    const locate = () => {
      const authorize = [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Authorize project');
      setTarget(authorize?.closest('.panel') as HTMLElement | null);
    };
    const timer = window.setTimeout(() => { locate(); void getStrongVerificationState().then((next) => { if (active) { setState(next); publish(next); } }).catch((caught) => { if (active) setError(message(caught)); }); }, 0);
    const observer = new MutationObserver(locate); observer.observe(document.body, { childList: true, subtree: true });
    return () => { active = false; window.clearTimeout(timer); observer.disconnect(); };
  }, []);

  async function enroll() {
    setBusy(true); setError(null); setCopied(false);
    try { const enrollment = await beginTotpEnrollment(); const next: StrongVerificationState = { currentLevel: state?.currentLevel ?? 'aal1', nextLevel: 'aal2', verifiedFactorId: state?.verifiedFactorId, unverifiedFactorIds: [], enrollment }; setState(next); publish(next); }
    catch (caught) { setError(message(caught)); } finally { setBusy(false); }
  }

  async function copySecret() { if (!state?.enrollment?.secret) return; try { await navigator.clipboard.writeText(state.enrollment.secret); setCopied(true); } catch { setError('Could not copy the setup key. Press and hold the key to copy it manually.'); } }

  async function verify(event: FormEvent) {
    event.preventDefault(); const factorId = state?.verifiedFactorId ?? state?.enrollment?.factorId; if (!factorId || !code.trim()) return;
    setBusy(true); setError(null); try { await verifyStrongFactor(factorId, code); setCode(''); await refresh(); } catch (caught) { setError(message(caught)); } finally { setBusy(false); }
  }

  if (!target || state?.currentLevel === 'aal2') return null;
  const hasIncompleteSetup = Boolean(state?.unverifiedFactorIds.length);
  return createPortal(<div className="verification-control verification-inline"><section className="verification-popover" aria-label="Strong verification"><strong>Verify identity</strong><p>Project Authorization requires a second factor. This confirms identity; it does not grant business authority.</p>{state?.verifiedFactorId ? <p>Open your authenticator app and enter the current six-digit Ridgewood OS code below.</p> : state?.enrollment ? <div className="verification-enrollment"><p>On this phone, add an account manually in your authenticator app and use this setup key. The QR code is only for another device.</p><div className="setup-key"><code>{state.enrollment.secret}</code><button type="button" className="secondary" onClick={() => void copySecret()}>{copied ? 'Copied' : 'Copy setup key'}</button></div><details open><summary>QR code</summary><img src={state.enrollment.qrCode} alt="Authenticator enrollment QR code"/></details></div> : <><p>{hasIncompleteSetup ? 'An incomplete authenticator setup was found. Resetting setup removes the incomplete enrollment and generates a fresh QR code and setup key.' : 'No authenticator is set up yet.'}</p><button type="button" disabled={busy} onClick={() => void enroll()}>{busy ? 'Resetting…' : hasIncompleteSetup ? 'Reset authenticator and generate new QR' : 'Set up authenticator'}</button></>}{(state?.verifiedFactorId || state?.enrollment) ? <form onSubmit={verify}><label>6-digit authenticator code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} required /></label><button type="submit" disabled={busy || code.length !== 6}>{busy ? 'Verifying…' : 'Verify session'}</button></form> : null}{error ? <p className="error-message" role="alert">{error}</p> : null}</section></div>, target);
}
