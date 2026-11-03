import type { PartLayout } from './PartLayout';

export type PanelPosition = 'bottom' | 'top' | 'left' | 'right';

export const PANEL_POSITIONS: readonly PanelPosition[] = ['bottom', 'top', 'left', 'right'];

/**
 * How far a top or bottom panel stretches. `center` keeps it under the editor
 * alone, so both side bars run the full height of the window beside it.
 */
export type PanelAlignment = 'center' | 'justify' | 'left' | 'right';

export const PANEL_ALIGNMENTS: readonly PanelAlignment[] = ['center', 'justify', 'left', 'right'];

export interface PanelLayout extends PartLayout {
    readonly position?: PanelPosition;
    readonly alignment?: PanelAlignment;
}
