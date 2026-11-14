import * as vscode from 'vscode';
import type { PresetCatalog } from '../../domain/models/PresetCatalog';
import type { Preset } from '../../domain/models/Preset';
import { ShortcutLabel } from './ShortcutLabel';

export const PRESETS_VIEW = 'hermiTile.presets';

/**
 * The activity bar's list of presets: each with its key, the current one
 * marked, a click applies it. The view has no state of its own; it is redrawn
 * from the catalog and the current preset whenever either changes.
 */
export class PresetTreeProvider implements vscode.TreeDataProvider<Preset>, vscode.Disposable {
    private readonly changed = new vscode.EventEmitter<undefined>();
    readonly onDidChangeTreeData = this.changed.event;

    private catalog: PresetCatalog | undefined;
    private current: string | undefined;

    constructor(private readonly applyCommand: string) {}

    show(catalog: PresetCatalog, current: string | undefined): void {
        this.catalog = catalog;
        this.current = current;
        this.changed.fire(undefined);
    }

    getChildren(element?: Preset): Preset[] {
        return element === undefined ? [...(this.catalog?.presets ?? [])] : [];
    }

    getTreeItem(preset: Preset): vscode.TreeItem {
        const slot = this.catalog?.slotOf(preset.name) ?? 0;
        const isCurrent = preset.name === this.current;
        const item = new vscode.TreeItem(preset.name, vscode.TreeItemCollapsibleState.None);
        item.id = preset.name;
        item.iconPath = isCurrent
            ? new vscode.ThemeIcon(PresetTreeProvider.codicon(preset.icon), new vscode.ThemeColor('charts.green'))
            : new vscode.ThemeIcon(PresetTreeProvider.codicon(preset.icon));
        item.description = [ShortcutLabel.forSlot(slot), isCurrent ? 'current' : undefined]
            .filter(Boolean)
            .join('  ·  ');
        item.tooltip = preset.description ?? preset.name;
        item.command = { command: this.applyCommand, title: 'Apply', arguments: [preset.name] };
        return item;
    }

    dispose(): void {
        this.changed.dispose();
    }

    /** `$(sparkle)` → `sparkle`; anything else falls back to the layout icon. */
    private static codicon(icon: string | undefined): string {
        return /^\$\(([\w-]+)\)$/.exec(icon ?? '')?.[1] ?? 'layout';
    }
}
