using System;
using System.IO;
using System.IO.Compression;
using System.Collections.Generic;
using System.Threading.Tasks;
using Xunit;
using KamisamaLoader.Services;
using KamisamaLoader.Models;

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
    }
}
