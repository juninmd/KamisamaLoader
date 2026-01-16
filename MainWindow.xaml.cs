using System;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Navigation;
using KamisamaLoader.Helpers;
using KamisamaLoader.Models;
using KamisamaLoader.Services;
using Microsoft.Win32;

namespace KamisamaLoader
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class MainWindow : Window, INotifyPropertyChanged
    {
        private readonly GameBananaService _gameBananaService;
        private readonly SettingsManager _settingsManager;
        private readonly ModManager _modManager;

        public event PropertyChangedEventHandler PropertyChanged;

        public ObservableCollection<ModRecord> GameBananaMods { get; set; }

        // Removed duplicate property definition
        private ObservableCollection<LocalMod> _localMods;
        public ObservableCollection<LocalMod> LocalMods
        {
            get => _localMods;
            set
            {
                if (_localMods != value)
                {
                    _localMods = value;
                    OnPropertyChanged();
                }
            }
        }

        // This property is likely bound to something in XAML but not strictly needed if we bind to GameExecutablePath directly via SettingsManager,
        // but for now keeping it as a facade.
        public string GameDirectory { get; set; }

        public string GameExecutablePath
        {
            get => _settingsManager.CurrentSettings.GameExecutablePath;
            set
            {
                _settingsManager.CurrentSettings.GameExecutablePath = value;
                OnPropertyChanged();
            }
        }

        public MainWindow()
        {
            InitializeComponent();

            _settingsManager = new SettingsManager();
            _gameBananaService = new GameBananaService();
            _modManager = new ModManager(_settingsManager);

            GameBananaMods = new RangeObservableCollection<ModRecord>();
            // Initialize with empty collection
            LocalMods = new RangeObservableCollection<LocalMod>();

            this.DataContext = this;

            Loaded += MainWindow_Loaded;
        }

        protected virtual void OnPropertyChanged([CallerMemberName] string propertyName = null)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }

        private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
        {
            await LoadGameBananaMods();
            await RefreshLibraryAsync();
        }

        private async Task LoadGameBananaMods()
        {
            var mods = await _gameBananaService.GetModsAsync();
            if (GameBananaMods is RangeObservableCollection<ModRecord> rangeCollection)
            {
                rangeCollection.ReplaceAll(mods);
            }
            else
            {
                GameBananaMods.Clear();
                foreach (var mod in mods)
                {
                    GameBananaMods.Add(mod);
                }
            }
        }

        private async Task RefreshLibraryAsync()
        {
            var mods = await _modManager.LoadLocalModsAsync();
            LocalMods = new ObservableCollection<LocalMod>(mods);
        }

        private async void RefreshLibrary_Click(object sender, RoutedEventArgs e)
        {
            await RefreshLibraryAsync();
        }

        private async void CheckUpdates_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button btn) btn.IsEnabled = false;
            try
            {
                // We need to work on the list.
                var mods = LocalMods.ToList();
                await _modManager.CheckForUpdatesAsync(mods, _gameBananaService);

                // Save state so we persist the update info
                _modManager.SaveLocalMods(mods);

                // Refresh list to show updates (since LocalMod doesn't implement INotifyPropertyChanged)
                LocalMods = new ObservableCollection<LocalMod>(mods);

                MessageBox.Show("Update check complete.", "Info", MessageBoxButton.OK, MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error checking updates: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
            finally
            {
                if (sender is Button btn) btn.IsEnabled = true;
            }
        }

        private async void UpdateMod_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button button && button.Tag is LocalMod mod)
            {
                if (MessageBox.Show($"Update '{mod.Name}' to version {mod.LatestVersion}?", "Confirm Update", MessageBoxButton.YesNo, MessageBoxImage.Question) == MessageBoxResult.Yes)
                {
                    try
                    {
                        await _modManager.UpdateModAsync(mod, _gameBananaService);
                        _modManager.SaveLocalMods(LocalMods.ToList());

                        MessageBox.Show($"Updated '{mod.Name}' successfully!", "Success", MessageBoxButton.OK, MessageBoxImage.Information);
                        await RefreshLibraryAsync();
                    }
                    catch (Exception ex)
                    {
                        MessageBox.Show($"Error updating mod: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                    }
                }
            }
        }

        private async void DownloadButton_Click(object sender, RoutedEventArgs e)
        {
            if (sender is Button button && button.Tag is ModRecord modRecord)
            {
                await InstallModFromId(modRecord.IdRow);
            }
        }

        private async Task InstallModFromId(int modId)
        {
            try
            {
                // Fetch full details
                var details = await _gameBananaService.GetModDetailsAsync(modId);
                if (details != null && details.Files != null && details.Files.Count > 0)
                {
                    // For simplicity, download the first file
                    // In a real app, show a dialog to pick file
                    var fileToDownload = details.Files[0];
                    string downloadUrl = fileToDownload.DownloadUrl;

                    if (string.IsNullOrEmpty(downloadUrl))
                    {
                        MessageBox.Show("No download URL found.", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                        return;
                    }

                    // Download
                    string tempFile = System.IO.Path.GetTempFileName();
                    try
                    {
                        // Show some loading indicator...
                        // In a real app, implement progress bar
                        await _gameBananaService.DownloadFileAsync(downloadUrl, tempFile);

                        // Extract
                        string modName = details.Name;
                        // Clean mod name for file system
                        foreach (char c in System.IO.Path.GetInvalidFileNameChars())
                        {
                            modName = modName.Replace(c, '_');
                        }

                        await _modManager.InstallModAsync(tempFile, modName);

                        MessageBox.Show($"Installed {modName} successfully!", "Success", MessageBoxButton.OK, MessageBoxImage.Information);
                        await RefreshLibraryAsync();
                    }
                    catch (Exception ex)
                    {
                        MessageBox.Show($"Error downloading/installing mod: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                    }
                    finally
                    {
                        if (File.Exists(tempFile)) File.Delete(tempFile);
                    }
                }
                else
                {
                    MessageBox.Show("No files found for this mod or mod details unavailable.", "Info", MessageBoxButton.OK, MessageBoxImage.Information);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error fetching mod details: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void RegisterProtocol_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                RegistryHelper.RegisterProtocol();
                MessageBox.Show("Protocol handler registered successfully. You can now use 1-Click Install from browser.", "Success", MessageBoxButton.OK, MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Failed to register protocol: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        public async Task ProcessStartupArgs(string[] args)
        {
            if (args == null || args.Length == 0) return;

            foreach (var arg in args)
            {
                if (arg.StartsWith("kamisama://", StringComparison.OrdinalIgnoreCase))
                {
                    // Format: kamisama://dl/<modid> or kamisama://<modid>
                    string cleanArg = arg.Replace("kamisama://", "", StringComparison.OrdinalIgnoreCase);
                    if (cleanArg.StartsWith("dl/", StringComparison.OrdinalIgnoreCase))
                        cleanArg = cleanArg.Replace("dl/", "", StringComparison.OrdinalIgnoreCase);

                    // Remove trailing slash if present
                    cleanArg = cleanArg.TrimEnd('/');

                    if (int.TryParse(cleanArg, out int modId))
                    {
                        // Trigger install
                        await InstallModFromId(modId);
                    }
                }
            }
        }

        private async void Build_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                if (sender is Button btn) btn.IsEnabled = false;

                // Pass the current list to Build, which will also save it
                await _modManager.BuildAsync(LocalMods.ToList());
                MessageBox.Show("Mods installed to game directory successfully!", "Success", MessageBoxButton.OK, MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error building mods: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
            finally
            {
                if (sender is Button btn) btn.IsEnabled = true;
            }
        }

        private async void DeleteMod_Click(object sender, RoutedEventArgs e)
        {
             if (sender is Button button && button.Tag is LocalMod mod)
             {
                 if (MessageBox.Show($"Are you sure you want to delete '{mod.Name}'?", "Confirm Delete", MessageBoxButton.YesNo, MessageBoxImage.Warning) == MessageBoxResult.Yes)
                 {
                     try
                     {
                         _modManager.DeleteMod(mod);
                         await RefreshLibraryAsync();
                     }
                     catch (Exception ex)
                     {
                         MessageBox.Show($"Error deleting mod: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                     }
                 }
             }
        }

        private void MoveUp_Click(object sender, RoutedEventArgs e)
        {
             if (sender is Button button && button.Tag is LocalMod mod)
             {
                 int index = LocalMods.IndexOf(mod);
                 if (index > 0)
                 {
                     LocalMods.Move(index, index - 1);
                 }
             }
        }

        private void MoveDown_Click(object sender, RoutedEventArgs e)
        {
             if (sender is Button button && button.Tag is LocalMod mod)
             {
                 int index = LocalMods.IndexOf(mod);
                 if (index < LocalMods.Count - 1)
                 {
                     LocalMods.Move(index, index + 1);
                 }
             }
        }

        private void BrowseGamePath_Click(object sender, RoutedEventArgs e)
        {
            OpenFileDialog openFileDialog = new OpenFileDialog();
            openFileDialog.Filter = "Executable files (*.exe)|*.exe|All files (*.*)|*.*";
            if (openFileDialog.ShowDialog() == true)
            {
                GameExecutablePath = openFileDialog.FileName;
                // Force UI update - we use PropertyChanged now but if TextBox is named GamePathTextBox we can set it too
                // Assuming GamePathTextBox exists in XAML
                // GamePathTextBox.Text = GameExecutablePath;
                // Since I don't see XAML, I'll keep the direct assignment if it was there or assume binding works.
                // The previous code had: GamePathTextBox.Text = GameExecutablePath;
                // I will add it back but wrapping in try/catch or checking null if possible?
                // No, I should assume GamePathTextBox exists as per previous code.
                // But wait, previous code had `GamePathTextBox.Text = GameExecutablePath;` inside BrowseGamePath_Click.
                // I'll keep it. But I need to know if GamePathTextBox is accessible.
                // Since I'm overwriting the class, I should include it.
                // But I should check if `GamePathTextBox` is defined in XAML.
                // Assuming it is.
                if (this.FindName("GamePathTextBox") is TextBox tb)
                {
                     tb.Text = GameExecutablePath;
                }
            }
        }

        private void SaveSettings_Click(object sender, RoutedEventArgs e)
        {
            _settingsManager.SaveSettings();
            MessageBox.Show("Settings saved.", "Success", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void Hyperlink_RequestNavigate(object sender, RequestNavigateEventArgs e)
        {
            try
            {
                Process.Start(new ProcessStartInfo(e.Uri.AbsoluteUri) { UseShellExecute = true });
                e.Handled = true;
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Cannot open link: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }
    }
}
