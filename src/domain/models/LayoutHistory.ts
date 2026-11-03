export interface HistorySnapshot {
    readonly current?: string;
    readonly previous?: string;
}

/**
 * The current preset and the one before it — enough for Alt+Tab between two
 * layouts, which is most of what switching back is for.
 *
 * Applying the current preset again records nothing: re-applying is how a
 * layout is snapped back into shape, and it should not cost the way back.
 */
export class LayoutHistory {
    private currentName: string | undefined;
    private previousName: string | undefined;

    constructor(snapshot: HistorySnapshot = {}) {
        this.currentName = snapshot.current;
        this.previousName = snapshot.previous;
    }

    get current(): string | undefined {
        return this.currentName;
    }

    get previous(): string | undefined {
        return this.previousName;
    }

    record(name: string): void {
        if (name === this.currentName) {
            return;
        }
        this.previousName = this.currentName;
        this.currentName = name;
    }

    snapshot(): HistorySnapshot {
        return { current: this.currentName, previous: this.previousName };
    }
}
