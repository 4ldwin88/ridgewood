export type AppMode = 'operate' | 'control' | 'direct';

/**
 * Mode controls presentation and attention emphasis only.
 * It must never be used as an authorization or permission check.
 */
export interface ModeContext {
  mode: AppMode;
}
