import * as vscode from 'vscode';
import type { Preset } from '../../domain/models/Preset';

export const STATUS_BAR_SETTING = 'statusBar';

/** The current layout's name; click it to pick another. */
export class StatusBarIndicator implements vscode.Disposable {
    private readonly item: vscode.StatusBarItem;

    constructor(pickCommand: string) {
        this.item = vscode.window.createStatusBarItem('hermiTile.current', vscode.StatusBarAlignment.Right, 100);
        this.item.name = 'HermiTile Layout';
        this.item.command = pickCommand;
    }

    show(preset: Preset | undefined, enabled: boolean): void {
        if (!enabled) {
            this.item.hide();
            return;
        }
        this.item.text = preset === undefined ? '$(layout)' : `${preset.icon ?? '$(layout)'} ${preset.name}`;
        this.item.tooltip =
            preset === undefined
                ? 'HermiTile: pick a layout'
                : `HermiTile: ${preset.name}${preset.description ? ` — ${preset.description}` : ''}\nClick to switch.`;
        this.item.show();
    }

    dispose(): void {
        this.item.dispose();
    }
}
