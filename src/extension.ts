import * as vscode from 'vscode';
import { SerialQueue } from './application/services/SerialQueue';
import { ApplyPresetUseCase } from './application/usecases/ApplyPresetUseCase';
import type { ApplyResult } from './application/usecases/ApplyResult';
import { CyclePresetsUseCase } from './application/usecases/CyclePresetsUseCase';
import { SwitchBackUseCase } from './application/usecases/SwitchBackUseCase';
import { ToggleMaximizeUseCase } from './application/usecases/ToggleMaximizeUseCase';
import { LayoutHistory } from './domain/models/LayoutHistory';
import { WORKBENCH_PARTS, type WorkbenchPart } from './domain/models/WorkbenchPart';
import { LayoutPlanner } from './domain/services/LayoutPlanner';
import { PresetParser } from './domain/services/PresetParser';
import {
    CONFIG_SECTION,
    ConfigurationPresetSource,
} from './presentation/host/ConfigurationPresetSource';
import { MementoHistoryStore } from './presentation/host/MementoHistoryStore';
import { PresetPicker } from './presentation/host/PresetPicker';
import { PRESETS_VIEW, PresetTreeProvider } from './presentation/host/PresetTreeProvider';
import { ResultReporter } from './presentation/host/ResultReporter';
import { STATUS_BAR_SETTING, StatusBarIndicator } from './presentation/host/StatusBarIndicator';
import { VsCodeCommandRunner } from './presentation/host/VsCodeCommandRunner';

const PICK_COMMAND = 'hermiTile.pick';
const APPLY_COMMAND = 'hermiTile.apply';

export function activate(context: vscode.ExtensionContext): void {
    const output = vscode.window.createOutputChannel('HermiTile', { log: true });
    const source = new ConfigurationPresetSource(new PresetParser(), output);
    const store = new MementoHistoryStore(context.workspaceState);
    const history = new LayoutHistory(store.load());

    const apply = new ApplyPresetUseCase(new LayoutPlanner(), new VsCodeCommandRunner(), history, store);
    const back = new SwitchBackUseCase(source, apply, history);
    const cycle = new CyclePresetsUseCase(source, apply, history);
    const maximize = new ToggleMaximizeUseCase(apply, back, history);

    const picker = new PresetPicker();
    const reporter = new ResultReporter(output);
    const statusBar = new StatusBarIndicator(PICK_COMMAND);
    const tree = new PresetTreeProvider(APPLY_COMMAND);

    const refreshViews = () => {
        const enabled = vscode.workspace.getConfiguration(CONFIG_SECTION).get<boolean>(STATUS_BAR_SETTING, true);
        const catalog = source.catalog();
        const current = history.current === undefined ? undefined : catalog.find(history.current);
        statusBar.show(current, enabled);
        tree.show(catalog, current?.name);
    };

    const queue = new SerialQueue();
    const run = async (task: () => Promise<ApplyResult>): Promise<ApplyResult> => {
        const done = await queue.run(task);
        reporter.report(done);
        refreshViews();
        return done;
    };

    const pick = async () => {
        const preset = await picker.pick(source.catalog(), history.current);
        return preset === undefined ? undefined : run(() => apply.execute(preset));
    };

    context.subscriptions.push(
        output,
        statusBar,
        tree,
        vscode.window.registerTreeDataProvider(PRESETS_VIEW, tree),

        /**
         * By name, for keybindings of your own:
         * `{ "key": "…", "command": "hermiTile.apply", "args": "Claude" }`.
         * Without a name it asks.
         */
        vscode.commands.registerCommand(APPLY_COMMAND, (arg?: unknown) => {
            const name = typeof arg === 'string' ? arg : presetArg(arg);
            if (name === undefined) {
                return pick();
            }
            const preset = source.catalog().find(name);
            if (preset === undefined) {
                reporter.report({ kind: 'notFound', name });
                return undefined;
            }
            return run(() => apply.execute(preset));
        }),

        /** Bound to Ctrl+Alt+1…9: the preset at that place in the list. */
        vscode.commands.registerCommand('hermiTile.applySlot', (slot?: unknown) => {
            const preset = source.catalog().atSlot(Number(slot));
            if (preset === undefined) {
                void vscode.window.setStatusBarMessage(`HermiTile: no preset number ${String(slot)}.`, 3000);
                return undefined;
            }
            return run(() => apply.execute(preset));
        }),

        vscode.commands.registerCommand(PICK_COMMAND, pick),
        vscode.commands.registerCommand('hermiTile.back', () => run(() => back.execute())),
        vscode.commands.registerCommand('hermiTile.next', () => run(() => cycle.execute(1))),
        vscode.commands.registerCommand('hermiTile.previous', () => run(() => cycle.execute(-1))),
        /** Opens settings.json at the presets, adding them there if they are not yet. */
        vscode.commands.registerCommand('hermiTile.editPresets', () =>
            vscode.commands.executeCommand('workbench.action.openSettingsJson', {
                revealSetting: { key: `${CONFIG_SECTION}.presets`, edit: true },
            })
        ),

        /**
         * The keybinding passes the part the keyboard is in, from VS Code's own
         * focus context keys; from the Command Palette, focus is in the palette,
         * so it maximizes the editor.
         */
        vscode.commands.registerCommand('hermiTile.maximize', (part?: unknown) =>
            run(() => maximize.execute(isPart(part) ? part : 'editor'))
        ),

        /** For tests and for curiosity: which layout this window is in. */
        vscode.commands.registerCommand('hermiTile.state', () => ({
            current: history.current,
            previous: history.previous,
            presets: source.catalog().presets.map((preset) => preset.name),
        })),

        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration(CONFIG_SECTION)) {
                refreshViews();
            }
        })
    );

    refreshViews();
}

export function deactivate(): void {}

function presetArg(arg: unknown): string | undefined {
    if (typeof arg === 'object' && arg !== null && 'preset' in arg) {
        const preset = (arg as { preset: unknown }).preset;
        return typeof preset === 'string' ? preset : undefined;
    }
    return undefined;
}

function isPart(value: unknown): value is WorkbenchPart {
    return typeof value === 'string' && (WORKBENCH_PARTS as readonly string[]).includes(value);
}
