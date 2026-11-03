import type { PanelLayout } from './PanelLayout';
import type { PartLayout } from './PartLayout';

/**
 * Where the keyboard goes once a preset is applied: one of the workbench's
 * parts, or any view by its id.
 */
export type FocusTarget = 'editor' | 'sideBar' | 'secondarySideBar' | 'panel' | (string & {});

/**
 * A named arrangement of the workbench. A part left out is left as it is, so a
 * preset can be as narrow as "hide the panel".
 */
export interface Preset {
    readonly name: string;
    /** A codicon, as `$(name)`, shown in the status bar and the picker. */
    readonly icon?: string;
    readonly description?: string;
    readonly sideBar?: PartLayout;
    readonly secondarySideBar?: PartLayout;
    readonly panel?: PanelLayout;
    readonly focus?: FocusTarget;
    /** Run last, in order — for anything a layout cannot express. */
    readonly commands: readonly string[];
}
