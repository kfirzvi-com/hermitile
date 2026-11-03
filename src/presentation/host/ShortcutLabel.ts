/**
 * The default key for a slot, as the platform writes it. The real binding
 * cannot be read back from VS Code, so a rebound slot shows its default here.
 */
export class ShortcutLabel {
    static readonly SLOTS = 9;

    static forSlot(slot: number, platform: NodeJS.Platform = process.platform): string | undefined {
        if (slot < 1 || slot > ShortcutLabel.SLOTS) {
            return undefined;
        }
        return platform === 'darwin' ? `⌃⌥${slot}` : `Ctrl+Alt+${slot}`;
    }
}
