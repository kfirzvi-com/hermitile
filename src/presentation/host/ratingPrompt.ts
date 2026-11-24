/**
 * When to ask for a rating, and where to send the person who says yes.
 *
 * Asked only after HermiTile has been used on several different days, at most
 * twice, and never again once the person rates or says no. The counts stay in
 * the editor's own storage: nothing leaves the machine.
 *
 * Kept free of `vscode` so the rules, and the steps in `RatingFlow`, can be
 * unit-tested; `RatingNotice` connects them to the editor. *
 * A copy of GitHawk's `src/presentation/host/ratingPrompt.ts`; change both
 * together. Only the review page differs: GitHawk has one identifier per store,
 * HermiTile has one for both, so the store is picked from the editor.
 */
export interface RatingState {
    /** Distinct days a layout was applied. */
    readonly useDays: number;
    /** The last day counted, as `YYYY-MM-DD`, so a day counts once. */
    readonly lastUseDay?: string;
    /** How many times the question has been shown. */
    readonly asks: number;
    /** Rated, or asked not to be asked again. */
    readonly done: boolean;
}

export const INITIAL_RATING_STATE: RatingState = { useDays: 0, asks: 0, done: false };

/** Use days before the first ask, and before the second (after "Later"). */
export const ASK_AT_USE_DAYS = [7, 30] as const;

const EXTENSION_ID = 'praktical.hermitile';

/** HermiTile has one identifier in both stores; the editor decides which store it came from. */
export const REVIEW_PAGES = {
    marketplace: `https://marketplace.visualstudio.com/items?itemName=${EXTENSION_ID}&ssr=false#review-details`,
    openVsx: `https://open-vsx.org/extension/${EXTENSION_ID.replace('.', '/')}/reviews`,
} as const;

/**
 * URI schemes of Microsoft's own VS Code builds, the only ones that install
 * from the Marketplace. Everything else (Cursor, VSCodium, Windsurf, and hosts
 * such as VS Code for the Web) goes to Open VSX.
 */
const MARKETPLACE_SCHEMES = new Set(['vscode', 'vscode-insiders', 'vscode-exploration']);

/** The review page for the store this editor installs from, by its URI scheme. */
export function reviewPage(uriScheme: string): string {
    return MARKETPLACE_SCHEMES.has(uriScheme) ? REVIEW_PAGES.marketplace : REVIEW_PAGES.openVsx;
}

/** Counts `day` as a use day, once. Returns the same object when nothing changed. */
export function recordUse(state: RatingState, day: string): RatingState {
    if (state.lastUseDay === day) {
        return state;
    }
    return { ...state, useDays: state.useDays + 1, lastUseDay: day };
}

export function shouldAsk(state: RatingState): boolean {
    if (state.done || state.asks >= ASK_AT_USE_DAYS.length) {
        return false;
    }
    return state.useDays >= ASK_AT_USE_DAYS[state.asks];
}

export function asked(state: RatingState): RatingState {
    return { ...state, asks: state.asks + 1 };
}

export function finished(state: RatingState): RatingState {
    return { ...state, done: true };
}

/** The local calendar day, so "a day" means the person's day, not UTC's. */
export function dayOf(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The person's answer; closing the popup counts as "later". */
export type RatingAnswer = 'rate' | 'later' | 'never';

/** What the flow needs from the editor. */
export interface RatingPorts {
    read(): RatingState;
    write(state: RatingState): Promise<void>;
    ask(): Promise<RatingAnswer>;
    open(url: string): Promise<void>;
    today(): string;
}

/** The steps: count the day, maybe ask, act on the answer. */
export class RatingFlow {
    private showing = false;

    constructor(
        private readonly reviewUrl: string,
        private readonly ports: RatingPorts
    ) {}

    /** Called each time a layout is applied. */
    async onUse(): Promise<void> {
        if (this.showing) {
            return;
        }
        const before = this.ports.read();
        const current = recordUse(before, this.ports.today());
        if (!shouldAsk(current)) {
            if (current !== before) {
                await this.ports.write(current);
            }
            return;
        }

        this.showing = true;
        try {
            // Counted before showing, on purpose: an ask the window closed on
            // still counts, so "at most twice" holds whatever happens next.
            await this.ports.write(asked(current));
            const answer = await this.ports.ask();
            if (answer === 'rate') {
                await this.rate();
            } else if (answer === 'never') {
                // Read again rather than reuse `current`: the ask above was written since.
                await this.ports.write(finished(this.ports.read()));
            }
        } finally {
            this.showing = false;
        }
    }

    /** The command, and the popup's yes. Either way, the question is not asked again. */
    async rate(): Promise<void> {
        // Open first: if the browser fails, the person has not rated, so keep asking.
        await this.ports.open(this.reviewUrl);
        await this.ports.write(finished(this.ports.read()));
    }
}
