# HermiTile

Layouts for VS Code's panels, switched from the keyboard — like windows on a desktop.

A hermit crab moves into whichever shell suits it. HermiTile moves your workbench into whichever
layout suits what you are doing: talking to an agent in the terminal, reviewing a change,
walking through history.

## Shortcuts

| Key (macOS: ⌃⌥) | Does |
|---|---|
| `Ctrl+Alt+1` … `9` | Apply the preset at that place in the list |
| `Ctrl+Alt+0` | Pick a preset |
| `Ctrl+Alt+Tab` | Back to the previous layout (again: forward) — Alt+Tab for layouts |
| `Ctrl+Alt+]` / `[` | Next / previous preset |
| `Ctrl+Alt+M` | Maximize the part the keyboard is in; again to restore (not `⌃⌥↩`: Rectangle has it) |

They work with the keyboard in a terminal too: HermiTile adds its commands to
`terminal.integrated.commandsToSkipShell`, so the shell never sees them. (If you have set that
setting yourself, your list replaces the default — add the `hermiTile.*` commands to it.)

Pressing a preset's key again snaps the layout back into shape after you have moved things.

## Presets

| # | Preset | Layout |
|---|---|---|
| 1 | **Claude** | The secondary side bar — and the terminal in it — takes the whole window |
| 2 | **Review** | GitHawk's Changes on the left, the diff in the editor, nothing else |
| 3 | **Commits** | GitHawk's graph full height, the commit's files on the left |
| 4 | **Code** | Files on the left, terminal on the right, editor in between, no panel |

Make your own in `settings.json`. The order is the shortcut order:

```jsonc
"hermiTile.presets": [
  {
    "name": "Commits",
    "icon": "$(git-commit)",
    "sideBar": { "state": "visible", "view": "gitHawkChanges" },
    "secondarySideBar": "hidden",
    "panel": { "state": "maximized", "view": "gitHawkView", "position": "bottom", "alignment": "center" },
    "focus": "gitHawkView"
  }
]
```

| Field | Values |
|---|---|
| `sideBar` | `"hidden"`, `"visible"`, or `{ "state", "view" }` |
| `secondarySideBar` | as above, plus `"maximized"` (takes the whole window) |
| `panel` | as above, plus `"maximized"`, `position` (`bottom` `top` `left` `right`), `alignment` (`center` `justify` `left` `right`) |
| `focus` | `editor`, `sideBar`, `secondarySideBar`, `panel`, or any view id |
| `commands` | command ids run last, in order |

A part left out is left alone. A `view` is any view id — `gitHawkView`, `gitHawkChanges`,
`terminal`, `workbench.explorer.fileView`, `workbench.scm`.

Bind a preset by name, rather than by place:

```jsonc
{ "key": "ctrl+alt+c", "command": "hermiTile.apply", "args": "Claude" }
```

## What VS Code does not let an extension do

- **Read the layout.** HermiTile cannot see what is open, so every preset builds its layout
  from scratch rather than adjusting what is there. It also cannot notice that you rearranged
  things by hand — the status bar shows the last preset applied.
- **Set sizes.** Widths and heights are whatever you last dragged them to.
- **Maximize a top/bottom panel that is not centred.** Give a preset that maximizes the panel
  `"alignment": "center"` (the defaults do).
- **Maximize the primary side bar.** `Ctrl+Alt+M` there hides the panel and secondary side
  bar instead.

## Develop

```bash
npm install
npm run check && npm test   # types, lint, unit tests
npm run e2e                 # a real VS Code in Docker: presses the keys, measures the window
npm run e2e:mac             # the same in your installed VS Code, in a window (takes the keyboard)
npm run install:local       # package and install into your VS Code
```
