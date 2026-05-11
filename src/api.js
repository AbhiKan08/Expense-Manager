function getToken() {
  return localStorage.getItem('em_token') || '';
}

async function req(path, opts = {}) {
  const res = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
      ...(opts.headers || {}),
    },
    ...opts,
  });
  if (res.status === 401) {
    // Token expired or invalid — clear and reload to show login
    localStorage.removeItem('em_token');
    window.location.reload();
    return;
  }
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}

export const api = {
  // Auth
  getConfig:         ()           => fetch('/api/config').then(r => r.json()),
  loginWithGoogle:   (credential) => fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  }).then(r => r.json()),
  getMe:             ()           => req('/api/auth/me'),

  // Settings
  getSettings:       ()           => req('/api/settings'),
  updateSettings:    (data)       => req('/api/settings',           { method: 'PUT',    body: JSON.stringify(data) }),

  // Transactions
  getTransactions:   ()           => req('/api/transactions'),
  createTransaction: (tx)         => req('/api/transactions',       { method: 'POST',   body: JSON.stringify(tx)   }),
  updateTransaction: (id, patch)  => req(`/api/transactions/${id}`, { method: 'PUT',    body: JSON.stringify(patch) }),
  deleteTransaction: (id)         => req(`/api/transactions/${id}`, { method: 'DELETE' }),

  // Gmail
  gmailStatus:     ()    => req('/api/gmail/status'),
  gmailSync:       ()    => req('/api/gmail/sync', { method: 'POST' }),
  gmailDisconnect: ()    => req('/api/gmail/disconnect', { method: 'DELETE' }),

  // Import
  importStatement: (file, sourceType) => {
    const form = new FormData();
    form.append('statement', file);
    form.append('sourceType', sourceType);
    return fetch('/api/import', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken()}` },
      body: form,
    }).then(async r => {
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Import failed'); }
      return r.json();
    });
  },
};
