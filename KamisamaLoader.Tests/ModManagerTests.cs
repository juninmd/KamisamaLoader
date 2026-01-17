using System;
using System.IO;
using System.IO.Compression;
using System.Collections.Generic;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Xunit;
using KamisamaLoader.Core.Services;
using KamisamaLoader.Core.Models;

namespace KamisamaLoader.Tests
{
    public class ModManagerTests : IDisposable
    {
        private readonly string _testRoot;
        private readonly string _modsDir;
        private readonly string _gameDir;
        private readonly ModManager _modManager;
        private readonly SettingsManager _settingsManager;

        public ModManagerTests()
        {
            _testRoot = Path.Combine(Path.GetTempPath(), "KamisamaLoaderTests", Guid.NewGuid().ToString());
            _modsDir = Path.Combine("Mods"); // ModManager uses relative "Mods" path
            _gameDir = Path.Combine(_testRoot, "Game", "SparkingZero", "Binaries", "Win64");

            // Setup directories
            Directory.CreateDirectory(_testRoot);
            Directory.CreateDirectory(_gameDir);

            // Create dummy game exe
            File.WriteAllText(Path.Combine(_gameDir, "SparkingZero-Win64-Shipping.exe"), "dummy exe");

            // ModManager expects "Mods" directory in current working directory
            if (Directory.Exists(_modsDir)) Directory.Delete(_modsDir, true);
            Directory.CreateDirectory(_modsDir);

            _settingsManager = new SettingsManager();
            _settingsManager.CurrentSettings.GameExecutablePath = Path.Combine(_gameDir, "SparkingZero-Win64-Shipping.exe");

            _modManager = new ModManager(_settingsManager);
        }

        public void Dispose()
        {
            if (Directory.Exists(_testRoot)) Directory.Delete(_testRoot, true);
            if (Directory.Exists(_modsDir)) Directory.Delete(_modsDir, true);
        }

        [Fact]
        public async Task LoadLocalModsAsync_ReturnsEmptyList_WhenNoModsExist()
        {
            var mods = await _modManager.LoadLocalModsAsync();
            Assert.Empty(mods);
        }

        [Fact]
        public async Task LoadLocalModsAsync_ReturnsMod_WhenModDirectoryExists()
        {
            string modPath = Path.Combine(_modsDir, "TestMod");
            Directory.CreateDirectory(modPath);

            var mods = await _modManager.LoadLocalModsAsync();

            Assert.Single(mods);
            Assert.Equal("TestMod", mods[0].Name);
            Assert.True(mods[0].IsEnabled); // Default is enabled
        }

        [Fact]
        public async Task InstallModAsync_ExtractsZipCorrectly()
        {
            // Create a dummy zip file
            string zipPath = Path.Combine(_testRoot, "testmod.zip");
            using (var archive = ZipFile.Open(zipPath, ZipArchiveMode.Create))
            {
                var entry = archive.CreateEntry("modfile.pak");
                using (var writer = new StreamWriter(entry.Open()))
                {
                    writer.Write("test content");
                }
            }

            await _modManager.InstallModAsync(zipPath, "InstalledMod");

            string expectedPath = Path.Combine(_modsDir, "InstalledMod", "modfile.pak");
            Assert.True(File.Exists(expectedPath));
        }

        [Fact]
        public void DeleteMod_RemovesDirectory()
        {
            string modPath = Path.Combine(_modsDir, "ModToDelete");
            Directory.CreateDirectory(modPath);
            var mod = new LocalMod { Name = "ModToDelete", FolderPath = modPath };

            _modManager.DeleteMod(mod);

            Assert.False(Directory.Exists(modPath));
        }

        [Fact]
        public async Task BuildAsync_CopiesFilesToCorrectLocations()
        {
            // Setup a mod with structure:
            // TestMod/
            //   MyMod.pak
            //   Content/
            //     SomeFile.uasset
            //   LogicMods/
            //     Logic.pak
            //   ue4ss/
            //     MyScriptMod/
            //       script.lua

            string modName = "ComplexMod";
            string modPath = Path.Combine(_modsDir, modName);
            Directory.CreateDirectory(modPath);
            File.WriteAllText(Path.Combine(modPath, "MyMod.pak"), "pak");

            Directory.CreateDirectory(Path.Combine(modPath, "Content", "Char"));
            File.WriteAllText(Path.Combine(modPath, "Content", "Char", "SomeFile.uasset"), "asset");

            Directory.CreateDirectory(Path.Combine(modPath, "LogicMods"));
            File.WriteAllText(Path.Combine(modPath, "LogicMods", "Logic.pak"), "logic");

            Directory.CreateDirectory(Path.Combine(modPath, "ue4ss", "MyScriptMod"));
            File.WriteAllText(Path.Combine(modPath, "ue4ss", "MyScriptMod", "script.lua"), "lua");

            var mod = new LocalMod
            {
                Name = modName,
                FolderPath = modPath,
                IsEnabled = true,
                Priority = 0
            };

            await _modManager.BuildAsync(new List<LocalMod> { mod });

            // Verify ~mods
            // 999_MyMod.pak
            string paksDir = Path.Combine(_testRoot, "Game", "SparkingZero", "Content", "Paks");
            string modsDir = Path.Combine(paksDir, "~mods");
            Assert.True(File.Exists(Path.Combine(modsDir, "999_MyMod.pak")));

            // Verify Content
            string contentDir = Path.Combine(_testRoot, "Game", "SparkingZero", "Content");
            Assert.True(File.Exists(Path.Combine(contentDir, "Char", "SomeFile.uasset")));

            // Verify LogicMods
            string logicDir = Path.Combine(paksDir, "LogicMods");
            Assert.True(File.Exists(Path.Combine(logicDir, "Logic.pak")));

            // Verify UE4SS
            string binModsDir = Path.Combine(_testRoot, "Game", "SparkingZero", "Binaries", "Win64", "Mods");
            Assert.True(File.Exists(Path.Combine(binModsDir, "MyScriptMod", "script.lua")));

            // Verify mods.txt
            string modsTxt = Path.Combine(binModsDir, "mods.txt");
            Assert.True(File.Exists(modsTxt));
            string txtContent = File.ReadAllText(modsTxt);
            Assert.Contains("MyScriptMod : 1", txtContent);
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
            // _gameDir in this test class is Binaries/Win64. Root is two levels up.
            var rootDir = new DirectoryInfo(_gameDir).Parent.Parent;
            string installedFile = Path.Combine(rootDir.FullName, "Content", "Movies", "intro.usm");
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
            // _gameDir is Binaries/Win64
            string installedModDir = Path.Combine(_gameDir, "Mods", "MyLuaMod");
            string installedLua = Path.Combine(installedModDir, "main.lua");
            Assert.True(File.Exists(installedLua));

            string modsTxt = Path.Combine(_gameDir, "Mods", "mods.txt");
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
