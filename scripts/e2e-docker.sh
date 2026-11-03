#!/usr/bin/env bash
# Runs scripts/e2e.mjs in a container, so no window opens and nothing takes
# the keyboard on the machine you are working at.
#
#   scripts/e2e-docker.sh [screenshot-dir]
set -euo pipefail
cd "$(dirname "$0")/.."

# The VS Code version installed here, so the container tests the same one.
mac_code='/Applications/Visual Studio Code.app/Contents/Resources/app/package.json'
code_version="$(node -p "require('$mac_code').version" 2>/dev/null || echo latest)"
image="hermitile-e2e:${code_version}"

if ! docker image inspect "$image" >/dev/null 2>&1; then
    echo "Building $image (once per VS Code version)…"
    docker build -q -t "$image" --build-arg "CODE_VERSION=${code_version}" -f scripts/e2e.Dockerfile scripts >/dev/null
fi

githawk="$(ls -d "$HOME"/.vscode/extensions/*.githawk-[0-9]* 2>/dev/null | sort -V | tail -1 || true)"
githawk_mount=()
if [[ -n "$githawk" ]]; then
    githawk_mount=(-v "$githawk:/githawk:ro" -e HERMITILE_E2E_GITHAWK=/githawk)
fi

docker run --rm --init --ipc=host \
    -v "$PWD:/work" -w /work \
    "${githawk_mount[@]}" \
    -e HERMITILE_E2E_CODE=/opt/vscode/code \
    "$image" \
    xvfb-run -a -s '-screen 0 1600x1000x24' node scripts/e2e.mjs "${1:-artifacts/e2e}"
