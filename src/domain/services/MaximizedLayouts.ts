import type { Preset } from '../models/Preset';
import type { WorkbenchPart } from '../models/WorkbenchPart';

/**
 * "Maximize this window", for each part of the workbench.
 *
 * Built-in presets rather than settings, because what each one means is fixed:
 * the part takes the window and everything else gets out of the way. They are
 * not listed in the picker and have no slot; they are reached by the maximize
 * command and left by switching back.
 */
export class MaximizedLayouts {
    private static readonly PREFIX = 'Maximized: ';

    private static readonly LAYOUTS: Record<WorkbenchPart, Preset> = {
        editor: {
            name: `${MaximizedLayouts.PREFIX}Editor`,
            icon: '$(screen-full)',
            sideBar: { state: 'hidden' },
            secondarySideBar: { state: 'hidden' },
            panel: { state: 'hidden' },
            focus: 'editor',
            commands: [],
        },
        panel: {
            name: `${MaximizedLayouts.PREFIX}Panel`,
            icon: '$(screen-full)',
            sideBar: { state: 'hidden' },
            secondarySideBar: { state: 'hidden' },
            panel: { state: 'maximized' },
            focus: 'panel',
            commands: [],
        },
        secondarySideBar: {
            name: `${MaximizedLayouts.PREFIX}Secondary Side Bar`,
            icon: '$(screen-full)',
            secondarySideBar: { state: 'maximized' },
            focus: 'secondarySideBar',
            commands: [],
        },
        // VS Code cannot maximize the primary side bar. The nearest thing is to
        // leave it alone beside the editor.
        sideBar: {
            name: `${MaximizedLayouts.PREFIX}Side Bar`,
            icon: '$(screen-full)',
            sideBar: { state: 'visible' },
            secondarySideBar: { state: 'hidden' },
            panel: { state: 'hidden' },
            focus: 'sideBar',
            commands: [],
        },
    };

    static for(part: WorkbenchPart): Preset {
        return MaximizedLayouts.LAYOUTS[part];
    }

    static named(name: string): Preset | undefined {
        return Object.values(MaximizedLayouts.LAYOUTS).find((preset) => preset.name === name);
    }

    static isMaximized(name: string | undefined): boolean {
        return name?.startsWith(MaximizedLayouts.PREFIX) ?? false;
    }
}
