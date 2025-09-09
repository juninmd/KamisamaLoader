namespace KamisamaLoader.Models
{
    public class LocalMod
    {
        public string Name { get; set; }
        public string FilePath { get; set; }
        public bool IsActive { get; set; } // To be used later for enabling/disabling mods
    }
}
