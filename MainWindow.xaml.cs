using System.Net.Http;
using System.Windows;
using Newtonsoft.Json;
using KamisamaLoader.Models;
using System.Collections.ObjectModel;
using System.Windows.Controls;
using System.Windows.Navigation; // Adicionado para o RequestNavigate
using System.Diagnostics; // Adicionado para Process.Start

namespace KamisamaLoader
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class MainWindow : Window
    {
        private static readonly HttpClient _httpClient = new HttpClient();
        public ObservableCollection<ModRecord> GameBananaMods { get; set; }

        public MainWindow()
        {
            InitializeComponent();
            GameBananaMods = new ObservableCollection<ModRecord>();
            this.DataContext = this;

            Loaded += MainWindow_Loaded;
        }

        private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
        {
            await LoadGameBananaMods();
        }

        private async System.Threading.Tasks.Task LoadGameBananaMods()
        {
            try
            {
                string apiUrl = "https://gamebanana.com/apiv11/Game/21179/Subfeed?_sSort=default&_nPage=1";

                HttpResponseMessage response = await _httpClient.GetAsync(apiUrl);
                response.EnsureSuccessStatusCode();

                string jsonResponse = await response.Content.ReadAsStringAsync();
                GameBananaApiResponse apiResponse = JsonConvert.DeserializeObject<GameBananaApiResponse>(jsonResponse);

                GameBananaMods.Clear();
                if (apiResponse?.Records != null)
                {
                    foreach (var mod in apiResponse.Records)
                    {
                        if (mod.ModelName == "Mod")
                        {
                            GameBananaMods.Add(mod);
                        }
                    }
                }
            }
            catch (HttpRequestException httpEx)
            {
                MessageBox.Show($"Erro de requisição HTTP: {httpEx.Message}", "Erro de Conexão", MessageBoxButton.OK, MessageBoxImage.Error);
            }
            catch (JsonSerializationException jsonEx)
            {
                MessageBox.Show($"Erro ao desserializar JSON: {jsonEx.Message}", "Erro de Dados", MessageBoxButton.OK, MessageBoxImage.Error);
            }
            catch (System.Exception ex)
            {
                MessageBox.Show($"Ocorreu um erro: {ex.Message}", "Erro", MessageBoxButton.OK, MessageBoxImage.Error);
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