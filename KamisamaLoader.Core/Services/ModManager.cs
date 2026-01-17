using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Threading.Tasks;
using KamisamaLoader.Core.Models;
using Newtonsoft.Json;

namespace KamisamaLoader.Core.Services
{
    public class ModManager
    {
        private const string ModsDirectory = "Mods";
        private const string ModsConfigFileName = "mods.json";
        private const string InstalledFilesConfigName = "installed_files.json";
        private readonly SettingsManager _settingsManager;

        public ModManager(SettingsManager settingsManager)
        {
            _settingsManager = settingsManager;
            if (!Directory.Exists(ModsDirectory))
            {
                Directory.CreateDirectory(ModsDirectory);
            }
        }

        [Obsolete("Use LoadLocalModsAsync instead.")]
        public List<LocalMod> LoadLocalMods()
        {
            return LoadLocalModsAsync().GetAwaiter().GetResult();
        }

        public async Task<List<LocalMod>> LoadLocalModsAsync()
        {
            var mods = new List<LocalMod>();
            if (!Directory.Exists(ModsDirectory)) return mods;

            List<LocalMod> savedMods = new List<LocalMod>();
            string configPath = Path.Combine(ModsDirectory, ModsConfigFileName);

            if (File.Exists(configPath))
            {
                try
                {
                    string json = await File.ReadAllTextAsync(configPath).ConfigureAwait(false);
                    savedMods = JsonConvert.DeserializeObject<List<LocalMod>>(json) ?? new List<LocalMod>();
                }
                catch
                {
                    // Ignore load error
                }
            }

            return await Task.Run(() =>
            {
                var directories = Directory.GetDirectories(ModsDirectory);
                var localMods = new List<LocalMod>();

                foreach (var dir in directories)
                {
                    var dirInfo = new DirectoryInfo(dir);
                    var savedMod = savedMods.FirstOrDefault(m => m.Name == dirInfo.Name);

                    if (savedMod != null)
                    {
                        savedMod.FolderPath = dir;
                        localMods.Add(savedMod);
                    }
                    else
                    {
                        localMods.Add(new LocalMod
                        {
                            Name = dirInfo.Name,
                            FolderPath = dir,
                            IsEnabled = true,
                            Priority = 0
                        });
                    }
                }

                // Preserve saved order
                var orderedMods = new List<LocalMod>();
                foreach (var saved in savedMods)
                {
                    var found = localMods.FirstOrDefault(m => m.Name == saved.Name);
                    if (found != null)
                    {
                        orderedMods.Add(found);
                        localMods.Remove(found);
                    }
                }
                orderedMods.AddRange(localMods);

                return orderedMods;
            });
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

        public void DeleteMod(LocalMod mod)
        {
            if (mod != null && Directory.Exists(mod.FolderPath))
            {
                try
                {
                    Directory.Delete(mod.FolderPath, true);
                }
                catch (Exception)
                {
                    // Handle potential locks or errors
                    throw;
                }
            }
        }

        public async Task CheckForUpdatesAsync(List<LocalMod> mods, GameBananaService gbService)
        {
            if (mods == null || gbService == null) return;

            foreach (var mod in mods)
            {
                if (mod.GameBananaId > 0)
                {
                    try
                    {
                        var details = await gbService.GetModDetailsAsync(mod.GameBananaId);
                        if (details != null)
                        {
                            // Check if version differs
                            if (!string.IsNullOrEmpty(details.Version) && !string.Equals(details.Version, mod.Version, StringComparison.OrdinalIgnoreCase))
                            {
                                mod.HasUpdate = true;
                                mod.LatestVersion = details.Version;
                                if (details.Files != null && details.Files.Count > 0)
                                {
                                    mod.LatestFileId = details.Files[0].IdRow;
                                }
                            }
                        }
                    }
                    catch
                    {
                        // Ignore update check errors for single mod
                    }
                }
            }
        }

        public async Task UpdateModAsync(LocalMod mod, GameBananaService gbService)
        {
            if (mod == null || gbService == null || mod.LatestFileId <= 0) return;

            var details = await gbService.GetModDetailsAsync(mod.GameBananaId);
            if (details == null || details.Files == null) return;

            var file = details.Files.FirstOrDefault(f => f.IdRow == mod.LatestFileId);
            if (file == null && details.Files.Count > 0) file = details.Files[0];

            if (file != null && !string.IsNullOrEmpty(file.DownloadUrl))
            {
                string tempFile = Path.GetTempFileName();
                try
                {
                    await gbService.DownloadFileAsync(file.DownloadUrl, tempFile);
                    await InstallModAsync(tempFile, mod.Name);

                    mod.Version = mod.LatestVersion;
                    mod.HasUpdate = false;
                }
                finally
                {
                    if (File.Exists(tempFile)) File.Delete(tempFile);
                }
            }
        }

        public async Task BuildAsync(List<LocalMod> localMods)
        {
            string gameExePath = _settingsManager.CurrentSettings.GameExecutablePath;
            if (string.IsNullOrEmpty(gameExePath) || !File.Exists(gameExePath))
            {
                throw new Exception("Game Executable Path is not set or invalid.");
            }

            await Task.Run(() =>
            {
                FileInfo exeInfo = new FileInfo(gameExePath);
                // Expected: .../SparkingZero/Binaries/Win64/SparkingZero-Win64-Shipping.exe
                // Root: .../SparkingZero/
                if (exeInfo.Directory == null || exeInfo.Directory.Parent == null || exeInfo.Directory.Parent.Parent == null)
                {
                    throw new DirectoryNotFoundException("Could not find game root directory structure.");
                }

                DirectoryInfo rootDir = exeInfo.Directory.Parent.Parent;

                string contentDir = Path.Combine(rootDir.FullName, "Content");
                string paksDir = Path.Combine(contentDir, "Paks");
                string modsDir = Path.Combine(paksDir, "~mods");

                string logicModsDest = Path.Combine(paksDir, "LogicMods");
                string binariesModsDest = Path.Combine(rootDir.FullName, "Binaries", "Win64", "Mods");

                // Ensure directories exist
                Directory.CreateDirectory(modsDir);
                Directory.CreateDirectory(logicModsDest);
                Directory.CreateDirectory(binariesModsDest);

                // --- CLEANUP START ---
                // Load previously installed files (Loose files & UE4SS files) and delete them
                string installedFilesPath = Path.Combine(ModsDirectory, InstalledFilesConfigName);
                if (File.Exists(installedFilesPath))
                {
                    try
                    {
                        var oldFiles = JsonConvert.DeserializeObject<List<string>>(File.ReadAllText(installedFilesPath));
                        if (oldFiles != null)
                        {
                            foreach (var oldFile in oldFiles)
                            {
                                if (File.Exists(oldFile))
                                {
                                    try
                                    {
                                        File.Delete(oldFile);
                                    }
                                    catch
                                    {
                                        // Best effort delete
                                    }
                                }
                            }
                        }
                    }
                    catch
                    {
                        // Ignore corruption in installed_files.json
                    }
                }
                // --- CLEANUP END ---

                // Clear ~mods folder
                foreach (var file in Directory.GetFiles(modsDir))
                {
                    File.Delete(file);
                }

                // Clear LogicMods folder (files only)
                foreach (var file in Directory.GetFiles(logicModsDest))
                {
                    File.Delete(file);
                }

                // Save current state
                SaveLocalMods(localMods);

                var enabledMods = localMods.Where(m => m.IsEnabled).ToList();
                var ue4ssModsToEnable = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                var ue4ssModsToDisable = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                // List to track newly installed loose/UE4SS files
                var newInstalledFiles = new List<string>();

                // Scan for UE4SS mods to update mods.txt
                foreach (var mod in localMods)
                {
                    if (Directory.Exists(mod.FolderPath))
                    {
                        var ue4ssDir = Path.Combine(mod.FolderPath, "ue4ss");
                        if (Directory.Exists(ue4ssDir))
                        {
                            var subDirs = Directory.GetDirectories(ue4ssDir);
                            foreach (var subDir in subDirs)
                            {
                                var modName = new DirectoryInfo(subDir).Name;
                                if (mod.IsEnabled)
                                {
                                    ue4ssModsToEnable.Add(modName);
                                }
                                else
                                {
                                    ue4ssModsToDisable.Add(modName);
                                }
                            }
                        }
                    }
                }

                // Install enabled mods
                // Priority: 0 is highest (loads last, so highest prefix)
                for (int i = 0; i < enabledMods.Count; i++)
                {
                    var mod = enabledMods[i];
                    string prefix = (999 - i).ToString("D3") + "_";
                    CopyModFiles(mod.FolderPath, modsDir, prefix, logicModsDest, binariesModsDest, contentDir, newInstalledFiles);
               }

                // Update mods.txt for UE4SS
                UpdateModsTxt(binariesModsDest, ue4ssModsToEnable, ue4ssModsToDisable);

                // Save the new list of installed files
                try
                {
                    string json = JsonConvert.SerializeObject(newInstalledFiles, Formatting.Indented);
                    File.WriteAllText(installedFilesPath, json);
                }
                catch
                {
                    // Handle error saving manifest
                }
            });
        }

        private void CopyModFiles(string sourceDir, string targetDir, string prefix, string logicModsDest, string binariesModsDest, string gameContentDir, List<string> installedFiles)
            });
        }

        private void CopyModFiles(string sourceDir, string targetDir, string prefix, string logicModsDest, string binariesModsDest, string gameContentDir)
        {
            if (!Directory.Exists(sourceDir)) return;

            var files = Directory.GetFiles(sourceDir, "*", SearchOption.AllDirectories);

            foreach (var file in files)
            {
                string relativePath = Path.GetRelativePath(sourceDir, file);
                string[] parts = relativePath.Split(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);

                // 1. UE4SS (ue4ss/...) -> Binaries/Win64/Mods/...
                int ue4ssIdx = Array.FindIndex(parts, p => p.Equals("ue4ss", StringComparison.OrdinalIgnoreCase));
                if (ue4ssIdx >= 0 && ue4ssIdx < parts.Length - 1)
                {
                    string subPath = Path.Combine(parts.Skip(ue4ssIdx + 1).ToArray());
                    string dest = Path.Combine(binariesModsDest, subPath);
                    CopyFile(file, dest);
                    installedFiles.Add(dest);
                    continue;
                }

                // 2. LogicMods (LogicMods/...) -> Content/Paks/LogicMods/...
                int logicIdx = Array.FindIndex(parts, p => p.Equals("LogicMods", StringComparison.OrdinalIgnoreCase));
                if (logicIdx >= 0 && logicIdx < parts.Length - 1)
                {
                    string subPath = Path.Combine(parts.Skip(logicIdx + 1).ToArray());
                    string dest = Path.Combine(logicModsDest, subPath);
                    CopyFile(file, dest);
                    // No need to track LogicMods as the whole folder is wiped
                    continue;
                }

                // 3. Content (Content/...) -> Game/Content/...
                int contentIdx = Array.FindIndex(parts, p => p.Equals("Content", StringComparison.OrdinalIgnoreCase));
                if (contentIdx >= 0 && contentIdx < parts.Length - 1)
                {
                    string subPath = Path.Combine(parts.Skip(contentIdx + 1).ToArray());
                    string dest = Path.Combine(gameContentDir, subPath);
                    // This overwrites game files if they exist.
                    // Ideally we should backup, but for now we follow "Unverum-like" replacement.
                    CopyFile(file, dest);
                    installedFiles.Add(dest);
                    continue;
                }

                // 4. Standard Mod Files (Root or other folders) -> ~mods
                string ext = Path.GetExtension(file).ToLower();
                if (IsModFile(ext))
                {
                    string fileName = Path.GetFileName(file);
                    // Only apply prefix for files going to ~mods
                    string targetFileName = $"{prefix}{fileName}";
                    string dest = Path.Combine(targetDir, targetFileName);
                    CopyFile(file, dest);
                    // No need to track ~mods as the whole folder is wiped
                }
            }
        }

        private void CopyFile(string source, string dest)
        {
            try
            {
                var destDir = Path.GetDirectoryName(dest);
                if (destDir != null)
                {
                    Directory.CreateDirectory(destDir);
                }
                File.Copy(source, dest, true);
            }
            catch (Exception)
            {
                // Ignore copy errors
            }
        }

        private bool IsModFile(string ext)
        {
            return ext == ".pak" || ext == ".sig" || ext == ".utoc" || ext == ".ucas" ||
                   ext == ".awb" || ext == ".mp4" || ext == ".bmp" || ext == ".uasset" || ext == ".usm";
        }

        private void UpdateModsTxt(string binariesModsDir, HashSet<string> toEnable, HashSet<string> toDisable)
        {
            if (!Directory.Exists(binariesModsDir))
            {
                Directory.CreateDirectory(binariesModsDir);
            }

            string modsTxtPath = Path.Combine(binariesModsDir, "mods.txt");
            var outputLines = new List<string>();
            var processedMods = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            if (File.Exists(modsTxtPath))
            {
                var lines = File.ReadAllLines(modsTxtPath);
                foreach (var line in lines)
                {
                    var trimmed = line.Trim();
                    if (string.IsNullOrEmpty(trimmed) || trimmed.StartsWith(";") || trimmed.StartsWith("#") || trimmed.StartsWith("//"))
                    {
                        outputLines.Add(line);
                        continue;
                    }

                    var parts = line.Split(':', 2);
                    if (parts.Length == 2)
                    {
                        string modName = parts[0].Trim();
                        if (toEnable.Contains(modName))
                        {
                            outputLines.Add($"{modName} : 1");
                            processedMods.Add(modName);
                        }
                        else if (toDisable.Contains(modName))
                        {
                            outputLines.Add($"{modName} : 0");
                            processedMods.Add(modName);
                        }
                        else
                        {
                            outputLines.Add(line);
                        }
                    }
                    else
                    {
                        outputLines.Add(line);
                    }
                }
            }

            foreach (var mod in toEnable)
            {
                if (!processedMods.Contains(mod))
                {
                    outputLines.Add($"{mod} : 1");
                }
            }

            foreach (var mod in toDisable)
            {
                if (!processedMods.Contains(mod))
                {
                    outputLines.Add($"{mod} : 0");
                }
            }

            File.WriteAllLines(modsTxtPath, outputLines);
        }
    }
}
