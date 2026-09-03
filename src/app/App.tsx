import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AuthPortal } from '../features/auth/AuthPortal';
import { supabase } from '../infrastructure/auth/supabaseClient';
import { AppShell, APP_VERSION } from './shell/AppShell';

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setError(sessionError.message);
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); setLoading(false); });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  if (loading) return <main className="center-state"><p>Loading Ridgewood OS…</p><span>{APP_VERSION}</span></main>;
  if (error) return <main className="center-state"><h1>Unable to start Ridgewood OS</h1><p>{error}</p><span>{APP_VERSION}</span></main>;
  if (!session) return <AuthPortal />;
  return <AppShell session={session} />;
}
