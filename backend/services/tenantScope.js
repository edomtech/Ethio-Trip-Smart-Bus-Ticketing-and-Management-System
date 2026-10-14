'use strict';

const { ROLES } = require('../constants/roles');

const isSuperAdmin = (user) => !!user && user.role === ROLES.SUPER_ADMIN;

const toIdString = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value._id) return value._id.toString();
  return value.toString();
};


const getCompanyId = (user) => {
  if (!user) return null;
  if (isSuperAdmin(user)) return null;
  return toIdString(user.companyId);
};


const httpError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};


const companyScopeOrThrow = (user, message = 'Access denied: your account is not assigned to a transport company') => {
  if (isSuperAdmin(user)) return null;

  const companyId = getCompanyId(user);
  if (!companyId) throw httpError(403, message);

  return companyId;
};


const buildCompanyFilter = (user, queryParams = {}, message) => {
  if (isSuperAdmin(user)) {
    return queryParams && queryParams.companyId ? { companyId: queryParams.companyId } : {};
  }
  return { companyId: companyScopeOrThrow(user, message) };
};


const isSameCompany = (user, companyId) => {
  if (isSuperAdmin(user)) return true;
  const userCompanyId = getCompanyId(user);
  const recordCompanyId = toIdString(companyId);
  if (!userCompanyId || !recordCompanyId) return false;
  return userCompanyId === recordCompanyId;
};


const assertSameCompany = (user, companyId, entityLabel = 'record') => {
  if (isSameCompany(user, companyId)) return;
  throw httpError(403, `Access denied: this ${entityLabel} belongs to another company`);
};

module.exports = {
  ROLES,
  isSuperAdmin,
  toIdString,
  getCompanyId,
  httpError,
  companyScopeOrThrow,
  buildCompanyFilter,
  isSameCompany,
  assertSameCompany,
};