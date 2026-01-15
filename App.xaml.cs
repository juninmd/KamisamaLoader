using System;
using System.Threading;
using System.Windows;

namespace KamisamaLoader
{
    /// <summary>
    /// Interaction logic for App.xaml
    /// </summary>
    public partial class App : Application
    {
        private const string MutexName = "KamisamaLoader_UniqueInstance_Mutex";
        private Mutex _mutex;

        protected override void OnStartup(StartupEventArgs e)
        {
            _mutex = new Mutex(true, MutexName, out bool createdNew);

            if (!createdNew)
            {
                // App is already running
                // In a full implementation, we would pass arguments to the running instance via NamedPipes or window messages.
                // For now, we strictly follow Unverum's behavior of just preventing multiple instances.
                MessageBox.Show("Kamisama Loader is already running.", "Kamisama Loader", MessageBoxButton.OK, MessageBoxImage.Warning);
                Shutdown();
                return;
            }

            base.OnStartup(e);
        }

        protected override void OnExit(ExitEventArgs e)
        {
            if (_mutex != null)
            {
                _mutex.ReleaseMutex();
                _mutex.Dispose();
            }
            base.OnExit(e);
        }
    }
}
