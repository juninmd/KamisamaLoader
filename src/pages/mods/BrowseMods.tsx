import { useCallback, useEffect, useRef, useState } from 'react';
import type { LocalMod, Mod } from '../../../shared/types';
import CategorySidebar, { type Category } from '../../components/CategorySidebar';
import FilterBar, { type FilterState } from '../../components/FilterBar';
import { ModGrid } from '../../components/mods/ModGrid';

interface Props {
  search: string;
  installed: LocalMod[];
  install: (mod: Mod) => void;
  select: (mod: Mod) => void;
  toggle: (id: string) => void;
}
export function BrowseMods({ search, installed, install, select, toggle }: Props) {
  const [mods, setMods] = useState<Mod[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState<FilterState>({ categories: [], sortBy: 'date', order: 'desc', dateRange: 'all', nsfw: false, zeroSpark: false, colorZ: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const request = useRef(0);
  const sentinel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let active = true;
    window.electronAPI.fetchCategories().then(result => {
      if (active) setCategories(result.map((item: { _idRow?: number; _sName?: string; _nItemCount?: number; id?: number; name?: string }, index: number) => ({
        id: item._idRow ?? item.id ?? index, name: item._sName || item.name || 'Unknown', count: item._nItemCount || 0,
      })));
    }).catch(error => console.error('[Categories] Failed to load', error));
    return () => { active = false; };
  }, []);
  const fetchPage = useCallback(async (next: number) => {
    const id = ++request.current;
    setLoading(true);
    setError('');
    try {
      const result = await window.electronAPI.searchBySection({ page: next, perPage: 20, gameId: 21179,
        search, sort: filters.sortBy, order: filters.order, dateRange: filters.dateRange,
        categoryId: categories.find(category => category.name === filters.categories[0])?.id });
      if (id !== request.current) return;
      const filtered = result.filter(item => (filters.nsfw || !item.isNsfw)
        && (!filters.zeroSpark || `${item.name} ${item.description}`.toLowerCase().includes('zerospark'))
        && (!filters.colorZ || `${item.name} ${item.description}`.toLowerCase().includes('colorz')));
      setMods(previous => next === 1 ? filtered : [...previous, ...filtered]);
      setPage(next); setHasMore(result.length === 20);
    } catch { if (id === request.current) setError('Não foi possível acessar o catálogo. Tente novamente.'); }
    finally { if (id === request.current) setLoading(false); }
  }, [search, filters, categories]);
  const invalidate = useCallback(() => { request.current++; }, []);
  useEffect(() => {
    const timer = setTimeout(() => { void fetchPage(1); }, 300);
    return () => { clearTimeout(timer); invalidate(); };
  }, [fetchPage, invalidate]);
  useEffect(() => {
    if (!sentinel.current || !hasMore || loading) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) void fetchPage(page + 1);
    });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [fetchPage, hasMore, loading, page]);
  return <div className="flex flex-col lg:flex-row gap-4 min-w-0">
    <CategorySidebar categories={categories} selectedCategories={filters.categories}
      onCategorySelect={category => setFilters(previous => ({ ...previous,
        categories: previous.categories.includes(category) ? [] : [category] }))} />
    <div className="flex-1 min-w-0">
      <button title="Refresh Online Mods" onClick={() => void fetchPage(1)} className="mb-3 text-sm text-emerald-200">Atualizar catálogo</button>
      <FilterBar availableCategories={categories} activeFilters={filters} onFilterChange={setFilters} />
      {error && <p role="alert" className="p-4 text-red-300">{error} <button onClick={() => void fetchPage(page)}>Tentar novamente</button></p>}
      <ModGrid mods={mods} installedMods={installed} loading={loading && !mods.length} onInstall={install} onSelect={select} onToggle={toggle} />
      {hasMore && <button ref={sentinel} disabled={loading} onClick={() => void fetchPage(page + 1)} className="block mx-auto my-6 px-6 py-3 rounded-xl bg-white/10 disabled:opacity-50">
        {loading ? 'Carregando…' : 'Carregar mais mods'}
      </button>}
    </div>
  </div>;
}
