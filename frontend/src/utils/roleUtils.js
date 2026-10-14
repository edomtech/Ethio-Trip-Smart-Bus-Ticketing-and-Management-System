

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  COMPANY_ADMIN: 'company_admin',
  COMPANY_STAFF: 'company_staff',
  CONDUCTOR: 'conductor',
  PASSENGER: 'passenger',
};


export function normalizeRole(role) {
  if (!role) return '';
  const r = String(role).toLowerCase().trim();
  if (r === 'agent' || r === 'ticket_agent' || r === 'staff') return ROLES.COMPANY_STAFF;
  if (r === 'admin' && arguments[1]?.companyId) return ROLES.COMPANY_ADMIN;
  if (r === 'admin') return ROLES.SUPER_ADMIN;
  return r;
}


export function getDashboardPath(role, companyId = null) {
  if (!role) return '/login';
  const norm = normalizeRole(role, { companyId });

  switch (norm) {
    case ROLES.SUPER_ADMIN:
      return '/platform-admin/dashboard';
    case ROLES.COMPANY_ADMIN:
      return '/company-admin/dashboard';
    case ROLES.COMPANY_STAFF:
      return '/company-staff/dashboard';
    case ROLES.CONDUCTOR:
      return '/conductor/dashboard';
    case ROLES.PASSENGER:
      return '/passenger/dashboard';
    default:
      return '/login';
  }
}

export function isSuperAdmin(role) {
  return normalizeRole(role) === ROLES.SUPER_ADMIN;
}
export const isPlatformAdmin = isSuperAdmin;

export function isCompanyAdmin(role) {
  return normalizeRole(role) === ROLES.COMPANY_ADMIN;
}

export function isCompanyStaff(role) {
  return normalizeRole(role) === ROLES.COMPANY_STAFF;
}

export function isConductor(role) {
  return normalizeRole(role) === ROLES.CONDUCTOR;
}

export function isPassenger(role) {
  return normalizeRole(role) === ROLES.PASSENGER;
}


export function getRoleDisplayName(role) {
  const norm = normalizeRole(role);
  switch (norm) {
    case ROLES.SUPER_ADMIN:
      return 'Platform Admin';
    case ROLES.COMPANY_ADMIN:
      return 'Company Admin';
    case ROLES.COMPANY_STAFF:
      return 'Company Staff';
    case ROLES.CONDUCTOR:
      return 'Bus Conductor';
    case ROLES.PASSENGER:
      return 'Passenger';
    default:
      return 'User';
  }
}
