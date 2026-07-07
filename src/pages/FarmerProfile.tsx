import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Phone, MessageSquare, BadgeCheck, Star, Calendar } from 'lucide-react';
import { api } from '../api/client';
import type { User, Listing, Review } from '../types';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../constants';
import ListingCard from '../components/ListingCard';
import StarRating from '../components/StarRating';

export default function FarmerProfile() {
  const { id } = useParams();
  const [farmer, setFarmer] = useState<User | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    api.getUser(id).then(d => setFarmer(d.user)).catch(() => {});
    api.getListings({ ownerId: id }).then(d => setListings(d.listings || [])).catch(() => {});
    api.getReviews(id).then(d => setReviews(d.reviews || [])).catch(() => {});
  }, [id]);

  async function handleChat() {
    if (!user) { navigate('/login'); return; }
    const d = await api.startChat(id!);
    navigate(`/chat/${d.roomId}`);
  }

  if (!farmer) return <div className="py-32 text-center text-muted">Жүктөлүүдө...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid md:grid-cols-[300px_1fr] gap-8">
        <div className="space-y-4">
          <div className="card p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-3xl mx-auto mb-3">{farmer.name[0]}</div>
            <h1 className="font-bold text-lg">{farmer.name}</h1>
            {farmer.companyName && <div className="text-sm text-muted mt-0.5">{farmer.companyName}</div>}
            <div className="flex items-center justify-center gap-1 mt-2">
              <span className="badge badge-green">{ROLE_LABELS[farmer.role]}</span>
              {farmer.verified && <span className="badge badge-green"><BadgeCheck size={10} /> Верификациядан өткөн</span>}
            </div>
            <div className="flex items-center justify-center gap-1 mt-3">
              <Star size={16} className="fill-amber-400 text-amber-400" />
              <span className="font-bold">{farmer.rating.toFixed(1)}</span>
              <span className="text-sm text-muted">({farmer.reviewCount} пикир)</span>
            </div>
          </div>

          <div className="card p-4 space-y-3 text-sm">
            {farmer.region && <div className="flex items-center gap-2 text-muted"><MapPin size={15} /> {farmer.region}{farmer.district ? `, ${farmer.district}` : ''}</div>}
            <div className="flex items-center gap-2 text-muted"><Phone size={15} /> {farmer.phone}</div>
            <div className="flex items-center gap-2 text-muted"><Calendar size={15} /> {new Date(farmer.createdAt).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long' })} каттоодон өттү</div>
          </div>

          <div className="card p-4 grid grid-cols-2 gap-3 text-center text-sm">
            <div><div className="font-bold text-primary-700 text-xl">{listings.length}</div><div className="text-muted text-xs">Жарыялар</div></div>
            <div><div className="font-bold text-primary-700 text-xl">{farmer.reviewCount}</div><div className="text-muted text-xs">Пикирлер</div></div>
          </div>

          {user && user.id !== id && (
            <div className="flex flex-col gap-2">
              <button onClick={handleChat} className="btn btn-primary gap-2"><MessageSquare size={16} /> Чат жазуу</button>
              {farmer.whatsapp && <a href={`https://wa.me/${farmer.whatsapp}`} target="_blank" className="btn bg-green-500 text-white hover:bg-green-600 gap-2">💬 WhatsApp</a>}
            </div>
          )}
        </div>

        <div>
          <h2 className="font-bold text-xl mb-4">Жарыялар ({listings.length})</h2>
          {listings.length === 0 ? <div className="text-muted">Жарыялар жок</div> : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              {listings.map(l => <ListingCard key={l.id} l={l} />)}
            </div>
          )}

          <h2 className="font-bold text-xl mb-4">Пикирлер ({reviews.length})</h2>
          {reviews.length === 0 ? <div className="text-muted">Пикирлер жок</div> : (
            <div className="space-y-4">
              {reviews.map(r => (
                <div key={r.id} className="card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs">{r.authorName[0]}</div>
                    <span className="font-semibold text-sm">{r.authorName}</span>
                    <StarRating value={r.rating} readonly size={14} />
                    <span className="text-xs text-muted ml-auto">{new Date(r.createdAt).toLocaleDateString('ru-RU')}</span>
                  </div>
                  <p className="text-sm text-slate-600">{r.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
