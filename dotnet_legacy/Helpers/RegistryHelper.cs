using System;
using System.Diagnostics;
using System.IO;
using Microsoft.Win32;

namespace KamisamaLoader.Helpers
{
    public static class RegistryHelper
    {
        private const string ProtocolName = "kamisama";
        private const string ProtocolDescription = "URL:Kamisama Protocol";

        public static void RegisterProtocol()
        {
            // check if we are on Windows
            if (Environment.OSVersion.Platform != PlatformID.Win32NT)
                return;

            string appPath = Process.GetCurrentProcess().MainModule.FileName;

            // HKEY_CLASSES_ROOT\kamisama
            // This might throw UnauthorizedAccessException if not run as Admin
            using (var key = Registry.ClassesRoot.CreateSubKey(ProtocolName))
            {
                key.SetValue(string.Empty, ProtocolDescription);
                key.SetValue("URL Protocol", string.Empty);

                using (var commandKey = key.CreateSubKey(@"shell\open\command"))
                {
                    commandKey.SetValue(string.Empty, $"\"{appPath}\" \"%1\"");
                }
            }
        }
    }
}
