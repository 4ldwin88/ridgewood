import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../infrastructure/auth/supabaseClient';
import { developmentObservability } from '../../infrastructure/observability/supabaseDevelopmentObservability';
import { DevNotesButton } from '../../modules/development/DevNotesButton';
import { BusinessWorkspace } from '../../modules/business/BusinessWorkspace';

type Page = 'Home' | 'Business' | 'Projects' | 'Network' | 'More';
const pages: Page[] = ['Home', 'Business', 'Projects', 'Network', 'More'];
const APP_VERSION = 'v0.01';
const feedbackEnabled = import.meta.env.VITE_DEV_FEEDBACK_ENABLED !== 'false';

export function AppShell({ session }: { session: Session }) {
  const [page, setPage] = useState<Page>('Business');
  const [signingOut, setSigningOut] = useState(false);
  const pagePath = `/${page.toLowerCase()}`;

  useEffect(() => {
    void developmentObservability.capture({ eventName: 'route_view', pagePath, metadata: { page } });
  }, [page, pagePath]);

  async function signOut() {
    setSigningOut(true);
    void developmentObservability.capture({ eventName: 'auth_signed_out', pagePath });
    await supabase.auth.signOut();
    setSigningOut(false);
  }

  return (
    <div className="app-frame">
      <header className="topbar">
        <img src="/assets/ridgewood-horizontal-light.svg" alt="Ridgewood" />
        <div className="top-actions">
          <span className="version">{APP_VERSION}</span>
          {feedbackEnabled ? <DevNotesButton observability={developmentObservability} pagePath={pagePath} pageTitle={page} /> : null}
          <button type="button" onClick={signOut} disabled={signingOut}>{signingOut ? 'Exiting…' : 'Exit'}</button>
        </div>
      </header>
      <nav className="primary-nav" aria-label="Primary">{pages.map((item) => <button key={item} className={page === item ? 'active' : ''} onClick={() => setPage(item)}>{item}</button>)}</nav>
      <main className="workspace">
        <p className="eyebrow">{page}</p>
        <h1>{page === 'Business' ? 'Business pipeline' : page}</h1>
        {page === 'Business' ? <BusinessWorkspace /> : <EmptyFoundation page={page} />}
      </main>
      <footer><span>{session.user.email}</span><span>Ridgewood OS · {APP_VERSION}</span></footer>
    </div>
  );
}

function EmptyFoundation({ page }: { page: Page }) {
  return <section className="panel"><h2>{page} foundation</h2><p>This surface is intentionally minimal until its governed capability is implemented.</p></section>;
}
