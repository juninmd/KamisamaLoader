---
name: Electron Development
description: Best practices and patterns for Electron development in KamisamaLoader
---

# Electron Development Guidelines

## Project Structure
- Main Process: `electron/main.ts`
- Preload Script: `electron/preload.ts`
- IPC Handlers: `electron/mod-manager.ts` (and other managers)
- Renderer: `src/` (React)

## IPC Communication
- **Pattern**: Use `ipcRenderer.invoke` (renderer) <-> `ipcMain.handle` (main) for all async operations.
- **Safety**: NEVER expose entire Node.js modules to the renderer. Use `contextBridge` in `preload.ts` to expose specific API methods.
- **Typing**: Ensure input arguments and return types are strictly typed.

## Code Style
- Use `async/await` for asynchronous operations.
- Handle errors gracefully in `ipcMain` handlers and return meaningful error messages to the renderer.
- Use `path.join` for file paths to ensure cross-platform compatibility.

## File System Operations
- Use `fs/promises` for file I/O where possible.
- Validate paths received from the renderer to prevent directory traversal attacks (though low risk in local app, good practice).

## Window Management
- Use `BrowserWindow` for creating windows.
- Manage window state (maximize, minimize, close) via IPC events.
