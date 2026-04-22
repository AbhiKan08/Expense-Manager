async function req(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}

export const api = {
  getSettings:       ()           => req('/api/settings'),
  updateSettings:    (data)       => req('/api/settings',            { method: 'PUT',    body: JSON.stringify(data) }),
  getTransactions:   ()           => req('/api/transactions'),
  createTransaction: (tx)         => req('/api/transactions',        { method: 'POST',   body: JSON.stringify(tx)   }),
  updateTransaction: (id, patch)  => req(`/api/transactions/${id}`,  { method: 'PUT',    body: JSON.stringify(patch) }),
  deleteTransaction: (id)         => req(`/api/transactions/${id}`,  { method: 'DELETE' }),
};
