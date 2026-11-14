/**
 * Prints one version's section of CHANGELOG.md, for use as GitHub Release notes.
 *
 * The changelog is the release notes: generating them from commit subjects
 * would describe the work rather than the change, and would drift from what
 * the stores show for the same version.
 *
 *   node scripts/changelog-section.mjs 0.1.0
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const version = process.argv[2];
if (!version) {
    console.error('usage: changelog-section.mjs <version>');
    process.exit(1);
}

const path = fileURLToPath(new URL('../CHANGELOG.md', import.meta.url));
const lines = readFileSync(path, 'utf8').split('\n');

// Headings look like `## [0.1.0] — 2026-11-14`. Only the bracketed version is
// matched, so the date separator and format stay free to change.
const isHeading = (line) => /^## \[/.test(line);
const start = lines.findIndex((line) => isHeading(line) && line.startsWith(`## [${version}]`));

if (start === -1) {
    console.error(`CHANGELOG.md has no section for ${version}`);
    process.exit(1);
}

const rest = lines.slice(start + 1);
const end = rest.findIndex(isHeading);

console.log((end === -1 ? rest : rest.slice(0, end)).join('\n').trim());
