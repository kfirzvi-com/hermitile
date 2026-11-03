# The e2e run, off your screen: Linux, a virtual display, and the same VS Code
# version as the one installed on the Mac. Playwright's image brings the
# Chromium libraries Electron needs; VS Code wants a few more.
FROM mcr.microsoft.com/playwright:v1.62.0-noble

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl git libsecret-1-0 libxkbfile1 xauth xvfb \
    && rm -rf /var/lib/apt/lists/*

ARG CODE_VERSION=latest
RUN arch="$(dpkg --print-architecture | sed 's/amd64/x64/')" \
    && curl -fsSL "https://update.code.visualstudio.com/${CODE_VERSION}/linux-${arch}/stable" -o /tmp/code.tgz \
    && mkdir -p /opt/vscode \
    && tar -xzf /tmp/code.tgz -C /opt/vscode --strip-components=1 \
    && rm /tmp/code.tgz
