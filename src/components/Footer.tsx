import { Link } from 'react-router-dom';
import { Sprout, Phone, Mail, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-20">
      <div className="max-w-7xl mx-auto px-4 py-14 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center"><Sprout size={16} className="text-white" /></div>
            <span className="font-display text-lg text-white">AgroBazar</span>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed mb-4">Кыргызстандын айыл чарба маркетплейси. Фермерлерди, сатып алуучуларды жана транспортту бириктирет.</p>
          <div className="flex gap-3">
            {['TG','WA','VK','IG'].map(s => (
              <div key={s} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 hover:bg-primary-600 hover:text-white cursor-pointer transition">{s}</div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-3">Каталог</h4>
          <ul className="space-y-2 text-sm text-slate-400">
            {['Жашылча', 'Мөмө', 'Эт', 'Сүт', 'Дан', 'Мал', 'Техника'].map(c => <li key={c} className="hover:text-white cursor-pointer">{c}</li>)}
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-3">Платформа</h4>
          <ul className="space-y-2 text-sm text-slate-400">
            {[['Сатып алуу жарыялары', '/announcements'], ['Транспорт', '/transport'], ['Баалар борбору', '/prices'], ['Катталуу', '/register']].map(([l, t]) => (
              <li key={t}><Link to={t} className="hover:text-white">{l}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-3">Байланыш</h4>
          <ul className="space-y-2.5 text-sm text-slate-400">
            <li className="flex items-center gap-2"><MapPin size={14} /> Бишкек, Кыргызстан</li>
            <li className="flex items-center gap-2"><Phone size={14} /> +996 700 000 000</li>
            <li className="flex items-center gap-2"><Mail size={14} /> info@agrobazar.kg</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-800 text-center text-xs text-slate-500 py-4">
        © {new Date().getFullYear()} AgroBazar.kg — Бардык укуктар корголгон
      </div>
    </footer>
  );
}
