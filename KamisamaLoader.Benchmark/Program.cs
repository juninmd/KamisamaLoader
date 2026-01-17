using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using KamisamaLoader.Core.Models;
using KamisamaLoader.Core.Services;

namespace KamisamaLoader.Benchmark
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("Setting up benchmark environment...");
            var baseDir = AppDomain.CurrentDomain.BaseDirectory;
            var gameDir = Path.Combine(baseDir, "Game", "SparkingZero");
            var contentDir = Path.Combine(gameDir, "Content");
            var paksDir = Path.Combine(contentDir, "Paks");
            var modsDir = Path.Combine(paksDir, "~mods");
            var binariesDir = Path.Combine(gameDir, "Binaries", "Win64");
            var exePath = Path.Combine(binariesDir, "SparkingZero-Win64-Shipping.exe");
            var modsSourceDir = Path.Combine(baseDir, "Mods");

            // Cleanup
            if (Directory.Exists(gameDir)) Directory.Delete(gameDir, true);
            if (Directory.Exists(modsSourceDir)) Directory.Delete(modsSourceDir, true);

            // Create directories
            Directory.CreateDirectory(modsDir);
            Directory.CreateDirectory(binariesDir);
            Directory.CreateDirectory(modsSourceDir);

            // Create fake exe
            File.WriteAllText(exePath, "fake exe content");

            // Create settings.json
            var settingsJson = $"{{\"GameExecutablePath\": \"{exePath.Replace("\\", "\\\\")}\"}}";
            File.WriteAllText("settings.json", settingsJson);

            // Create dummy mods
            int modCount = 50;
            int filesPerMod = 20;
            var localMods = new List<LocalMod>();

            for (int i = 0; i < modCount; i++)
            {
                string modName = $"Mod_{i}";
                string modPath = Path.Combine(modsSourceDir, modName);
                Directory.CreateDirectory(modPath);

                for (int j = 0; j < filesPerMod; j++)
                {
                    File.WriteAllBytes(Path.Combine(modPath, $"file_{j}.pak"), new byte[1024 * 100]); // 100KB file
                    File.WriteAllBytes(Path.Combine(modPath, $"file_{j}.sig"), new byte[100]);
                }

                localMods.Add(new LocalMod
                {
                    Name = modName,
                    FolderPath = modPath,
                    IsEnabled = true,
                    Priority = i
                });
            }

            var settingsManager = new SettingsManager();
            var modManager = new ModManager(settingsManager);

            Console.WriteLine($"Starting benchmark with {modCount} mods, {filesPerMod * 2} files each...");
            var stopwatch = Stopwatch.StartNew();

            modManager.BuildAsync(localMods).Wait();

            stopwatch.Stop();
            Console.WriteLine($"BuildAsync completed in {stopwatch.ElapsedMilliseconds} ms");

            // Cleanup
             if (Directory.Exists(gameDir)) Directory.Delete(gameDir, true);
             if (Directory.Exists(modsSourceDir)) Directory.Delete(modsSourceDir, true);
             if (File.Exists("settings.json")) File.Delete("settings.json");
        }
    }
}
