# Snipe PR ⚡

**Auto-generated PR descriptions that actually make sense.**

Snipe PR analyzes your pull request diffs and generates structured, readable descriptions — so your team spends less time writing and more time shipping.

## Quick Start

Add to `.github/workflows/snipe-pr.yml`:

```yaml
name: Snipe PR
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  describe:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - uses: klawgulp-ship-it/snipe-pr@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

That's it. Every PR gets an auto-generated description with:
- Change type detection (feature, bugfix, refactor, docs, etc.)
- Smart file categorization (API, UI, Tests, Config, etc.)
- Visual stats bar showing additions vs deletions
- Key highlights (new files, large changes, renames)

## Example Output

> ## ✨ **New Feature** — 5 files changed (+120/-15)
>
> ### Highlights
> - Added 2 new files: `UserService.ts`, `types.ts`
> - Largest change: `UserService.ts` (+80/-0)
>
> ### Changes
> - 🔌 **API**: `src/routes/users.ts`, `src/controllers/auth.ts`
> - 🖼️ **UI Components**: `src/components/UserCard.tsx`
> - 🧪 **Tests**: `src/__tests__/users.test.ts`
> - ⚙️ **Configuration**: `tsconfig.json`
>
> 🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟥🟥 +120 / -15 (net +105)

## Options

| Input | Description | Default |
|-------|-------------|---------|
| `github-token` | GitHub token for API access | `${{ github.token }}` |
| `snipelink-key` | SnipeLink API key for AI-powered descriptions | — |
| `mode` | `comment` (PR comment) or `body` (update PR body) | `comment` |
| `include-stats` | Include file change statistics | `true` |
| `max-diff-size` | Max diff characters to analyze | `10000` |

## AI-Powered Descriptions (Pro)

Want smarter, context-aware descriptions? Add a SnipeLink API key:

```yaml
- uses: klawgulp-ship-it/snipe-pr@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    snipelink-key: ${{ secrets.SNIPELINK_KEY }}
```

Get your API key at [snipelink.com/tools](https://snipelink.com/tools)

## How It Works

1. PR is opened or updated
2. Snipe PR reads the diff and changed files
3. Files are categorized by type (API, UI, Tests, etc.)
4. Change type is detected from diff content
5. A structured description is generated and posted

No external API calls needed for the free tier — everything runs locally in the GitHub Action.

## License

MIT — by [SnipeLink LLC](https://snipelink.com)
