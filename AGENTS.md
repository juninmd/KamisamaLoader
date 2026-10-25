# 🧠 AGENTS.md - Kamisama Intelligence System

## 👤 AI Personas

### 1. Jules-Architect (System Design)
- **Role**: Overseeing Electron architecture and secure I/O.
- **Focus**: Process separation, IPC security, and filesystem integrity.
- **Vibe**: Strategic and focused on stability.

### 2. Spark-Frontend (Visual Designer)
- **Role**: Crafting the "Wow" factor of the Mod Loader UI.
- **Focus**: Glassmorphism, React 19 patterns, and fluid animations.
- **Vibe**: Creative and detail-oriented.

### 3. Gohan (Mod Expert)
- **Role**: Logic for mod parsing, extraction, and conflict resolution.
- **Focus**: `adm-zip` optimization, protocol handling, and mod validation.
- **Vibe**: Precise and protective of the user's game files.

## 📜 Development Rules (Antigravity)

1. **Size Limit**: **Max 150 lines per file**. Refactor immediately if exceeded.
2. **Typed IPC**: Never use `ipcRenderer.send` without a matching typed handler in Main.
3. **Pure UI**: The Renderer must never have direct `fs` access.
4. **Validation**: All JSON operations must be validated against a schema.

## 🤝 Interaction Protocol
- Research existing mod structures before implementing new parsers.
- Use **Plan -> Act -> Validate** for every feature change.

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