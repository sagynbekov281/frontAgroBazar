import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { api } from '../api/client';
import type { Listing } from '../types';
import { useFavorites } from '../context/FavoritesContext';
import ListingCard from '../components/ListingCard';

export default function Favorites() {
  const { ids } = useFavorites();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ids.length === 0) { setLoading(false); return; }
    api.getListings().then(d => {
      const all: Listing[] = d.listings || [];
      setListings(all.filter(l => ids.includes(l.id)));
    }).finally(() => setLoading(false));
  }, [ids.join(',')]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="font-bold text-2xl mb-6 flex items-center gap-2"><Heart size={24} className="text-red-500 fill-red-500" /> Сүйүктүүлөр</h1>

      {loading ? (
        <div className="py-20 text-center text-muted">Жүктөлүүдө...</div>
      ) : listings.length === 0 ? (
        <div className="text-center py-24">
          <Heart size={48} className="text-slate-200 mx-auto mb-4" />
          <div className="font-semibold text-lg mb-2">Сүйүктүүлөр бош</div>
          <p className="text-muted text-sm mb-6">Жарыяларды сактап, кийин тезирээк табыңыз</p>
          <Link to="/catalog" className="btn btn-primary px-6 py-3">Каталогго өтүү</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {listings.map(l => <ListingCard key={l.id} l={l} />)}
        </div>
      )}
    </div>
  );
}
