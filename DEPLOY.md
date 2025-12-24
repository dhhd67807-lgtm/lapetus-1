# Lapetus Deploy Guide

## After Making Code Changes

1. Commit and push:
```bash
git add -A
git commit -m "Your commit message"
git push --no-verify
```

2. Check build status:
```bash
gh run list --repo dhhd67807-lgtm/lapetus-1 --workflow "Build on Push" --limit 1
```
Wait for ✓ status.

3. Download and install new version:
```bash
curl -L -o /tmp/lapetus.zip "https://github.com/dhhd67807-lgtm/lapetus-1/releases/download/latest/lapetus-darwin-arm64.zip" && \
unzip -o /tmp/lapetus.zip -d /tmp/lapetus-new && \
rm -f ~/.lapetus/bin/lapetus && \
mv /tmp/lapetus-new/lapetus ~/.lapetus/bin/lapetus && \
chmod +x ~/.lapetus/bin/lapetus
```

4. Verify version:
```bash
lapetus --version
```

## First Time Install

```bash
curl -fsSL https://lapetus-install.vulcanubi.workers.dev/install | bash
```

## Deploy Cloudflare Worker (install script changes)

```bash
cd cloudflare-worker
wrangler deploy
```

## Important URLs

- GitHub Repo: https://github.com/dhhd67807-lgtm/lapetus-1
- Install Script: https://lapetus-install.vulcanubi.workers.dev/install
- Website: https://lapetus.qzz.io/
