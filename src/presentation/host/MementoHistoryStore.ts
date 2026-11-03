import type * as vscode from 'vscode';
import type { HistoryStore } from '../../application/ports/HistoryStore';
import type { HistorySnapshot } from '../../domain/models/LayoutHistory';

/**
 * Per workspace, like the layout itself: VS Code restores each window's
 * layout separately, so each window remembers its own preset.
 */
export class MementoHistoryStore implements HistoryStore {
    private static readonly KEY = 'hermiTile.history';

    constructor(private readonly memento: vscode.Memento) {}

    load(): HistorySnapshot {
        return this.memento.get<HistorySnapshot>(MementoHistoryStore.KEY) ?? {};
    }

    async save(snapshot: HistorySnapshot): Promise<void> {
        await this.memento.update(MementoHistoryStore.KEY, snapshot);
    }
}
