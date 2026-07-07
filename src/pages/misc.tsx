import { Link } from 'react-router-dom';
import { Sprout } from 'lucide-react';

export function NotFound() {
  return (
    <div className="max-w-lg mx-auto px-4 py-32 text-center">
      <Sprout size={48} className="text-primary-200 mx-auto mb-4" />
      <h1 className="font-bold text-4xl text-primary-700 mb-2">404</h1>
      <p className="text-muted mb-6">Бет табылган жок</p>
      <Link to="/" className="btn btn-primary px-6 py-3">Башкы бетке</Link>
    </div>
  );
}

export function Notifications() {
  const NOTIFS = [
    { icon: '📦', text: 'Сиздин заказыңыз ырасталды', time: '2 саат мурун', read: false },
    { icon: '💬', text: 'Айбек Турсунов билдирүү жазды', time: '5 саат мурун', read: false },
    { icon: '📈', text: 'Картошканын баасы 8% га өстү', time: 'Кечээ', read: true },
    { icon: '🎉', text: 'Сиздин жарыяңыз жарыяланды', time: '2 күн мурун', read: true },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-bold text-2xl mb-6">Билдирмелер</h1>
      <div className="space-y-2">
        {NOTIFS.map((n, i) => (
          <div key={i} className={`card p-4 flex items-start gap-3 ${!n.read ? 'border-primary-200 bg-primary-50/30' : ''}`}>
            <span className="text-2xl">{n.icon}</span>
            <div className="flex-1">
              <div className="text-sm font-medium">{n.text}</div>
              <div className="text-xs text-muted mt-0.5">{n.time}</div>
            </div>
            {!n.read && <div className="w-2 h-2 rounded-full bg-primary-600 mt-1.5 shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  );
}
