/**
 * Test-only. The layout that matters most is one with the terminal in the
 * secondary side bar — that is where the keyboard is when a shortcut must
 * still reach VS Code instead of the shell. A fresh profile keeps the
 * terminal in the panel, and moving a view needs arguments the Command
 * Palette cannot pass, so this does it.
 */
const vscode = require('vscode');

exports.activate = (context) => {
    context.subscriptions.push(
        vscode.commands.registerCommand('hermiTileE2e.terminalToSecondarySideBar', async () => {
            await vscode.commands.executeCommand('workbench.action.terminal.new');
            await vscode.commands.executeCommand('vscode.moveViews', {
                viewIds: ['terminal'],
                destinationId: 'workbench.panel.chat',
            });
        })
    );
};
