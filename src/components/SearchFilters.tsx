import { CATEGORIES, REGIONS } from '../constants';

interface Filters { category: string; region: string; organic: string; exportReady: string; hasDelivery: string; vip: string; sort: string; }
interface Props { filters: Filters; onChange(f: Partial<Filters>): void; }

export default function SearchFilters({ filters, onChange }: Props) {
  return (
    <div className="card p-4 space-y-4">
      <h3 className="font-semibold text-sm">Фильтрлер</h3>

      <div>
        <label className="label">Категория</label>
        <select className="input text-sm" value={filters.category} onChange={e => onChange({ category: e.target.value })}>
          <option value="">Баары</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.labelRu}</option>)}
        </select>
      </div>

      <div>
        <label className="label">Регион</label>
        <select className="input text-sm" value={filters.region} onChange={e => onChange({ region: e.target.value })}>
          <option value="">Баары</option>
          {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div>
        <label className="label">Сорттоо</label>
        <select className="input text-sm" value={filters.sort} onChange={e => onChange({ sort: e.target.value })}>
          <option value="">Жаңы</option>
          <option value="price_asc">Баасы: төмөн</option>
          <option value="price_desc">Баасы: жогору</option>
          <option value="popular">Популярдуу</option>
          <option value="vip">VIP</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="label">Параметрлер</label>
        {[
          { key: 'organic', label: '🌿 Органик' },
          { key: 'exportReady', label: '✈️ Экспортко даяр' },
          { key: 'hasDelivery', label: '🚚 Жеткирүү бар' },
          { key: 'vip', label: '⭐ VIP жарыялар' },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={filters[key as keyof Filters] === 'true'}
              onChange={e => onChange({ [key]: e.target.checked ? 'true' : '' })}
              className="w-4 h-4 accent-primary-600"
            />
            {label}
          </label>
        ))}
      </div>

      <button onClick={() => onChange({ category: '', region: '', organic: '', exportReady: '', hasDelivery: '', vip: '', sort: '' })}
        className="w-full btn btn-outline text-sm">
        Тазалоо
      </button>
    </div>
  );
}
