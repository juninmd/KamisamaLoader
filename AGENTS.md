# KamisamaLoader / Sparking! ZERO Mod Manager — Agent Guide

Este repositório é um **gerenciador de mods para Dragon Ball: Sparking! ZERO**, construído com **Electron + React + TypeScript**.

## Objetivo do produto
- **Baixar mods (GameBanana)**, gerenciar downloads (pausar/retomar/cancelar)
- **Instalar / Desinstalar** mods
- **Ativar / Desativar** mods (deploy/undeploy em arquivos do jogo)
- **Perfis**: salvar e carregar “conjuntos de mods ativos”
- **Catálogo online**: grid com **infinite scroll**, filtros e ordenação por **downloads / views / likes / date**
- **Detalhes do mod**: modal com **carrossel de imagens**, descrição, métricas (downloads/likes/views)

## Arquitetura (resumo)
- **Main (Electron)**: `electron/main.ts`
  - Expõe IPC para o renderer via `electron/preload.ts`
  - Orquestra `ModManager` e `DownloadManager`
- **Backend local (Electron)**:
  - `electron/mod-manager.ts`: instalação local, deploy/undeploy no diretório do jogo, perfis, atualização
  - `electron/download-manager.ts`: downloads com progresso, pause/resume/cancel
  - `electron/gamebanana.ts`: fetch/search/listagem de mods do GameBanana
- **Renderer (React)**:
  - `src/pages/Mods.tsx`: tabs (Installed/Browse/Downloads), **grid + infinite scroll**
  - `src/components/ModDetailsModal.tsx`: detalhes + carrossel + descrição
  - `src/components/ProfileManager.tsx`: perfis (criar/apagar/carregar)
  - Tipagem `window.electronAPI` em `src/vite-env.d.ts`

## Regras de ouro (para agentes)
- **Nunca acessar filesystem no React**. Toda operação de disco vai via `window.electronAPI` (IPC).
- **Não quebrar compatibilidade com mods existentes** (`Mods/mods.json`, `Mods/settings.json`, `Mods/profiles.json`).
- **Sem ações destrutivas** no diretório do jogo: apenas criar/remover arquivos em `~mods` e UE4SS quando aplicável.
- **Manter UX responsiva**: listagens grandes precisam continuar fluídas (scroll + skeletons).
- **Tratamento de erro** sempre retorna `{ success, message }` no IPC quando fizer sentido.

## Definition of Done (DoD)
- **Funcional**:
  - Instalar (zip/pak), ativar/desativar, desinstalar
  - Download manager com pause/resume/cancel e UI atualizando
  - Browse online com infinite scroll
  - Ordenação coerente (downloads/views/likes/date) com fallback quando API não suportar
  - Perfis criam/load aplicando estados corretamente
  - Modal de detalhes mostra imagens, descrição e métricas
- **Qualidade / homologação**:
  - `pnpm test:unit` passa
  - `pnpm type-check` passa
  - `pnpm lint` passa
  - Fluxos principais validados manualmente (checklist em `docs/QA-HOMOLOGATION.md`)

