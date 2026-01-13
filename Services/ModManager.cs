using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
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

        public void InstallMod(string zipPath, string modName)
        {
            string destinationDir = Path.Combine(ModsDirectory, modName);
            if (Directory.Exists(destinationDir))
            {
                Directory.Delete(destinationDir, true);
            }
            Directory.CreateDirectory(destinationDir);
            ZipFile.ExtractToDirectory(zipPath, destinationDir);
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
                DirectoryInfo rootDir = exeInfo.Directory.Parent.Parent;

                string contentDir = Path.Combine(rootDir.FullName, "Content");
                string paksDir = Path.Combine(contentDir, "Paks");
                string modsDir = Path.Combine(paksDir, "~mods");

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

                // Save the state first (needs to be on UI thread? No, SaveLocalMods uses File IO, safe on bg thread)
                SaveLocalMods(localMods);

                // Get Enabled Mods
                var enabledMods = localMods.Where(m => m.IsEnabled).ToList();

                // Strategy: 0 is Top Priority (Loads Last).
                // We want Top Priority to have highest prefix (e.g. 999).

                // We use Parallel.For loop
                Parallel.For(0, enabledMods.Count, (i) =>
                {
                    var mod = enabledMods[i];
                    string prefix = (999 - i).ToString("D3") + "_";
                    CopyModFiles(mod.FolderPath, modsDir, prefix);
                });
            });
        }


        private void CopyModFiles(string sourceDir, string targetDir, string prefix)
        {
            if (!Directory.Exists(sourceDir)) return;

            var files = Directory.GetFiles(sourceDir, "*", SearchOption.AllDirectories);
            foreach (var file in files)
            {
                string ext = Path.GetExtension(file).ToLower();
                if (ext == ".pak" || ext == ".sig" || ext == ".utoc" || ext == ".ucas")
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