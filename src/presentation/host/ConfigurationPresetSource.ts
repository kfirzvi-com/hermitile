import * as vscode from 'vscode';
import type { PresetSource } from '../../application/ports/PresetSource';
import { PresetCatalog } from '../../domain/models/PresetCatalog';
import type { PresetParser } from '../../domain/services/PresetParser';

export const CONFIG_SECTION = 'hermiTile';
export const PRESETS_SETTING = 'presets';

/**
 * Presets from `hermiTile.presets`. Problems in them are reported once per
 * distinct set, not on every key press that reads the settings.
 */
export class ConfigurationPresetSource implements PresetSource {
    private lastReported = '';

    constructor(
        private readonly parser: PresetParser,
        private readonly output: vscode.LogOutputChannel
    ) {}

    catalog(): PresetCatalog {
        const raw = vscode.workspace.getConfiguration(CONFIG_SECTION).get<unknown>(PRESETS_SETTING);
        const { presets, problems } = this.parser.parse(raw ?? []);
        this.report(problems);
        return new PresetCatalog(presets);
    }

    private report(problems: string[]): void {
        const key = problems.join('\n');
        if (key === this.lastReported) {
            return;
        }
        this.lastReported = key;
        if (problems.length === 0) {
            return;
        }

        problems.forEach((problem) => this.output.warn(problem));
        void vscode.window
            .showWarningMessage(
                `HermiTile: ${problems.length === 1 ? problems[0] : `${problems.length} problems in your presets.`}`,
                'Show',
                'Open Settings'
            )
            .then((choice) => {
                if (choice === 'Show') {
                    this.output.show(true);
                } else if (choice === 'Open Settings') {
                    void vscode.commands.executeCommand(
                        'workbench.action.openSettingsJson',
                        { revealSetting: { key: `${CONFIG_SECTION}.${PRESETS_SETTING}` } }
                    );
                }
            });
    }
}
