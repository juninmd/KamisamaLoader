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
            foreach (var saved in savedMods)
            {
                var found = mods.FirstOrDefault(m => m.Name == saved.Name);
                if (found != null)
                {
                    orderedMods.Add(found);
                    mods.Remove(found);
                }
            }
            // Add remaining (new) mods
            orderedMods.AddRange(mods);

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

        public void Build(List<LocalMod> localMods)
        {
            string gameExePath = _settingsManager.CurrentSettings.GameExecutablePath;
            if (string.IsNullOrEmpty(gameExePath) || !File.Exists(gameExePath))
            {
                throw new Exception("Game Executable Path is not set or invalid.");
            }

            FileInfo exeInfo = new FileInfo(gameExePath);
            DirectoryInfo rootDir = exeInfo.Directory.Parent.Parent;

            string contentDir = Path.Combine(rootDir.FullName, "Content");
            string paksDir = Path.Combine(contentDir, "Paks");
            string modsDir = Path.Combine(paksDir, "~mods");

            // Clear ~mods folder
            if (Directory.Exists(modsDir))
            {
                Directory.Delete(modsDir, true);
            }
            Directory.CreateDirectory(modsDir);

            // Save the state first
            SaveLocalMods(localMods);

            // Get Enabled Mods
            var enabledMods = localMods.Where(m => m.IsEnabled).ToList();

            // Strategy: 0 is Top Priority (Loads Last).
            // We want Top Priority to have highest prefix (e.g. 999).
            // So we iterate i from 0 to Count-1.
            // Prefix = (999 - i).

            for (int i = 0; i < enabledMods.Count; i++)
            {
                var mod = enabledMods[i];
                string prefix = (999 - i).ToString("D3") + "_";
                CopyModFiles(mod.FolderPath, modsDir, prefix);
            }
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