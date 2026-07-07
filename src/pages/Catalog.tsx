import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import { api } from '../api/client';
import type { Listing } from '../types';
import ListingCard from '../components/ListingCard';
import SearchFilters from '../components/SearchFilters';

export default function Catalog() {
  const [params, setParams] = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(params.get('search') || '');
  const [showFilters, setShowFilters] = useState(false);

  const filters = {
    category: params.get('category') || '',
    region: params.get('region') || '',
    organic: params.get('organic') || '',
    exportReady: params.get('exportReady') || '',
    hasDelivery: params.get('hasDelivery') || '',
    vip: params.get('vip') || '',
    sort: params.get('sort') || '',
  };

  function setFilters(f: Partial<typeof filters>) {
    const next = { ...filters, ...f };
    const p: Record<string, string> = {};
    Object.entries(next).forEach(([k, v]) => { if (v) p[k] = v; });
    if (search) p.search = search;
    setParams(p);
  }

  useEffect(() => {
    setLoading(true);
    const p: Record<string, string> = {};
    params.forEach((v, k) => { p[k] = v; });
    api.getListings(p).then(d => setListings(d.listings || [])).catch(() => {}).finally(() => setLoading(false));
  }, [params.toString()]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-2 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') setFilters({ category: filters.category }) }}
            placeholder="Товар, фермер, аймак..." className="input pl-10 text-sm" />
        </div>
        <button onClick={() => { const p: Record<string, string> = {}; Object.entries(filters).forEach(([k, v]) => { if (v) p[k] = v; }); if (search) p.search = search; setParams(p); }}
          className="btn btn-primary px-5">Издөө</button>
        <button onClick={() => setShowFilters(!showFilters)} className="btn btn-outline md:hidden gap-1.5">
          <SlidersHorizontal size={16} /> Фильтр
        </button>
      </div>

      <div className="grid md:grid-cols-[220px_1fr] gap-6">
        <div className={`${showFilters ? 'block' : 'hidden'} md:block`}>
          <SearchFilters filters={filters} onChange={setFilters} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted">{loading ? 'Жүктөлүүдө...' : `${listings.length} жарыя табылды`}</span>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => <div key={i} className="card aspect-[3/4] animate-pulse bg-slate-100" />)}
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-20 text-muted">
              <div className="text-5xl mb-4">🔍</div>
              <div className="font-semibold">Жарыялар табылган жок</div>
              <div className="text-sm mt-1">Башка параметрлер менен издеп көрүңүз</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {listings.map(l => <ListingCard key={l.id} l={l} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
