#!/usr/bin/env bash
# Downloads the newest GitHawk from Open VSX and unpacks it, for an e2e run on a
# machine that has none installed (CI). Prints the extension's directory.
#
#   HERMITILE_E2E_GITHAWK="$(scripts/fetch-githawk.sh /tmp/githawk)"
set -euo pipefail

dest="${1:?usage: fetch-githawk.sh <directory>}"

# Found by name, so the publisher can change without breaking this.
url="$(curl -fsSL 'https://open-vsx.org/api/-/search?query=githawk&size=10' \
    | node -e 'let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
        const hit = JSON.parse(s).extensions.find((e) => e.name === "githawk");
        if (!hit) process.exit(1);
        console.log(hit.files.download);
    })')"

rm -rf "$dest" && mkdir -p "$dest"
curl -fsSL "$url" -o "$dest/githawk.vsix"
unzip -q "$dest/githawk.vsix" 'extension/*' -d "$dest"
rm "$dest/githawk.vsix"
echo "$dest/extension"
