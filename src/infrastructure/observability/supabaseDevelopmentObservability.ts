import { APP_VERSION } from '../../app/shell/AppShell';
import type { DevelopmentObservability, DevelopmentNoteInput, DevelopmentTelemetryEvent } from '../../application/ports/developmentObservability';
import { supabase } from '../auth/supabaseClient';

const sessionId = crypto.randomUUID();
async function currentUserId(): Promise<string | null> { const { data } = await supabase.auth.getUser(); return data.user?.id ?? null; }

export const developmentObservability: DevelopmentObservability = {
  async capture(event: DevelopmentTelemetryEvent) {
    try {
      const userId = await currentUserId();
      if (!userId) return;
      await supabase.from('development_telemetry').insert({ user_id: userId, session_id: sessionId, event_name: event.eventName, page_path: event.pagePath, app_version: APP_VERSION, metadata: event.metadata ?? {} });
    } catch { /* Observability must never block Ridgewood work. */ }
  },
  async submitNote(input: DevelopmentNoteInput) {
    const userId = await currentUserId();
    if (!userId) throw new Error('Authentication required.');
    const { error } = await supabase.from('development_notes').insert({ user_id: userId, page_path: input.pagePath, page_title: input.pageTitle, note: input.note, app_version: APP_VERSION, viewport_width: window.innerWidth, viewport_height: window.innerHeight, user_agent: navigator.userAgent, context: input.context ?? {} });
    if (error) throw error;
    void this.capture({ eventName: 'dev_note_submitted', pagePath: input.pagePath });
  },
};
