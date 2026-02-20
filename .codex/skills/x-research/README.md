# x-research

> Canonical PT Study system: CP-MSS v1.0 (`PRIME -> CALIBRATE -> ENCODE -> REFERENCE -> RETRIEVE -> OVERLEARN`).
> If this file conflicts with current docs, follow `sop/library/17-control-plane.md`.


X/Twitter research agent for [Claude Code](https://code.claude.com) and [OpenClaw](https://openclaw.ai). Search, filter, monitor — all from the terminal.

## What it does

Wraps the X API into a fast CLI so your AI agent (or you) can search tweets, pull threads, monitor accounts, and get sourced research without writing curl commands.

- **Search** with engagement sorting, time filtering, noise removal
- **Quick mode** for cheap, targeted lookups
- **Watchlists** for monitoring accounts
- **Cache** to avoid repeat API charges
- **Cost transparency** — every search shows what it cost

## Install

### Claude Code
```bash
# From your project
mkdir -p .claude/skills
cd .claude/skills
git clone https://github.com/rohunvora/x-research-skill.git x-research
```

### OpenClaw
```bash
# From your workspace
mkdir -p skills
cd skills
git clone https://github.com/rohunvora/x-research-skill.git x-research
```

## Setup

1. **X API Bearer Token** — Get one from the [X Developer Portal](https://developer.x.com)
2. **Set the env var:**
   ```bash
   export X_BEARER_TOKEN="your-token-here"
   ```
   Or save it to `~/.config/env/global.env`:
   ```
   X_BEARER_TOKEN=your-token-here
   ```
3. **Install Bun** (for CLI tooling): https://bun.sh

## Usage

### Natural language (just talk to Claude)
- "What are people saying about Opus 4.6?"
- "Search X for OpenClaw skills"
- "What's CT saying about BNKR today?"
- "Check what @frankdegods posted recently"

### CLI commands
```bash
cd skills/x-research

# Search (sorted by likes, auto-filters retweets)
bun run x-search.ts search "your query" --sort likes --limit 10

# Profile — recent tweets from a user
bun run x-search.ts profile username

# Thread — full conversation
bun run x-search.ts thread TWEET_ID

# Single tweet
bun run x-search.ts tweet TWEET_ID

# Watchlist
bun run x-search.ts watchlist add username "optional note"
bun run x-search.ts watchlist check

# Save research to file
bun run x-search.ts search "query" --save --markdown
```

### Search options
```
--sort likes|impressions|retweets|recent   (default: likes)
--since 1h|3h|12h|1d|7d     Time filter (default: last 7 days)
--min-likes N              Filter minimum likes
--min-impressions N        Filter minimum impressions
--pages N                  Pages to fetch, 1-5 (default: 1, 100 tweets/page)
--limit N                  Results to display (default: 15)
--quick                    Quick mode (see below)
--from <username>          Shorthand for from:username in query
--quality                  Pre-filter low-engagement tweets (min_faves:10)
--no-replies               Exclude replies
--save                     Save to ~/clawd/drafts/
--json                     Raw JSON output
--markdown                 Markdown research doc
```

## Quick Mode

`--quick` is designed for fast, cheap lookups when you just need a pulse check on a topic.

**What it does:**
- Forces single page (max 10 results) — reduces API reads
- Auto-appends `-is:retweet -is:reply` noise filters (unless you explicitly used those operators)
- Uses 1-hour cache TTL instead of the default 15 minutes
- Shows cost summary after results

**Examples:**
```bash
# Quick pulse check on a topic
bun run x-search.ts search "BNKR" --quick

# Quick check what someone is saying
bun run x-search.ts search "BNKR" --from voidcider --quick

# Quick quality-only results
bun run x-search.ts search "AI agents" --quality --quick
```

**Why it's cheaper:**
- Prevents multi-page fetches (biggest cost saver)
- 1hr cache means repeat searches are free
- Noise filters mean fewer junk results in your 100-tweet page
- You see cost after every search — no surprises

## `--from` Shorthand

Adds `from:username` to your query without having to type the full operator syntax.

```bash
# These are equivalent:
bun run x-search.ts search "BNKR from:voidcider"
bun run x-search.ts search "BNKR" --from voidcider

# Works with --quick and other flags
bun run x-search.ts search "AI" --from frankdegods --quick --quality
```

If your query already contains `from:`, the flag won't double-add it.

## `--quality` Flag

Filters out low-engagement tweets (≥10 likes required). Applied post-fetch since `min_faves` isn't available on X API Basic tier.

```bash
bun run x-search.ts search "crypto AI" --quality
```

## Cost

X API charges per tweet read. Every search page = ~100 reads.

| Operation | API calls | Est. cost |
|-----------|-----------|-----------|
| Quick search (1 page) | 1 | ~$0.50 |
| Standard search (1 page) | 1 | ~$0.50 |
| Deep research (3 pages) | 3 | ~$1.50 |
| Watchlist check (5 accounts) | 5 | ~$0.13/ea |
| Cached repeat | 0 | free |

**How x-search saves money:**
- Cache (15min default, 1hr in quick mode) — repeat queries are free
- Quick mode prevents accidental multi-page fetches
- Cost displayed after every search so you know what you're spending
- `--from` targets specific users instead of broad searches

## File structure

```
x-research/
├── SKILL.md              # Agent instructions (Claude reads this)
├── x-search.ts           # CLI entry point
├── lib/
│   ├── api.ts            # X API wrapper
│   ├── cache.ts          # File-based cache
│   └── format.ts         # Telegram + markdown formatters
└── data/
    ├── watchlist.json    # Accounts to monitor
    └── cache/            # Auto-managed
```

## Limitations

- Search covers last 7 days only (X API restriction on Basic tier)
- Read-only — never posts or interacts
- Requires X API Basic tier ($200/mo) or higher
- `min_likes` / `min_retweets` operators unavailable on Basic tier (filtered post-hoc instead)

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=rohunvora/x-research-skill&type=Date)](https://star-history.com/#rohunvora/x-research-skill&Date)

## License

MIT

