import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, TrendingUp, ArrowRight, Truck, ShieldCheck, Sprout, BarChart3, Globe } from 'lucide-react';
import { api } from '../api/client';
import type { Listing, MarketPrice } from '../types';
import { CATEGORIES } from '../constants';
import ListingCard from '../components/ListingCard';
import pole from '../assets/2017-06-08-10-25-35.jpg';

const STATS = [
  { label: 'Фермерлер', value: '2,400+' },
  { label: 'Активдүү жарыялар', value: '18,000+' },
  { label: 'Аймактар', value: '9' },
  { label: 'Сатуулар', value: '₩ 840М+' },
];

const NEWS = [
  { title: 'Кыргызстан 2025-жылы жашылча экспортун 30% га өстүрдү', date: '15 июнь 2025', tag: 'Жаңылык' },
  { title: 'Жаңы мамлекеттик программа: фермерлерге 50% субсидия', date: '12 июнь 2025', tag: 'Программа' },
  { title: 'AgroBazar мобилдик колдонмосу жеткиликтүү болду', date: '8 июнь 2025', tag: 'Платформа' },
];

const TESTIMONIALS = [
  { name: 'Айбек Турсунов', role: 'Фермер, Чуй', text: 'AgroBazar аркылуу мен өз картошкамды 40% кымбатыраак сатам. Ортомчулар жок!', rating: 5 },
  { name: 'Гүлнара Асанова', role: 'Сатып алуучу, Бишкек', text: 'Бир жерден бир нече фермер менен байланышып, баасын салыштырдым. Абдан ыңгайлуу.', rating: 5 },
  { name: 'КамАЗ ЖЧК', role: 'Транспорт, Ош', text: 'Жүк табуу мурда кыйын болчу. Эми AgroBazar аркылуу ар дайым жүк бар.', rating: 4 },
];

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.getListings({ limit: '8' }).then(d => setListings(d.listings || [])).catch(() => {});
    api.getPrices().then(d => setPrices(d.prices || [])).catch(() => {});
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden text-white">
        <div className="absolute inset-0">
          <img
            src={pole}
            alt="Поле"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-slate-950/55" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-12 sm:py-16 md:py-24">
          <div className="max-w-2xl">
            <div className="badge bg-white/20 text-white mb-4 text-[11px] sm:text-xs">🇰🇬 Кыргызстандын #1 агро маркетплейси</div>
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold leading-tight mb-4">
              Фермерден<br />түздөн-түз сатып ал
            </h1>
            <p className="text-primary-100 text-sm sm:text-lg mb-6 sm:mb-8">Мал, жашылча, мөмө, дан жана техника. Ортомчулар жок — баасы адилет.</p>
            <form onSubmit={e => { e.preventDefault(); navigate(`/catalog?search=${encodeURIComponent(search)}`); }} className="flex flex-col sm:flex-row gap-2 max-w-lg">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Эмне издейсиз?" className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-xl bg-white/95 text-slate-900 text-sm outline-none" />
              </div>
              <button type="submit" className="btn bg-accent-500 text-white hover:bg-accent-600 px-6 py-3 sm:py-3.5 text-sm shrink-0">Издөө</button>
            </form>
            <div className="flex flex-wrap gap-2 mt-4 text-xs sm:text-sm text-primary-100">
              {['Картошка', 'Уй эти', 'Буудай', 'Бал', 'Томат'].map(t => (
                <button key={t} onClick={() => navigate(`/catalog?search=${t}`)} className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full transition">{t}</button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-5 sm:py-6 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {STATS.map(s => (
            <div key={s.label} className="text-center">
              <div className="font-display text-xl sm:text-2xl font-bold text-primary-700">{s.value}</div>
              <div className="text-[11px] sm:text-xs text-muted mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <h2 className="text-lg sm:text-xl font-bold">Категориялар</h2>
          <Link to="/catalog" className="text-xs sm:text-sm text-primary-600 font-medium flex items-center gap-1 hover:underline">Бардыгы <ArrowRight size={14} /></Link>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-8 gap-2 sm:gap-3">
          {CATEGORIES.map(c => (
            <Link key={c.value} to={`/catalog?category=${c.value}`} className="flex flex-col items-center gap-1.5 p-2.5 sm:p-3 rounded-2xl bg-card border border-border hover:border-primary-300 hover:bg-primary-50 transition text-center">
              <span className="text-xl sm:text-2xl">{c.emoji}</span>
              <span className="text-[10px] sm:text-[11px] font-medium text-slate-600 leading-tight">{c.labelKy}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Latest listings */}
      {listings.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <h2 className="text-lg sm:text-xl font-bold">Акыркы жарыялар</h2>
            <Link to="/catalog" className="text-xs sm:text-sm text-primary-600 font-medium flex items-center gap-1 hover:underline">Баары <ArrowRight size={14} /></Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {listings.map(l => <ListingCard key={l.id} l={l} />)}
          </div>
        </section>
      )}

      {/* Price table snippet */}
      {prices.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2"><BarChart3 size={20} className="text-primary-600 shrink-0" /> <span className="truncate">Баалар борбору</span></h2>
            <Link to="/prices" className="text-xs sm:text-sm text-primary-600 font-medium flex items-center gap-1 hover:underline shrink-0">Толук <ArrowRight size={14} /></Link>
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full text-xs sm:text-sm min-w-[420px]">
              <thead><tr className="bg-surface text-muted text-[11px] sm:text-xs"><th className="px-3 sm:px-4 py-2.5 sm:py-3 text-left">Товар</th><th className="px-3 sm:px-4 py-2.5 sm:py-3 text-right">Орточо баа</th><th className="px-3 sm:px-4 py-2.5 sm:py-3 text-right">Апталык</th><th className="px-3 sm:px-4 py-2.5 sm:py-3 text-right hidden md:table-cell">Айлык</th></tr></thead>
              <tbody className="divide-y divide-border">
                {prices.slice(0, 6).map(p => (
                  <tr key={p.id} className="hover:bg-surface">
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-medium">{p.name}</td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-right font-semibold">{p.avgPrice} сом/{p.unit}</td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-right">
                      <span className={`text-xs font-semibold ${p.weekChange > 0 ? 'text-green-600' : p.weekChange < 0 ? 'text-red-500' : 'text-muted'}`}>
                        {p.weekChange > 0 ? '+' : ''}{p.weekChange}%
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-right hidden md:table-cell">
                      <span className={`text-xs font-semibold ${p.monthChange > 0 ? 'text-green-600' : p.monthChange < 0 ? 'text-red-500' : 'text-muted'}`}>
                        {p.monthChange > 0 ? '+' : ''}{p.monthChange}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Why AgroBazar */}
      <section className="bg-primary-50 border-y border-primary-100">
        <div className="max-w-7xl mx-auto px-4 py-10 sm:py-14 grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {[
            { icon: Sprout, title: 'Ортомчулар жок', text: 'Фермерден түздөн-түз. Баа адилет, сапат жакшы.' },
            { icon: ShieldCheck, title: 'Верификация', text: 'Ар бир фермер текшерилет. Рейтинг жана пикирлер.' },
            { icon: Truck, title: 'Транспорт', text: 'Платформадан логистика заказ бер.' },
            { icon: Globe, title: 'Экспорт', text: 'Чет өлкөгө чыгуу мүмкүнчүлүгү.' },
            { icon: TrendingUp, title: 'Баалар', text: 'Рыноктун актуалдуу баалары жана графиктер.' },
          ].slice(0, 4).map(f => (
            <div key={f.title} className="flex flex-col items-start gap-2 sm:gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary-100 flex items-center justify-center shrink-0"><f.icon size={18} className="text-primary-700" /></div>
              <div>
                <div className="font-semibold text-sm sm:text-base mb-1">{f.title}</div>
                <div className="text-xs sm:text-sm text-muted">{f.text}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Purchase announcements banner */}
      <section className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
        <div className="bg-gradient-to-r from-accent-500 to-orange-400 rounded-2xl p-5 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 text-white">
          <div>
            <h2 className="font-bold text-lg sm:text-xl mb-1">Сатып алуу жарыяларын жарыяла</h2>
            <p className="text-orange-50 text-xs sm:text-sm">«100 тонна картошка керек» — жаз да, фермерлер өздөрү келет!</p>
          </div>
          <Link to="/announcements/new" className="btn bg-white text-accent-600 hover:bg-orange-50 shrink-0 px-5 sm:px-6 py-2.5 sm:py-3 w-full md:w-auto text-center">
            Жарыя кошуу
          </Link>
        </div>
      </section>

      {/* News */}
      <section className="max-w-7xl mx-auto px-4 py-4 pb-8 sm:pb-10">
        <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-5">Айыл чарба жаңылыктары</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {NEWS.map(n => (
            <div key={n.title} className="card p-4 sm:p-5 hover:shadow-md transition-shadow cursor-pointer">
              <span className="badge badge-green text-[10px] mb-2.5 sm:mb-3 block w-fit">{n.tag}</span>
              <h3 className="font-semibold text-sm leading-snug mb-2">{n.title}</h3>
              <span className="text-xs text-muted">{n.date}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-surface border-t border-border">
        <div className="max-w-7xl mx-auto px-4 py-10 sm:py-14">
          <h2 className="text-lg sm:text-xl font-bold mb-5 sm:mb-6 text-center">Колдонуучулардын пикири</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="card p-4 sm:p-5">
                <div className="flex gap-1 mb-3">{[...Array(t.rating)].map((_, i) => <span key={i} className="text-amber-400 text-sm">★</span>)}</div>
                <p className="text-sm text-slate-600 mb-4 italic">«{t.text}»</p>
                <div>
                  <div className="font-semibold text-sm">{t.name}</div>
                  <div className="text-xs text-muted">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}