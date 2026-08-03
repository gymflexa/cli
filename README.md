# gymflexa

Command-line access to your [GymFlexa](https://www.gymflexa.com/) data on
[app.gymflexa.com](https://app.gymflexa.com): the gyms of your organization,
the members enrolled in them, the services they sell, the appointments on
their calendars, and the payments they record — the same records the dashboard
shows, through the GymFlexa REST API at `https://api.gymflexa.com`.

## Install

```bash
npm install -g gymflexa   # global install
npx gymflexa --help       # or run without installing
```

Requires Node.js 18 or newer.

## Quick start

```bash
gymflexa login                                   # choose browser or API key login
gymflexa gyms list                               # the gyms of your organization
gymflexa members list --gymId 64a1f2c9e4b0a1b2c3d4e5f6 -n 10
gymflexa appointments list --startTime 2026-08-01T00:00:00.000Z
```

```
Found 1 gym(s):
1. Iron Yard — Rome, IT (64a1f2c9e4b0a1b2c3d4e5f6)
```

## Signing up

No account yet? Create one from the terminal — the generated password prints
exactly once, the new organization is seeded with a gym, and the session is
stored so every other command works immediately:

```bash
gymflexa signup --email founder@example.com --json
```

## Authentication

Two ways in, both stored in `~/.gymflexa/`:

- **Browser** — `gymflexa login --browser` opens
  [app.gymflexa.com](https://app.gymflexa.com) in your browser to log in with
  your GymFlexa account, then stores a token session. Tokens are refreshed
  automatically; requests carry `Authorization: Token base64(<jwt>)`.
- **API key** — `gymflexa login --with-key` prompts for an API key secret with
  a masked input. An owner of your organization creates the key in the
  GymFlexa dashboard: open your gym and use **API keys**
  (`/gyms/<gymId>/api-keys/new` on
  [app.gymflexa.com](https://app.gymflexa.com)). The secret is shown **once**,
  when the key is created, and never again — store it somewhere safe. It is
  never accepted as a command-line argument, so it cannot leak into your shell
  history. Requests carry `Authorization: Basic base64(<key secret>)`.

Plain `gymflexa login` in a terminal asks which method to use.
`gymflexa logout` deletes everything stored in `~/.gymflexa/`.

**Headless / CI / agents** — export `GYMFLEXA_API_KEY=<key secret>` and skip
`login` entirely: every command reads it at request time. When several
credentials exist the precedence is: stored browser session, then stored key,
then the environment variable — a stored login always wins over an exported
key, so a globally exported `GYMFLEXA_API_KEY` never hijacks an interactive
session.

Without a terminal the CLI never hangs and never opens a browser:
`gymflexa login` (and any command run without credentials) fails immediately
with exit code 1 and instructions on stderr.

A key belongs to a single organization, so the organization never has to be
named. A key can additionally be locked to one gym — such a key reads and
writes only that gym, and the `--gymId` options below become unnecessary.

### Scopes

Each API key carries per-resource scopes: `gyms:read`, `gyms:write`,
`members:read`, `members:write`, `appointments:read`, `appointments:write`,
`services:read`, `services:write`, `payments:read` and `payments:write`. New
keys start read-only; an owner widens them in the dashboard. A command hitting
a scope the key lacks fails with `403: API key is missing the "…" scope`.
Requests are rate limited per key; going over the limit returns `429`. A
browser login carries your own user permissions instead of key scopes.

## JSON output

Every subcommand accepts `--json` and prints real, parseable JSON on stdout —
plain `JSON.stringify`, no colors. Without the flag, `list` and `read` print
human summaries. Mutations with `--json` print a small result object:
`{ "ok": true, "id": "…" }` for `add`/`update`,
`{ "ok": true, "deleted": ["…"] }` for `delete`.

Errors always go to stderr with exit code 1; with `--json` the error is a
single JSON line — `{"error":{"message":"…","status":404}}` — so stdout stays
clean for parsing.

```bash
gymflexa members list --json -n 100 | jq '.[] | {id: ._id, name, email}'
```

## Commands

### Session

```bash
gymflexa signup --email founder@example.com  # create an account and log in
gymflexa login                # interactive: choose browser or API key login
gymflexa login --browser      # log in through app.gymflexa.com
gymflexa login --with-key     # prompt for an API key secret (masked)
gymflexa logout               # clear everything stored in ~/.gymflexa/
```

### Schema

```bash
gymflexa schema                # the whole command tree as JSON
gymflexa schema members list   # one subtree: its options and arguments
```

Machine-readable discovery of every command, option, and argument — for agents
and scripts that would otherwise scrape `--help` text.

### Gyms

```bash
gymflexa gyms list                     # -n/--limit 25 (max 200), --skip, --json
gymflexa gyms list --sortField name --sortDirection ASC
gymflexa gyms get <gymId>              # raw JSON for one gym
gymflexa gyms read <gymId>             # formatted view: currency, timezone, hours
gymflexa gyms add --name "Iron Yard" --currency EUR --timezone Europe/Rome
gymflexa gyms update <gymId> --phone 5551234567
gymflexa gyms delete <gymId...>        # one or more ids
```

`gyms list` sorts by `_id`, `name` or `lastEditTime`; any other `--sortField`
falls back to `_id` server-side.

### Members

```bash
gymflexa members list                              # -n/--limit 25, --skip, --json
gymflexa members list --gymId <gymId>              # only one gym
gymflexa members list --email jane@example.com     # exact-email lookup
gymflexa members list --ids <id1>,<id2>            # several ids at once
gymflexa members list --fields name,email,phone    # project fields
gymflexa members get <memberId>                    # raw JSON for one member
gymflexa members read <memberId>                   # formatted view
gymflexa members add --name "Jane Fonda" --email jane@example.com \
  --phone 5551234567 --gymId <gymId>
gymflexa members update <memberId> --phone 5559876543
gymflexa members update <memberId> --body '{"language":"it"}'
gymflexa members delete <memberId...>              # one or more ids
```

### Services

```bash
gymflexa services list --gymId <gymId>   # --fields, --sortField, --json
gymflexa services get <serviceId>        # raw JSON for one service
gymflexa services read <serviceId>       # formatted view
gymflexa services add --name "Personal training" --price 50 --gymId <gymId>
gymflexa services update <serviceId> --price 60
gymflexa services delete <serviceId...>  # one or more ids
```

### Appointments

```bash
gymflexa appointments list                       # -n/--limit 25, --skip, --json
gymflexa appointments list --gymId <gymId> --memberId <memberId>
gymflexa appointments list --startTime 2026-08-01T00:00:00.000Z \
  --endTime 2026-09-01T00:00:00.000Z             # time window
gymflexa appointments list --sortField startTime --sortDirection ASC
gymflexa appointments get <appointmentId>        # raw JSON
gymflexa appointments read <appointmentId>       # formatted view
gymflexa appointments add --startTime 2026-08-10T14:00:00.000Z \
  --endTime 2026-08-10T14:30:00.000Z --memberId <memberId> --gymId <gymId>
gymflexa appointments update <appointmentId> --status CANCELED
gymflexa appointments delete <appointmentId...>  # one or more ids
```

Appointment `--status` accepts `SCHEDULED`, `MEMBER_ARRIVED`, `NO_SHOW`, or
`CANCELED`. `--startTime` keeps appointments starting at or after it,
`--endTime` keeps appointments ending before it.

### Payments

```bash
gymflexa payments list --gymId <gymId>     # --memberId, --startTime, --endTime
gymflexa payments get <paymentId>          # raw JSON
gymflexa payments read <paymentId>         # formatted view
gymflexa payments add --amount 50 --currency EUR --memberId <memberId> \
  --gymId <gymId> --status SUCCEEDED
gymflexa payments update <paymentId> --status CANCELED
gymflexa payments delete <paymentId...>    # one or more ids
```

Payment `--status` accepts `SUCCEEDED`, `FAILED`, or `CANCELED`. On
`payments list`, `--startTime`/`--endTime` filter on the payment's creation
time. These endpoints record bookkeeping — they never charge, refund or settle
anything.

### Skills

```bash
gymflexa skills list           # names and descriptions of the bundled guides
gymflexa skills get gymflexa   # print a bundled SKILL.md to stdout
```

## Notes on writes

- Every member/service/appointment/payment create needs a `gymId`. Pass
  `--gymId`, or use a key locked to one gym, which supplies it implicitly. On
  `update`, when neither is given, the CLI reads the record first and reuses
  its `gymId` — that path needs the matching `:read` scope too.
- `update` sends only the fields you pass (plus `--body` JSON); the API merges
  them into the stored record.
- Creates and updates fire the corresponding webhooks (`member.created`,
  `appointment.updated`, `payment.created`, …) for the organization's webhook
  subscriptions, exactly as dashboard edits do.
- Deletes are permanent and accept multiple ids
  (`gymflexa members delete <id1> <id2>`). Deleting an appointment also
  cancels its scheduled reminders.

## Configuration

`GYMFLEXA_API_URL` overrides the API endpoint (default
`https://api.gymflexa.com`) — only needed against a non-production deployment.
`GYMFLEXA_API_KEY` supplies an API key secret from the environment for
headless use. Stored credentials live only in `~/.gymflexa/`; the CLI sends
them to the GymFlexa API and nowhere else, and collects no telemetry.

## Usage with AI agents

Install the GymFlexa agent skills for Claude Code, Cursor, Codex, and any
other agent that supports the Skills standard:

```bash
npx skills add gymflexa/skills
```

The same guide ships inside the npm package, version-matched to the installed
CLI:

```bash
gymflexa skills list           # what is bundled
gymflexa skills get gymflexa   # the CLI guide matching this version
```

Or paste this into your `AGENTS.md` / `CLAUDE.md`:

```markdown
## GymFlexa

Use the `gymflexa` CLI for GymFlexa data: gyms, members, services,
appointments and payments. Run `npx gymflexa skills get gymflexa` for the full
guide, `gymflexa schema` for the command tree as JSON, and `gymflexa --help`
for the command reference. Log in once with `gymflexa login` (browser or API
key), or export GYMFLEXA_API_KEY for headless use. Every subcommand accepts
`--json`.
```

Prefer raw HTTP? The same API key authenticates the REST API directly —
`https://api.gymflexa.com` with `Authorization: Basic base64(<key secret>)`.

## License

[Apache-2.0](LICENSE)
