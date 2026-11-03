import { describe, expect, it } from 'vitest';
import type { CommandRunner } from '../ports/CommandRunner';
import type { HistoryStore } from '../ports/HistoryStore';
import type { PresetSource } from '../ports/PresetSource';
import { LayoutHistory, type HistorySnapshot } from '../../domain/models/LayoutHistory';
import type { Preset } from '../../domain/models/Preset';
import { PresetCatalog } from '../../domain/models/PresetCatalog';
import { LayoutPlanner } from '../../domain/services/LayoutPlanner';
import { SerialQueue } from '../services/SerialQueue';
import { ApplyPresetUseCase } from './ApplyPresetUseCase';
import { CyclePresetsUseCase } from './CyclePresetsUseCase';
import { SwitchBackUseCase } from './SwitchBackUseCase';
import { ToggleMaximizeUseCase } from './ToggleMaximizeUseCase';

const preset = (name: string, extra: Partial<Preset> = {}): Preset => ({ name, commands: [], ...extra });

class RecordingRunner implements CommandRunner {
    readonly ran: string[] = [];
    constructor(private readonly failing: ReadonlySet<string> = new Set()) {}

    async run(command: string): Promise<void> {
        // A tick between steps, so overlapping layouts would interleave.
        await new Promise((resolve) => setTimeout(resolve, 1));
        if (this.failing.has(command)) {
            throw new Error(`command '${command}' not found`);
        }
        this.ran.push(command);
    }
}

class MemoryStore implements HistoryStore {
    saved: HistorySnapshot = {};
    load(): HistorySnapshot {
        return this.saved;
    }
    async save(snapshot: HistorySnapshot): Promise<void> {
        this.saved = snapshot;
    }
}

function setup(presets: Preset[], failing?: Set<string>) {
    const runner = new RecordingRunner(failing);
    const store = new MemoryStore();
    const history = new LayoutHistory();
    const source: PresetSource = { catalog: () => new PresetCatalog(presets) };
    const apply = new ApplyPresetUseCase(new LayoutPlanner(), runner, history, store);
    const back = new SwitchBackUseCase(source, apply, history);
    return {
        runner,
        store,
        history,
        apply,
        back,
        cycle: new CyclePresetsUseCase(source, apply, history),
        maximize: new ToggleMaximizeUseCase(apply, back, history),
    };
}

describe('ApplyPresetUseCase', () => {
    it('carries on past a failed step and reports it', async () => {
        const { apply, runner } = setup([], new Set(['gitHawkView.focus']));
        const result = await apply.execute(
            preset('Commits', { panel: { state: 'maximized', view: 'gitHawkView' }, focus: 'editor' })
        );
        expect(result).toMatchObject({
            kind: 'applied',
            failures: [{ command: 'gitHawkView.focus', reason: "command 'gitHawkView.focus' not found" }],
        });
        expect(runner.ran.at(-1)).toBe('workbench.action.focusActiveEditorGroup');
    });

    it('remembers the layout for the next window reload', async () => {
        const { apply, store } = setup([]);
        await apply.execute(preset('A'));
        await apply.execute(preset('B'));
        expect(store.saved).toEqual({ current: 'B', previous: 'A' });
    });
});

describe('SwitchBackUseCase', () => {
    it('goes back and forth between the last two layouts', async () => {
        const presets = [preset('A'), preset('B'), preset('C')];
        const { apply, back, history } = setup(presets);
        await apply.execute(presets[0]);
        await apply.execute(presets[2]);

        await back.execute();
        expect(history.current).toBe('A');
        await back.execute();
        expect(history.current).toBe('C');
    });

    it('re-applying the current layout keeps the way back', async () => {
        const presets = [preset('A'), preset('B')];
        const { apply, back, history } = setup(presets);
        await apply.execute(presets[0]);
        await apply.execute(presets[1]);
        await apply.execute(presets[1]);
        await back.execute();
        expect(history.current).toBe('A');
    });

    it('says when there is nothing to go back to, or it was renamed away', async () => {
        const { apply, back } = setup([preset('A')]);
        expect(await back.execute()).toEqual({ kind: 'nothingToReturnTo' });
        await apply.execute(preset('Gone'));
        await apply.execute(preset('A'));
        expect(await back.execute()).toEqual({ kind: 'notFound', name: 'Gone' });
    });
});

describe('ToggleMaximizeUseCase', () => {
    it('maximizes, and the same key restores the layout from before', async () => {
        const presets = [preset('Code')];
        const { apply, maximize, history } = setup(presets);
        await apply.execute(presets[0]);

        await maximize.execute('panel');
        expect(history.current).toBe('Maximized: Panel');
        await maximize.execute('panel');
        expect(history.current).toBe('Code');
    });

    it('moves straight from one maximized part to another', async () => {
        const { apply, maximize, history } = setup([preset('Code')]);
        await apply.execute(preset('Code'));
        await maximize.execute('panel');
        await maximize.execute('editor');
        expect(history.current).toBe('Maximized: Editor');
    });
});

describe('CyclePresetsUseCase', () => {
    it('steps through the list from the current layout', async () => {
        const presets = [preset('A'), preset('B')];
        const { apply, cycle, history } = setup(presets);
        await apply.execute(presets[0]);
        await cycle.execute(1);
        expect(history.current).toBe('B');
        await cycle.execute(1);
        expect(history.current).toBe('A');
        await cycle.execute(-1);
        expect(history.current).toBe('B');
    });
});

describe('SerialQueue', () => {
    it('builds one layout at a time when keys are pressed in quick succession', async () => {
        const { apply, runner } = setup([]);
        const queue = new SerialQueue();
        await Promise.all([
            queue.run(() => apply.execute(preset('A', { commands: ['a1', 'a2'] }))),
            queue.run(() => apply.execute(preset('B', { commands: ['b1', 'b2'] }))),
        ]);
        expect(runner.ran.filter((command) => !command.startsWith('workbench.'))).toEqual(['a1', 'a2', 'b1', 'b2']);
    });

    it('decides "next" from the layout pressed just before it, not the one before that', async () => {
        const presets = [preset('A'), preset('B'), preset('C', { commands: ['slow'] })];
        const { apply, cycle, history } = setup(presets);
        const queue = new SerialQueue();
        await queue.run(() => apply.execute(presets[0]));

        await Promise.all([
            queue.run(() => apply.execute(presets[2])),
            queue.run(() => cycle.execute(1)),
        ]);
        expect(history.current).toBe('A');
    });

    it('keeps going after a command fails', async () => {
        const queue = new SerialQueue();
        const failed = queue.run(() => Promise.reject(new Error('boom')));
        const next = queue.run(async () => 'ran');
        await expect(failed).rejects.toThrow('boom');
        await expect(next).resolves.toBe('ran');
    });
});
