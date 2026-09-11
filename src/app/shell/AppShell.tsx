import ridgewoodLogo from '../../../assets/ridgewood-horizontal-dark.svg';
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../infrastructure/auth/supabaseClient';
import { developmentObservability } from '../../infrastructure/observability/supabaseDevelopmentObservability';
import { DevNotesButton } from '../../modules/development/DevNotesButton';
import { BusinessWorkspace } from '../../modules/business/BusinessWorkspace';
import { ProjectsWorkspace } from '../../modules/projects/ProjectsWorkspace';

type Page = 'Home' | 'Business' | 'Projects' | 'Network' | 'More';
const pages: Page[] = ['Home', 'Projects', 'Business', 'Network', 'More'];
const navIcons: Record<Page, string> = {Home:'M3 10 12 3l9 7v10H3V10Zm6 10v-7h6v7',Projects:'M3 7h18v14H3V7Zm4 0V3h10v4M3 12h18',Business:'M4 20V10h4v10M10 20V4h4v16M16 20v-7h4v7',Network:'M8 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 21v-3a6 6 0 0 1 12 0v3m0-8a6 6 0 0 1 8 5v3',More:'M4 5h16M4 12h16M4 19h16'};
export const APP_VERSION = 'v0.25';
const feedbackEnabled = import.meta.env.VITE_DEV_FEEDBACK_ENABLED !== 'false';

export function AppShell({ session }: { session: Session }) {
  const [page, setPage] = useState<Page>('Business');
  const [signingOut, setSigningOut] = useState(false);
  const pagePath = `/${page.toLowerCase()}`;
  useEffect(() => { void developmentObservability.capture({ eventName: 'route_view', pagePath, metadata: { page } }); }, [page, pagePath]);
  async function signOut() { setSigningOut(true); void developmentObservability.capture({ eventName: 'auth_signed_out', pagePath }); await supabase.auth.signOut(); setSigningOut(false); }
  const pageTitle = page === 'Business' ? 'Business pipeline' : page;
  const content = page === 'Business' ? <BusinessWorkspace/> : page === 'Projects' ? <ProjectsWorkspace/> : <EmptyFoundation page={page}/>;
  return <div className="app-frame"><header className="topbar"><img src={ridgewoodLogo} alt="Ridgewood"/><div className="top-actions"><span className="version">{APP_VERSION}</span>{feedbackEnabled ? <DevNotesButton observability={developmentObservability} pagePath={pagePath} pageTitle={page}/> : null}<button type="button" onClick={signOut} disabled={signingOut}>{signingOut ? 'Exiting…' : 'Exit'}</button></div></header><a className="skip-link" href="#main-workspace">Skip to workspace</a><nav className="primary-nav" aria-label="Primary">{pages.map((item) => <button key={item} className={page === item ? 'active' : ''} aria-current={page === item ? 'page' : undefined} onClick={() => setPage(item)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={navIcons[item]}/></svg>{item}</button>)}</nav><main id="main-workspace" className="workspace"><div className="page-heading"><div><p className="eyebrow">Ridgewood workspace</p><h1>{pageTitle}</h1></div><span className="demo-label">Demo · awaiting acceptance</span></div>{content}</main><footer><span>{session.user.email}</span><span>Ridgewood OS · {APP_VERSION}</span></footer></div>;
}
function EmptyFoundation({ page }: { page: Page }) { return <section className="panel"><h2>{page}</h2><p>This area is not available in the current demo. Open Business to work from Opportunity through Authorization, or Projects to review authorized records.</p></section>; }
