import type { LayoutHistory } from '../../domain/models/LayoutHistory';
import type { PresetSource } from '../ports/PresetSource';
import type { ApplyPresetUseCase } from './ApplyPresetUseCase';
import type { ApplyResult } from './ApplyResult';

/** Back to the layout before this one — Alt+Tab, for presets. */
export class SwitchBackUseCase {
    constructor(
        private readonly source: PresetSource,
        private readonly apply: ApplyPresetUseCase,
        private readonly history: LayoutHistory
    ) {}

    async execute(): Promise<ApplyResult> {
        const previous = this.history.previous;
        if (previous === undefined) {
            return { kind: 'nothingToReturnTo' };
        }
        const preset = this.source.catalog().find(previous);
        if (preset === undefined) {
            // Renamed or deleted in settings since it was applied.
            return { kind: 'notFound', name: previous };
        }
        return this.apply.execute(preset);
    }
}
