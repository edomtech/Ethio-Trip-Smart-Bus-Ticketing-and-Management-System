const ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  COMPANY_ADMIN: 'company_admin',
  COMPANY_STAFF: 'company_staff',
  CONDUCTOR: 'conductor',
  PASSENGER: 'passenger',
});

const CANONICAL_ROLES = Object.freeze(Object.values(ROLES));

module.exports = {
  ROLES,
  CANONICAL_ROLES,
  SUPER_ADMIN: ROLES.SUPER_ADMIN,
  COMPANY_ADMIN: ROLES.COMPANY_ADMIN,
  COMPANY_STAFF: ROLES.COMPANY_STAFF,
  CONDUCTOR: ROLES.CONDUCTOR,
  PASSENGER: ROLES.PASSENGER,
};
