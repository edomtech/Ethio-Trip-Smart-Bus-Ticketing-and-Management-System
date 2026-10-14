import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { normalizeRole, getDashboardPath } from '../utils/roleUtils';

import LandingPage from '../pages/LandingPage';
import BusesPage from '../pages/BusesPage';
import AboutPage from '../pages/AboutPage';
import ContactPage from '../pages/ContactPage';
import LoginPage from '../pages/auth/LoginPage';
import VerifyEmailPage from '../pages/auth/VerifyEmailPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import PassengerRegister from '../pages/passenger/PassengerRegister';
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
      <div className="flex items-center justify-center h-screen bg-[#0f172a] text-slate-100">
        <div className="text-center">
          <div className="w-10 h-10 border-[3px] border-slate-200 border-t-emerald-400 rounded-full animate-spin mx-auto mb-3" />
          <div className="text-[0.9rem] text-slate-400 font-semibold">Loading Ethio Trip...</div>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && allowedRoles.length > 0) {
    const userRoleNorm = normalizeRole(user.role);
    const allowedNorm = allowedRoles.map(r => normalizeRole(r));
    const isAllowed = allowedNorm.includes(userRoleNorm);

    if (!isAllowed) {
      return <Navigate to={getDashboardPath(user.role, user.companyId)} replace />;
    }
  }

  return children;
};

export const SmartRoleRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return <Navigate to={getDashboardPath(user.role, user.companyId)} replace />;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/buses" element={<BusesPage />} />
    <Route path="/about" element={<AboutPage />} />
    <Route path="/about-us" element={<Navigate to="/about" replace />} />
    <Route path="/contact" element={<ContactPage />} />
    <Route path="/contact-us" element={<ContactPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/verify-email" element={<VerifyEmailPage />} />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/register" element={<PassengerRegister />} />
    <Route path="/register-company" element={<Navigate to="/login" replace />} />
    <Route path="/payment/callback" element={<PaymentCallbackPage />} />
    <Route path="/chapa/callback" element={<PaymentCallbackPage />} />
    <Route path="/payments/callback" element={<PaymentCallbackPage />} />

    <Route path="/passenger/login" element={<Navigate to="/login" replace />} />
    <Route path="/passenger/register" element={<Navigate to="/register" replace />} />
    <Route path="/agent/login" element={<Navigate to="/login" replace />} />
    <Route path="/conductor/login" element={<Navigate to="/login" replace />} />
    <Route path="/admin/login" element={<Navigate to="/login" replace />} />

    <Route path="/passenger/dashboard" element={<ProtectedRoute allowedRoles={['passenger']}><PassengerDashboard /></ProtectedRoute>} />
    <Route path="/platform-admin/dashboard" element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdminDashboard /></ProtectedRoute>} />
    <Route path="/super-admin/dashboard" element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdminDashboard /></ProtectedRoute>} />
    <Route path="/company-admin/dashboard" element={<ProtectedRoute allowedRoles={['company_admin']}><AdminDashboard /></ProtectedRoute>} />
    <Route path="/company-staff/dashboard" element={<ProtectedRoute allowedRoles={['company_staff']}><AgentDashboard /></ProtectedRoute>} />
    <Route path="/conductor/dashboard" element={<ProtectedRoute allowedRoles={['conductor']}><ConductorDashboard /></ProtectedRoute>} />

    <Route path="/admin/dashboard" element={<Navigate to="/company-admin/dashboard" replace />} />
    <Route path="/agent/dashboard" element={<Navigate to="/company-staff/dashboard" replace />} />

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default AppRoutes;

