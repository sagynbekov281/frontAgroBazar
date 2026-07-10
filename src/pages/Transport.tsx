import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MapPin, Package, Phone } from 'lucide-react';
import { api } from '../api/client';
import type { TransportListing } from '../types';
import { useAuth } from '../context/AuthContext';
import { REGIONS, TRANSPORT_TYPES } from '../constants';
import CustomSelect from '../components/CustomSelect';

export default function Transport() {
  const [list, setList] = useState<TransportListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterRegion, setFilterRegion] = useState('');
  const [filterType, setFilterType] = useState('');
  const [form, setForm] = useState({ type: 'truck', capacity: '', route: '', availableDates: '', region: '', price: '' });
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const upd = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    const p: Record<string, string> = {};
    if (filterRegion) p.region = filterRegion;
    if (filterType) p.type = filterType;
    api.getTransport(p).then(d => setList(d.transports || [])).finally(() => setLoading(false));
  }, [filterRegion, filterType]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    setSaving(true);
    try {
      await api.createTransport({ ...form, price: form.price ? Number(form.price) : undefined });
      const d = await api.getTransport({});
      setList(d.transports || []);
      setShowForm(false);
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  }

  const ICONS: Record<string, string> = { truck: '🚛', kamaz: '🚚', gazelle: '🚐', refrigerator: '❄️', tractor: '🚜' };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-bold text-2xl">Транспорт</h1>
          <p className="text-muted text-sm mt-0.5">Жүк ташуу үчүн унаа тап же өз унааңды жайгаштыр</p>
        </div>
        <button onClick={() => user ? setShowForm(true) : navigate('/login')} className="btn btn-primary gap-2">
          <Plus size={18} /> Унаа кошуу
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="w-auto min-w-[220px]">
          <CustomSelect
            value={filterRegion}
            options={[{ value: '', label: 'Бардык аймак' }, ...REGIONS.map(r => ({ value: r, label: r }))]}
            onChange={value => setFilterRegion(value)}
            placeholder="Бардык аймак"
          />
        </div>
        <div className="w-auto min-w-[220px]">
          <CustomSelect
            value={filterType}
            options={[{ value: '', label: 'Бардык унаа' }, ...Object.entries(TRANSPORT_TYPES).map(([v, l]) => ({ value: v, label: l }))]}
            onChange={value => setFilterType(value)}
            placeholder="Бардык унаа"
          />
        </div>
      </div>

      {loading ? <div className="py-20 text-center text-muted">Жүктөлүүдө...</div> : (
        list.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-3">🚛</div>
            <div className="font-semibold">Транспорт жок</div>
            <div className="text-sm text-muted mt-1">Биринчи болуп унааңызды кошуңуз</div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {list.map(t => (
              <div key={t.id} className="card p-5 hover:shadow-md transition">
                <div className="flex items-start gap-3">
                  <div className="text-4xl">{ICONS[t.type] || '🚛'}</div>
                  <div className="flex-1">
                    <div className="font-semibold text-lg">{TRANSPORT_TYPES[t.type]}</div>
                    <div className="flex flex-wrap gap-3 text-sm text-muted mt-1">
                      <span className="flex items-center gap-1"><Package size={13} /> {t.capacity}</span>
                      <span className="flex items-center gap-1"><MapPin size={13} /> {t.region}</span>
                    </div>
                    <div className="text-sm mt-2"><span className="font-medium">Маршрут:</span> {t.route}</div>
                    <div className="text-sm"><span className="font-medium">Бош күндөр:</span> {t.availableDates}</div>
                    {t.price && <div className="text-primary-700 font-bold mt-2">{t.price.toLocaleString('ru-RU')} сом</div>}
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-sm font-medium">{t.ownerName}</span>
                      <a href={`tel:${t.ownerPhone}`} className="btn btn-outline text-xs gap-1 px-3 py-1.5">
                        <Phone size={13} /> {t.ownerPhone}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-4">Унаа кошуу</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div><label className="label">Унаа түрү</label>
                <CustomSelect
                  value={form.type}
                  options={Object.entries(TRANSPORT_TYPES).map(([v, l]) => ({ value: v, label: `${ICONS[v]} ${l}` }))}
                  onChange={value => upd('type', value)}
                  placeholder="Унаа түрү"
                />
              </div>
              <div><label className="label">Жүк көлөмү</label><input required className="input text-sm" placeholder="мис: 20 тонна" value={form.capacity} onChange={e => upd('capacity', e.target.value)} /></div>
              <div><label className="label">Маршрут</label><input required className="input text-sm" placeholder="мис: Ош — Бишкек" value={form.route} onChange={e => upd('route', e.target.value)} /></div>
              <div><label className="label">Бош күндөр</label><input required className="input text-sm" placeholder="мис: Дүйшөмбүдөн — Жумага" value={form.availableDates} onChange={e => upd('availableDates', e.target.value)} /></div>
              <div><label className="label">Аймак</label>
                <CustomSelect
                  value={form.region}
                  options={[{ value: '', label: 'Тандаңыз' }, ...REGIONS.map(r => ({ value: r, label: r }))]}
                  onChange={value => upd('region', value)}
                  placeholder="Тандаңыз"
                />
              </div>
              <div><label className="label">Баасы (сом, кааласа)</label><input type="number" className="input text-sm" value={form.price} onChange={e => upd('price', e.target.value)} /></div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-outline flex-1">Жокко чыгаруу</button>
                <button disabled={saving} className="btn btn-primary flex-1">{saving ? 'Сакталууда...' : 'Кошуу'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
