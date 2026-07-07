import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import Catalog from './pages/Catalog';
import ListingDetail from './pages/ListingDetail';
import FarmerProfile from './pages/FarmerProfile';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ListingForm from './pages/ListingForm';
import Announcements from './pages/Announcements';
import Transport from './pages/Transport';
import PriceCenter from './pages/PriceCenter';
import Chat from './pages/Chat';
import Favorites from './pages/Favorites';
import AdminPanel from './pages/AdminPanel';
import { NotFound, Notifications } from './pages/misc';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main id="app-main" className="flex-1 page-enter">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/listing/:id" element={<ListingDetail />} />
          <Route path="/farmer/:id" element={<FarmerProfile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/prices" element={<PriceCenter />} />
          <Route path="/transport" element={<Transport />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/announcements/new" element={<Announcements />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/chat/:roomId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/dashboard/new" element={<ProtectedRoute><ListingForm /></ProtectedRoute>} />
          <Route path="/dashboard/edit/:id" element={<ProtectedRoute><ListingForm /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute role="admin"><AdminPanel /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
