import { CATEGORIES, REGIONS } from '../constants';
import CustomSelect from './CustomSelect';

interface Filters { category: string; region: string; organic: string; exportReady: string; hasDelivery: string; vip: string; sort: string; }
interface Props { filters: Filters; onChange(f: Partial<Filters>): void; }

export default function SearchFilters({ filters, onChange }: Props) {
  const categoryOptions = [
    { value: '', label: 'Баары' },
    ...CATEGORIES.map(c => ({ value: c.value, label: `${c.emoji} ${c.labelRu}` })),
  ];

  const regionOptions = [
    { value: '', label: 'Баары' },
    ...REGIONS.map(r => ({ value: r, label: r })),
  ];

  const sortOptions = [
    { value: '', label: 'Жаңы' },
    { value: 'price_asc', label: 'Баасы: төмөн' },
    { value: 'price_desc', label: 'Баасы: жогору' },
    { value: 'popular', label: 'Популярдуу' },
    { value: 'vip', label: 'VIP' },
  ];

  return (
    <div className="card p-4 space-y-4">
      <h3 className="font-semibold text-sm">Фильтрлер</h3>

      <div>
        <label className="label">Категория</label>
        <CustomSelect
          value={filters.category}
          options={categoryOptions}
          onChange={value => onChange({ category: value })}
          placeholder="Баары"
        />
      </div>

      <div>
        <label className="label">Регион</label>
        <CustomSelect
          value={filters.region}
          options={regionOptions}
          onChange={value => onChange({ region: value })}
          placeholder="Баары"
        />
      </div>

      <div>
        <label className="label">Сорттоо</label>
        <CustomSelect
          value={filters.sort}
          options={sortOptions}
          onChange={value => onChange({ sort: value })}
          placeholder="Жаңы"
        />
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
