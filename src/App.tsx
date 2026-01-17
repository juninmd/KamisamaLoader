import { useState } from 'react';
import Layout from './components/Layout';
import Mods from './pages/Mods';
import Settings from './pages/Settings';

function App() {
  const [activePage, setActivePage] = useState('home');

  const renderContent = () => {
    switch (activePage) {
      case 'home':
        return (
          <div className="flex flex-col items-center justify-center h-full space-y-4 text-center">
            <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white to-gray-500">
              Welcome to Kamisama Loader
            </h1>
            <p className="text-xl text-gray-400 max-w-lg">
              Manage your Dragon Ball: Sparking! ZERO mods with style and ease.
            </p>
            <button
                onClick={() => setActivePage('mods')}
                className="mt-8 px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-full font-bold text-lg shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all hover:scale-105"
            >
                Get Started
            </button>
          </div>
        );
      case 'mods':
        return <Mods />;
      case 'settings':
        return <Settings />;
      default:
        return <Mods />;
    }
  };

  return (
    <Layout activePage={activePage} onNavigate={setActivePage}>
      {renderContent()}
    </Layout>
  );
}

export default App;
