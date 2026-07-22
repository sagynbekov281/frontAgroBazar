import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Sprout, Search, Bell, Heart, MessageSquare, Menu, X, LogOut, ChevronDown, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import { ROLE_LABELS } from '../constants';

const navLinks = [
  { to: '/catalog', label: 'Каталог' },
  { to: '/announcements', label: 'Покупка' },
  { to: '/transport', label: 'Транспорт' },
  { to: '/prices', label: 'Цены' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { user, logout } = useAuth();
  const { ids } = useFavorites();
  const navigate = useNavigate();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) { navigate(`/catalog?search=${encodeURIComponent(search.trim())}`); setOpen(false); }
  }

  const dashPath = user?.role === 'admin' ? '/admin' : user?.role === 'transport' ? '/transport-dashboard' : '/dashboard';

  return (
    <header className="bg-card border-b border-border sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-4">
        {/* top bar */}
        <div className="flex items-center gap-1.5 sm:gap-3 h-14 sm:h-16">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary-600 flex items-center justify-center shrink-0">
              <Sprout size={18} className="text-white sm:hidden" />
              <Sprout size={20} className="text-white hidden sm:block" />
            </div>
            <span className="font-display text-lg text-primary-700 hidden sm:block">AgroBazar</span>
          </Link>

          <form onSubmit={handleSearch} className="flex-1 max-w-lg hidden md:flex items-center">
            <div className="relative w-full">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Товар, фермер, регион..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-surface text-sm outline-none focus:ring-2 focus:ring-primary-600/30"
              />
            </div>
          </form>

          <div className="flex items-center gap-0.5 sm:gap-1 ml-auto">
            {/* иконки — жашырылат майда экранда, мобилдик менюда көрсөтүлөт */}
            <Link to="/favorites" className="relative p-2 sm:p-2.5 rounded-xl hover:bg-surface hidden sm:block">
              <Heart size={20} className="text-muted" />
              {ids.length > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-accent-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{ids.length}</span>}
            </Link>
            <Link to="/chat" className="p-2 sm:p-2.5 rounded-xl hover:bg-surface hidden sm:block">
              <MessageSquare size={20} className="text-muted" />
            </Link>
            <Link to="/notifications" className="p-2 sm:p-2.5 rounded-xl hover:bg-surface hidden sm:block">
              <Bell size={20} className="text-muted" />
            </Link>

            {/* мобилдик экранда чат дайыма көрүнөт, анткени эң көп колдонулат */}
            <Link to="/chat" className="p-2 rounded-xl hover:bg-surface sm:hidden">
              <MessageSquare size={19} className="text-muted" />
            </Link>

            {user ? (
              <div className="flex items-center gap-0.5 sm:gap-1 ml-0.5 sm:ml-1">
                <Link to={dashPath} className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-3 py-2 rounded-xl hover:bg-surface text-sm font-semibold">
                  <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xs shrink-0">{user.name[0]}</div>
                  <span className="hidden md:block">{user.name.split(' ')[0]}</span>
                  <ChevronDown size={14} className="text-muted hidden md:block" />
                </Link>
                <button onClick={() => { logout(); navigate('/'); }} className="p-2 sm:p-2.5 rounded-xl hover:bg-red-50 text-muted hover:text-red-500 hidden sm:block">
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2 ml-0.5 sm:ml-1">
                <Link to="/login" className="btn btn-outline text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 sm:py-2 hidden sm:flex">Войти</Link>
                <Link to="/register" className="btn btn-primary text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 sm:py-2">Зарегистрироваться</Link>
              </div>
            )}
            <button className="md:hidden p-2 sm:p-2.5 rounded-xl hover:bg-surface shrink-0" onClick={() => setOpen(!open)}>
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* nav strip */}
        <div className="hidden md:flex items-center gap-1 pb-2">
          {navLinks.map(l => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg text-sm font-medium transition ${isActive ? 'text-primary-700 bg-primary-50' : 'text-muted hover:text-text hover:bg-surface'}`}>
              {l.label}
            </NavLink>
          ))}
          {user && (
            <NavLink to={dashPath} className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg text-sm font-medium transition ${isActive ? 'text-primary-700 bg-primary-50' : 'text-muted hover:text-text hover:bg-surface'}`}>
              Личный кабинет
            </NavLink>
          )}
          {user?.role === 'admin' && (
            <span className="ml-auto flex items-center gap-1 text-xs text-accent-600 font-semibold">
              <ShieldCheck size={14} /> Admin
            </span>
          )}
          {user && (
            <span className="ml-1 badge badge-gray">{ROLE_LABELS[user.role]}</span>
          )}
        </div>
      </div>

      {/* mobile menu */}
      {open && (
        <div className="md:hidden border-t border-border bg-card px-4 py-3 space-y-1 max-h-[calc(100vh-56px)] overflow-y-auto">
          <form onSubmit={handleSearch} className="relative mb-3">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск..." className="input pl-9 text-sm" />
          </form>

          {/* тез шилтемелер (сүрөттөр, коопсоздук иконка) */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <Link to="/favorites" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-surface font-medium text-sm">
              <Heart size={16} className="text-muted shrink-0" /> Сохранённые
              {ids.length > 0 && <span className="ml-auto w-5 h-5 bg-accent-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{ids.length}</span>}
            </Link>
            <Link to="/notifications" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-surface font-medium text-sm">
              <Bell size={16} className="text-muted shrink-0" /> Уведомления
            </Link>
          </div>

          {navLinks.map(l => <NavLink key={l.to} to={l.to} onClick={() => setOpen(false)} className="block px-3 py-2.5 rounded-xl font-medium hover:bg-surface">{l.label}</NavLink>)}

          {user ? (
            <>
              <Link to={dashPath} onClick={() => setOpen(false)} className="block px-3 py-2.5 rounded-xl font-medium hover:bg-surface">Личный кабинет</Link>
              {user.role === 'admin' && (
                <div className="flex items-center gap-1 px-3 py-1 text-xs text-accent-600 font-semibold"><ShieldCheck size={13} /> Admin</div>
              )}
              <button onClick={() => { logout(); setOpen(false); navigate('/'); }} className="w-full text-left px-3 py-2.5 rounded-xl font-medium text-red-600 hover:bg-red-50 flex items-center gap-2">
                <LogOut size={16} /> Выйти
              </button>
            </>
          ) : (
            <div className="flex gap-2 pt-2">
              <Link to="/login" onClick={() => setOpen(false)} className="flex-1 btn btn-outline">Войти</Link>
              <Link to="/register" onClick={() => setOpen(false)} className="flex-1 btn btn-primary">Зарегистрироваться</Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}