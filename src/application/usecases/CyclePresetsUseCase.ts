import type { LayoutHistory } from '../../domain/models/LayoutHistory';
import type { PresetSource } from '../ports/PresetSource';
import type { ApplyPresetUseCase } from './ApplyPresetUseCase';
import type { ApplyResult } from './ApplyResult';

/** The next or previous preset in the list, wrapping round. */
export class CyclePresetsUseCase {
    constructor(
        private readonly source: PresetSource,
        private readonly apply: ApplyPresetUseCase,
        private readonly history: LayoutHistory
    ) {}

    async execute(step: 1 | -1): Promise<ApplyResult> {
        const preset = this.source.catalog().after(this.history.current, step);
        if (preset === undefined) {
            return { kind: 'noPresets' };
        }
        return this.apply.execute(preset);
    }
}
