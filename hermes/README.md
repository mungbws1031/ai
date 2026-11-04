# Hermes — Telegram group-chat bot

A Telegram bot for the IVDR automation team. It answers commands, talks to an
LLM, reports IVDR workflow status, and posts a scheduled digest to the group.

## Why a group bot may "not run" (root-cause checklist)

A Telegram bot most often appears dead in a **group chat** for one of these
reasons. They are ordered by how frequently they are the actual cause:

1. **Group privacy mode is ON (most common).** By default BotFather creates
   bots with *privacy mode enabled*, so a bot in a group only receives
   `/commands` directed at it — it **cannot see normal messages**. If you
   expected the bot to react to plain chat, message
   [@BotFather](https://t.me/BotFather) → `/setprivacy` → select the bot →
   **Disable**, then **remove and re-add the bot to the group** (the change
   only takes effect on re-join).
2. **`HERMES_BOT_TOKEN` is missing or wrong.** The process exits immediately
   with a clear error (`HERMES_BOT_TOKEN is not set`).
3. **Bot was never added to the group**, or was added then removed.
4. **Wrong chat ID** in `HERMES_NOTIFY_CHAT_IDS`. Run `/id` inside the target
   group to get the correct (negative) ID. A group promoted to a *supergroup*
   gets a **new** ID (prefixed `-100`); the old one stops working.
5. **A webhook is set on the bot.** Long polling (what this bot uses) and a
   webhook are mutually exclusive; if a webhook was set earlier, polling gets
   no updates. Clear it: `https://api.telegram.org/bot<TOKEN>/deleteWebhook`.
6. **Two instances of the same bot token running.** Telegram delivers each
   update once; a second poller causes `Conflict` errors and dropped messages.
7. **`/ask` says "AI unavailable"** → `LLM_*` env vars are unset or the
   endpoint rejected the request (the error text shows the HTTP status).
8. **Scheduling silently does nothing** → `JobQueue` extra not installed.
   Install `python-telegram-bot[job-queue]` (already pinned in
   `requirements.txt`) and set `HERMES_DIGEST_INTERVAL_SECONDS > 0` plus a
   non-empty `HERMES_NOTIFY_CHAT_IDS`.

## Setup

### Option A — Docker (recommended for "just run it")

```bash
cp hermes/.env.example .env       # then fill HERMES_BOT_TOKEN at minimum
docker compose up -d hermes       # starts only the bot
# or: docker compose up -d        # bot + backend + frontend together
docker compose logs -f hermes     # follow logs
```

The bot reads `.env` from the repo root. The compose service overrides
`HERMES_IVDR_API_URL` to `http://backend:8000/api` so `/status` works
out of the box when the backend container is running.

### Option B — local Python

```bash
pip install -r hermes/requirements.txt
cp hermes/.env.example .env       # then edit .env
python -m hermes
```

### First-time BotFather steps

1. Open [@BotFather](https://t.me/BotFather) → `/newbot` → name and username.
2. Copy the token into `HERMES_BOT_TOKEN`.
3. `/setprivacy` → select your bot → **Disable** (so it can read group
   messages, mentions, and replies).
4. Add the bot to your group, then in that group send `/id` — paste the
   returned number into `HERMES_NOTIFY_CHAT_IDS`.
5. Restart the bot.

## Commands

| Command            | Description                                            |
|--------------------|--------------------------------------------------------|
| `/start`           | Greeting                                               |
| `/help`            | Command list and the privacy-mode note                 |
| `/ping`            | Health check (`pong`)                                  |
| `/id`              | Show the current chat ID (use it for notifications)    |
| `/status`          | IVDR projects and their workflow runs                  |
| `/ask <question>`  | Ask the AI assistant                                   |

In a group the bot also replies when **mentioned** (`@yourbot ...`) or when a
user **replies to one of its messages**. In a private chat every message is
treated as a question.

## IVDR workflow notifications

`hermes.bot.notify(application, text)` broadcasts a message to every chat in
`HERMES_NOTIFY_CHAT_IDS`. The IVDR backend can call it (or post to the same
chat IDs via the Telegram API) when a run changes state, e.g.
"workflow run #12 awaiting human approval".

## Scheduled digest

Set `HERMES_DIGEST_INTERVAL_SECONDS` and `HERMES_NOTIFY_CHAT_IDS`; the bot
posts the `/status` summary to those chats on that interval.
