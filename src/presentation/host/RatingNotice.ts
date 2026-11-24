import * as vscode from 'vscode';
import {
    INITIAL_RATING_STATE,
    RatingFlow,
    dayOf,
    reviewPage,
    type RatingAnswer,
    type RatingState,
} from './ratingPrompt';

/**
 * Connects `RatingFlow` to the editor: the state lives in `globalState`, the
 * question is an information message, and "Rate" opens the browser.
 */
export class RatingNotice {
    private static readonly KEY = 'hermiTile.rating';
    private static readonly RATE = 'Rate HermiTile';
    private static readonly LATER = 'Later';
    private static readonly NEVER = "Don't Ask Again";

    private readonly flow: RatingFlow;

    constructor(state: vscode.Memento) {
        this.flow = new RatingFlow(reviewPage(vscode.env.uriScheme), {
            read: () => state.get<RatingState>(RatingNotice.KEY, INITIAL_RATING_STATE),
            write: async (next) => state.update(RatingNotice.KEY, next),
            ask: () => RatingNotice.ask(),
            open: async (url) => {
                await vscode.env.openExternal(vscode.Uri.parse(url));
            },
            today: () => dayOf(new Date()),
        });
    }

    onUse(): Promise<void> {
        return this.flow.onUse();
    }

    rate(): Promise<void> {
        return this.flow.rate();
    }

    private static async ask(): Promise<RatingAnswer> {
        const choice = await vscode.window.showInformationMessage(
            'Enjoying HermiTile? A rating in the store helps other people find it.',
            RatingNotice.RATE,
            RatingNotice.LATER,
            RatingNotice.NEVER
        );
        if (choice === RatingNotice.RATE) {
            return 'rate';
        }
        return choice === RatingNotice.NEVER ? 'never' : 'later';
    }
}
