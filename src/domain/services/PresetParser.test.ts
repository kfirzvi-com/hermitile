import { describe, expect, it } from 'vitest';
import { PresetParser } from './PresetParser';

const parser = new PresetParser();

describe('PresetParser', () => {
    it('reads a part given as its state alone, or with a view', () => {
        const { presets, problems } = parser.parse([
            { name: 'A', sideBar: 'hidden', panel: { state: 'maximized', view: 'gitHawkView', alignment: 'center' } },
        ]);
        expect(problems).toEqual([]);
        expect(presets[0]).toMatchObject({
            name: 'A',
            sideBar: { state: 'hidden' },
            panel: { state: 'maximized', view: 'gitHawkView', alignment: 'center' },
            commands: [],
        });
    });

    it('rejects a list that is not one', () => {
        expect(parser.parse({ name: 'A' })).toEqual({ presets: [], problems: ['Presets must be a list.'] });
    });

    it('skips a nameless preset and a repeated name, and says so', () => {
        const { presets, problems } = parser.parse([{ name: 'A' }, { sideBar: 'hidden' }, { name: 'a' }]);
        expect(presets.map((preset) => preset.name)).toEqual(['A']);
        expect(problems).toHaveLength(2);
    });

    it('drops only the bad field, keeping the preset — and so its key — in place', () => {
        const { presets, problems } = parser.parse([
            { name: 'A', panel: 'sideways' },
            { name: 'B', panel: { state: 'visible', alignment: 'diagonal' } },
        ]);
        expect(presets.map((preset) => preset.name)).toEqual(['A', 'B']);
        expect(presets[0].panel).toBeUndefined();
        expect(presets[1].panel).toEqual({ state: 'visible', view: undefined, position: undefined, alignment: undefined });
        expect(problems).toHaveLength(2);
    });

    it('shows a primary side bar asked to maximize, since VS Code cannot', () => {
        const { presets, problems } = parser.parse([{ name: 'A', sideBar: 'maximized' }]);
        expect(presets[0].sideBar).toEqual({ state: 'visible', view: undefined });
        expect(problems[0]).toMatch(/cannot be maximized/);
    });

    it('warns when two parts are both maximized', () => {
        const { problems } = parser.parse([{ name: 'A', panel: 'maximized', secondarySideBar: 'maximized' }]);
        expect(problems[0]).toMatch(/secondary side bar wins/);
    });

    it('keeps only command ids from commands', () => {
        const { presets, problems } = parser.parse([{ name: 'A', commands: ['one', 2, ''] }]);
        expect(presets[0].commands).toEqual(['one']);
        expect(problems).toHaveLength(1);
    });
});
