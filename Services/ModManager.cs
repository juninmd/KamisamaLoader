using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Threading.Tasks;
using KamisamaLoader.Models;
using Newtonsoft.Json;

namespace KamisamaLoader.Services
{
    public class ModManager
    {
        private const string ModsDirectory = "Mods";
        private const string ModsConfigFileName = "mods.json";
        private readonly SettingsManager _settingsManager;

        public ModManager(SettingsManager settingsManager)
        {
            _settingsManager = settingsManager;
            if (!Directory.Exists(ModsDirectory))
            {
                Directory.CreateDirectory(ModsDirectory);
            }
        }

        public List<LocalMod> LoadLocalMods()
        {
            var mods = new List<LocalMod>();
            if (!Directory.Exists(ModsDirectory)) return mods;

            // Load persisted config
            List<LocalMod> savedMods = new List<LocalMod>();
            string configPath = Path.Combine(ModsDirectory, ModsConfigFileName);
            if (File.Exists(configPath))
            {
                try
                {
                    string json = File.ReadAllText(configPath);
                    savedMods = JsonConvert.DeserializeObject<List<LocalMod>>(json) ?? new List<LocalMod>();
                }
                catch
                {
                    // Ignore load error
                }
            }

            var directories = Directory.GetDirectories(ModsDirectory);
            foreach (var dir in directories)
            {
                var dirInfo = new DirectoryInfo(dir);
                // Check if we have saved state for this mod
                var savedMod = savedMods.FirstOrDefault(m => m.Name == dirInfo.Name);

                if (savedMod != null)
                {
                    // Update path just in case
                    savedMod.FolderPath = dir;
                    mods.Add(savedMod);
                }
                else
                {
                    // New mod
                    mods.Add(new LocalMod
                    {
                        Name = dirInfo.Name,
                        FolderPath = dir,
                        IsEnabled = true,
                        Priority = 0
                    });
                }
            }

            // Respect saved order if possible, append new ones at the end?
            // Or just rely on the order in the list.
            // But we reconstructed the list from directories, so order might be lost if we don't sort.
            // Let's sort by index in savedMods if present.

            var orderedMods = new List<LocalMod>();
            // Use a dictionary of queues to handle potential duplicate names and preserve their order
            var modDict = mods.Where(m => m.Name != null)
                              .GroupBy(m => m.Name)
                              .ToDictionary(g => g.Key, g => new Queue<LocalMod>(g));

            var usedMods = new HashSet<LocalMod>();

            foreach (var saved in savedMods)
            {
                if (saved.Name != null && modDict.TryGetValue(saved.Name, out var queue) && queue.Count > 0)
                {
                    var found = queue.Dequeue();
                    orderedMods.Add(found);
                    usedMods.Add(found);
                }
            }

            // Add remaining mods, preserving their original order in 'mods'
            foreach (var mod in mods)
            {
                if (!usedMods.Contains(mod))
                {
                    orderedMods.Add(mod);
                }
            }

            return orderedMods;
        }

        public void SaveLocalMods(List<LocalMod> mods)
        {
            try
            {
                string configPath = Path.Combine(ModsDirectory, ModsConfigFileName);
                string json = JsonConvert.SerializeObject(mods, Formatting.Indented);
                File.WriteAllText(configPath, json);
            }
            catch
            {
                // Handle error
            }
        }

        public async Task InstallModAsync(string zipPath, string modName)
        {
            string destinationDir = Path.Combine(ModsDirectory, modName);

            await Task.Run(() =>
            {
                if (Directory.Exists(destinationDir))
                {
                    Directory.Delete(destinationDir, true);
                }
                Directory.CreateDirectory(destinationDir);
                ZipFile.ExtractToDirectory(zipPath, destinationDir);
            });
        }

        public async Task BuildAsync(List<LocalMod> localMods)
        {
            string gameExePath = _settingsManager.CurrentSettings.GameExecutablePath;
            if (string.IsNullOrEmpty(gameExePath) || !File.Exists(gameExePath))
            {
                throw new Exception("Game Executable Path is not set or invalid.");
            }

            // Capture necessary data before the background task to avoid threading issues with UI bound objects if any
            // (LocalMod is a simple POCO, so it's fine, but good practice).
            // However, localMods is passed in.

            await Task.Run(() =>
            {
                FileInfo exeInfo = new FileInfo(gameExePath);
                // exeInfo is .../SparkingZero/Binaries/Win64/SparkingZero-Win64-Shipping.exe
                // rootDir is .../SparkingZero/
                DirectoryInfo rootDir = exeInfo.Directory.Parent.Parent;

                string contentDir = Path.Combine(rootDir.FullName, "Content");
                string paksDir = Path.Combine(contentDir, "Paks");
                string modsDir = Path.Combine(paksDir, "~mods");

                // UE4SS Paths
                // LogicMods usually goes to Content/Paks/LogicMods
                string logicModsDest = Path.Combine(paksDir, "LogicMods");
                // Binaries/Win64/Mods
                string binariesModsDest = Path.Combine(rootDir.FullName, "Binaries", "Win64", "Mods");

                if (!Directory.Exists(modsDir))
                {
                    Directory.CreateDirectory(modsDir);
                }

                // Clear ~mods folder
                var existingFiles = Directory.GetFiles(modsDir);
                Parallel.ForEach(existingFiles, (file) =>
                {
                    File.Delete(file);
                });

                // Note: We might want to clear LogicMods and Binaries/Mods too, but that could delete user-installed things.
                // However, Unverum says "~mods folder will be erased". It doesn't explicitly say it erases LogicMods,
                // but for a manager, it usually manages the state.
                // For safety, let's NOT delete LogicMods/Binaries entirely, but we might overwrite.
                // Or maybe we should? If a user disables a mod, it should be removed.
                // Let's assume we should manage them.
                // But deleting Binaries/Win64/Mods might remove UE4SS itself if not careful?
                // Usually UE4SS is "installed" there.
                // Unverum modifies mods.txt.
                // Let's just copy for now (overwrite). Managing deletion of disabled UE4SS mods is harder without tracking.
                // We will stick to additive for UE4SS for this iteration, as deleting ~mods is standard behavior but deleting Binaries is risky.

                // Save the state first (needs to be on UI thread? No, SaveLocalMods uses File IO, safe on bg thread)
                SaveLocalMods(localMods);

                // Get Enabled Mods
                var enabledMods = localMods.Where(m => m.IsEnabled).ToList();

                // Strategy: 0 is Top Priority (Loads Last).
                // We want Top Priority to have highest prefix (e.g. 999).

                // We use Parallel.For loop for standard mods, but for LogicMods/UE4SS we need to be careful about concurrency if multiple mods touch same files.
                // Parallel is fine if files are different.

                Parallel.For(0, enabledMods.Count, (i) =>
                {
                    var mod = enabledMods[i];
                    string prefix = (999 - i).ToString("D3") + "_";
                    CopyModFiles(mod.FolderPath, modsDir, prefix, logicModsDest, binariesModsDest);
                });
            });
        }


        private void CopyModFiles(string sourceDir, string targetDir, string prefix, string logicModsDest, string binariesModsDest)
        {
            if (!Directory.Exists(sourceDir)) return;

            // Handle UE4SS Special Folders
            // LogicMods
            // Look for "LogicMods" folder in the root of the mod or subdirectories?
            // Unverum: "Anything in a LogicMods folder"
            // Let's look for immediate LogicMods folder or recurse?
            // Usually mod structure is either:
            // 1. LogicMods/MyMod.pak
            // 2. ModName/LogicMods/MyMod.pak
            // The recursive scan in original code flattened everything.
            // We should check if we are INSIDE a special folder.

            // Let's iterate all files and check their relative path?
            // Or just check for specific folders first.

            var directories = Directory.GetDirectories(sourceDir, "*", SearchOption.AllDirectories);
            // We also need the root sourceDir itself if it contains files.

            // Actually, simply iterating files and checking path is easier.
            var files = Directory.GetFiles(sourceDir, "*", SearchOption.AllDirectories);

            foreach (var file in files)
            {
                string relativePath = Path.GetRelativePath(sourceDir, file);
                string[] parts = relativePath.Split(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);

                // Check if part of LogicMods
                if (parts.Any(p => p.Equals("LogicMods", StringComparison.OrdinalIgnoreCase)))
                {
                    // It goes to LogicModsDest
                    // We need to preserve structure INSIDE LogicMods?
                    // Usually yes.
                    // Find the index of LogicMods
                    int idx = Array.FindIndex(parts, p => p.Equals("LogicMods", StringComparison.OrdinalIgnoreCase));
                    if (idx < parts.Length - 1)
                    {
                         // Path after LogicMods
                         string subPath = Path.Combine(parts.Skip(idx + 1).ToArray());
                         string dest = Path.Combine(logicModsDest, subPath);
                         Directory.CreateDirectory(Path.GetDirectoryName(dest));
                         File.Copy(file, dest, true);
                    }
                    else
                    {
                        // File IS "LogicMods" (impossible as it's a file) or inside but somehow weird.
                    }
                    continue; // Done with this file
                }

                // Check if part of ue4ss or Binaries
                // Unverum: "anything in a ue4ss folder" -> Binaries/Win64/Mods
                if (parts.Any(p => p.Equals("ue4ss", StringComparison.OrdinalIgnoreCase)))
                {
                    int idx = Array.FindIndex(parts, p => p.Equals("ue4ss", StringComparison.OrdinalIgnoreCase));
                    if (idx < parts.Length - 1)
                    {
                         string subPath = Path.Combine(parts.Skip(idx + 1).ToArray());
                         string dest = Path.Combine(binariesModsDest, subPath);
                         Directory.CreateDirectory(Path.GetDirectoryName(dest));
                         File.Copy(file, dest, true);
                    }
                    continue;
                }

                // If the mod structure mimics the game folder, e.g. "Binaries/Win64/Mods"
                if (parts.Contains("Binaries") && parts.Contains("Mods"))
                {
                     // Complex check, but Unverum specifically mentions "ue4ss" folder mapping to Binaries/Win64/Mods.
                     // It doesn't explicitly say "Binaries" folder maps.
                     // I'll stick to "ue4ss" folder for now as per instructions/Unverum readme.
                }

                // Standard Mod Files
                string ext = Path.GetExtension(file).ToLower();
                // Expanded extensions list
                if (ext == ".pak" || ext == ".sig" || ext == ".utoc" || ext == ".ucas" ||
                    ext == ".awb" || ext == ".mp4" || ext == ".bmp" || ext == ".uasset" || ext == ".usm")
                {
                    string fileName = Path.GetFileName(file);
                    string targetFileName = prefix + fileName;
                    string targetPath = Path.Combine(targetDir, targetFileName);
                    File.Copy(file, targetPath, true);
                }
            }
        }
    }
}