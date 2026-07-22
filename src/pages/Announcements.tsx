import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MapPin, Clock, ChevronRight } from 'lucide-react';
import { api } from '../api/client';
import type { Announcement } from '../types';
import { useAuth } from '../context/AuthContext';
import { CATEGORIES, REGIONS, catLabel } from '../constants';
import type { ListingCategory } from '../types';
import CustomSelect from '../components/CustomSelect';

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'vegetables' as ListingCategory, qty: '', unit: 'кг', region: '', description: '', deadline: '' });
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.getAnnouncements().then(d => setAnnouncements(d.announcements || [])).finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    setSaving(true);
    try {
      await api.createAnnouncement({ ...form, qty: Number(form.qty) });
      const d = await api.getAnnouncements();
      setAnnouncements(d.announcements || []);
      setShowForm(false);
      setForm({ title: '', category: 'vegetables', qty: '', unit: 'кг', region: '', description: '', deadline: '' });
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-bold text-2xl">Объявления о покупке</h1>
          <p className="text-muted text-sm mt-0.5">Напишите, что вам нужно, и фермеры сами предложат варианты</p>
        </div>
        <button onClick={() => user ? setShowForm(true) : navigate('/login')} className="btn btn-accent gap-2">
          <Plus size={18} /> Создать объявление
        </button>
      </div>

      {/* form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-4">Новое объявление о покупке</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div><label className="label">Название *</label><input required className="input text-sm" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Например: нужно 100 тонн картофеля" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Категория</label>
                  <CustomSelect
                    value={form.category}
                    options={[
                      ...CATEGORIES.map(c => ({ value: c.value, label: `${c.emoji} ${c.labelRu}` })),
                    ]}
                    onChange={value => setForm(f => ({ ...f, category: value as ListingCategory }))}
                    placeholder="Категория">
                  </CustomSelect>
                </div>
                <div>
                  <label className="label">Регион</label>
                  <CustomSelect
                    value={form.region}
                    options={[
                      { value: '', label: 'Все' },
                      ...REGIONS.map(r => ({ value: r, label: r })),
                    ]}
                    onChange={value => setForm(f => ({ ...f, region: value }))}
                    placeholder="Все">
                  </CustomSelect>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Количество *</label><input required type="number" className="input text-sm" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} /></div>
                <div><label className="label">Единица измерения</label><input className="input text-sm" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} /></div>
              </div>
              <div><label className="label">Описание</label><textarea rows={3} className="input text-sm" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div><label className="label">Крайний срок</label><input type="date" className="input text-sm" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} /></div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-outline flex-1">Отмена</button>
                <button disabled={saving} className="btn btn-primary flex-1">{saving ? 'Сохраняется...' : 'Опубликовать'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? <div className="py-20 text-center text-muted">Загрузка...</div> : (
        <div className="space-y-3">
          {announcements.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-4xl mb-3">📢</div>
              <div className="font-semibold">Нет объявлений</div>
              <div className="text-sm text-muted mt-1">Создайте объявление первым</div>
            </div>
          ) : announcements.map(a => (
            <div key={a.id} className="card p-5 hover:shadow-md transition flex items-center gap-4">
              <div className="text-3xl">{CATEGORIES.find(c => c.value === a.category)?.emoji || '📦'}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-semibold">{a.title}</h3>
                  <span className={`badge ${a.status === 'open' ? 'badge-green' : 'badge-gray'}`}>{a.status === 'open' ? 'Открыто' : 'Закрыто'}</span>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-muted">
                  <span className="badge badge-gray">{catLabel(a.category)}</span>
                  <span className="flex items-center gap-1"><MapPin size={13} /> {a.region || 'Все регионы'}</span>
                  <span className="font-medium text-primary-700">{a.qty.toLocaleString('ru-RU')} {a.unit}</span>
                  {a.deadline && <span className="flex items-center gap-1"><Clock size={13} /> {new Date(a.deadline).toLocaleDateString('ru-RU')}</span>}
                </div>
                {a.description && <p className="text-sm text-muted mt-1 truncate">{a.description}</p>}
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm font-semibold text-primary-700">{a.offerCount} предложений</div>
                <div className="text-xs text-muted">{a.authorName}</div>
                <button className="btn btn-outline text-xs px-3 py-1.5 mt-2 gap-1">Сделать предложение <ChevronRight size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
