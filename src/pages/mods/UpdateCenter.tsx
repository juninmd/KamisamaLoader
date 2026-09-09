import { useState } from 'react';
import { ArrowRight, CheckCircle2, Download, RefreshCw, ShieldCheck } from 'lucide-react';
import type { LocalMod } from '../../../shared/types';
import type { useUpdateQueue, UpdateState } from './use-update-queue';

interface Props {
  mods: LocalMod[];
  checking: boolean;
  check: () => Promise<void>;
  queue: ReturnType<typeof useUpdateQueue>;
}
const labels: Record<UpdateState, string> = {
  queued: 'Na fila', updating: 'Baixando e aplicando…', completed: 'Atualizado', failed: 'Falhou · tente novamente', cancelled: 'Adiado',
};
export function UpdateCenter({ mods, checking, check, queue }: Props) {
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const pending = mods.filter(mod => mod.hasUpdate);
  const selected = pending.filter(mod => !excluded.has(mod.id));
  const done = queue.items.filter(item => item.state === 'completed').length;
  const failed = queue.items.filter(item => item.state === 'failed');
  const rows = queue.running ? queue.items.map(item => item.mod) : pending;
  const toggle = (id: string) => setExcluded(previous => {
    const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next;
  });
  return <section aria-labelledby="update-title" className="max-w-5xl mx-auto space-y-6 pb-8">
    <div className="rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-950/70 to-slate-950/80 p-6 sm:p-8">
      <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold uppercase tracking-widest"><ShieldCheck size={16} /> Atualização incremental</div>
      <h2 id="update-title" className="text-3xl font-bold mt-3 text-white">Só o que mudou.</h2>
      <p className="text-slate-300 mt-3 max-w-2xl leading-relaxed">Escolha os mods que deseja atualizar. Arquivos idênticos permanecem no lugar; novos e modificados são aplicados ao jogo.</p>
      <p className="text-sm text-slate-400 mt-2">O pacote do mod é baixado por inteiro. A instalação compara os arquivos e preserva sua ordem e ativação.</p>
      <div className="flex flex-wrap gap-8 mt-6 border-t border-white/10 pt-5">
        <div><strong className="text-2xl text-white">{pending.length}</strong><p className="text-sm text-slate-400">com atualização</p></div>
        <div><strong className="text-2xl text-white">{mods.filter(mod => mod.gameBananaId && !mod.hasUpdate).length}</strong><p className="text-sm text-slate-400">sem atualização sinalizada</p></div>
        <div><strong className="text-2xl text-white">{mods.filter(mod => !mod.gameBananaId).length}</strong><p className="text-sm text-slate-400">locais · atualização manual</p></div>
      </div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="font-semibold text-lg text-white">Atualizações disponíveis</h3><p className="text-sm text-slate-400">Revise a seleção antes de começar.</p></div>
      <button disabled={checking || queue.running} onClick={() => void check()} className="flex gap-2 items-center px-4 py-2.5 rounded-xl border border-white/15 hover:bg-white/10 disabled:opacity-50">
        <RefreshCw size={16} className={checking ? 'animate-spin' : ''} />{checking ? 'Verificando…' : 'Verificar atualizações'}
      </button>
    </div>
    {queue.items.length > 0 && <div role="status" aria-live="polite" className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2">
      <div className="flex justify-between gap-4"><span>{queue.running ? 'Atualização em andamento' : 'Resultado do lote'}</span><span>{done} de {queue.items.length} atualizados</span></div>
      <progress aria-label="Progresso do lote" value={queue.items.filter(item => !['queued', 'updating'].includes(item.state)).length} max={queue.items.length} className="w-full h-2 accent-emerald-400" />
      {!queue.running && <ul className="text-sm space-y-3">{queue.items.map(item => <li key={item.mod.id} className={item.state === 'failed' ? 'text-red-300' : 'text-slate-300'}>
        {item.mod.name} — {labels[item.state]}
        {item.summary && <p className="text-xs text-slate-400 mt-1">{item.summary.unchanged} preservados · {item.summary.changed} alterados · {item.summary.added} novos · {item.summary.removed} removidos</p>}
        {item.error && <p className="text-xs mt-1 break-words">{item.error}</p>}
      </li>)}</ul>}
      {failed.length > 0 && !queue.running && <button className="text-amber-300 underline" onClick={() => void queue.start(failed.map(item => item.mod))}>Tentar novamente os que falharam</button>}
    </div>}
    {rows.length ? <div className="rounded-2xl border border-white/10 overflow-hidden bg-slate-950/50">
      <label className="flex items-center gap-3 px-5 py-3 border-b border-white/10 text-sm text-slate-300">
        <input type="checkbox" disabled={queue.running} checked={selected.length === pending.length && pending.length > 0}
          onChange={() => setExcluded(selected.length === pending.length ? new Set(pending.map(mod => mod.id)) : new Set())} className="accent-emerald-400 h-4 w-4" />
        Selecionar todos ({pending.length})
      </label>
      {rows.map(mod => <div key={mod.id} className="flex items-center gap-4 px-5 py-4 border-b last:border-0 border-white/5">
        <input aria-label={`Atualizar ${mod.name}`} type="checkbox" disabled={queue.running} checked={!excluded.has(mod.id)} onChange={() => toggle(mod.id)} className="accent-emerald-400 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1"><p className="font-medium text-white break-words">{mod.name}</p><div className="text-sm text-slate-400 flex flex-wrap gap-2 items-center mt-1"><span>{mod.version}</span><ArrowRight size={12} /><span className="text-emerald-300">{mod.latestVersion || 'Nova versão'}</span><span>· {mod.isEnabled ? 'Ativo' : 'Desativado'}</span></div></div>
        {queue.running && <span className="text-xs text-emerald-200 text-right">{labels[queue.items.find(item => item.mod.id === mod.id)!.state]}</span>}
      </div>)}
    </div> : <div className="text-center py-10 rounded-2xl border border-dashed border-white/15"><CheckCircle2 className="mx-auto text-emerald-300 mb-3" size={32} /><h3 className="font-semibold">Nenhuma atualização pendente</h3><p className="text-sm text-slate-400 mt-2">Verifique para consultar as versões disponíveis no GameBanana.</p></div>}
    <div className="flex flex-wrap gap-4 justify-between items-center sticky bottom-0 p-4 bg-slate-950/95 border border-white/10 rounded-xl backdrop-blur-xl">
      <p className="text-sm text-slate-300">{queue.running ? 'Você pode parar a fila. O mod atual será concluído.' : `${selected.length} mods selecionados`}</p>
      {queue.running ? <button onClick={queue.stop} className="px-5 py-3 rounded-xl border border-white/20 hover:bg-white/10">Parar após o mod atual</button>
        : <button disabled={!selected.length || checking} onClick={() => void queue.start(selected)} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold disabled:opacity-40 disabled:cursor-not-allowed"><Download size={18} />Atualizar selecionados ({selected.length})</button>}
    </div>
  </section>;
}
