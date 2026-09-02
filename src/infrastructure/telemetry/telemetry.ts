export type TelemetryEventName =
  | 'route_view'
  | 'form_started'
  | 'form_section_saved'
  | 'validation_blocked'
  | 'command_attempted'
  | 'command_rejected'
  | 'command_succeeded'
  | 'unexpected_error';

export interface TelemetryEvent {
  name: TelemetryEventName;
  occurredAt: string;
  entityId?: string;
  state?: string;
  reasonCode?: string;
}

export interface TelemetrySink {
  capture(event: TelemetryEvent): void | Promise<void>;
}

export class ConsoleTelemetrySink implements TelemetrySink {
  capture(event: TelemetryEvent): void {
    // Deliberately excludes free-form business content.
    console.info('[ridgewood-telemetry]', event);
  }
}
