import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

import LandingPage from '../pages/LandingPage';
import AboutPage from '../pages/AboutPage';
import ContactPage from '../pages/ContactPage';
import LoginPage from '../pages/auth/LoginPage';
import PassengerRegister from '../pages/passenger/PassengerRegister';
import PassengerDashboard from '../pages/passenger/PassengerDashboard';
import AgentDashboard from '../pages/agent/AgentDashboard';
import AdminDashboard from '../pages/admin/AdminDashboard';

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#f8fafc' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:40, height:40, border:'3px solid #e2e8f0', borderTopColor:'#059669', borderRadius:'50%', animation:'spin .7s linear infinite', margin:'0 auto 12px' }} />
        <div style={{ fontSize:'.85rem', color:'#64748b', fontWeight:600 }}>Loading EthioBus...</div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/"         element={<LandingPage />} />
    <Route path="/about"    element={<AboutPage />} />
    <Route path="/contact"  element={<ContactPage />} />
    <Route path="/login"    element={<LoginPage />} />
    <Route path="/register" element={<PassengerRegister />} />

    <Route path="/passenger/login"    element={<Navigate to="/login" replace />} />
    <Route path="/passenger/register" element={<Navigate to="/register" replace />} />
    <Route path="/agent/login"        element={<Navigate to="/login" replace />} />
    <Route path="/admin/login"        element={<Navigate to="/login" replace />} />

    <Route path="/passenger/dashboard" element={<ProtectedRoute role="passenger"><PassengerDashboard /></ProtectedRoute>} />
    <Route path="/agent/dashboard"     element={<ProtectedRoute role="agent"><AgentDashboard /></ProtectedRoute>} />
    <Route path="/admin/dashboard"     element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default AppRoutes;
