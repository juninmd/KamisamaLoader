import { useState } from 'react';
import Layout from './components/Layout';
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
      case 'home': // Handle legacy state if needed
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
          <Layout activePage={activePage} onNavigate={setActivePage}>
          {renderContent()}
          </Layout>
      </ToastProvider>
    </SettingsProvider>
  );
}

export default App;
