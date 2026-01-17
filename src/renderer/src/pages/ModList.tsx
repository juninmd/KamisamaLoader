import React, { useEffect, useState, useMemo } from 'react'
import { Virtuoso } from 'react-virtuoso'
import { Search, FolderOpen, Package, Plus } from 'lucide-react'

// Simple Switch Component since we don't have shadcn/ui fully setup yet
const Toggle = ({ checked, onChange }: { checked: boolean, onChange: (v: boolean) => void }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`w-12 h-6 rounded-full transition-colors relative ${checked ? 'bg-blue-600' : 'bg-slate-700'}`}
  >
    <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
  </button>
)

interface Mod {
  id: string
  name: string
  isEnabled: boolean
  path: string
}

const ModList = () => {
  const [mods, setMods] = useState<Mod[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchMods = async () => {
    setLoading(true)
    try {
        const result = await window.api.scanMods()
        setMods(result || [])
    } catch (e) {
        console.error(e)
    } finally {
        setLoading(false)
    }
  }

  useEffect(() => {
    fetchMods()
  }, [])

  const filteredMods = useMemo(() => {
    return mods.filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
  }, [mods, search])

  const handleToggle = async (mod: Mod) => {
      // Optimistic update
      const newState = !mod.isEnabled
      setMods(prev => prev.map(m => m.id === mod.id ? { ...m, isEnabled: newState } : m))

      await window.api.toggleMod(mod.id, newState)
      // Refresh to ensure file names are correct
      fetchMods()
  }

  const handleInstall = async () => {
    const filePath = await window.api.selectFile()
    if (!filePath) return

    setLoading(true)
    await window.api.installMod(filePath)
    await fetchMods()
  }

  return (
    <div className="h-full flex flex-col p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">My Mods</h2>
          <p className="text-slate-400">Manage your installed modifications</p>
        </div>
        <div className="flex gap-2">
            <button
                onClick={handleInstall}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-900/20"
            >
            <Plus size={16} />
            Install Mod
            </button>
            <button
                onClick={fetchMods}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors border border-white/10"
            >
            Refresh
            </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search mods..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
        />
      </div>

      {/* List */}
      <div className="flex-1 glass-panel rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
        {loading ? (
             <div className="flex items-center justify-center h-full text-slate-500">Loading mods...</div>
        ) : filteredMods.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
                <Package size={48} className="opacity-20" />
                <p>No mods found. Install some!</p>
             </div>
        ) : (
            <Virtuoso
              data={filteredMods}
              itemContent={(_, mod) => (
                <div className="flex items-center justify-between p-4 border-b border-white/5 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500">
                        <FolderOpen size={20} />
                    </div>
                    <div>
                        <h4 className="font-medium text-slate-200">{mod.name}</h4>
                        <span className="text-xs text-slate-500 font-mono">{mod.id}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <Toggle checked={mod.isEnabled} onChange={() => handleToggle(mod)} />
                  </div>
                </div>
              )}
            />
        )}
      </div>
    </div>
  )
}

export default ModList
