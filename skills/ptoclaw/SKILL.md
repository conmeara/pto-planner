# PTOClaw

Use this skill when the user asks to manage PTO from the local PTO Planner plugin, inspect PTO balance, add or remove planned time off, forecast PTO, or preview calendar sync.

## Default Behavior

- Use the plugin CLI at `bin/ptoclaw.mjs` from this plugin directory.
- Keep SQLite as the source of truth. Do not hardcode private paths, account names, calendars, or personal data.
- Use `PTOCLAW_DB` or `--db PATH` when the user wants an external database. Otherwise, use the CLI default user-local path.
- Prefer human-readable output for direct user answers. Use `--json` when another tool or automation will consume the result.
- Treat calendar sync as an external side effect. `calendar sync` is dry-run only in this MVP and must be run with `--dry-run`.

## Common Commands

Initialize storage:

```bash
node bin/ptoclaw.mjs init
```

Show current status:

```bash
node bin/ptoclaw.mjs status
```

Configure balance and accrual:

```bash
node bin/ptoclaw.mjs settings set --balance-hours 80 --accrual-hours 8 --accrual-cadence monthly --hours-per-day 8
```

Add planned PTO:

```bash
node bin/ptoclaw.mjs plan add --start 2026-07-06 --end 2026-07-10 --type vacation --status planned --title "Summer break"
```

Preview calendar sync:

```bash
node bin/ptoclaw.mjs calendar sync --dry-run --json
```

## Safety

- Use `plan add --dry-run` to preview inserts without writing.
- `plan remove <id>` refuses to delete unless `--force` or `--dry-run` is present.
- Calendar writes are intentionally not implemented yet. The dry-run output includes stable `externalId` values for a future Apple Calendar adapter.
