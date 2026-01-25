# KamisamaLoader — Dragon Ball: Sparking! ZERO Mod Manager

A modern, high-performance Mod Manager for **Dragon Ball: Sparking! ZERO**, inspired by Unverum but built with a modern stack (Electron, React, TypeScript).

## ✨ Key Features

### Unverum Parity & Enhancements
- **Non-Destructive Installation**: Unlike some managers that wipe the `~mods` folder, KamisamaLoader uses smart linking/copying. Your mods are safe.
- **Sparking! ZERO Specific**: Native support for `.pak`, `.sig`, `.utoc`, `.ucas` and `LogicMods`.
- **UE4SS Support**: One-click install/update for UE4SS, required for advanced script mods.
- **Priority Management**: Drag-and-drop load order (Higher priority overrides lower).
- **Launch Arguments**: Configure custom flags like `-dx11` directly in Settings.
- **1-Click Install**: Supports protocol handling for easy installation from websites.

### Modern UI/UX
- **Glassmorphism Design**: Beautiful dark theme with glass effects and blur.
- **Infinite Scroll**: Browse thousands of mods on GameBanana without pagination limits.
- **Personalization**: Set your own background image in Settings.
- **Profiles**: Create and switch between mod loadouts instantly.

## 🛠 Tech Stack
- **Electron** (Main Process, IPC, File System)
- **React 18 + TypeScript** (Renderer, UI)
- **Tailwind CSS** (Styling)
- **Vite** (Build Tool)

## 🚀 Running Locally

```bash
# Install dependencies
pnpm install

# Run development mode
pnpm dev
```

## 📦 Build

To create the installer (NSIS for Windows):

```bash
pnpm build
```

## ✅ Quality Assurance

Run the test suite to verify ModManager logic:

```bash
pnpm test:unit
```
