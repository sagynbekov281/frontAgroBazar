import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapPin, Star, Truck, BadgeCheck, Heart, MessageSquare, Phone, ArrowLeft, Leaf, Globe, Crown } from 'lucide-react';
import { api } from '../api/client';
import type { Listing, Review } from '../types';
import { useFavorites } from '../context/FavoritesContext';
import { useAuth } from '../context/AuthContext';
import { catLabel } from '../constants';
import StarRating from '../components/StarRating';
import CustomSelect from '../components/CustomSelect';

export default function ListingDetail() {
  const { id } = useParams();
  const [listing, setListing] = useState<Listing | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeImg, setActiveImg] = useState(0);
  const [showOrder, setShowOrder] = useState(false);
  const [qty, setQty] = useState(1);
  const [orderForm, setOrderForm] = useState({ address: '', phone: '', comment: '', deliveryDate: '', paymentMethod: 'cash' });
  const [placing, setPlacing] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const { toggle, has } = useFavorites();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    api.getListing(id).then(d => setListing(d.listing)).catch(() => {});
    api.getReviews(id).then(d => setReviews(d.reviews || [])).catch(() => {});
  }, [id]);

  async function handleOrder() {
    if (!user) { navigate('/login', { state: { from: `/listing/${listing!.id}` } }); return; }
    setPlacing(true);
    try {
      await api.createOrder({ listingId: listing!.id, qty, ...orderForm });
      alert('Заказыңыз кабыл алынды!');
      setShowOrder(false);
    } catch (e: any) { alert(e.message); }
    finally { setPlacing(false); }
  }

  async function handleReview() {
    if (!user) { navigate('/login', { state: { from: `/listing/${listing!.id}` } }); return; }
    await api.createReview({ targetId: listing!.ownerId, rating: reviewRating, comment: reviewText });
    const d = await api.getReviews(listing!.id);
    setReviews(d.reviews || []);
    setReviewText('');
  }

  async function handleChat() {
    if (!user) { navigate('/login', { state: { from: `/listing/${listing!.id}` } }); return; }
    const d = await api.startChat(listing!.ownerId);
    navigate(`/chat/${d.roomId}`);
  }

  function handleFav() {
    if (!user) { navigate('/login', { state: { from: `/listing/${listing!.id}` } }); return; }
    toggle(listing!.id);
  }

  if (!listing) return <div className="py-32 text-center text-muted">Жүктөлүүдө...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link to="/catalog" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary-600 mb-6">
        <ArrowLeft size={16} /> Каталогго кайтуу
      </Link>

      <div className="grid md:grid-cols-2 gap-8 mb-10">
        {/* Images */}
        <div>
          <div className="rounded-2xl overflow-hidden aspect-[4/3] bg-slate-100 mb-3">
            <img src={listing.images[activeImg]} alt={listing.title} className="w-full h-full object-cover" />
          </div>
          {listing.images.length > 1 && (
            <div className="flex gap-2">
              {listing.images.map((img, i) => (
                <button key={i} onClick={() => setActiveImg(i)} className={`w-16 h-16 rounded-xl overflow-hidden border-2 ${activeImg === i ? 'border-primary-600' : 'border-border'}`}>
                  <img src={img} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="badge badge-green">{catLabel(listing.category)}</span>
            {listing.vip && <span className="badge badge-orange"><Crown size={10} /> VIP</span>}
            {listing.organic && <span className="badge bg-emerald-100 text-emerald-700"><Leaf size={10} /> Органик</span>}
            {listing.exportReady && <span className="badge bg-blue-100 text-blue-700"><Globe size={10} /> Экспортко даяр</span>}
          </div>

          <h1 className="font-bold text-2xl mb-2">{listing.title}</h1>
          <div className="flex items-center gap-3 text-sm text-muted mb-4">
            <span className="flex items-center gap-1"><MapPin size={14} /> {listing.region}</span>
            <span className="flex items-center gap-1">{listing.views} кароо</span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-bold text-primary-700">{listing.price.toLocaleString('ru-RU')}</span>
            <span className="text-muted">сом / {listing.unit}</span>
          </div>
          <div className="text-sm text-muted mb-4">Мин заказ: {listing.minOrder} {listing.unit}</div>

          {/* Bulk prices */}
          {listing.bulkPrices && listing.bulkPrices.length > 0 && (
            <div className="card p-4 mb-5">
              <div className="text-sm font-semibold mb-3">📦 Дүң баалар</div>
              <div className="space-y-1.5">
                {listing.bulkPrices.map((bp, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-muted">{bp.minQty}{bp.maxQty ? `–${bp.maxQty}` : '+'} {bp.unit}</span>
                    <span className="font-semibold text-primary-700">{bp.price} сом/{bp.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delivery */}
          {listing.hasDelivery && (
            <div className="flex items-center gap-2 text-sm text-primary-700 bg-primary-50 rounded-xl px-3 py-2 mb-4">
              <Truck size={16} /> Жеткирүү бар
            </div>
          )}

          {/* Qty + actions */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center border border-border rounded-xl overflow-hidden">
              <button onClick={() => setQty(q => Math.max(listing.minOrder, q - 1))} className="px-4 py-2.5 hover:bg-surface text-lg">−</button>
              <span className="px-4 font-semibold">{qty}</span>
              <button onClick={() => setQty(q => q + 1)} className="px-4 py-2.5 hover:bg-surface text-lg">+</button>
            </div>
            <span className="text-sm text-muted">{listing.unit}</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => { if (!user) { navigate('/login', { state: { from: `/listing/${listing.id}` } }); return; } setShowOrder(true); }} className="btn btn-primary flex-1">Заказ берүү</button>
            <button onClick={handleChat} className="btn btn-outline gap-1.5"><MessageSquare size={16} /> Чат</button>
            <a href={`tel:+${listing.ownerId}`} className="btn btn-outline gap-1.5"><Phone size={16} /></a>
            <button onClick={handleFav} className={`btn btn-outline ${has(listing.id) ? 'text-red-500' : ''}`}>
              <Heart size={16} className={has(listing.id) ? 'fill-red-500' : ''} />
            </button>
          </div>

          {/* Farmer info */}
          <div className="card p-4 mt-5 flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-lg">{listing.ownerName[0]}</div>
            <div className="flex-1">
              <div className="font-semibold text-sm flex items-center gap-1.5">
                {listing.ownerName}
                {listing.ownerVerified && <BadgeCheck size={14} className="text-primary-600" />}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted mt-0.5">
                <Star size={11} className="fill-amber-400 text-amber-400" /> {listing.ownerRating.toFixed(1)}
              </div>
            </div>
            <Link to={`/farmer/${listing.ownerId}`} className="btn btn-outline text-xs px-3 py-2">Профиль</Link>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="card p-6 mb-6">
        <h2 className="font-bold text-lg mb-3">Сүрөттөмө</h2>
        <p className="text-sm text-slate-600 leading-relaxed">{listing.description}</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-5 text-sm">
          {listing.harvestDate && <div><span className="text-muted">Жыйналган:</span> <span className="font-medium ml-1">{listing.harvestDate}</span></div>}
          {listing.weight && <div><span className="text-muted">Салмак:</span> <span className="font-medium ml-1">{listing.weight} кг</span></div>}
          {listing.inStock && <div><span className="text-muted">Кампада:</span> <span className="font-medium ml-1 text-green-600">Бар</span></div>}
        </div>
      </div>

      {/* Reviews */}
      <div className="card p-6">
        <h2 className="font-bold text-lg mb-4">Пикирлер ({reviews.length})</h2>
        {reviews.map(r => (
          <div key={r.id} className="border-b border-border pb-4 mb-4 last:border-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs">{r.authorName[0]}</div>
              <span className="font-semibold text-sm">{r.authorName}</span>
              <StarRating value={r.rating} readonly size={14} />
              <span className="text-xs text-muted ml-auto">{new Date(r.createdAt).toLocaleDateString('ru-RU')}</span>
            </div>
            <p className="text-sm text-slate-600 pl-10">{r.comment}</p>
          </div>
        ))}
        {user && (
          <div className="mt-4 bg-surface rounded-xl p-4">
            <div className="font-semibold text-sm mb-2">Пикир калтыруу</div>
            <StarRating value={reviewRating} onChange={setReviewRating} />
            <textarea rows={3} className="input mt-2 text-sm" placeholder="Комментарий..." value={reviewText} onChange={e => setReviewText(e.target.value)} />
            <button onClick={handleReview} className="btn btn-primary text-sm mt-2">Жөнөтүү</button>
          </div>
        )}
      </div>

      {/* Order modal */}
      {showOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setShowOrder(false)}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4">Заказ берүү</h3>
            <div className="space-y-3">
              <div><label className="label">Дарек</label><input className="input text-sm" value={orderForm.address} onChange={e => setOrderForm(f => ({ ...f, address: e.target.value }))} /></div>
              <div><label className="label">Телефон</label><input className="input text-sm" value={orderForm.phone} onChange={e => setOrderForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div><label className="label">Жеткирүү күнү</label><input type="date" className="input text-sm" value={orderForm.deliveryDate} onChange={e => setOrderForm(f => ({ ...f, deliveryDate: e.target.value }))} /></div>
              <div><label className="label">Төлөм ыкмасы</label>
                <CustomSelect
                  value={orderForm.paymentMethod}
                  options={[
                    { value: 'cash', label: 'Накталай' },
                    { value: 'transfer', label: 'Которуу' },
                    { value: 'card', label: 'Карта' },
                  ]}
                  onChange={value => setOrderForm(f => ({ ...f, paymentMethod: value }))}
                  placeholder="Төлөм ыкмасы"
                />
              </div>
              <div><label className="label">Комментарий</label><textarea className="input text-sm" rows={2} value={orderForm.comment} onChange={e => setOrderForm(f => ({ ...f, comment: e.target.value }))} /></div>
              <div className="flex items-center justify-between font-semibold">
                <span>Жалпы ({qty} {listing.unit}):</span>
                <span className="text-primary-700 text-lg">{(listing.price * qty).toLocaleString('ru-RU')} сом</span>
              </div>
              <button disabled={placing} onClick={handleOrder} className="btn btn-primary w-full">{placing ? 'Жөнөтүлүүдө...' : 'Заказ берүү'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}