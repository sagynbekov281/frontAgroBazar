import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { api } from '../api/client';
import type { MarketPrice } from '../types';

function ChangeCell({ value }: { value: number }) {
  if (value > 0) return <span className="flex items-center gap-0.5 text-green-600 font-semibold text-sm"><TrendingUp size={13} /> +{value}%</span>;
  if (value < 0) return <span className="flex items-center gap-0.5 text-red-500 font-semibold text-sm"><TrendingDown size={13} /> {value}%</span>;
  return <span className="flex items-center gap-0.5 text-muted text-sm"><Minus size={13} /> 0%</span>;
}

const CATEGORIES_PRICE = [
  { key: 'Жашылча', label: 'Жашылча' },
  { key: 'Мал', label: 'Мал' },
  { key: 'Дан', label: 'Дан' },
  { key: 'Башкалар', label: 'Башкалар' },
];

export default function PriceCenter() {
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Жашылча');

  useEffect(() => {
    api.getPrices().then(d => setPrices(d.prices || [])).finally(() => setLoading(false));
  }, []);

  const filtered = activeTab ? prices.filter(p => p.category === activeTab) : prices;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="font-bold text-2xl flex items-center gap-2"><BarChart3 size={26} className="text-primary-600" /> Баалар борбору</h1>
        <p className="text-muted text-sm mt-1">Кыргызстандагы айыл чарба өнүмдөрүнүн актуалдуу рыноктук баалары</p>
      </div>

      {/* summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {prices.slice(0, 4).map(p => (
          <div key={p.id} className="card p-4">
            <div className="text-xs text-muted mb-1">{p.name}</div>
            <div className="font-bold text-lg text-primary-700">{p.avgPrice} <span className="text-xs font-normal text-muted">сом/{p.unit}</span></div>
            <ChangeCell value={p.weekChange} />
          </div>
        ))}
      </div>

      {/* tabs */}
      <div className="flex gap-1 mb-5 border-b border-border overflow-x-auto">
        {CATEGORIES_PRICE.map(c => (
          <button key={c.key} onClick={() => setActiveTab(c.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition ${activeTab === c.key ? 'border-primary-600 text-primary-700' : 'border-transparent text-muted hover:text-text'}`}>
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center text-muted">Жүктөлүүдө...</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface text-muted text-xs border-b border-border">
                <th className="px-4 py-3 text-left font-semibold">Товар</th>
                <th className="px-4 py-3 text-right font-semibold">Мин</th>
                <th className="px-4 py-3 text-right font-semibold">Орточо</th>
                <th className="px-4 py-3 text-right font-semibold">Макс</th>
                <th className="px-4 py-3 text-right font-semibold">Апталык</th>
                <th className="px-4 py-3 text-right font-semibold hidden md:table-cell">Айлык</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-surface transition">
                  <td className="px-4 py-3 font-medium">{p.name} <span className="text-muted text-xs">/ {p.unit}</span></td>
                  <td className="px-4 py-3 text-right text-muted">{p.minPrice}</td>
                  <td className="px-4 py-3 text-right font-bold text-primary-700">{p.avgPrice}</td>
                  <td className="px-4 py-3 text-right text-muted">{p.maxPrice}</td>
                  <td className="px-4 py-3 text-right"><ChangeCell value={p.weekChange} /></td>
                  <td className="px-4 py-3 text-right hidden md:table-cell"><ChangeCell value={p.monthChange} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 text-xs text-muted text-right">
        Маалымат актуалдуулугу: {prices[0] ? new Date(prices[0].updatedAt).toLocaleDateString('ru-RU', { dateStyle: 'long' }) : '—'}
      </div>
    </div>
  );
}
