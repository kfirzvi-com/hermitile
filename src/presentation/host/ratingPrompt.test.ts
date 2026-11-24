import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
    ASK_AT_USE_DAYS,
    INITIAL_RATING_STATE,
    REVIEW_PAGES,
    RatingFlow,
    asked,
    dayOf,
    finished,
    recordUse,
    reviewPage,
    shouldAsk,
    type RatingAnswer,
    type RatingState,
} from './ratingPrompt';

function usedOn(days: number, state: RatingState = INITIAL_RATING_STATE): RatingState {
    let next = state;
    for (let i = 0; i < days; i++) {
        next = recordUse(next, `use-${state.useDays + i}`);
    }
    return next;
}

describe('recordUse', () => {
    it('counts a day once, however often a layout is applied that day', () => {
        let state = recordUse(INITIAL_RATING_STATE, '2026-11-24');
        state = recordUse(state, '2026-11-24');
        expect(state.useDays).toBe(1);
        expect(recordUse(state, '2026-11-24')).toBe(state);
        expect(recordUse(state, '2026-11-25').useDays).toBe(2);
    });
});

describe('shouldAsk', () => {
    it('asks at 7 use days, then again at 30 after one ask', () => {
        expect(shouldAsk(usedOn(ASK_AT_USE_DAYS[0] - 1))).toBe(false);
        expect(shouldAsk(usedOn(ASK_AT_USE_DAYS[0]))).toBe(true);
        expect(shouldAsk(asked(usedOn(ASK_AT_USE_DAYS[0])))).toBe(false);
        expect(shouldAsk(asked(usedOn(ASK_AT_USE_DAYS[1])))).toBe(true);
    });

    it('never asks a third time, or after rating or "Don\'t Ask Again"', () => {
        expect(shouldAsk(asked(asked(usedOn(1000))))).toBe(false);
        expect(shouldAsk(finished(usedOn(ASK_AT_USE_DAYS[1])))).toBe(false);
    });
});

describe('reviewPage', () => {
    it("sends Microsoft's VS Code to the Marketplace", () => {
        expect(reviewPage('vscode')).toBe(REVIEW_PAGES.marketplace);
        expect(reviewPage('vscode-insiders')).toBe(REVIEW_PAGES.marketplace);
    });

    it('sends every other editor to Open VSX, VSCodium included', () => {
        expect(reviewPage('cursor')).toBe(REVIEW_PAGES.openVsx);
        expect(reviewPage('vscodium')).toBe(REVIEW_PAGES.openVsx);
        expect(reviewPage('windsurf')).toBe(REVIEW_PAGES.openVsx);
    });

    it('matches the links in the README', () => {
        const readme = readFileSync(new URL('../../../README.md', import.meta.url), 'utf8');
        for (const page of Object.values(REVIEW_PAGES)) {
            expect(readme).toContain(page);
        }
    });
});

describe('dayOf', () => {
    it('is the local calendar day', () => {
        expect(dayOf(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    });
});

/** The editor, faked: an in-memory store, a scripted answer, and a record of what happened. */
function editor(answer: RatingAnswer, start: RatingState = INITIAL_RATING_STATE) {
    const fake = { state: start, writes: 0, asks: 0, opened: [] as string[], day: 0 };
    const ports = {
        read: () => fake.state,
        write: async (next: RatingState) => {
            fake.state = next;
            fake.writes++;
        },
        ask: async () => {
            fake.asks++;
            return answer;
        },
        open: async (url: string) => {
            fake.opened.push(url);
        },
        today: () => `day-${fake.day}`,
    };
    return { fake, ports };
}

async function useOnDays(flow: RatingFlow, fake: { day: number }, days: number) {
    for (let i = 0; i < days; i++) {
        fake.day++;
        await flow.onUse();
    }
}

const PAGE = REVIEW_PAGES.marketplace;

describe('RatingFlow', () => {
    it('asks on the seventh use day, not before', async () => {
        const { fake, ports } = editor('later');
        const flow = new RatingFlow(PAGE, ports);
        await useOnDays(flow, fake, ASK_AT_USE_DAYS[0] - 1);
        expect(fake.asks).toBe(0);
        await useOnDays(flow, fake, 1);
        expect(fake.asks).toBe(1);
    });

    it('"Rate" opens the review page, and stops asking', async () => {
        const { fake, ports } = editor('rate', usedOn(ASK_AT_USE_DAYS[0] - 1));
        const flow = new RatingFlow(REVIEW_PAGES.openVsx, ports);
        await useOnDays(flow, fake, 1);
        expect(fake.opened).toEqual([REVIEW_PAGES.openVsx]);
        await useOnDays(flow, fake, 100);
        expect(fake.asks).toBe(1);
    });

    it('"Don\'t Ask Again" stops asking, and keeps the ask counted', async () => {
        const { fake, ports } = editor('never', usedOn(ASK_AT_USE_DAYS[0] - 1));
        const flow = new RatingFlow(PAGE, ports);
        await useOnDays(flow, fake, 100);
        expect(fake.asks).toBe(1);
        expect(fake.state).toMatchObject({ asks: 1, done: true });
        expect(fake.opened).toEqual([]);
    });

    it('"Later" asks once more, then never', async () => {
        const { fake, ports } = editor('later');
        const flow = new RatingFlow(PAGE, ports);
        await useOnDays(flow, fake, 200);
        expect(fake.asks).toBe(2);
    });

    it('does not ask twice while the question is still on screen', async () => {
        const { fake, ports } = editor('later', usedOn(ASK_AT_USE_DAYS[0] - 1));
        // A store that takes a moment to save, so the second use reads the
        // state from before the first ask was counted.
        const save = ports.write;
        ports.write = async (next) => {
            await new Promise((resolve) => setTimeout(resolve, 5));
            await save(next);
        };
        const flow = new RatingFlow(PAGE, ports);
        fake.day++;
        const first = flow.onUse();
        fake.day++;
        const second = flow.onUse();
        await Promise.all([first, second]);
        expect(fake.asks).toBe(1);
    });

    it('writes nothing when a layout is applied again the same day', async () => {
        const { fake, ports } = editor('later');
        const flow = new RatingFlow(PAGE, ports);
        await flow.onUse();
        await flow.onUse();
        await flow.onUse();
        expect(fake.writes).toBe(1);
    });

    it('keeps asking when the browser fails to open', async () => {
        const { fake, ports } = editor('rate', usedOn(ASK_AT_USE_DAYS[0] - 1));
        ports.open = async () => {
            throw new Error('no browser');
        };
        const flow = new RatingFlow(PAGE, ports);
        fake.day++;
        await expect(flow.onUse()).rejects.toThrow('no browser');
        expect(fake.state.done).toBe(false);
    });
});
