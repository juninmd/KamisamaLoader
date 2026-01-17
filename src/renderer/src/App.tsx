import React, { useEffect, useState } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'

// Pages
import ModList from './pages/ModList'
import Settings from './pages/Settings'

// Placeholder Home
const Home = () => (
  <div className="flex-1 p-10 flex flex-col justify-center items-center text-center">
    <div className="max-w-md space-y-6">
      <h1 className="text-4xl font-bold text-white">Dragon Ball Sparking! ZERO</h1>
      <p className="text-slate-400 text-lg">Manage your mods with ease and performance.</p>
    </div>
  </div>
)

function App(): JSX.Element {
  const [bgImage, setBgImage] = useState('https://images4.alphacoders.com/134/1341409.png')

  useEffect(() => {
    // Poll for settings or listen to event (simple poll for now)
    const loadSettings = async () => {
      const s = await window.api.getSettings()
      if (s.backgroundImage) setBgImage(s.backgroundImage)
    }
    loadSettings()

    // Quick and dirty way to update bg when settings change: expose a global event or re-fetch periodically
    const interval = setInterval(loadSettings, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <HashRouter>
      <div
        className="flex h-screen bg-cover bg-center transition-all duration-700"
        style={{ backgroundImage: `url('${bgImage}')` }}
      >
         {/* Overlay to darken bg */}
         <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-0" />

         <div className="relative z-10 flex w-full h-full">
            <Sidebar />
            <main className="flex-1 overflow-hidden relative">
              {/* Top Drag Region */}
              <div className="h-8 w-full select-none" style={{ WebkitAppRegion: 'drag' } as any}></div>

              <div className="h-[calc(100%-2rem)] overflow-auto">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/mods" element={<ModList />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </div>
            </main>
         </div>
      </div>
    </HashRouter>
  )
}

export default App
