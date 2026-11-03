/**
 * How a preset wants one part of the workbench to be.
 *
 * `maximized` exists only for the panel and the secondary side bar, because
 * those are the two parts VS Code itself can maximize. The primary side bar
 * cannot be made to fill the window; a preset gets close by hiding the rest.
 */
export type PartState = 'hidden' | 'visible' | 'maximized';

export const PART_STATES: readonly PartState[] = ['hidden', 'visible', 'maximized'];

export interface PartLayout {
    readonly state: PartState;
    /**
     * A view to bring to the front of the part — `gitHawkView`, `terminal`,
     * `workbench.explorer.fileView`. Any view id works: VS Code registers a
     * `<id>.focus` command for each one.
     */
    readonly view?: string;
}
