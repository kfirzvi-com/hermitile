# HermiTile — Claude Code Instructions

Layouts for VS Code's panels, switched from the keyboard — like windows on a desktop.
The name: a hermit crab moves between shells; here, between tiled layouts. Published as
`praktical.hermitile` (VS Code Marketplace + Open VSX); the repo stays private until release.

## Architecture — three DDD tiers (GitHawk's, minus what this does not need)

```
domain/         presets, the layout planner, history; no dependencies at all
application/    use cases + ports (CommandRunner, HistoryStore, PresetSource)
presentation/   host/ — the VS Code adapters, picker, status bar
extension.ts    composition root
```

- **`vscode` may only be imported by `presentation/host` and `extension.ts`.** Enforced by
  `eslint-plugin-boundaries`, not by convention.
- **A layout is a list of built-in commands**, planned in `LayoutPlanner` and run in order.
  VS Code gives extensions no way to read the layout back (no API, context keys are
  write-only), so every plan must reach the same place from any starting state. Where VS Code
  only has a toggle (`toggleMaximizedPanel`), the plan first drives the part to a known state
  (closed) and toggles from there. Read the comments in `LayoutPlanner` before changing order.
- No webview, no infrastructure tier: there is nothing to draw and nothing outside VS Code.

## Commands

```bash
npm run dev            # esbuild watch (F5 uses it)
npm run check          # tsc + eslint
npm test               # Vitest — planner, parser, use cases
npm run e2e            # real VS Code in Docker on a virtual display — nothing on your screen
npm run e2e:mac        # the same, in /Applications' VS Code, in a window (takes the keyboard)
npm run e2e:mac:real   # …with every extension you have installed (keybinding conflicts)
npm run install:local  # check + test + package + install into your VS Code
```

## Two test tiers, and why each exists

1. **Vitest** — the planner's command sequences and the use cases, against a recording runner.
2. **`scripts/e2e.mjs`** — Playwright drives a real VS Code with a throwaway profile, GitHawk
   (your newest installed copy), and `scripts/e2e-helper` (test-only: moves the terminal into the
   secondary side bar). It presses the real shortcuts and measures each `.part` element. This is
   the only tier that can tell whether a layout actually happened — and whether a shortcut
   pressed inside a terminal reaches VS Code at all.
   - **Default: in Docker** (`scripts/e2e-docker.sh`, `scripts/e2e.Dockerfile`), Linux + xvfb,
     pinned to the VS Code version installed locally. Never opens a window on your screen —
     use this one unless asked.
   - **`e2e:mac`** opens a window and takes the keyboard. Anything else that takes OS focus
     mid-run (another app, a click) makes key presses go nowhere; the script refocuses its window
     before each key, but it is still unreliable while someone uses the machine.
   - One run at a time (a lock in the temp dir): each run clears the last one's directories.

## Facts about VS Code that the design rests on (checked against 1.142)

- Action preconditions are not enforced on `executeCommand`, so `restoreAuxiliaryBar` is a safe
  no-op when nothing is maximized.
- Hiding the panel un-maximizes it; reopening it re-maximizes it if it was last closed maximized
  (`workbench.panel.opensMaximized: preserve`, the default).
- `toggleMaximizedPanel` on a hidden panel opens it maximized, always.
- A top/bottom panel can only be maximized when its alignment is `center`. Alignment cannot be read.
- Keys pressed in a terminal go to the shell unless the command is in
  `terminal.integrated.commandsToSkipShell` — hence `configurationDefaults` in package.json.
