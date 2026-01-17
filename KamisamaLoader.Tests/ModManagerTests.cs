using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using KamisamaLoader.Models;
using KamisamaLoader.Services;
using Newtonsoft.Json;
using Xunit;

namespace KamisamaLoader.Tests
{
    public class ModManagerTests : IDisposable
    {
        private readonly string _testRoot;
        private readonly string _gameDir;
        private readonly string _modsDir;
        private readonly ModManager _modManager;
        private readonly SettingsManager _settingsManager;

        public ModManagerTests()
        {
            _testRoot = Path.Combine(Path.GetTempPath(), "KamisamaTests_" + Guid.NewGuid());
            Directory.CreateDirectory(_testRoot);

            // Setup Game Structure
            // .../SparkingZero/Binaries/Win64/SparkingZero-Win64-Shipping.exe
            _gameDir = Path.Combine(_testRoot, "SparkingZERO");
            string binariesDir = Path.Combine(_gameDir, "Binaries", "Win64");
            Directory.CreateDirectory(binariesDir);
            string exePath = Path.Combine(binariesDir, "SparkingZERO-Win64-Shipping.exe");
            File.WriteAllText(exePath, "fake exe");

            // Setup App Structure
            // The ModManager expects "Mods" directory in the current working directory (which will be bin/Debug/...)
            // To isolate tests, we should probably set the working directory or copy ModManager and modify it to accept a root path.
            // But ModManager uses "Mods" constant. We can create "Mods" in the test output dir.
            _modsDir = "Mods"; // Relative to execution
            if (Directory.Exists(_modsDir)) Directory.Delete(_modsDir, true);
            Directory.CreateDirectory(_modsDir);

            // Initialize Managers
            _settingsManager = new SettingsManager();
            _settingsManager.CurrentSettings.GameExecutablePath = exePath;

            _modManager = new ModManager(_settingsManager);
        }

        public void Dispose()
        {
            if (Directory.Exists(_testRoot)) Directory.Delete(_testRoot, true);
            if (Directory.Exists(_modsDir)) Directory.Delete(_modsDir, true);
            if (File.Exists("installed_files.json")) File.Delete("installed_files.json");
            if (File.Exists("mods.json")) File.Delete("mods.json");
        }

        [Fact]
        public async Task BuildAsync_ShouldInstallAndCleanupLooseFiles()
        {
            // 1. Create a Mod with Loose Files
            string modName = "TestMod_Loose";
            string modDir = Path.Combine(_modsDir, modName);
            Directory.CreateDirectory(Path.Combine(modDir, "Content", "Movies"));
            File.WriteAllText(Path.Combine(modDir, "Content", "Movies", "intro.usm"), "fake movie");

            var mod = new LocalMod
            {
                Name = modName,
                FolderPath = modDir,
                IsEnabled = true
            };

            // 2. Build (Install)
            await _modManager.BuildAsync(new List<LocalMod> { mod });

            // 3. Verify Installation
            string installedFile = Path.Combine(_gameDir, "Content", "Movies", "intro.usm");
            Assert.True(File.Exists(installedFile), "Loose file should be installed to Game Content directory.");

            // Verify Manifest
            string manifestPath = Path.Combine(_modsDir, "installed_files.json");
            Assert.True(File.Exists(manifestPath));
            var installedFiles = JsonConvert.DeserializeObject<List<string>>(File.ReadAllText(manifestPath));
            Assert.Contains(installedFile, installedFiles);

            // 4. Disable Mod and Build (Uninstall/Cleanup)
            mod.IsEnabled = false;
            await _modManager.BuildAsync(new List<LocalMod> { mod });

            // 5. Verify Cleanup
            Assert.False(File.Exists(installedFile), "Loose file should be deleted when mod is disabled.");

            // Verify Manifest is empty-ish
            installedFiles = JsonConvert.DeserializeObject<List<string>>(File.ReadAllText(manifestPath));
            Assert.DoesNotContain(installedFile, installedFiles);
        }

        [Fact]
        public async Task BuildAsync_ShouldInstallAndCleanupUE4SS()
        {
            // 1. Create a Mod with UE4SS
            string modName = "TestMod_UE4SS";
            string modDir = Path.Combine(_modsDir, modName);
            string ue4ssModPath = Path.Combine(modDir, "ue4ss", "MyLuaMod");
            Directory.CreateDirectory(ue4ssModPath);
            File.WriteAllText(Path.Combine(ue4ssModPath, "main.lua"), "print('hello')");

            var mod = new LocalMod
            {
                Name = modName,
                FolderPath = modDir,
                IsEnabled = true
            };

            // 2. Build
            await _modManager.BuildAsync(new List<LocalMod> { mod });

            // 3. Verify
            string installedModDir = Path.Combine(_gameDir, "Binaries", "Win64", "Mods", "MyLuaMod");
            string installedLua = Path.Combine(installedModDir, "main.lua");
            Assert.True(File.Exists(installedLua));

            string modsTxt = Path.Combine(_gameDir, "Binaries", "Win64", "Mods", "mods.txt");
            Assert.True(File.Exists(modsTxt));
            string txtContent = File.ReadAllText(modsTxt);
            Assert.Contains("MyLuaMod : 1", txtContent);

            // 4. Disable
            mod.IsEnabled = false;
            await _modManager.BuildAsync(new List<LocalMod> { mod });

            // 5. Verify Cleanup
            // The file main.lua should be deleted because we tracked it.
            // However, the folder 'MyLuaMod' might remain if we only delete files.
            // Our code deletes files.
            Assert.False(File.Exists(installedLua), "UE4SS mod file should be deleted.");

            // mods.txt should updated
            txtContent = File.ReadAllText(modsTxt);
            Assert.Contains("MyLuaMod : 0", txtContent);
        }
    }
}
