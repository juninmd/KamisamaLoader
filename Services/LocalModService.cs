using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using KamisamaLoader.Models;

namespace KamisamaLoader.Services
{
    public class LocalModService
    {
        public List<LocalMod> ScanForLocalMods(string gameDirectory)
        {
            var mods = new List<LocalMod>();
            if (string.IsNullOrEmpty(gameDirectory) || !Directory.Exists(gameDirectory))
            {
                return mods;
            }

            // Common path for mods in Unreal Engine games
            // e.g., <GameDir>/SparkingZero/Content/Paks/~mods
            // Let's find the Paks directory first.
            var paksDir = FindPaksDirectory(gameDirectory);
            if (paksDir == null)
            {
                return mods;
            }

            var modsDir = Path.Combine(paksDir, "~mods");
            if (!Directory.Exists(modsDir))
            {
                // For now, let's also check for a "LogicMods" folder
                modsDir = Path.Combine(paksDir, "LogicMods");
                if (!Directory.Exists(modsDir))
                {
                     return mods;
                }
            }

            // Get all .pak files
            var pakFiles = Directory.GetFiles(modsDir, "*.pak", SearchOption.AllDirectories);
            foreach (var file in pakFiles)
            {
                mods.Add(new LocalMod
                {
                    Name = Path.GetFileNameWithoutExtension(file),
                    FilePath = file,
                    IsActive = !Path.GetExtension(file).EndsWith("_disabled") // A simple way to check if a mod is disabled
                });
            }

            return mods;
        }

        private string FindPaksDirectory(string gameDirectory)
        {
            // Search for a "Paks" directory in common locations
            var searchPaths = new string[]
            {
                Path.Combine(gameDirectory, "Content", "Paks"),
                Path.Combine(gameDirectory, "SparkingZero", "Content", "Paks"), // A guess for the structure
                Path.Combine(gameDirectory, "Paks")
            };

            foreach (var path in searchPaths)
            {
                if (Directory.Exists(path))
                {
                    return path;
                }
            }

            return null;
        }
    }
}
