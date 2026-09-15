const API_BASE = '/api';

async function request(path, options = {}) {
  const fetchOptions = { ...options };
  delete fetchOptions.skipRefresh;
  const headers = { ...fetchOptions.headers };
  if (fetchOptions.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  return fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers,
    credentials: 'same-origin',
  });
}

async function apiFetch(path, options = {}) {
  let response = await request(path, options);
  const isAuthAction = ['/auth/login', '/auth/refresh-token'].includes(path);

  if (response.status === 401 && !isAuthAction && !options.skipRefresh) {
    const refresh = await request('/auth/refresh-token', { method: 'POST' });
    if (refresh.ok) response = await request(path, { ...options, skipRefresh: true });
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message || data?.message || data?.error || 'Error en la solicitud';
    throw new Error(typeof message === 'string' ? message : 'Error en la solicitud');
  }
  return data;
}

export { apiFetch };
