export type StageToolWorkState =
  | 'not_started'
  | 'in_progress'
  | 'complete'
  | 'optional'
  | 'not_applicable'
  | 'blocked'
  | 'unknown';

const workStateLabel: Record<StageToolWorkState, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  complete: 'Complete',
  optional: 'Optional',
  not_applicable: 'Not applicable',
  blocked: 'Blocked',
  unknown: 'Unknown',
};

export function StageToolLauncher({
  label,
  description,
  state,
  icon,
  disabled = false,
  onOpen,
}: {
  label: string;
  description?: string;
  state: StageToolWorkState;
  icon?: string;
  disabled?: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      className="stage-tool-launcher"
      disabled={disabled}
      onClick={onOpen}
      aria-label={`${label} — ${workStateLabel[state]}`}
    >
      <span className="stage-tool-launcher__identity">
        {icon ? <span className="stage-tool-launcher__icon" aria-hidden="true">{icon}</span> : null}
        <span className="stage-tool-launcher__copy">
          <strong>{label}</strong>
          {description ? <small>{description}</small> : null}
        </span>
      </span>
      <span className={`status-pill stage-tool-launcher__status status-${state}`}>
        {workStateLabel[state]}
      </span>
    </button>
  );
}
