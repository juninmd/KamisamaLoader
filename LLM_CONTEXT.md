# Contexto rápido (para LLMs/agentes)

## Produto
**KamisamaLoader** é um **mod manager** para **Dragon Ball: Sparking! ZERO**, com:
- catálogo online via GameBanana (browse + search + categorias)
- downloads gerenciados (fila, progresso, pausa/retoma/cancela)
- instalação e deploy de mods no diretório do jogo
- perfis (loadouts) para ligar/desligar grupos de mods

## Stack / execução
- **Electron main** (Node): `electron/main.ts`
- **Preload** (contextBridge): `electron/preload.ts`
- **Renderer** (React + Vite + TS): `src/`

## Persistência local (arquivos)
Os dados ficam em `Mods/` (na pasta do app quando empacotado; no dev: `../../Mods`):
- `Mods/settings.json`: caminho do jogo e preferências
- `Mods/mods.json`: lista de mods instalados e metadados (enabled, folderPath, deployedFiles, priority…)
- `Mods/profiles.json`: perfis (id, name, modIds[])

## Integrações
- GameBanana API v11:
  - busca/listagem: `electron/gamebanana.ts` (`searchBySection`, `fetchCategories`, `fetchModDetails`, etc.)
  - detalhes e updates: `fetchModDetails`, `fetchModUpdates`

## Fluxo de instalação online (alto nível)
Renderer:
- lista mods -> `window.electronAPI.searchBySection(options)`
- instalar -> `window.electronAPI.installOnlineMod(mod)` -> retorna `{ downloadId }`

Main/Backend:
- baixa zip para temp via `DownloadManager`
- no `download-completed`, extrai para `Mods/<nome_sanitizado>/`
- atualiza `mods.json`

## Regras do jogo (deploy)
O deploy copia arquivos do mod para:
- `.../SparkingZERO/Content/Paks/~mods` (arquivos `.pak/.sig/.utoc/.ucas` com prefixo de prioridade)
- UE4SS (se houver pasta `ue4ss/` no mod): copia para `.../SparkingZERO/Binaries/Win64/...` e atualiza `Mods/mods.txt`

## O que NÃO fazer
- Não escrever diretamente no renderer em `fs`/`path`.
- Não apagar arquivos originais do jogo.
- Não mudar formatos de JSON sem migração.

