import {
    PANEL_ALIGNMENTS,
    PANEL_POSITIONS,
    type PanelAlignment,
    type PanelLayout,
    type PanelPosition,
} from '../models/PanelLayout';
import { PART_STATES, type PartLayout, type PartState } from '../models/PartLayout';
import type { Preset } from '../models/Preset';

export interface ParsedPresets {
    readonly presets: Preset[];
    /** One line per thing that was ignored, for the user to fix. */
    readonly problems: string[];
}

type PartKey = 'sideBar' | 'secondarySideBar' | 'panel';

/** Parts VS Code can maximize; the primary side bar is not one of them. */
const MAXIMIZABLE: readonly PartKey[] = ['secondarySideBar', 'panel'];

/**
 * Reads presets from settings.
 *
 * Settings are hand-edited JSON, so this is forgiving: a mistake drops the one
 * field or preset it is in, says so, and keeps everything else working. A
 * bad field drops only that field, so the preset keeps its place in the list —
 * and with it its shortcut, which is bound by position.
 */
export class PresetParser {
    parse(raw: unknown): ParsedPresets {
        const problems: string[] = [];
        const presets: Preset[] = [];

        if (!Array.isArray(raw)) {
            return { presets, problems: ['Presets must be a list.'] };
        }

        const names = new Set<string>();
        raw.forEach((entry, index) => {
            const where = `Preset ${index + 1}`;
            if (!isRecord(entry)) {
                problems.push(`${where} is not an object, and was skipped.`);
                return;
            }

            const name = typeof entry.name === 'string' ? entry.name.trim() : '';
            if (name === '') {
                problems.push(`${where} has no name, and was skipped.`);
                return;
            }
            const key = name.toLowerCase();
            if (names.has(key)) {
                problems.push(`"${name}" is named twice; only the first is used.`);
                return;
            }
            names.add(key);

            presets.push(this.preset(entry, name, problems));
        });

        return { presets, problems };
    }

    private preset(entry: Record<string, unknown>, name: string, problems: string[]): Preset {
        const where = `"${name}"`;
        const sideBar = this.part(entry.sideBar, 'sideBar', where, problems);
        const secondarySideBar = this.part(entry.secondarySideBar, 'secondarySideBar', where, problems);
        const panel = this.panel(entry.panel, where, problems);

        if (secondarySideBar?.state === 'maximized' && panel?.state === 'maximized') {
            problems.push(
                `${where} maximizes both the panel and the secondary side bar; the secondary side bar wins.`
            );
        }

        return {
            name,
            icon: optionalString(entry.icon, `${where} icon`, problems),
            description: optionalString(entry.description, `${where} description`, problems),
            sideBar,
            secondarySideBar,
            panel,
            focus: optionalString(entry.focus, `${where} focus`, problems),
            commands: this.commands(entry.commands, where, problems),
        };
    }

    /** A part is either its state alone, `"hidden"`, or `{ "state": …, "view": … }`. */
    private part(
        value: unknown,
        key: PartKey,
        where: string,
        problems: string[]
    ): PartLayout | undefined {
        if (value === undefined) {
            return undefined;
        }
        const record = typeof value === 'string' ? { state: value } : value;
        if (!isRecord(record)) {
            problems.push(`${where} ${key} must be a state or an object; it was ignored.`);
            return undefined;
        }

        const state = record.state;
        if (!isPartState(state)) {
            problems.push(
                `${where} ${key} state must be one of ${PART_STATES.join(', ')}; it was ignored.`
            );
            return undefined;
        }
        if (state === 'maximized' && !MAXIMIZABLE.includes(key)) {
            problems.push(
                `${where} ${key} cannot be maximized — VS Code only maximizes the panel and the secondary side bar. It is shown instead.`
            );
            return { state: 'visible', view: optionalString(record.view, `${where} ${key} view`, problems) };
        }

        return { state, view: optionalString(record.view, `${where} ${key} view`, problems) };
    }

    private panel(value: unknown, where: string, problems: string[]): PanelLayout | undefined {
        const part = this.part(value, 'panel', where, problems);
        if (part === undefined || !isRecord(value)) {
            return part;
        }

        return {
            ...part,
            position: oneOf<PanelPosition>(value.position, PANEL_POSITIONS, `${where} panel position`, problems),
            alignment: oneOf<PanelAlignment>(value.alignment, PANEL_ALIGNMENTS, `${where} panel alignment`, problems),
        };
    }

    private commands(value: unknown, where: string, problems: string[]): string[] {
        if (value === undefined) {
            return [];
        }
        if (!Array.isArray(value)) {
            problems.push(`${where} commands must be a list of command ids; they were ignored.`);
            return [];
        }
        const commands = value.filter((command): command is string => typeof command === 'string' && command !== '');
        if (commands.length !== value.length) {
            problems.push(`${where} commands has entries that are not command ids; they were skipped.`);
        }
        return commands;
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPartState(value: unknown): value is PartState {
    return typeof value === 'string' && (PART_STATES as readonly string[]).includes(value);
}

function optionalString(value: unknown, what: string, problems: string[]): string | undefined {
    if (value === undefined) {
        return undefined;
    }
    if (typeof value !== 'string' || value === '') {
        problems.push(`${what} must be a non-empty string; it was ignored.`);
        return undefined;
    }
    return value;
}

function oneOf<T extends string>(
    value: unknown,
    allowed: readonly T[],
    what: string,
    problems: string[]
): T | undefined {
    if (value === undefined) {
        return undefined;
    }
    if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) {
        return value as T;
    }
    problems.push(`${what} must be one of ${allowed.join(', ')}; it was ignored.`);
    return undefined;
}
