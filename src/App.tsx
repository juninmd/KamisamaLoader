import { useState } from 'react';
import MainLayout from './layouts/MainLayout';
import Mods from './pages/Mods';
import Settings from './pages/Settings';
import Dashboard from './pages/Dashboard';
import { ToastProvider } from './components/ToastContext';
import { SettingsProvider } from './components/SettingsContext';

function App() {
  const [activePage, setActivePage] = useState('dashboard');

  const renderContent = () => {
    switch (activePage) {
      case 'dashboard':
      case 'home':
        return <Dashboard onNavigate={setActivePage} />;
      case 'mods':
        return <Mods />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onNavigate={setActivePage} />;
    }
  };

  return (
    <SettingsProvider>
      <ToastProvider>
        <MainLayout activePage={activePage} onNavigate={setActivePage}>
          {renderContent()}
        </MainLayout>
      </ToastProvider>
    </SettingsProvider>
  );
}

export default App;
