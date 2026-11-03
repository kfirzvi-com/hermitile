import * as vscode from 'vscode';
import type { ApplyResult } from '../../application/usecases/ApplyResult';

/**
 * Tells the user only when something did not happen. A layout that applied
 * cleanly speaks for itself — a notification on every key press would be noise.
 */
export class ResultReporter {
    constructor(private readonly output: vscode.LogOutputChannel) {}

    report(result: ApplyResult): void {
        switch (result.kind) {
            case 'applied':
                if (result.failures.length === 0) {
                    this.output.info(`Applied "${result.preset.name}".`);
                    return;
                }
                for (const failure of result.failures) {
                    this.output.warn(`"${result.preset.name}": ${failure.command} failed — ${failure.reason}`);
                }
                void vscode.window
                    .showWarningMessage(
                        `HermiTile: "${result.preset.name}" applied, but ${stepsFailed(result.failures.length)}, starting with ${result.failures[0].command}.`,
                        'Show'
                    )
                    .then((choice) => choice && this.output.show(true));
                return;
            case 'notFound':
                void vscode.window.showWarningMessage(`HermiTile: there is no preset called "${result.name}".`);
                return;
            case 'nothingToReturnTo':
                void vscode.window.setStatusBarMessage('HermiTile: no earlier layout to go back to.', 3000);
                return;
            case 'noPresets':
                void vscode.window.showInformationMessage('HermiTile: no presets. Add some under hermiTile.presets.');
                return;
        }
    }
}

function stepsFailed(count: number): string {
    return count === 1 ? '1 step failed' : `${count} steps failed`;
}
