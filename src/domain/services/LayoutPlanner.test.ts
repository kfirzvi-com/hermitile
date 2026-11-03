import { describe, expect, it } from 'vitest';
import type { Preset } from '../models/Preset';
import { LayoutPlanner } from './LayoutPlanner';

const planner = new LayoutPlanner();
const commands = (preset: Partial<Preset>) =>
    planner.plan({ name: 'test', commands: [], ...preset }).map((step) => step.command);

describe('LayoutPlanner', () => {
    it('always starts by releasing a maximized secondary side bar', () => {
        expect(commands({})).toEqual(['workbench.action.restoreAuxiliaryBar']);
    });

    it('leaves out the parts a preset does not mention', () => {
        expect(commands({ sideBar: { state: 'hidden' } })).toEqual([
            'workbench.action.restoreAuxiliaryBar',
            'workbench.action.closeSidebar',
        ]);
    });

    it('opens a side bar by focusing the view it should show', () => {
        expect(commands({ sideBar: { state: 'visible', view: 'gitHawkChanges' } })).toContain(
            'gitHawkChanges.focus'
        );
        expect(commands({ sideBar: { state: 'visible' } })).toContain('workbench.action.focusSideBar');
    });

    it('maximizes the panel from a closed panel, so the toggle cannot go the wrong way', () => {
        expect(commands({ panel: { state: 'maximized', view: 'gitHawkView' } })).toEqual([
            'workbench.action.restoreAuxiliaryBar',
            'workbench.action.closePanel',
            'workbench.action.toggleMaximizedPanel',
            'gitHawkView.focus',
        ]);
    });

    it('sets the panel position and alignment before anything is shown in it', () => {
        expect(
            commands({ panel: { state: 'maximized', position: 'bottom', alignment: 'center' } })
        ).toEqual([
            'workbench.action.restoreAuxiliaryBar',
            'workbench.action.positionPanelBottom',
            'workbench.action.alignPanelCenter',
            'workbench.action.closePanel',
            'workbench.action.toggleMaximizedPanel',
        ]);
    });

    it('opens a centred panel un-maximized by maximizing and restoring it', () => {
        // Opening alone would bring it back maximized if it was last closed so.
        expect(commands({ panel: { state: 'visible', alignment: 'center' } })).toEqual([
            'workbench.action.restoreAuxiliaryBar',
            'workbench.action.alignPanelCenter',
            'workbench.action.closePanel',
            'workbench.action.toggleMaximizedPanel',
            'workbench.action.toggleMaximizedPanel',
        ]);
    });

    it('opens a panel of unknown alignment plainly, since VS Code may refuse to maximize it', () => {
        expect(commands({ panel: { state: 'visible' } })).toEqual([
            'workbench.action.restoreAuxiliaryBar',
            'workbench.action.closePanel',
            'workbench.action.focusPanel',
        ]);
    });

    it('treats a side panel as maximizable whatever its alignment', () => {
        expect(commands({ panel: { state: 'visible', position: 'right' } })).toEqual([
            'workbench.action.restoreAuxiliaryBar',
            'workbench.action.positionPanelRight',
            'workbench.action.closePanel',
            'workbench.action.toggleMaximizedPanel',
            'workbench.action.toggleMaximizedPanel',
        ]);
    });

    it('ignores the other parts when the secondary side bar is maximized over them', () => {
        expect(
            commands({
                sideBar: { state: 'visible' },
                panel: { state: 'visible' },
                secondarySideBar: { state: 'maximized', view: 'terminal' },
                focus: 'secondarySideBar',
            })
        ).toEqual([
            'workbench.action.restoreAuxiliaryBar',
            'workbench.action.maximizeAuxiliaryBar',
            'terminal.focus',
            'workbench.action.focusAuxiliaryBar',
        ]);
    });

    it('focuses last, then runs the preset’s own commands in order', () => {
        expect(commands({ focus: 'editor', commands: ['first', 'second'] })).toEqual([
            'workbench.action.restoreAuxiliaryBar',
            'workbench.action.focusActiveEditorGroup',
            'first',
            'second',
        ]);
    });

    it('focuses a view by id', () => {
        expect(commands({ focus: 'gitHawkView' }).at(-1)).toBe('gitHawkView.focus');
    });

    it('builds the Commits layout: graph full height beside the files', () => {
        expect(
            commands({
                sideBar: { state: 'visible', view: 'gitHawkChanges' },
                secondarySideBar: { state: 'hidden' },
                panel: { state: 'maximized', view: 'gitHawkView', position: 'bottom', alignment: 'center' },
                focus: 'gitHawkView',
            })
        ).toEqual([
            'workbench.action.restoreAuxiliaryBar',
            'workbench.action.positionPanelBottom',
            'workbench.action.alignPanelCenter',
            'gitHawkChanges.focus',
            'workbench.action.closeAuxiliaryBar',
            'workbench.action.closePanel',
            'workbench.action.toggleMaximizedPanel',
            'gitHawkView.focus',
        ]);
    });
});
