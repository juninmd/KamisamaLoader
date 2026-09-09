import { useRef, useState } from 'react';
import { ArrowUpRight, Download, FolderOpen, Globe, RefreshCw, Search, UploadCloud, Wrench } from 'lucide-react';
import type { Mod } from '../../shared/types';
import ModDetailsModal from '../components/ModDetailsModal';
import ProfileManager from '../components/ProfileManager';
import { DownloadsList } from '../components/DownloadsList';
import { ModGrid } from '../components/mods/ModGrid';
import { BrowseMods } from './mods/BrowseMods';
import { UpdateCenter } from './mods/UpdateCenter';
import { useLibrary } from './mods/use-library';
import { useUpdateQueue } from './mods/use-update-queue';
import { useSingleUpdate } from './mods/use-single-update';
import { formatBytes } from './mods/format-bytes';
import UpdateDialog from '../components/UpdateDialog';
type Tab = 'installed' | 'browse' | 'updates' | 'downloads';
export default function Mods() {
  const library = useLibrary();
  const queue = useUpdateQueue(library.reload);
  const single = useSingleUpdate(library.reload);
  const dragDepth = useRef(0);
  const [tab, setTab] = useState<Tab>('installed');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<Mod | null>(null);
  const [dragging, setDragging] = useState(false);
  const pending = library.mods.filter(mod => mod.hasUpdate).length;
  const filtered = library.mods.filter(mod => `${mod.name} ${mod.author}`.toLowerCase().includes(search.toLowerCase())
    && (filter === 'all' || filter === 'enabled' && mod.isEnabled || filter === 'disabled' && !mod.isEnabled || filter === 'updates' && mod.hasUpdate));
  const install = async (mod: Mod) => { if (await library.install(mod)) setTab('downloads'); };
  const tabs: [Tab, string][] = [['installed', 'Installed'], ['browse', 'Browse Online'], ['updates', `Atualizações${pending ? ` (${pending})` : ''}`], ['downloads', 'Downloads']];
  return <div className="h-full flex flex-col min-w-0 relative" onDragEnter={event => {
    event.preventDefault(); dragDepth.current++; if (event.dataTransfer.items?.length) setDragging(true);
  }} onDragOver={event => { event.preventDefault(); event.stopPropagation(); }} onDragLeave={event => {
    event.preventDefault(); dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDragging(false);
  }} onDrop={event => { event.preventDefault(); dragDepth.current = 0; setDragging(false); if (event.dataTransfer.files.length) void library.drop(event.dataTransfer.files); }}>
    {dragging && <div className="absolute inset-0 z-50 bg-slate-950/95 border-2 border-dashed border-emerald-400 rounded-2xl flex flex-col items-center justify-center pointer-events-none"><UploadCloud size={64} className="text-emerald-300" /><h2 className="text-2xl font-bold mt-4">Drop to Install</h2><p className="text-slate-300 mt-2">Solte seus arquivos. Mods existentes serão atualizados de forma incremental.</p></div>}
    <header className="flex flex-wrap justify-between gap-4 mb-5">
      <div><p className="text-xs uppercase tracking-widest text-slate-400">Kamisama / Mod Library</p><h1 className="text-3xl font-bold mt-2">Sua coleção, no seu ritmo.</h1><p className="text-slate-400 mt-2 text-sm">Instale, organize e mantenha seus mods em dia.</p></div>
      <button onClick={() => void window.electronAPI.openModsDirectory()} className="self-center flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 text-sm hover:bg-white/10"><FolderOpen size={16} />Abrir pasta de mods</button>
    </header>
    <nav aria-label="Biblioteca de mods" className="flex flex-wrap gap-1 p-1 bg-black/30 rounded-xl border border-white/10 mb-5 shrink-0">
      {tabs.map(([value, label]) => <button key={value} aria-current={tab === value ? 'page' : undefined} onClick={() => { setTab(value); if (value === 'installed') void library.reload(); }} className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${tab === value ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>{label}{value === 'updates' && queue.running && <span className="ml-2 text-emerald-300">· Em andamento</span>}</button>)}
    </nav>
    {(tab === 'installed' || tab === 'browse') && <div><div className="flex flex-wrap gap-3 mb-4 items-center">
      <div className="relative flex-1 min-w-48"><Search size={17} className="absolute left-3 top-3 text-slate-400" /><input aria-label="Buscar mods" value={search} onChange={event => setSearch(event.target.value)} placeholder={tab === 'installed' ? 'Search installed mods...' : 'Search online mods...'} className="w-full pl-10 pr-4 py-2.5 bg-black/30 border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none" /></div>
      {tab === 'installed' && <>
        <select aria-label="Filtrar biblioteca" value={filter} onChange={event => setFilter(event.target.value)} className="bg-slate-900 border border-white/15 rounded-xl px-3 py-2.5"><option value="all">All Mods</option><option value="enabled">Enabled Only</option><option value="disabled">Disabled Only</option><option value="updates">Updates Available</option></select>
        <ProfileManager onProfileLoaded={library.reload} />
        <button title="Check Updates" disabled={library.checking || queue.running} onClick={() => void library.check()} className="flex gap-2 items-center rounded-xl border border-white/15 px-3 py-2.5 disabled:opacity-40"><RefreshCw size={16} className={library.checking ? 'animate-spin' : ''} />{library.checking ? 'Checking...' : 'Check Updates'}</button>
        <button title="Repair Mods" disabled={library.repairing || queue.running} onClick={() => void library.repair()} className="rounded-xl border border-white/15 p-3 disabled:opacity-40"><Wrench size={16} /></button>
        <button title="GameBanana" onClick={() => void window.electronAPI.openModBrowser()} className="rounded-xl border border-white/15 p-3"><Globe size={16} /></button>
      </>}
    </div></div>}
    <main className="flex-1 overflow-auto min-h-0 pb-4">
      {tab === 'installed' && <>
        <div className="flex flex-wrap items-center gap-4 justify-between bg-emerald-950/40 border border-emerald-400/15 rounded-2xl p-5 mb-5">
          <div><h2 className="font-semibold text-emerald-100">{pending ? `${pending} mods prontos para atualizar` : 'Sua biblioteca, sem reinstalações desnecessárias'}</h2><p className="text-sm text-slate-400 mt-1">Arquivos iguais são preservados. Você escolhe o que atualizar.</p></div>
          <button onClick={() => setTab('updates')} className="flex items-center gap-2 text-emerald-200 font-medium px-3 py-2 rounded-lg hover:bg-emerald-400/10">{pending ? <><Download size={16} />Update All</> : <>Central de atualizações<ArrowUpRight size={16} /></>}</button>
        </div>
        {library.error ? <div role="alert" className="p-6 text-red-300">{library.error}<button onClick={() => void library.reload()} className="ml-3 underline">Tentar novamente</button></div>
          : <><p className="text-xs text-slate-400 mb-3">{filtered.length} mods <span>{formatBytes(library.mods.reduce((sum, mod) => sum + (mod.fileSize || 0), 0))}</span> · Arraste para mudar a prioridade ou solte arquivos para instalar.</p><ModGrid mods={filtered} installedMods={library.mods} loading={library.loading} onSelect={setSelected} onToggle={library.toggle} onUninstall={library.uninstall} onPriorityChange={library.priority} onReorder={library.reorder} onUpdate={single.open} updatingMods={[...queue.items.filter(item => item.state === 'updating').map(item => item.mod.id), ...(single.updating && single.mod ? [single.mod.id] : [])]} /></>}
      </>}
      {tab === 'browse' && <BrowseMods search={search} installed={library.mods} install={install} select={setSelected} toggle={library.toggle} />}
      {tab === 'downloads' && <DownloadsList />}
      {tab === 'updates' && <UpdateCenter mods={library.mods} checking={library.checking} check={library.check} queue={queue} />}
    </main>
    {selected && <ModDetailsModal mod={selected} isOpen onClose={() => setSelected(null)} onInstall={install} />}
    {single.mod && <UpdateDialog mod={single.mod} changelog={single.changelog} isUpdating={single.updating} onUpdate={single.update} onClose={single.close} />}
  </div>;
}
