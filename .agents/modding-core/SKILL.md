---
name: Modding Core Logic
description: Domain logic for mod management, GameBanana integration, and file handling
---

# Modding Core Logic

## Dependencies
- **Zip Handling**: `adm-zip`
- **Networking**: `fetch` (native) or `axios` (if added)
- **Path Manipulation**: `path` (Node.js built-in)

## Domain Entities
- **Mod**: A modifiction package.
- **Profile**: A collection of enabled mods.
- **GameBanana**: The primary source for online mods.

## Key Directories
- **Game Directory**: Where the game is installed (e.g., `Steam/steamapps/common/...`).
- **Mods Directory**: Where mods are stored (often a subfolder of the game or a dedicated `mods` folder).

## Common Tasks

### Installing a Mod
1. Extract the zip file using `adm-zip`.
2. Validate the structure (check for specific mod files).
3. Move files to the correct destination in the game directory.
4. Record the installation in `installed-mods.json` (or database).

### Uninstalling a Mod
1. Look up files associated with the mod.
2. Remove files safely.
3. Update specific config files if necessary.
4. Remove entry from `installed-mods.json`.

### GameBanana Integration
- Fetch mod info using GameBanana API endpoints.
- Map API responses to the internal `OnlineMod` interface.
- Handle rate limiting and errors gracefully.
