import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Star, Heart, Truck, BadgeCheck, Crown } from 'lucide-react';
import type { Listing } from '../types';
import { useFavorites } from '../context/FavoritesContext';
import { useAuth } from '../context/AuthContext';
import { catLabel } from '../constants';

export default function ListingCard({ l }: { l: Listing }) {
  const { toggle, has } = useFavorites();
  const { user } = useAuth();
  const navigate = useNavigate();

  function handleFavClick(e: React.MouseEvent) {
    e.preventDefault();
    if (!user) { navigate('/login', { state: { from: `/listing/${l.id}` } }); return; }
    toggle(l.id);
  }

  return (
    <div className={`card overflow-hidden flex flex-col hover:shadow-md transition-shadow ${l.vip ? 'ring-1 ring-accent-400' : ''}`}>
      <div className="relative">
        <Link to={`/listing/${l.id}`} className="block aspect-[4/3] bg-slate-100 overflow-hidden">
          <img src={l.images[0]} alt={l.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
        </Link>
        <button onClick={handleFavClick} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow">
          <Heart size={15} className={has(l.id) ? 'fill-red-500 text-red-500' : 'text-slate-400'} />
        </button>
        {l.vip && <span className="absolute top-2 left-2 badge badge-orange"><Crown size={10} /> VIP</span>}
        {l.exportReady && <span className="absolute bottom-2 left-2 badge bg-blue-600 text-white text-[10px]">Экспорт</span>}
      </div>

      <div className="p-3 flex flex-col flex-1">
        <span className="text-xs text-muted mb-1">{catLabel(l.category)}</span>
        <Link to={`/listing/${l.id}`} className="font-semibold text-sm leading-snug mb-1 hover:text-primary-600 line-clamp-2">{l.title}</Link>
        <div className="flex items-center gap-1 text-xs text-muted mb-2">
          <MapPin size={11} /> {l.region}
          {l.organic && <span className="ml-1 badge badge-green text-[10px]">Органик</span>}
        </div>
        <div className="mt-auto">
          <div className="flex items-baseline gap-1 mb-1">
            <span className="font-bold text-lg text-primary-700">{l.price.toLocaleString('ru-RU')}</span>
            <span className="text-xs text-muted">сом/{l.unit}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted">
            <div className="flex items-center gap-1">
              <Star size={11} className="fill-amber-400 text-amber-400" /> {l.ownerRating.toFixed(1)}
              {l.ownerVerified && <BadgeCheck size={12} className="text-primary-600" />}
            </div>
            <div className="flex items-center gap-1">
              {l.hasDelivery && <Truck size={12} className="text-primary-600" />}
              <span>от {l.minOrder} {l.unit}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}