# 🐉 Kamisama Mod Loader

[![Electron](https://img.shields.io/badge/Electron-28.x-47848F?logo=electron)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-7.x-646CFF?logo=vite)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-38B2AC?logo=tailwindcss)](https://tailwindcss.com/)

> A premium Mod Loader for **Dragon Ball: Sparking! ZERO**, built for speed, reliability, and a stunning user experience.

## ✨ Features

- **One-Click Installation**: Seamlessly install mods using custom protocols (`kamisama://`, `gb-modmanager://`).
- **Mod Management**: Enable, disable, and organize your mod library with ease.
- **Glassmorphism UI**: A modern, responsive interface built with React 19 and Framer Motion.
- **Strict Separation**: Clean architecture separating UI (Renderer) from heavy I/O (Main Process).
- **Data Integrity**: Automated validation for `mods.json` and profiles to prevent corruption.

## 🛠️ Tech Stack

- **Framework**: Electron + Vite
- **Frontend**: React 19 + TypeScript
- **Styling**: TailwindCSS + Framer Motion
- **I/O**: adm-zip for fast mod extraction
- **Testing**: Vitest (Unit) + Playwright (E2E)

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Run development environment
pnpm run dev

# Build for distribution
pnpm run dist
```

## 🛡️ Antigravity Protocol

This project follows the **Antigravity** engineering standards:
- **150-Line Limit**: Modular code structure for maximum maintainability.
- **Strict Types**: Full TypeScript coverage with zero `any`.
- **Typed IPC**: All communication between processes is strictly typed and secure.

---

*"Power comes in response to a need, not a desire."*
