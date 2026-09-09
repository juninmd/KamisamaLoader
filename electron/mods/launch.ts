import { execFile } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { LocalMod } from '../../shared/types.js';
import type { ModManager } from '../mod-manager.js';
export const launchOperations = {
async launchGame(this: ModManager): Promise<boolean> {
        const settings = await this.getSettings();
        if (!settings.gamePath) {
            throw new Error('Game path not configured');
        }

        let exePath = settings.gamePath;
        // If directory, try to find exe.
        // Steam: .../DRAGON BALL Sparking! ZERO/SparkingZERO.exe
        // Or .../DRAGON BALL Sparking! ZERO/SparkingZERO/Binaries/Win64/SparkingZERO-Win64-Shipping.exe

        // Start simplistic: Assume root has the exe or they selected the exe.
        const stats = await fs.stat(exePath);
        if (stats.isDirectory()) {
            // Common steam path check
            const possibleExe = path.join(exePath, 'SparkingZERO.exe');
            try {
                await fs.access(possibleExe);
                exePath = possibleExe;
            } catch {
                // Try binaries
                const binExe = path.join(exePath, 'SparkingZERO', 'Binaries', 'Win64', 'SparkingZERO-Win64-Shipping.exe');
                try {
                    await fs.access(binExe);
                    exePath = binExe;
                } catch {
                    throw new Error('Could not find SparkingZERO.exe in the selected directory.');
                }
            }
        }

        // Make sure the game folder still holds every enabled mod before starting
        await this.verifyDeployment();

        // Get enabled mods to potentially pass as parameters
        const mods = await this.getInstalledMods();
        const enabledMods = Array.isArray(mods) ? mods.filter((m: LocalMod) => m.isEnabled) : [];
        console.log(`Launching game with ${enabledMods.length} mods enabled`);

        console.log(`Launching game at: ${exePath}`);

        // Launch parameters for Unreal Engine mod loading
        // -fileopenlog helps with mod loading diagnostics
        // The ~mods folder should be in the game's content directory
        const launchArgs = ['-fileopenlog'];

        if (settings.launchArgs) {
            const extraArgs = settings.launchArgs.split(' ').filter((a: string) => a.trim().length > 0);
            launchArgs.push(...extraArgs);
        }

        execFile(exePath, launchArgs, { cwd: path.dirname(exePath) }, (error) => {
            if (error) {
                console.error('Failed to launch game:', error);
            }
        });
        return true;
    },
};
