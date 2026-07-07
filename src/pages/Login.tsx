import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sprout } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try { await login(email, password); navigate('/'); }
    catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-primary-600 flex items-center justify-center mx-auto mb-3"><Sprout size={26} className="text-white" /></div>
        <h1 className="font-display text-2xl font-bold">AgroBazar кирүү</h1>
        <p className="text-muted text-sm mt-1">Кабинетиңизге кириңиз</p>
      </div>
      <div className="card p-6">
        {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2.5 rounded-lg mb-4">{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          <div><label className="label">Email</label><input type="email" required className="input" value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div><label className="label">Сырсөз</label><input type="password" required className="input" value={password} onChange={e => setPassword(e.target.value)} /></div>
          <button disabled={loading} className="btn btn-primary w-full py-3">{loading ? 'Кирилүүдө...' : 'Кирүү'}</button>
        </form>
        <div className="flex gap-2 mt-4 text-xs text-center">
          <div className="flex-1 bg-primary-50 rounded-lg p-2 text-primary-700"><div className="font-semibold">Фермер</div>farmer@test.kg / 123456</div>
          <div className="flex-1 bg-orange-50 rounded-lg p-2 text-orange-700"><div className="font-semibold">Сатып алуучу</div>buyer@test.kg / 123456</div>
        </div>
      </div>
      <p className="text-center text-sm text-muted mt-5">Аккаунт жокпу? <Link to="/register" className="text-primary-600 font-semibold hover:underline">Катталуу</Link></p>
    </div>
  );
}
