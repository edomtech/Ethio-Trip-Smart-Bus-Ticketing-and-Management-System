import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

import LandingPage from '../pages/LandingPage';
import BusesPage from '../pages/BusesPage';
import AboutPage from '../pages/AboutPage';
import ContactPage from '../pages/ContactPage';
import LoginPage from '../pages/auth/LoginPage';
import VerifyEmailPage from '../pages/auth/VerifyEmailPage';
import PassengerRegister from '../pages/passenger/PassengerRegister';
import CompanyRegisterPage from '../pages/CompanyRegisterPage';
import PassengerDashboard from '../pages/passenger/PassengerDashboard';
import SuperAdminDashboard from '../pages/superAdmin/SuperAdminDashboard';
import AdminDashboard from '../pages/admin/AdminDashboard';
import AgentDashboard from '../pages/agent/AgentDashboard';
import ConductorDashboard from '../pages/conductor/ConductorDashboard';
import PaymentCallbackPage from '../pages/passenger/PaymentCallbackPage';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: '#f8fafc' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#34d399', borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ fontSize: '.9rem', color: '#94a3b8', fontWeight: 600 }}>Loading Smart Bus System...</div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && allowedRoles.length > 0) {
    const isAllowed = allowedRoles.includes(user.role) ||
      (allowedRoles.includes('super_admin') && (user.role === 'super_admin' || (user.role === 'admin' && !user.companyId))) ||
      (allowedRoles.includes('company_admin') && (user.role === 'company_admin' || (user.role === 'admin' && user.companyId))) ||
      (allowedRoles.includes('agent') && (user.role === 'agent' || user.role === 'company_staff')) ||
      (allowedRoles.includes('conductor') && user.role === 'conductor') ||
      (allowedRoles.includes('passenger') && (user.role === 'passenger' || user.role === 'user' || !user.role || String(user.role).toLowerCase() === 'passenger'));

    if (!isAllowed) {
      if (user.role === 'super_admin' || (user.role === 'admin' && !user.companyId)) return <Navigate to="/super-admin/dashboard" replace />;
      if (user.role === 'company_admin' || (user.role === 'admin' && user.companyId)) return <Navigate to="/company-admin/dashboard" replace />;
      if (user.role === 'conductor') return <Navigate to="/conductor/dashboard" replace />;
      if (user.role === 'agent' || user.role === 'company_staff') return <Navigate to="/agent/dashboard" replace />;
      return <Navigate to="/passenger/dashboard" replace />;
    }
  }

  return children;
};

export const SmartRoleRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  if (user.role === 'super_admin' || (user.role === 'admin' && !user.companyId)) return <Navigate to="/super-admin/dashboard" replace />;
  if (user.role === 'company_admin' || (user.role === 'admin' && user.companyId)) return <Navigate to="/company-admin/dashboard" replace />;
  if (user.role === 'conductor') return <Navigate to="/conductor/dashboard" replace />;
  if (user.role === 'agent' || user.role === 'company_staff') return <Navigate to="/agent/dashboard" replace />;
  return <Navigate to="/passenger/dashboard" replace />;
};

const AppRoutes = () => (
  <Routes>
    {/* Public Routes */}
    <Route path="/" element={<LandingPage />} />
    <Route path="/buses" element={<BusesPage />} />
    <Route path="/about" element={<AboutPage />} />
    <Route path="/about-us" element={<Navigate to="/about" replace />} />
    <Route path="/contact" element={<ContactPage />} />
    <Route path="/contact-us" element={<ContactPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/verify-email" element={<VerifyEmailPage />} />
    <Route path="/register" element={<PassengerRegister />} />
    <Route path="/register-company" element={<CompanyRegisterPage />} />
    <Route path="/payment/callback" element={<PaymentCallbackPage />} />
    <Route path="/chapa/callback" element={<PaymentCallbackPage />} />
    <Route path="/payments/callback" element={<PaymentCallbackPage />} />

    {/* Legacy Login & Staff Redirects */}
    <Route path="/passenger/login" element={<Navigate to="/login" replace />} />
    <Route path="/passenger/register" element={<Navigate to="/register" replace />} />
    <Route path="/agent/login" element={<Navigate to="/login" replace />} />
    <Route path="/conductor/login" element={<Navigate to="/login" replace />} />
    <Route path="/admin/login" element={<Navigate to="/login" replace />} />
    <Route path="/company-staff/dashboard" element={<Navigate to="/agent/dashboard" replace />} />

    {/* Role-Based Protected Dashboards */}
    <Route path="/passenger/dashboard" element={<ProtectedRoute allowedRoles={['passenger']}><PassengerDashboard /></ProtectedRoute>} />
    <Route path="/super-admin/dashboard" element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdminDashboard /></ProtectedRoute>} />
    <Route path="/company-admin/dashboard" element={<ProtectedRoute allowedRoles={['company_admin']}><AdminDashboard /></ProtectedRoute>} />
    <Route path="/admin/dashboard" element={<Navigate to="/company-admin/dashboard" replace />} />
    <Route path="/agent/dashboard" element={<ProtectedRoute allowedRoles={['agent', 'company_staff']}><AgentDashboard /></ProtectedRoute>} />
    <Route path="/conductor/dashboard" element={<ProtectedRoute allowedRoles={['conductor']}><ConductorDashboard /></ProtectedRoute>} />

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default AppRoutes;
