import { describe, expect, it } from 'vitest';
import type { Preset } from './Preset';
import { PresetCatalog } from './PresetCatalog';

const preset = (name: string): Preset => ({ name, commands: [] });
const catalog = new PresetCatalog([preset('Claude'), preset('Review'), preset('Commits')]);

describe('PresetCatalog', () => {
    it('finds by exact name, then ignoring case', () => {
        expect(catalog.find('Review')?.name).toBe('Review');
        expect(catalog.find('claude')?.name).toBe('Claude');
        expect(catalog.find('nope')).toBeUndefined();
    });

    it('finds the built-in maximized layouts, which switching back may return to', () => {
        expect(catalog.find('Maximized: Editor')?.name).toBe('Maximized: Editor');
    });

    it('numbers slots from 1', () => {
        expect(catalog.atSlot(1)?.name).toBe('Claude');
        expect(catalog.atSlot(3)?.name).toBe('Commits');
        expect(catalog.atSlot(0)).toBeUndefined();
        expect(catalog.atSlot(4)).toBeUndefined();
        expect(catalog.slotOf('Review')).toBe(2);
    });

    it('cycles round in both directions', () => {
        expect(catalog.after('Commits')?.name).toBe('Claude');
        expect(catalog.after('Claude', -1)?.name).toBe('Commits');
        expect(catalog.after(undefined)?.name).toBe('Claude');
        // From a layout outside the list, such as a maximized one.
        expect(catalog.after('Maximized: Panel', -1)?.name).toBe('Commits');
        expect(new PresetCatalog([]).after('Claude')).toBeUndefined();
    });
});
