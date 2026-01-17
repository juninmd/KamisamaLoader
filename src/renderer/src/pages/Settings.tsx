import React, { useEffect, useState } from 'react'
import { Save } from 'lucide-react'

const Settings = () => {
  const [gamePath, setGamePath] = useState('')
  const [bgImage, setBgImage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Load initial settings
    window.api.getSettings().then(s => {
        if(s.gamePath) setGamePath(s.gamePath)
        if(s.backgroundImage) setBgImage(s.backgroundImage)
    })
  }, [])

  const handleSave = async () => {
    setLoading(true)
    await window.api.saveSettings({ gamePath, backgroundImage: bgImage })
    setLoading(false)
    // Maybe show toast
  }

  return (
    <div className="h-full flex flex-col p-8 max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold text-white mb-2">Settings</h2>
      <p className="text-slate-400 mb-8">Configure application preferences</p>

      <div className="glass-panel p-6 rounded-2xl space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Game Directory</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={gamePath}
              onChange={(e) => setGamePath(e.target.value)}
              placeholder="C:\SteamLibrary\steamapps\common\DRAGON BALL Sparking! ZERO"
              className="flex-1 bg-slate-950/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">Path to the root game folder containing SparkingZERO.exe</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Background Image URL</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={bgImage}
              onChange={(e) => setBgImage(e.target.value)}
              placeholder="https://..."
              className="flex-1 bg-slate-950/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">URL to an image for the application background</p>
        </div>

        <div className="pt-4 border-t border-white/5 flex justify-end">
           <button
             onClick={handleSave}
             disabled={loading}
             className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-blue-900/20 active:scale-95 disabled:opacity-50"
           >
             <Save size={18} />
             {loading ? 'Saving...' : 'Save Changes'}
           </button>
        </div>
      </div>
    </div>
  )
}

export default Settings
