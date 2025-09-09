using System.Net.Http;
using System.Windows;
using Newtonsoft.Json;
using KamisamaLoader.Models;
using System.Collections.ObjectModel;
using System.Windows.Controls;
using System.Windows.Navigation; // Adicionado para o RequestNavigate
using System.Diagnostics; // Adicionado para Process.Start
using KamisamaLoader.Services;

namespace KamisamaLoader
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class MainWindow : Window
    {
        private readonly SteamService _steamService;
        private readonly LocalModService _localModService;
        private readonly GameBananaService _gameBananaService;
        public ObservableCollection<ModRecord> GameBananaMods { get; set; }
        public ObservableCollection<LocalMod> LocalMods { get; set; }
        public string GameDirectory { get; set; }

        public MainWindow()
        {
            InitializeComponent();
            GameBananaMods = new ObservableCollection<ModRecord>();
            LocalMods = new ObservableCollection<LocalMod>();
            _steamService = new SteamService();
            _localModService = new LocalModService();
            _gameBananaService = new GameBananaService();
            this.DataContext = this;

            Loaded += MainWindow_Loaded;
        }

        private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
        {
            await LoadGameBananaMods();
            FindGameDirectory();
            LoadLocalMods();
        }

        private void LoadLocalMods()
        {
            var mods = _localModService.ScanForLocalMods(GameDirectory);
            LocalMods.Clear();
            foreach (var mod in mods)
            {
                LocalMods.Add(mod);
            }
            Debug.WriteLine($"Found {LocalMods.Count} local mods.");
        }

        private void FindGameDirectory()
        {
            GameDirectory = _steamService.FindGameDirectory();
            if (!string.IsNullOrEmpty(GameDirectory))
            {
                GamePathText.Text = $"Caminho do jogo: {GameDirectory}";
            }
            else
            {
                GamePathText.Text = "Caminho do jogo não encontrado. Verifique se a Steam e o jogo estão instalados.";
            }
        }

        private const int GameId = 21179;

        private async System.Threading.Tasks.Task LoadGameBananaMods()
        {
            var mods = await _gameBananaService.GetModsAsync(GameId);
            GameBananaMods.Clear();
            if (mods != null)
            {
                foreach (var mod in mods)
                {
                    GameBananaMods.Add(mod);
                }
            }
            else
            {
                MessageBox.Show("Não foi possível carregar os mods do GameBanana. Verifique sua conexão com a internet ou tente novamente mais tarde.", "Erro de Rede", MessageBoxButton.OK, MessageBoxImage.Warning);
            }
        }

        // Método para lidar com o evento RequestNavigate do Hyperlink
        private void Hyperlink_RequestNavigate(object sender, RequestNavigateEventArgs e)
        {
            try
            {
                // Abre o link no navegador padrão do sistema
                Process.Start(new ProcessStartInfo(e.Uri.AbsoluteUri) { UseShellExecute = true });
                e.Handled = true; // Indica que o evento foi tratado
            }
            catch (System.Exception ex)
            {
                MessageBox.Show($"Não foi possível abrir o link: {ex.Message}", "Erro", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }
    }
}