import type { LayoutHistory } from '../../domain/models/LayoutHistory';
import type { Preset } from '../../domain/models/Preset';
import type { LayoutPlanner } from '../../domain/services/LayoutPlanner';
import type { CommandRunner } from '../ports/CommandRunner';
import type { HistoryStore } from '../ports/HistoryStore';
import type { ApplyResult, FailedStep } from './ApplyResult';

/**
 * Builds a preset's layout, one command at a time.
 *
 * Strictly in sequence: each step assumes the one before it has finished —
 * the panel is closed before it is maximized, the side bar exists before a
 * view in it is focused. One preset at a time is the caller's job — see
 * SerialQueue.
 */
export class ApplyPresetUseCase {
    constructor(
        private readonly planner: LayoutPlanner,
        private readonly runner: CommandRunner,
        private readonly history: LayoutHistory,
        private readonly store: HistoryStore
    ) {}

    async execute(preset: Preset): Promise<ApplyResult> {
        const failures: FailedStep[] = [];
        for (const step of this.planner.plan(preset)) {
            try {
                await this.runner.run(step.command, step.args ?? []);
            } catch (error) {
                failures.push({
                    command: step.command,
                    reason: error instanceof Error ? error.message : String(error),
                });
            }
        }

        this.history.record(preset.name);
        await this.store.save(this.history.snapshot());
        return { kind: 'applied', preset, failures };
    }
}
