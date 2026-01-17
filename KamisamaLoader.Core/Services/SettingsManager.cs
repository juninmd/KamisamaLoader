using System;
using System.IO;
using Newtonsoft.Json;
using KamisamaLoader.Core.Models;

namespace KamisamaLoader.Core.Services
{
    public class SettingsManager
    {
        private const string SettingsFileName = "settings.json";
        public AppSettings CurrentSettings { get; private set; }

        public SettingsManager()
        {
            LoadSettings();
        }

        public void LoadSettings()
        {
            if (File.Exists(SettingsFileName))
            {
                try
                {
                    string json = File.ReadAllText(SettingsFileName);
                    CurrentSettings = JsonConvert.DeserializeObject<AppSettings>(json);
                }
                catch (Exception)
                {
                    CurrentSettings = new AppSettings();
                }
            }
            else
            {
                CurrentSettings = new AppSettings();
            }
        }

        public void SaveSettings()
        {
            try
            {
                string json = JsonConvert.SerializeObject(CurrentSettings, Formatting.Indented);
                File.WriteAllText(SettingsFileName, json);
            }
            catch (Exception)
            {
                // Handle save error
            }
        }
    }
}