const LOCAL_FRONTEND_URL = 'http://localhost:5173';

const stripTrailingSlash = (value) => String(value || '').trim().replace(/\/+$/, '');

const isHttpUrl = (value) => /^https?:\/\//i.test(String(value || '').trim());

const splitList = (value) =>
  String(value || '')
    .split(',')
    .map((entry) => stripTrailingSlash(entry))
    .filter((entry) => isHttpUrl(entry));

// Frontend origins taken from the environment. FRONTEND_URL may hold a
// comma separated list so CORS and payment redirects can allow several
// deployments (production, staging, preview) at once.
const getConfiguredFrontendUrls = () => {
  const fromFrontendUrl = splitList(process.env.FRONTEND_URL);
  const fromFrontendUrls = splitList(process.env.FRONTEND_URLS);

  const unique = [];
  [...fromFrontendUrl, ...fromFrontendUrls].forEach((url) => {
    if (!unique.includes(url)) unique.push(url);
  });
  return unique;
};

const getFrontendUrl = () => getConfiguredFrontendUrls()[0] || LOCAL_FRONTEND_URL;

const getBackendUrl = () => {
  const configured = stripTrailingSlash(process.env.BACKEND_URL || process.env.API_BASE_URL);
  if (isHttpUrl(configured)) return configured;
  return null;
};

const firstForwardedValue = (value) => String(value || '').split(',')[0].trim();

// The public origin of the API the request was made to. On Render the service
// sits behind a proxy, so the forwarded headers are the only reliable source
// of the https origin Chapa must call back.
const resolveBackendUrl = (req) => {
  const configured = getBackendUrl();
  if (configured) return configured;
  if (!req) return null;

  const forwardedProto = firstForwardedValue(req.get?.('x-forwarded-proto'));
  const proto = forwardedProto || req.protocol || 'https';
  const forwardedHost = firstForwardedValue(req.get?.('x-forwarded-host'));
  const host = forwardedHost || req.get?.('host');

  if (!host) return null;
  return `${proto}://${host}`;
};

// The public origin of the web app. The browser tells us where it came from,
// which keeps payment redirects correct even when FRONTEND_URL is missing or
// stale on the server.
const resolveFrontendUrl = (req) => {
  if (req) {
    const origin = stripTrailingSlash(firstForwardedValue(req.get?.('origin')));
    if (isHttpUrl(origin)) return origin;

    const referer = req.get?.('referer');
    if (referer) {
      try {
        const refererOrigin = stripTrailingSlash(new URL(referer).origin);
        if (isHttpUrl(refererOrigin)) return refererOrigin;
      } catch {
        /* ignore malformed referer */
      }
    }
  }

  return getFrontendUrl();
};

const joinPath = (base, pathname) =>
  `${stripTrailingSlash(base)}/${String(pathname || '').replace(/^\/+/, '')}`;

const withQuery = (base, pathname, params = {}) => {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (entries.length === 0) return joinPath(base, pathname);
  const query = entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  return `${joinPath(base, pathname)}?${query}`;
};

module.exports = {
  LOCAL_FRONTEND_URL,
  getConfiguredFrontendUrls,
  getFrontendUrl,
  getBackendUrl,
  resolveBackendUrl,
  resolveFrontendUrl,
  joinPath,
  withQuery,
};
