namespace KamisamaLoader.Models
{
    public class LocalMod
    {
        public string Name { get; set; }
        public string FolderPath { get; set; } // The path to the folder inside 'Mods'
        public bool IsEnabled { get; set; }
        public int Priority { get; set; } // 0 is top priority (loads last), or we can use the List index
        public string Version { get; set; }
        public string Author { get; set; }
        public string IconUrl { get; set; }
        public int GameBananaId { get; set; }
    }
}
