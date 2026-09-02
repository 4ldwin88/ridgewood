export type DevelopmentTelemetryEventName =
  | 'route_view'
  | 'form_started'
  | 'form_section_saved'
  | 'validation_blocked'
  | 'command_attempted'
  | 'command_rejected'
  | 'command_succeeded'
  | 'unexpected_error'
  | 'dead_end_detected'
  | 'auth_signed_in'
  | 'auth_signed_up'
  | 'auth_signed_out'
  | 'dev_note_submitted';

export interface DevelopmentTelemetryEvent {
  eventName: DevelopmentTelemetryEventName;
  pagePath: string;
  metadata?: Record<string, unknown>;
}

export interface DevelopmentNoteInput {
  pagePath: string;
  pageTitle?: string;
  note: string;
  context?: Record<string, unknown>;
}

export interface DevelopmentObservability {
  capture(event: DevelopmentTelemetryEvent): Promise<void>;
  submitNote(input: DevelopmentNoteInput): Promise<void>;
}
