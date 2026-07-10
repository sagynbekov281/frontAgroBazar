import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sprout } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { REGIONS, ROLE_LABELS } from '../constants';
import type { UserRole } from '../types';
import CustomSelect from '../components/CustomSelect';

const ROLES: UserRole[] = ['farmer', 'buyer', 'cooperative', 'exporter', 'transport', 'company'];
const ROLE_ICONS: Record<string, string> = { farmer: '🌾', buyer: '🛒', cooperative: '🤝', exporter: '✈️', transport: '🚛', company: '🏢' };

export default function Register() {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<UserRole>('farmer');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', region: '', district: '', village: '', companyName: '', telegram: '', whatsapp: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const upd = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try { await register({ ...form, role }); navigate('/'); }
    catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-primary-600 flex items-center justify-center mx-auto mb-3"><Sprout size={26} className="text-white" /></div>
        <h1 className="font-display text-2xl font-bold">Катталуу</h1>
        <p className="text-muted text-sm mt-1">AgroBazar платформасына кошулуу</p>
      </div>

      <div className="flex items-center gap-2 mb-6">
        {[1, 2].map(s => (
          <div key={s} className={`flex-1 h-1.5 rounded-full transition-colors ${step >= s ? 'bg-primary-600' : 'bg-border'}`} />
        ))}
      </div>

      {step === 1 && (
        <div className="card p-6">
          <h2 className="font-semibold mb-4">Ролуңузду тандаңыз</h2>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {ROLES.map(r => (
              <button key={r} onClick={() => setRole(r)}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition ${role === r ? 'border-primary-600 bg-primary-50' : 'border-border hover:border-primary-300'}`}>
                <span className="text-2xl">{ROLE_ICONS[r]}</span>
                <span className="text-sm font-semibold">{ROLE_LABELS[r]}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setStep(2)} className="btn btn-primary w-full py-3">Улантуу →</button>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={submit} className="card p-6 space-y-3">
          {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>}
          <div><label className="label">Аты-жөнү *</label><input required className="input text-sm" value={form.name} onChange={e => upd('name', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Email *</label><input required type="email" className="input text-sm" value={form.email} onChange={e => upd('email', e.target.value)} /></div>
            <div><label className="label">Телефон *</label><input required className="input text-sm" placeholder="+996..." value={form.phone} onChange={e => upd('phone', e.target.value)} /></div>
          </div>
          <div><label className="label">Сырсөз *</label><input required type="password" minLength={6} className="input text-sm" value={form.password} onChange={e => upd('password', e.target.value)} /></div>
          <div><label className="label">Регион</label>
            <CustomSelect
              value={form.region}
              options={[
                { value: '', label: 'Тандаңыз' },
                ...REGIONS.map(r => ({ value: r, label: r })),
              ]}
              onChange={value => upd('region', value)}
              placeholder="Тандаңыз"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Район</label><input className="input text-sm" value={form.district} onChange={e => upd('district', e.target.value)} /></div>
            <div><label className="label">Айыл</label><input className="input text-sm" value={form.village} onChange={e => upd('village', e.target.value)} /></div>
          </div>
          {(role === 'company' || role === 'cooperative' || role === 'exporter') && (
            <div><label className="label">Компания аты</label><input className="input text-sm" value={form.companyName} onChange={e => upd('companyName', e.target.value)} /></div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Telegram</label><input className="input text-sm" placeholder="@username" value={form.telegram} onChange={e => upd('telegram', e.target.value)} /></div>
            <div><label className="label">WhatsApp</label><input className="input text-sm" placeholder="+996..." value={form.whatsapp} onChange={e => upd('whatsapp', e.target.value)} /></div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setStep(1)} className="btn btn-outline flex-1">← Артка</button>
            <button disabled={loading} className="btn btn-primary flex-1 py-3">{loading ? 'Катталууда...' : 'Катталуу'}</button>
          </div>
        </form>
      )}
      <p className="text-center text-sm text-muted mt-5">Аккаунт барбы? <Link to="/login" className="text-primary-600 font-semibold hover:underline">Кирүү</Link></p>
    </div>
  );
}
