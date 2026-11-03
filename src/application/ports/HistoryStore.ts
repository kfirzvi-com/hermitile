import type { HistorySnapshot } from '../../domain/models/LayoutHistory';

/**
 * Keeps the history across reloads. VS Code restores the layout itself when a
 * window reopens, so the name of the preset it is in should come back too.
 */
export interface HistoryStore {
    load(): HistorySnapshot;
    save(snapshot: HistorySnapshot): Promise<void>;
}
