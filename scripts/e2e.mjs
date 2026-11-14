/**
 * HermiTile end to end, in a real VS Code, the way a person uses it: press the
 * keys and measure what the window turned into.
 *
 *   npm run e2e         in Docker, on a virtual display: nothing on your screen
 *   npm run e2e:mac     in the VS Code in /Applications, in a window of its own
 *
 * VS Code gives an extension no way to read the layout back, so no test from
 * inside the extension host can tell whether a preset worked. The DOM can: each
 * part of the workbench is an element whose size says whether it is showing.
 *
 * A throwaway profile, GitHawk (your newest installed copy), and a test-only
 * helper. On the Mac, HERMITILE_E2E_EXTENSIONS=1 loads every extension you
 * have installed instead — another extension's keybinding taking Ctrl+Alt+N
 * is only caught that way, and their builds are for the Mac, not the container.
 */
import { _electron as electron } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

// A launch that hangs — it has, behind a leftover crash reporter — should fail
// the run, not hold it open for hours.
const watchdog = setTimeout(() => {
    console.error('✗ e2e: no result after 5 minutes; VS Code probably never opened.');
    process.exit(3);
}, 5 * 60_000);
watchdog.unref();

const out = process.argv[2] ?? 'artifacts/e2e';
mkdirSync(out, { recursive: true });

const mac = process.platform === 'darwin';
const executablePath =
    process.env.HERMITILE_E2E_CODE ?? '/Applications/Visual Studio Code.app/Contents/MacOS/Code';
/** The Command Palette's key, which is the one shortcut here that differs. */
const commandKey = mac ? 'Meta' : 'Control';
// A fresh directory every run: VS Code's crash reporter can outlive the
// window, and a second run on the same profile hangs at launch behind it.
// One run at a time: each clears the last one's directories, and two windows
// would take the keyboard from each other.
const lock = join(tmpdir(), 'hermitile-e2e.lock');
try {
    const holder = Number(readFileSync(lock, 'utf8'));
    process.kill(holder, 0);
    console.error(`✗ e2e: another run (pid ${holder}) is in progress.`);
    process.exit(4);
} catch {
    // No lock, or its holder has gone.
}
writeFileSync(lock, String(process.pid));
process.on('exit', () => rmSync(lock, { force: true }));

try {
    // Crash reporters that outlived earlier runs.
    execFileSync('pkill', ['-f', 'crashpad_handler.*hermitile-e2e-']);
} catch {
    // Nothing left over.
}
for (const stale of readdirSync(tmpdir()).filter((name) => name.startsWith('hermitile-e2e-'))) {
    rmSync(join(tmpdir(), stale), { recursive: true, force: true });
}
const root = join(tmpdir(), `hermitile-e2e-${Date.now()}`);
const profile = join(root, 'profile');
const sample = join(root, 'sample');
const extensionsDir = join(root, 'extensions');
const installed = join(homedir(), '.vscode', 'extensions');
const realExtensions = process.env.HERMITILE_E2E_EXTENSIONS === '1';

// A small repository, so GitHawk has a graph to show.
mkdirSync(sample, { recursive: true });
const git = (...args) => execFileSync('git', args, { cwd: sample, stdio: 'ignore' });
git('init', '-q', '-b', 'main');
for (const [file, message] of [['README.md', 'Start'], ['app.js', 'Add the app'], ['app.test.js', 'Test it']]) {
    writeFileSync(join(sample, file), `// ${message}\n`);
    git('add', file);
    git('-c', 'user.name=Sample', '-c', 'user.email=sample@example.com', 'commit', '-q', '-m', message);
}

// GitHawk, the newest installed version (whoever publishes it), alone.
mkdirSync(extensionsDir, { recursive: true });
const githawk =
    process.env.HERMITILE_E2E_GITHAWK ??
    readdirSync(installed, { withFileTypes: true })
        .map((entry) => entry.name)
        .filter((name) => /\.githawk-\d/.test(name))
        .sort()
        .map((name) => join(installed, name))
        .at(-1);
if (!realExtensions && githawk) {
    cpSync(githawk, join(extensionsDir, 'githawk'), { recursive: true });
}

// A fresh profile shows a welcome page and a chat that would steal focus.
mkdirSync(join(profile, 'User'), { recursive: true });
writeFileSync(
    join(profile, 'User', 'settings.json'),
    JSON.stringify({
        'workbench.startupEditor': 'none',
        'workbench.tips.enabled': false,
        'chat.commandCenter.enabled': false,
        'security.workspace.trust.enabled': false,
        'git.openRepositoryInParentFolders': 'never',
        // With HERMITILE_E2E_EXTENSIONS=1 this runs on your real extensions
        // directory; nothing should be updated or rewritten there.
        'extensions.autoUpdate': false,
        'extensions.autoCheckUpdates': false,
    })
);

const app = await electron.launch({
    timeout: 60_000,
    executablePath,
    args: [
        `--extensionDevelopmentPath=${process.cwd()}`,
        `--extensionDevelopmentPath=${join(process.cwd(), 'scripts', 'e2e-helper')}`,
        `--user-data-dir=${profile}`,
        `--extensions-dir=${realExtensions ? installed : extensionsDir}`,
        '--skip-welcome',
        '--skip-release-notes',
        '--disable-workspace-trust',
        // In the container: running as root, and no GPU behind the virtual display.
        ...(mac ? [] : ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']),
        sample,
    ],
});
const page = await app.firstWindow();
await page.setViewportSize({ width: 1500, height: 950 });
await page.waitForSelector('.monaco-workbench', { timeout: 60_000 });
await page.waitForTimeout(5000);

const results = [];
const check = (name, ok, detail) => {
    results.push({ name, ok: Boolean(ok), detail });
    console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `  — ${JSON.stringify(detail)}`}`);
};
const settle = () => page.waitForTimeout(1500);
/**
 * The window can lose the OS focus mid-run — to another app, a click on the
 * desktop — and a key pressed then reaches nothing. A person looks at the
 * window before pressing a key; so does this.
 */
const focusWindow = () =>
    app.evaluate(({ BrowserWindow }) => {
        const [window] = BrowserWindow.getAllWindows();
        window.show();
        window.focus();
    });
const press = async (keys) => {
    await focusWindow();
    await page.keyboard.press(keys);
    await settle();
};
const shot = (name) => page.screenshot({ path: join(out, `${name}.png`) });
const palette = async (command) => {
    await focusWindow();
    await page.keyboard.press(`${commandKey}+Shift+P`);
    await page.waitForSelector('.quick-input-widget:visible');
    await page.keyboard.type(command);
    await page.waitForTimeout(800);
    await page.keyboard.press('Enter');
    await settle();
};

/** Each part's size, and which part the keyboard is in. */
const layout = () =>
    page.evaluate(() => {
        const windowFocused = document.hasFocus();
        const measure = (selector) => {
            const element = document.querySelector(selector);
            if (!element || !element.checkVisibility()) {
                return { shown: false, width: 0, height: 0 };
            }
            const { width, height } = element.getBoundingClientRect();
            return { shown: width > 1 && height > 1, width: Math.round(width), height: Math.round(height) };
        };
        // A webview — GitHawk's graph — is laid over its part from outside it,
        // so it is placed by where it sits rather than by its ancestors.
        const partAt = (element) => {
            const { x, y, width, height } = element.getBoundingClientRect();
            const [cx, cy] = [x + width / 2, y + height / 2];
            return [...document.querySelectorAll('.part')].find((part) => {
                const r = part.getBoundingClientRect();
                return part.checkVisibility() && cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
            });
        };
        const active = document.activeElement;
        const focused = active?.closest('.part') ?? (active?.tagName === 'IFRAME' ? partAt(active) : undefined);
        const focus = focused
            ? ['sidebar', 'auxiliarybar', 'panel', 'editor'].find((name) => focused.classList.contains(name))
            : undefined;
        return {
            sideBar: measure('.part.sidebar'),
            secondarySideBar: measure('.part.auxiliarybar'),
            panel: measure('.part.panel'),
            editor: measure('.part.editor'),
            workbench: measure('.monaco-workbench'),
            focus,
            windowFocused,
            active: `${active?.tagName}.${String(active?.className).slice(0, 60)}`,
            inTerminal: Boolean(document.activeElement?.closest('.terminal')),
            gitHawkGraph: measure('[id="workbench.view.extension.gitHawkPanel"]').shown,
            gitHawkSideBar: measure('[id="workbench.view.extension.gitHawkSidebar"]').shown,
            // By id: other extensions' items say "Claude" too.
            status: document.querySelector('.statusbar-item[id*="hermiTile.current"]')?.textContent?.trim(),
        };
    });

const shown = (l) =>
    ['sideBar', 'secondarySideBar', 'panel', 'editor'].filter((part) => l[part].shown).join(',');

// Other extensions' prompts arrive whenever they like and can take the
// keyboard with them; with real extensions loaded that made focus checks
// fail for reasons that had nothing to do with HermiTile.
await palette('Notifications: Toggle Do Not Disturb Mode');
await palette('Notifications: Clear All Notifications');

// --- The terminal goes where an agent's usually lives: the secondary side bar.
await palette('HermiTile E2E: Move The Terminal To The Secondary Side Bar');
await page.waitForTimeout(2000);
let l = await layout();
check('setup: the terminal is in the secondary side bar', l.secondarySideBar.shown, l);

// --- 1. Claude: the secondary side bar takes the window.
await press('Control+Alt+1');
l = await layout();
await shot('1-claude');
check('Claude: only the secondary side bar is shown', shown(l) === 'secondarySideBar', shown(l));
check('Claude: it fills the window', l.secondarySideBar.width > l.workbench.width * 0.85, l);
check('Claude: the keyboard is in it', l.focus === 'auxiliarybar', l.focus);
check('Claude: named in the status bar', l.status?.includes('Claude'), l.status);

// --- 2. From inside the terminal, a shortcut still reaches VS Code.
await page.locator('.part.auxiliarybar .terminal').first().click();
await page.waitForTimeout(500);
l = await layout();
check('terminal: the keyboard is in the terminal', l.inTerminal, l);
await press('Control+Alt+2');
l = await layout();
await shot('2-review');
check('Review (pressed in the terminal): side bar and editor only', shown(l) === 'sideBar,editor', shown(l));
check('Review: the side bar shows GitHawk', l.gitHawkSideBar, l);
check('Review: the keyboard is in the side bar', l.focus === 'sidebar', l.focus);

// --- 3. Commits: graph full height, files beside it.
await press('Control+Alt+3');
l = await layout();
await shot('3-commits');
check('Commits: side bar and panel, no editor', shown(l) === 'sideBar,panel', shown(l));
check('Commits: the panel runs the full height', l.panel.height >= l.sideBar.height * 0.9, l);
check('Commits: the panel shows the GitHawk graph', l.gitHawkGraph, l);
check('Commits: the keyboard is in the panel', l.focus === 'panel', { focus: l.focus, active: l.active, windowFocused: l.windowFocused });
// --- Pressing it again leaves it as it is: no toggle runs the wrong way.
await press('Control+Alt+3');
l = await layout();
check('Commits again: unchanged', shown(l) === 'sideBar,panel' && l.panel.height >= l.sideBar.height * 0.9, l);

// --- 4. Code: everything but the panel.
await press('Control+Alt+4');
l = await layout();
await shot('4-code');
check('Code: side bars and editor, no panel', shown(l) === 'sideBar,secondarySideBar,editor', shown(l));
check('Code: the keyboard is in the editor', l.focus === 'editor', l.focus);

// --- Back: Alt+Tab between the last two.
await press('Control+Alt+Tab');
l = await layout();
check('back: to Commits', shown(l) === 'sideBar,panel' && l.status?.includes('Commits'), { shown: shown(l), status: l.status });
await press('Control+Alt+Tab');
l = await layout();
check('back again: to Code', shown(l) === 'sideBar,secondarySideBar,editor', shown(l));

// --- Maximize the part with the keyboard, and the same key restores.
await press('Control+Alt+M');
l = await layout();
await shot('5-maximized-editor');
check('maximize (from the editor): the editor alone', shown(l) === 'editor', shown(l));
await press('Control+Alt+M');
l = await layout();
check('maximize again: back to Code', shown(l) === 'sideBar,secondarySideBar,editor', shown(l));

// --- From a state HermiTile did not make: the panel maximized by hand.
await palette('View: Toggle Maximized Panel');
await press('Control+Alt+1');
l = await layout();
check('Claude, from a hand-maximized panel', shown(l) === 'secondarySideBar', shown(l));
await press('Control+Alt+3');
l = await layout();
check('Commits, from Claude', shown(l) === 'sideBar,panel', shown(l));

// --- Next / previous.
await press('Control+Alt+BracketRight');
l = await layout();
check('next: Commits → Code', l.status?.includes('Code'), l.status);
await press('Control+Alt+BracketLeft');
l = await layout();
check('previous: Code → Commits', l.status?.includes('Commits'), l.status);

// --- The picker lists every preset with its key.
await press('Control+Alt+Digit0');
const picks = await page.locator('.quick-input-list .monaco-list-row').allInnerTexts();
await shot('6-picker');
check('picker: four presets with their keys', picks.length === 4 && picks.every((text) => /⌃⌥\d|Ctrl\+Alt\+\d/.test(text)), picks);
await page.keyboard.press('Escape');
await settle();

// --- The activity bar's list: every preset, the current one marked, a click applies.
await palette('View: Show HermiTile');
const rows = page.locator('[id="workbench.view.extension.hermiTile"] .monaco-list-row');
await rows.first().waitFor({ timeout: 10_000 }).catch(() => undefined);
const listed = await rows.allInnerTexts();
await shot('7-activity-bar');
check('activity bar: four presets with their keys', listed.length === 4 && listed.every((text) => /⌃⌥\d|Ctrl\+Alt\+\d/.test(text)), listed);
check('activity bar: the current preset is marked', listed.some((text) => text.includes('Commits') && text.includes('current')), listed);
await rows.filter({ hasText: 'Code' }).click();
await settle();
l = await layout();
check('activity bar: a click applies the preset', l.status?.includes('Code'), l.status);

await app.close();

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed. Screenshots in ${out}/`);
process.exit(failed.length === 0 ? 0 : 1);
