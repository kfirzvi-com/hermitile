/** Runs one workbench command; rejects if VS Code does. */
export interface CommandRunner {
    run(command: string, args: readonly unknown[]): Promise<void>;
}
