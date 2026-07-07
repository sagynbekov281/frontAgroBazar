import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Package, ShoppingBag, Megaphone, BarChart2, BadgeCheck } from 'lucide-react';
import { api } from '../api/client';
import type { Listing, Order, Announcement } from '../types';
import { useAuth } from '../context/AuthContext';
import { ORDER_STATUS } from '../constants';

type Tab = 'listings' | 'orders' | 'announcements' | 'stats';

export default function Dashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('listings');
  const [listings, setListings] = useState<Listing[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const isFarmer = user?.role === 'farmer' || user?.role === 'cooperative' || user?.role === 'company';

  function load() {
    setLoading(true);
    Promise.all([
      isFarmer ? api.myListings() : Promise.resolve({ listings: [] }),
      isFarmer ? api.sellerOrders() : api.myOrders(),
      api.myAnnouncements(),
    ]).then(([l, o, a]) => {
      setListings(l.listings || []);
      setOrders(o.orders || []);
      setAnnouncements(a.announcements || []);
    }).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string) {
    if (!confirm('Жоюуну тастыктайсызбы?')) return;
    await api.deleteListing(id);
    load();
  }

  const tabs = [
    ...(isFarmer ? [{ key: 'listings' as Tab, label: 'Жарыяларым', icon: Package, count: listings.length }] : []),
    { key: 'orders' as Tab, label: 'Заказдар', icon: ShoppingBag, count: orders.length },
    { key: 'announcements' as Tab, label: 'Жарыяларым (сатып алуу)', icon: Megaphone, count: announcements.length },
    { key: 'stats' as Tab, label: 'Статистика', icon: BarChart2 },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-bold text-2xl flex items-center gap-2">
            {user?.name}
            {user?.verified && <BadgeCheck size={20} className="text-primary-600" />}
          </h1>
          <p className="text-muted text-sm">{user?.email}</p>
        </div>
        {isFarmer && (
          <Link to="/dashboard/new" className="btn btn-primary gap-2"><Plus size={18} /> Жарыя кошуу</Link>
        )}
      </div>

      {/* stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {isFarmer && <div className="card p-4 text-center"><div className="text-2xl font-bold text-primary-700">{listings.length}</div><div className="text-xs text-muted mt-1">Жарыялар</div></div>}
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-primary-700">{orders.length}</div><div className="text-xs text-muted mt-1">Заказдар</div></div>
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-accent-500">{orders.filter(o => o.status === 'new').length}</div><div className="text-xs text-muted mt-1">Жаңы заказдар</div></div>
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-primary-700">{orders.filter(o => o.status === 'completed').reduce((s, o) => s + o.total, 0).toLocaleString('ru-RU')}</div><div className="text-xs text-muted mt-1">Жалпы сом</div></div>
      </div>

      <div className="flex gap-1 mb-5 border-b border-border overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap -mb-px transition ${tab === t.key ? 'border-primary-600 text-primary-700' : 'border-transparent text-muted hover:text-text'}`}>
            <t.icon size={15} /> {t.label} {'count' in t && t.count !== undefined ? `(${t.count})` : ''}
          </button>
        ))}
      </div>

      {loading ? <div className="py-16 text-center text-muted">Жүктөлүүдө...</div> : (
        <>
          {tab === 'listings' && (
            listings.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-3">📦</div>
                <div className="font-semibold mb-2">Жарыялар жок</div>
                <Link to="/dashboard/new" className="btn btn-primary gap-2"><Plus size={16} /> Биринчи жарыяны кошуу</Link>
              </div>
            ) : (
              <div className="card overflow-hidden divide-y divide-border">
                {listings.map(l => (
                  <div key={l.id} className="flex items-center gap-4 p-4 hover:bg-surface">
                    <img src={l.images[0]} className="w-16 h-16 rounded-xl object-cover" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{l.title}</div>
                      <div className="text-xs text-muted">{l.price.toLocaleString('ru-RU')} сом/{l.unit} · {l.region}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {l.vip && <span className="badge badge-orange text-[10px]">VIP</span>}
                      <Link to={`/dashboard/edit/${l.id}`} className="p-2 rounded-lg hover:bg-primary-50 text-muted hover:text-primary-600"><Pencil size={15} /></Link>
                      <button onClick={() => handleDelete(l.id)} className="p-2 rounded-lg hover:bg-red-50 text-muted hover:text-red-500"><Trash2 size={15} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {tab === 'orders' && (
            orders.length === 0 ? <div className="text-center py-16 text-muted">Заказдар жок</div> : (
              <div className="space-y-3">
                {orders.map(o => (
                  <div key={o.id} className="card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <img src={o.listingImage} className="w-12 h-12 rounded-lg object-cover" />
                        <div>
                          <div className="font-semibold text-sm">{o.listingTitle}</div>
                          <div className="text-xs text-muted">{isFarmer ? `Сатып алуучу: ${o.buyerName}` : ''} · {o.qty} {o.unit}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-primary-700">{o.total.toLocaleString('ru-RU')} сом</div>
                        <span className={`badge ${ORDER_STATUS[o.status]?.color || 'badge-gray'}`}>{ORDER_STATUS[o.status]?.label || o.status}</span>
                      </div>
                    </div>
                    <div className="text-xs text-muted">{new Date(o.createdAt).toLocaleDateString('ru-RU', { dateStyle: 'long' })}</div>
                  </div>
                ))}
              </div>
            )
          )}

          {tab === 'announcements' && (
            <div>
              <div className="flex justify-end mb-4">
                <Link to="/announcements/new" className="btn btn-primary gap-2"><Plus size={16} /> Сатып алуу жарыясы</Link>
              </div>
              {announcements.length === 0 ? <div className="text-center py-16 text-muted">Жарыялар жок</div> : (
                <div className="space-y-3">
                  {announcements.map(a => (
                    <div key={a.id} className="card p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{a.title}</div>
                          <div className="text-sm text-muted">{a.qty} {a.unit} · {a.region}</div>
                        </div>
                        <div>
                          <span className={`badge ${a.status === 'open' ? 'badge-green' : 'badge-gray'}`}>{a.status === 'open' ? 'Ачык' : 'Жабык'}</span>
                          <div className="text-xs text-muted mt-1">{a.offerCount} сунуш</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'stats' && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card p-6">
                <h3 className="font-semibold mb-4">Заказ статустары</h3>
                {['new', 'confirmed', 'shipped', 'completed', 'cancelled'].map(s => {
                  const cnt = orders.filter(o => o.status === s).length;
                  return (
                    <div key={s} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <span className={`badge ${ORDER_STATUS[s]?.color}`}>{ORDER_STATUS[s]?.label}</span>
                      <span className="font-semibold">{cnt}</span>
                    </div>
                  );
                })}
              </div>
              <div className="card p-6">
                <h3 className="font-semibold mb-4">Киреше</h3>
                <div className="text-3xl font-bold text-primary-700 mb-1">
                  {orders.filter(o => o.status === 'completed').reduce((s, o) => s + o.total, 0).toLocaleString('ru-RU')} сом
                </div>
                <div className="text-sm text-muted">Аяктаган заказдардан</div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
