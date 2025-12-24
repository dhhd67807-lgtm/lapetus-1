# Lapetus Deploy Guide

After making any code changes, run these commands to deploy:

```bash
git add -A
git commit -m "Your commit message"
git push --no-verify
```

The GitHub Actions workflow will automatically build binaries for all platforms.

## Check Build Status

```bash
gh run list --repo dhhd67807-lgtm/lapetus-1 --limit 3
```

Wait for "Build on Push" workflow to show ✓ status.

## Install/Update

```bash
curl -fsSL https://lapetus-install.vulcanubi.workers.dev/install | bash
```

## Important URLs

- GitHub Repo: https://github.com/dhhd67807-lgtm/lapetus-1
- Install Script: https://lapetus-install.vulcanubi.workers.dev/install
- Website: https://lapetus.qzz.io/
