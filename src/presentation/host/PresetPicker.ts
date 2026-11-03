import * as vscode from 'vscode';
import type { PresetCatalog } from '../../domain/models/PresetCatalog';
import type { Preset } from '../../domain/models/Preset';
import { ShortcutLabel } from './ShortcutLabel';

interface PresetItem extends vscode.QuickPickItem {
    readonly preset: Preset;
}

/** Every preset, with its key, the current one marked. */
export class PresetPicker {
    async pick(catalog: PresetCatalog, current: string | undefined): Promise<Preset | undefined> {
        const items: PresetItem[] = catalog.presets.map((preset, index) => ({
            preset,
            label: `${preset.icon ?? '$(layout)'} ${preset.name}`,
            description: [
                ShortcutLabel.forSlot(index + 1),
                preset.name === current ? 'current' : undefined,
            ]
                .filter(Boolean)
                .join('  ·  '),
            detail: preset.description,
        }));

        if (items.length === 0) {
            const choice = await vscode.window.showInformationMessage(
                'HermiTile: no presets. Add some under hermiTile.presets.',
                'Open Settings'
            );
            if (choice !== undefined) {
                await vscode.commands.executeCommand('workbench.action.openSettings', 'hermiTile.presets');
            }
            return undefined;
        }

        const picked = await vscode.window.showQuickPick(items, {
            title: 'HermiTile: Apply A Layout',
            placeHolder: 'Pick a layout — or press its number',
            matchOnDetail: true,
        });
        return picked?.preset;
    }
}
