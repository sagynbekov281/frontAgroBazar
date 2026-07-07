import { useEffect, useState } from 'react';
import { Users, Package, ShoppingBag, BarChart2, BadgeCheck, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import type { User, Listing, Order } from '../types';
import { ROLE_LABELS } from '../constants';

type Tab = 'stats' | 'users' | 'listings' | 'orders';

export default function AdminPanel() {
  const [tab, setTab] = useState<Tab>('stats');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    Promise.all([api.adminStats(), api.adminUsers(), api.adminListings(), api.adminOrders()])
      .then(([s, u, l, o]) => {
        setStats(s); setUsers(u.users || []); setListings(l.listings || []); setOrders(o.orders || []);
      }).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleVerify(id: string) {
    await api.verifyUser(id); load();
  }

  const TABS = [
    { key: 'stats' as Tab, label: 'Статистика', icon: BarChart2 },
    { key: 'users' as Tab, label: `Колдонуучулар (${users.length})`, icon: Users },
    { key: 'listings' as Tab, label: `Жарыялар (${listings.length})`, icon: Package },
    { key: 'orders' as Tab, label: `Заказдар (${orders.length})`, icon: ShoppingBag },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-accent-500 flex items-center justify-center"><BadgeCheck size={20} className="text-white" /></div>
        <div>
          <h1 className="font-bold text-2xl">Администратор панели</h1>
          <p className="text-muted text-sm">Платформаны башкаруу</p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap -mb-px ${tab === t.key ? 'border-primary-600 text-primary-700' : 'border-transparent text-muted hover:text-text'}`}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {loading ? <div className="py-20 text-center text-muted">Жүктөлүүдө...</div> : (
        <>
          {tab === 'stats' && stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Колдонуучулар', value: stats.userCount, icon: Users, color: 'text-blue-600' },
                { label: 'Жарыялар', value: stats.listingCount, icon: Package, color: 'text-green-600' },
                { label: 'Заказдар', value: stats.orderCount, icon: ShoppingBag, color: 'text-orange-500' },
                { label: 'Аяктаган заказдар', value: stats.completedOrderCount, icon: BadgeCheck, color: 'text-primary-600' },
              ].map(s => (
                <div key={s.label} className="card p-5">
                  <s.icon size={22} className={`${s.color} mb-3`} />
                  <div className={`text-3xl font-bold ${s.color} mb-1`}>{s.value}</div>
                  <div className="text-xs text-muted">{s.label}</div>
                </div>
              ))}
              <div className="card p-5 col-span-2">
                <div className="text-sm font-semibold mb-3">Ролдор боюнча бөлүштүрүлүш</div>
                {stats.byRole && Object.entries(stats.byRole).map(([role, count]: [string, any]) => (
                  <div key={role} className="flex items-center justify-between py-1.5 border-b border-border last:border-0 text-sm">
                    <span>{ROLE_LABELS[role] || role}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
              </div>
              <div className="card p-5 col-span-2">
                <div className="text-sm font-semibold mb-3">Акыркы активдүүлүк</div>
                <div className="text-muted text-sm">Платформа жакшы иштеп жатат ✅</div>
              </div>
            </div>
          )}

          {tab === 'users' && (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-surface text-muted text-xs border-b border-border">
                  <th className="px-4 py-3 text-left">Аты</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Ролу</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Аймак</th>
                  <th className="px-4 py-3 text-left">Верификация</th>
                  <th className="px-4 py-3"></th>
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-surface">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xs">{u.name[0]}</div>
                          <span className="font-medium">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted">{u.email}</td>
                      <td className="px-4 py-3"><span className="badge badge-gray">{ROLE_LABELS[u.role]}</span></td>
                      <td className="px-4 py-3 text-muted hidden md:table-cell">{u.region || '—'}</td>
                      <td className="px-4 py-3">
                        {u.verified ? <span className="badge badge-green"><BadgeCheck size={10} /> Ырасталган</span> : <span className="badge badge-gray">Жок</span>}
                      </td>
                      <td className="px-4 py-3">
                        {!u.verified && (
                          <button onClick={() => handleVerify(u.id)} className="btn btn-outline text-xs px-2 py-1 gap-1">
                            <BadgeCheck size={12} /> Ырастоо
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'listings' && (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-surface text-muted text-xs border-b border-border">
                  <th className="px-4 py-3 text-left">Жарыя</th>
                  <th className="px-4 py-3 text-left">Фермер</th>
                  <th className="px-4 py-3 text-right">Баасы</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Аймак</th>
                  <th className="px-4 py-3"></th>
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {listings.map(l => (
                    <tr key={l.id} className="hover:bg-surface">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <img src={l.images[0]} className="w-10 h-10 rounded-lg object-cover" />
                          <span className="font-medium line-clamp-1">{l.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted">{l.ownerName}</td>
                      <td className="px-4 py-3 text-right font-semibold text-primary-700">{l.price.toLocaleString('ru-RU')} сом</td>
                      <td className="px-4 py-3 text-muted hidden md:table-cell">{l.region}</td>
                      <td className="px-4 py-3">
                        <button className="p-1.5 rounded-lg hover:bg-red-50 text-muted hover:text-red-500"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'orders' && (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-surface text-muted text-xs border-b border-border">
                  <th className="px-4 py-3 text-left">Товар</th>
                  <th className="px-4 py-3 text-left">Сатып алуучу</th>
                  <th className="px-4 py-3 text-right">Сумма</th>
                  <th className="px-4 py-3 text-left">Статус</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Күнү</th>
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {orders.map(o => (
                    <tr key={o.id} className="hover:bg-surface">
                      <td className="px-4 py-3 font-medium">{o.listingTitle}</td>
                      <td className="px-4 py-3 text-muted">{o.buyerName}</td>
                      <td className="px-4 py-3 text-right font-semibold text-primary-700">{o.total.toLocaleString('ru-RU')} сом</td>
                      <td className="px-4 py-3"><span className="badge badge-gray">{o.status}</span></td>
                      <td className="px-4 py-3 text-muted hidden md:table-cell">{new Date(o.createdAt).toLocaleDateString('ru-RU')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
