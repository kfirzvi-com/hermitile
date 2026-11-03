import type { LayoutHistory } from '../../domain/models/LayoutHistory';
import type { WorkbenchPart } from '../../domain/models/WorkbenchPart';
import { MaximizedLayouts } from '../../domain/services/MaximizedLayouts';
import type { ApplyPresetUseCase } from './ApplyPresetUseCase';
import type { ApplyResult } from './ApplyResult';
import type { SwitchBackUseCase } from './SwitchBackUseCase';

/**
 * Maximize the part the keyboard is in; the same key again restores the
 * layout from before — the way a window manager's maximize works.
 */
export class ToggleMaximizeUseCase {
    constructor(
        private readonly apply: ApplyPresetUseCase,
        private readonly back: SwitchBackUseCase,
        private readonly history: LayoutHistory
    ) {}

    async execute(part: WorkbenchPart): Promise<ApplyResult> {
        const maximized = MaximizedLayouts.for(part);
        if (this.history.current === maximized.name && this.history.previous !== undefined) {
            return this.back.execute();
        }
        return this.apply.execute(maximized);
    }
}
