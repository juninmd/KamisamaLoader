# KamisamaLoader — Dragon Ball: Sparking! ZERO Mod Manager

App desktop para **baixar, instalar, ativar/desativar e organizar mods** do **Dragon Ball: Sparking! ZERO**.

## Stack
- **Electron** (main + IPC)
- **React + TypeScript + Vite** (renderer)
- **Tailwind CSS**

## Features
- **Installed Mods**: ativar/desativar, prioridade, desinstalar
- **Browse Online (GameBanana)**: grid com **infinite scroll**, filtros e detalhes do mod
- **Downloads**: fila com progresso, pause/resume/cancel
- **Profiles**: salvar e carregar “loadouts”

## Rodar (dev)

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm build
```

## Qualidade / homologação
Checklist em `docs/QA-HOMOLOGATION.md`.

```bash
pnpm lint
pnpm type-check
pnpm test:unit
```

## Pastas importantes
- `electron/`: main process + integrações (GameBanana, downloads, mod-manager)
- `src/`: UI React
- `Mods/`: persistência local (`mods.json`, `settings.json`, `profiles.json`)

