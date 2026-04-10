# Contributing to NexusWorld3D

Thanks for helping improve the framework and sample stack.

## Scope / Alcance

- **Engine / framework:** Colyseus room, `@nexusworld3d/protocol`, `engine-server` / `engine-client`, manifest pipeline, plugins under `server/room/`, shared docs in `docs/`.
- **Private game content:** maps, proprietary art, and commercial balance usually belong in a **separate repo** that depends on published packages. Use GitHub issues labeled for “game” only when the bug is clearly in the open-source core.

## Before you open a PR

1. Install dependencies: `npm install`
2. Typecheck: `npx tsc --noEmit`
3. Validate content: `npm run validate-content`
4. Match existing code style (imports, naming, no drive-by refactors unrelated to the fix).

## Commits

Write clear messages in English or Spanish; describe **what** changed and **why** when it is not obvious.

## Security

Do **not** commit `.env`, `.env.local`, API keys, or production URLs. Use `.env.local.example` as reference only. See [`docs/SECURITY.md`](./docs/SECURITY.md) for reporting vulnerabilities.

## Code of conduct

Be respectful in issues and PRs. For a formal policy, we recommend the [Contributor Covenant](https://www.contributor-covenant.org/) if the project adopts a standalone `CODE_OF_CONDUCT.md` later.
