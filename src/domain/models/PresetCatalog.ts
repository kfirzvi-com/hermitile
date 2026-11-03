import { MaximizedLayouts } from '../services/MaximizedLayouts';
import type { Preset } from './Preset';

/** The presets from settings, found by name or by their place in the list. */
export class PresetCatalog {
    constructor(readonly presets: readonly Preset[]) {}

    /**
     * Exact first, then ignoring case — a keybinding written by hand as
     * `"claude"` should still find "Claude". Falls back to the built-in
     * maximized layouts, which switching back can return to.
     */
    find(name: string): Preset | undefined {
        const lower = name.toLowerCase();
        return (
            this.presets.find((preset) => preset.name === name) ??
            this.presets.find((preset) => preset.name.toLowerCase() === lower) ??
            MaximizedLayouts.named(name)
        );
    }

    /** Slots count from 1, the way they are numbered on the keyboard. */
    atSlot(slot: number): Preset | undefined {
        return Number.isInteger(slot) && slot >= 1 ? this.presets[slot - 1] : undefined;
    }

    slotOf(name: string): number | undefined {
        const index = this.presets.findIndex((preset) => preset.name === name);
        return index === -1 ? undefined : index + 1;
    }

    /** The preset after the given one, wrapping round; the first if none. */
    after(name: string | undefined, step: 1 | -1 = 1): Preset | undefined {
        if (this.presets.length === 0) {
            return undefined;
        }
        const index = name === undefined ? -1 : this.presets.findIndex((preset) => preset.name === name);
        if (index === -1) {
            return step === 1 ? this.presets[0] : this.presets[this.presets.length - 1];
        }
        const next = (index + step + this.presets.length) % this.presets.length;
        return this.presets[next];
    }
}
