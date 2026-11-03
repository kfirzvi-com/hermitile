import * as vscode from 'vscode';
import type { CommandRunner } from '../../application/ports/CommandRunner';

export class VsCodeCommandRunner implements CommandRunner {
    async run(command: string, args: readonly unknown[]): Promise<void> {
        await vscode.commands.executeCommand(command, ...args);
    }
}
