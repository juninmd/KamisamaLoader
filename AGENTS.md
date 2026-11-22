# AGENTS.md

KamisamaLoader is an Electron mod manager for Dragon Ball: Sparking! ZERO (GameBanana catalog, downloads, mod deploy, profiles).

## Stack
- Electron 45 main process (`electron/`), preload via contextBridge, React 19 + Vite 7 + Tailwind 3 renderer (`src/`), TypeScript 5.9
- Unit tests: Vitest (happy-dom); E2E: Playwright
- Package manager: pnpm (`packageManager` pins pnpm@8.14.3); lockfile is `pnpm-lock.yaml`

## Commands
- Setup: `pnpm install`
- Dev (Vite + Electron): `pnpm run dev`
- Build: `pnpm run build` (type-check, Vite build, Electron compile)
- Package: `pnpm run dist` (electron-builder; Linux AppImage, Windows NSIS)
- Lint: `pnpm run lint`
- Typecheck: `pnpm run type-check`
- Unit tests: `pnpm run test:unit`; coverage: `pnpm run test:coverage`
- E2E: `pnpm run test:e2e` (builds first, then Playwright; writes `tests/evidence/homologation`)

## Structure
- `electron/`: main process, IPC handlers, mod manager, downloads, GameBanana/GitHub clients, archive and validation
- `electron/preload.ts`: the only bridge between renderer and main
- `src/`: React renderer (pages, components, context)
- `shared/types.ts`: types shared by main and renderer
- `tests/unit/`, `tests/e2e/`, `tests/*.spec.ts`: Vitest and Playwright suites
- `evidence/`: README screenshots
- `.agents/`: notes for AI agents (electron-dev, modding-core, react-frontend)
- `.github/workflows/`: validate (delegates to `juninmd/base-actions` reusable workflow), SAST, security, auto-tag, release-drafter

## Conventions
- Branch default: `master`.
- Keep files at or under 150 lines and split by responsibility when exceeded. Current violations: `electron/mod-manager.ts` (1412), `src/pages/Mods.tsx` (697), `electron/gamebanana.ts` (511).
- IPC is typed: never call `ipcRenderer.send` without a matching handler in main.
- Renderer (`src/`) has no direct `fs` access; file work goes through main.
- Validate every JSON read/write against a schema (`electron/data-validation.ts`, `electron/ipc-validation.ts`).
- Before adding a mod parser, read the existing mod structure notes in `.agents/modding-core`.
- Work as Plan -> Act -> Validate for each feature change.

<!-- base-actions-main-policy -->
## GitHub Actions — padrão obrigatório (@main)

- Referencie as actions internas sempre pelo branch, nunca por SHA:
  - `uses: juninmd/base-actions/<action>@main`
  - `uses: juninmd/base-actions/.github/workflows/<arquivo>.yml@main`
- Não fixe `@<sha>` em `juninmd/base-actions`: a atualização é centralizada no
  `main` e passa a valer no próximo run.
- PRs cujos checks não iniciam por billing/spending limit são mesclados pelo bot central
  `juninmd/base-actions/.github/workflows/auto-merge-billing-blocked.yml`.
  Para impedir o merge automático de um PR, aplique a label `do-not-merge`.
