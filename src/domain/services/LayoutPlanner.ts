import type { LayoutStep } from '../models/LayoutStep';
import type { PanelLayout } from '../models/PanelLayout';
import type { PartLayout } from '../models/PartLayout';
import type { FocusTarget, Preset } from '../models/Preset';
import { WorkbenchCommands as C } from './WorkbenchCommands';

/**
 * Turns a preset into the commands that build it.
 *
 * VS Code gives an extension no way to read the layout — whether the panel is
 * open, or maximized — so every step here must land in the same place from
 * any starting point. Where VS Code only offers a toggle, the plan first
 * drives the part to a known state and toggles from there.
 */
export class LayoutPlanner {
    plan(preset: Preset): LayoutStep[] {
        // A maximized secondary side bar hides every other part and holds on
        // to them; nothing else can be arranged until it lets go. Restoring
        // one that is not maximized does nothing.
        const steps: LayoutStep[] = [step(C.restoreSecondarySideBar)];

        steps.push(...this.panelPlacement(preset.panel));

        if (preset.secondarySideBar?.state === 'maximized') {
            // Maximizing hides the side bar, the panel, and the editor itself,
            // so whatever the preset says about those has nothing to act on.
            steps.push(step(C.maximizeSecondarySideBar));
            steps.push(...this.revealView(preset.secondarySideBar));
        } else {
            steps.push(...this.sideBar(preset.sideBar));
            steps.push(...this.secondarySideBar(preset.secondarySideBar));
            steps.push(...this.panel(preset.panel));
        }

        if (preset.focus !== undefined) {
            steps.push(step(this.focusCommand(preset.focus)));
        }

        steps.push(...preset.commands.map((command) => step(command)));

        // Focusing the view a part was just opened on would only repeat it.
        // Only focus steps: the panel's toggle is repeated on purpose.
        return steps.filter(
            (current, index) => !isFocus(current) || current.command !== steps[index - 1]?.command
        );
    }

    private panelPlacement(panel: PanelLayout | undefined): LayoutStep[] {
        const steps: LayoutStep[] = [];
        if (panel?.position !== undefined) {
            steps.push(step(C.panelPosition[panel.position]));
        }
        // After the position: aligning a side panel first moves it to the bottom.
        if (panel?.alignment !== undefined) {
            steps.push(step(C.panelAlignment[panel.alignment]));
        }
        return steps;
    }

    private sideBar(part: PartLayout | undefined): LayoutStep[] {
        if (part === undefined) {
            return [];
        }
        if (part.state === 'hidden') {
            return [step(C.closeSideBar)];
        }
        // Focusing a view opens the side bar it lives in.
        return part.view !== undefined ? this.revealView(part) : [step(C.focusSideBar)];
    }

    private secondarySideBar(part: PartLayout | undefined): LayoutStep[] {
        if (part === undefined) {
            return [];
        }
        if (part.state === 'hidden') {
            return [step(C.closeSecondarySideBar)];
        }
        return part.view !== undefined
            ? this.revealView(part)
            : [step(C.focusSecondarySideBar)];
    }

    private panel(part: PanelLayout | undefined): LayoutStep[] {
        if (part === undefined) {
            return [];
        }

        // Closing un-maximizes as it goes, so every branch starts from a
        // hidden, un-maximized panel.
        const steps: LayoutStep[] = [step(C.closePanel)];

        if (part.state === 'maximized') {
            // From hidden, this command opens the panel and maximizes it
            // unless it opened maximized already: maximized either way.
            steps.push(step(C.toggleMaximizedPanel));
        } else if (part.state === 'visible') {
            if (this.canMaximize(part)) {
                // Plain opening may come back maximized: VS Code reopens the
                // panel the way it was last closed. Maximize, then toggle back
                // out, and it is open and not maximized for certain.
                steps.push(step(C.toggleMaximizedPanel), step(C.toggleMaximizedPanel));
            } else {
                steps.push(step(C.focusPanel));
            }
        }

        if (part.state !== 'hidden') {
            steps.push(...this.revealView(part));
        }
        return steps;
    }

    /**
     * VS Code refuses to maximize a top or bottom panel unless it is centred.
     * The extension cannot ask which alignment is in force, so it relies on
     * the preset having said.
     */
    private canMaximize(panel: PanelLayout): boolean {
        return (
            panel.alignment === 'center' ||
            panel.position === 'left' ||
            panel.position === 'right'
        );
    }

    private revealView(part: PartLayout): LayoutStep[] {
        return part.view !== undefined ? [step(C.focusView(part.view))] : [];
    }

    private focusCommand(target: FocusTarget): string {
        switch (target) {
            case 'editor':
                return C.focusEditor;
            case 'sideBar':
                return C.focusSideBar;
            case 'secondarySideBar':
                return C.focusSecondarySideBar;
            case 'panel':
                return C.focusPanel;
            default:
                return C.focusView(target);
        }
    }
}

function step(command: string): LayoutStep {
    return { command };
}

function isFocus(step: LayoutStep): boolean {
    return step.command.endsWith('.focus') || step.command.startsWith('workbench.action.focus');
}
