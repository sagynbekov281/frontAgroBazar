import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { api } from '../api/client';
import { CATEGORIES, REGIONS } from '../constants';
import type { ListingCategory, BulkPrice } from '../types';
import CustomSelect from '../components/CustomSelect';

const PLACEHOLDER_IMGS = [
  'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&q=80',
  'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=600&q=80',
  'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&q=80',
  'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&q=80',
  'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&q=80',
  'https://images.unsplash.com/photo-1452857297128-d9c29adba80b?w=600&q=80',
];

export default function ListingForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', category: 'vegetables' as ListingCategory, description: '', price: '', unit: 'кг',
    minOrder: '1', maxOrder: '', region: '', district: '', organic: false, exportReady: false,
    hasDelivery: false, inStock: true, vip: false, harvestDate: '', weight: '', selectedImages: [PLACEHOLDER_IMGS[0]],
  });
  const [bulkPrices, setBulkPrices] = useState<BulkPrice[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const upd = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!id) return;
    api.getListing(id).then(d => {
      const l = d.listing;
      setForm({ title: l.title, category: l.category, description: l.description, price: String(l.price), unit: l.unit, minOrder: String(l.minOrder), maxOrder: String(l.maxOrder || ''), region: l.region, district: l.district || '', organic: l.organic, exportReady: l.exportReady, hasDelivery: l.hasDelivery, inStock: l.inStock, vip: l.vip, harvestDate: l.harvestDate || '', weight: String(l.weight || ''), selectedImages: l.images });
      if (l.bulkPrices) setBulkPrices(l.bulkPrices);
    });
  }, [id]);

  function addBulkPrice() { setBulkPrices(p => [...p, { minQty: 0, maxQty: null, unit: form.unit, price: 0 }]); }
  function removeBulkPrice(i: number) { setBulkPrices(p => p.filter((_, idx) => idx !== i)); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const payload = { ...form, price: Number(form.price), minOrder: Number(form.minOrder), maxOrder: form.maxOrder ? Number(form.maxOrder) : undefined, weight: form.weight ? Number(form.weight) : undefined, images: form.selectedImages, bulkPrices };
      if (isEdit && id) await api.updateListing(id, payload);
      else await api.createListing(payload);
      navigate('/dashboard');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="font-bold text-2xl mb-8">{isEdit ? 'Жарыяны өзгөртүү' : 'Жаңы жарыя кошуу'}</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

        <div className="card p-5 space-y-4">
          <h2 className="font-semibold">Негизги маалымат</h2>
          <div><label className="label">Аталышы *</label><input required className="input" value={form.title} onChange={e => upd('title', e.target.value)} /></div>
          <div><label className="label">Категория *</label>
            <CustomSelect
              value={form.category}
              options={CATEGORIES.map(c => ({ value: c.value, label: `${c.emoji} ${c.labelRu} / ${c.labelKy}` }))}
              onChange={value => upd('category', value as ListingCategory)}
              placeholder="Категория"
            />
          </div>
          <div><label className="label">Сүрөттөмө *</label><textarea required rows={4} className="input" value={form.description} onChange={e => upd('description', e.target.value)} /></div>
        </div>

        <div className="card p-5 space-y-4">
          <h2 className="font-semibold">Баасы жана өлчөм</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2"><label className="label">Баасы (сом) *</label><input required type="number" min={0} className="input" value={form.price} onChange={e => upd('price', e.target.value)} /></div>
            <div><label className="label">Бирдик</label><input className="input" value={form.unit} onChange={e => upd('unit', e.target.value)} placeholder="кг, шт..." /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Мин. заказ</label><input type="number" min={0} className="input" value={form.minOrder} onChange={e => upd('minOrder', e.target.value)} /></div>
            <div><label className="label">Макс. заказ</label><input type="number" min={0} className="input" value={form.maxOrder} onChange={e => upd('maxOrder', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Салмак (кг)</label><input type="number" className="input" value={form.weight} onChange={e => upd('weight', e.target.value)} /></div>
            <div><label className="label">Жыйналган күнү</label><input type="date" className="input" value={form.harvestDate} onChange={e => upd('harvestDate', e.target.value)} /></div>
          </div>
        </div>

        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Дүң баалар</h2>
            <button type="button" onClick={addBulkPrice} className="btn btn-outline text-xs gap-1.5"><Plus size={13} /> Кошуу</button>
          </div>
          {bulkPrices.map((bp, i) => (
            <div key={i} className="flex items-center gap-2 bg-surface rounded-xl p-3">
              <div className="grid grid-cols-3 gap-2 flex-1">
                <input type="number" placeholder="мин" className="input text-sm py-2" value={bp.minQty || ''} onChange={e => setBulkPrices(p => p.map((x, xi) => xi === i ? { ...x, minQty: Number(e.target.value) } : x))} />
                <input type="number" placeholder="макс (опция)" className="input text-sm py-2" value={bp.maxQty || ''} onChange={e => setBulkPrices(p => p.map((x, xi) => xi === i ? { ...x, maxQty: e.target.value ? Number(e.target.value) : null } : x))} />
                <input type="number" placeholder="баасы" className="input text-sm py-2" value={bp.price || ''} onChange={e => setBulkPrices(p => p.map((x, xi) => xi === i ? { ...x, price: Number(e.target.value) } : x))} />
              </div>
              <button type="button" onClick={() => removeBulkPrice(i)} className="p-1.5 rounded-lg hover:bg-red-50 text-muted hover:text-red-500"><X size={14} /></button>
            </div>
          ))}
        </div>

        <div className="card p-5 space-y-4">
          <h2 className="font-semibold">Жайгашкан жери</h2>
          <div><label className="label">Регион *</label>
            <CustomSelect
              value={form.region}
              options={[{ value: '', label: 'Тандаңыз' }, ...REGIONS.map(r => ({ value: r, label: r }))]}
              onChange={value => upd('region', value)}
              placeholder="Тандаңыз"
            />
          </div>
          <div><label className="label">Район</label><input className="input" value={form.district} onChange={e => upd('district', e.target.value)} /></div>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold mb-4">Сүрөттөр</h2>
          <div className="grid grid-cols-3 gap-2">
            {PLACEHOLDER_IMGS.map(img => (
              <button type="button" key={img} onClick={() => upd('selectedImages', form.selectedImages.includes(img) ? form.selectedImages.filter(x => x !== img) : [...form.selectedImages, img])}
                className={`aspect-square rounded-xl overflow-hidden border-3 ${form.selectedImages.includes(img) ? 'border-primary-600 ring-2 ring-primary-600' : 'border-border'}`}>
                <img src={img} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <div className="card p-5 space-y-3">
          <h2 className="font-semibold">Параметрлер</h2>
          {[['organic', '🌿 Органик продукт'], ['exportReady', '✈️ Экспортко даяр'], ['hasDelivery', '🚚 Жеткирүү бар'], ['inStock', '✅ Кампада бар'], ['vip', '⭐ VIP жарыя']].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={Boolean(form[key as keyof typeof form])} onChange={e => upd(key, e.target.checked)} className="w-4 h-4 accent-primary-600" />
              {label}
            </label>
          ))}
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate('/dashboard')} className="btn btn-outline flex-1">Жокко чыгаруу</button>
          <button disabled={loading} className="btn btn-primary flex-1 py-3">{loading ? 'Сакталууда...' : isEdit ? 'Сактоо' : 'Жарыялоо'}</button>
        </div>
      </form>
    </div>
  );
}
