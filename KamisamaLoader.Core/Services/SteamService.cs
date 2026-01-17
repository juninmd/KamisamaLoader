using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using Microsoft.Win32;

namespace KamisamaLoader.Services
{
    public class SteamService
    {
        private const string GameAppId = "1790600";
        private const string GameName = "DRAGON BALL Sparking! ZERO";

        public string? FindGameDirectory()
        {
            try
            {
                string? steamPath = GetSteamInstallPath();
                if (string.IsNullOrEmpty(steamPath))
                {
                    return null;
                }

                var libraryPaths = GetSteamLibraryPaths(steamPath);
                foreach (var libraryPath in libraryPaths)
                {
                    var gamePath = FindGameInLibrary(libraryPath);
                    if (!string.IsNullOrEmpty(gamePath))
                    {
                        return gamePath;
                    }
                }
            }
            catch (Exception ex)
            {
                // Log the exception
                Console.WriteLine($"Error finding game directory: {ex.Message}");
            }

            return null;
        }

        private string? GetSteamInstallPath()
        {
            if (!OperatingSystem.IsWindows())
            {
                return null;
            }

            // For 64-bit OS, Steam path is in Wow6432Node
            var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\WOW6432Node\Valve\Steam");
            if (key == null)
            {
                // If not found, try the 32-bit path
                key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Valve\Steam");
            }

            return key?.GetValue("InstallPath")?.ToString();
        }

        private List<string> GetSteamLibraryPaths(string steamPath)
        {
            var paths = new List<string> { steamPath };
            var libraryFoldersVdf = Path.Combine(steamPath, "steamapps", "libraryfolders.vdf");

            if (File.Exists(libraryFoldersVdf))
            {
                var content = File.ReadAllText(libraryFoldersVdf);
                // Simple regex to find library paths, e.g., "1" "D:\\SteamLibrary"
                var matches = Regex.Matches(content, @"\""path\""\s+\""(.+?)\""");
                foreach (Match match in matches)
                {
                    if (match.Success && match.Groups.Count > 1)
                    {
                        // VDF paths use escaped backslashes
                        paths.Add(match.Groups[1].Value.Replace(@"\\", @"\"));
                    }
                }
            }

            return paths.Distinct().ToList();
        }

        private string? FindGameInLibrary(string libraryPath)
        {
            var appManifestPath = Path.Combine(libraryPath, "steamapps", $"appmanifest_{GameAppId}.acf");

            if (File.Exists(appManifestPath))
            {
                var content = File.ReadAllText(appManifestPath);
                // Find the "installdir" value
                var match = Regex.Match(content, @"\""installdir\""\s+\""(.+?)\""");
                if (match.Success && match.Groups.Count > 1)
                {
                    var installDir = match.Groups[1].Value;
                    var gameDir = Path.Combine(libraryPath, "steamapps", "common", installDir);
                    if (Directory.Exists(gameDir))
                    {
                        return gameDir;
                    }
                }
            }

            return null;
        }
    }
}
