# Changelog

All notable changes to HermiTile are documented here, following
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **A rating request, asked once.** After a layout has been applied on 7
  different days, HermiTile asks for a rating in the store your editor installs
  from (the VS Code Marketplace, or Open VSX for Cursor, VSCodium and others),
  with "Later" (asks once more, at 30 days) and "Don't Ask Again". Also the
  `HermiTile: Rate HermiTile` command, in the Layouts panel's "…" menu too. The
  count stays in the editor; nothing is sent.

## [0.1.0] — 2026-11-15

The first release: layouts for VS Code's panels, switched from the keyboard.

### Added

- **Four presets on `Ctrl+Alt+1`…`4`** (macOS `⌃⌥`). **Claude** gives the
  secondary side bar — and the agent's terminal in it — the whole window.
  **Review** shows GitHawk's Changes beside the diff and nothing else.
  **Commits** gives GitHawk's graph the full height, with the commit's files on
  the left. **Code** puts the files left, the terminal right and the editor in
  between. Each preset builds its layout from scratch, so pressing its key
  again snaps a rearranged window back into shape.
- **Moving between layouts.** `Ctrl+Alt+Tab` goes back to the previous layout
  and, pressed again, forward. `Ctrl+Alt+]` / `[` step through the presets, and
  `Ctrl+Alt+0` picks one from a list with their keys.
- **Maximize the part you are in.** `Ctrl+Alt+M` gives the editor, panel or
  secondary side bar the whole window; again restores the layout before it.
- **The keys work from inside a terminal.** HermiTile adds its commands to
  `terminal.integrated.commandsToSkipShell`, so the shell never sees them.
- **A Layouts panel in the activity bar.** Every preset with its key, the
  current one marked; a click applies it. Its title bar goes back to the
  previous layout and opens your presets in `settings.json`.
- **The current preset in the status bar**; click it to pick another. Turn it
  off with `hermiTile.statusBar`.
- **Presets of your own** in `hermiTile.presets`: for each of the side bar,
  secondary side bar and panel, hidden, visible or maximized, which view to
  show, the panel's position and alignment, where the keyboard lands, and
  commands to run last. Bind one by name with `hermiTile.apply`.
