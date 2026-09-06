import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaCrown, FaBuilding, FaTicketAlt, FaUser, FaDesktop } from 'react-icons/fa';

const RoleDemoHeader = ({ currentRole, onSwitchRole }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const roles = [
    { id: 'super_admin', label: 'Super Admin Dashboard', icon: <FaCrown />, path: '/super-admin/dashboard', color: '#6b21a8' },
    { id: 'company_admin', label: 'Bus Company Admin Dashboard', icon: <FaBuilding />, path: '/company-admin/dashboard', color: '#1d4ed8' },
    { id: 'company_staff', label: 'Company Staff Dashboard', icon: <FaTicketAlt />, path: '/company-staff/dashboard', color: '#15803d' },
    { id: 'passenger', label: 'Passenger Dashboard', icon: <FaUser />, path: '/passenger/dashboard', color: '#7c3aed' },
  ];

  const handleRoleClick = (roleObj) => {
    if (onSwitchRole) {
      onSwitchRole(roleObj.id);
    }
    navigate(roleObj.path);
  };

  return (
    <div className="role-switcher-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
        <FaDesktop style={{ color: '#60a5fa' }} />
        <span>Ethio Trip Dashboard Suite</span>
      </div>
      <div className="role-switcher-buttons">
        {roles.map((r) => {
          const isActive = currentRole === r.id || location.pathname.startsWith(r.path.split('/dashboard')[0]);
          return (
            <button
              key={r.id}
              onClick={() => handleRoleClick(r)}
              className={`role-btn ${isActive ? 'active' : ''}`}
              style={isActive ? { borderLeft: `4px solid ${r.color}` } : {}}
            >
              {r.icon}
              <span>{r.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default RoleDemoHeader;
