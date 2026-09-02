import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AuthPortal } from '../features/auth/AuthPortal';
import { supabase } from '../infrastructure/auth/supabaseClient';
import { AppShell } from './shell/AppShell';
export function App(){const[session,setSession]=useState<Session|null>(null);const[loading,setLoading]=useState(true);const[error,setError]=useState<string|null>(null);useEffect(()=>{let active=true;supabase.auth.getSession().then(({data,error:e})=>{if(!active)return;if(e)setError(e.message);setSession(data.session);setLoading(false)});const{data}=supabase.auth.onAuthStateChange((_event,next)=>{setSession(next);setLoading(false)});return()=>{active=false;data.subscription.unsubscribe()}},[]);if(loading)return <main className="center-state"><p>Loading Ridgewood OS…</p><span>Beta 0.1</span></main>;if(error)return <main className="center-state"><h1>Unable to start Ridgewood OS</h1><p>{error}</p><span>Beta 0.1</span></main>;if(!session)return <AuthPortal/>;return <AppShell session={session}/>}
