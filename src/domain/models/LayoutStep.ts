/** One VS Code command, in the order a layout is built. */
export interface LayoutStep {
    readonly command: string;
    readonly args?: readonly unknown[];
}
