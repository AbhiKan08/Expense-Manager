import { useState, useEffect } from 'react';
import { api } from '../api';
import { formatCurrency } from '../utils/dateHelpers';

const TYPE_LABELS = { debit: 'Debit', credit: 'Credit', investment: 'Investment', selfTransfer: 'Transfer' };
const TYPE_COLOR  = {
  debit:        'bg-rose-50 text-rose-700 border-rose-200',
  credit:       'bg-emerald-50 text-emerald-700 border-emerald-200',
  investment:   'bg-violet-50 text-violet-700 border-violet-200',
  selfTransfer: 'bg-sky-50 text-sky-700 border-sky-200',
};
const AMOUNT_COLOR = { debit: 'text-rose-600', credit: 'text-emerald-600', investment: 'text-violet-600', selfTransfer: 'text-sky-600' };

export default function GmailSync({ categories, subCategories, onAddTransaction }) {
  const [status, setStatus]       = useState(null);   // null | { connected, lastSync }
  const [syncing, setSyncing]     = useState(false);
  const [rows, setRows]           = useState([]);
  const [selected, setSelected]   = useState(new Set());
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [error, setError]         = useState('');
  const [emailsScanned, setEmailsScanned] = useState(null);

  // Check if Gmail was just connected via OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('gmail') === 'connected') {
      window.history.replaceState({}, '', window.location.pathname);
    }
    loadStatus();
  }, []);

  async function loadStatus() {
    try {
      const s = await api.gmailStatus();
      setStatus(s);
    } catch {
      setStatus({ connected: false, lastSync: null });
    }
  }

  function handleConnect() {
    window.location.href = '/api/gmail/connect';
  }

  async function handleDisconnect() {
    await api.gmailDisconnect();
    setStatus({ connected: false, lastSync: null });
    setRows([]); setSelected(new Set());
  }

  async function handleSync() {
    setSyncing(true); setError(''); setRows([]); setSelected(new Set()); setImportedCount(0);
    try {
      const data = await api.gmailSync();
      setEmailsScanned(data.emailsScanned);
      const txs = data.transactions;
      setRows(txs);
      setSelected(new Set(txs.map(t => t.id)));
      await loadStatus();
    } catch (err) {
      setError(err.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  function updateRow(id, field, value) {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      if (field === 'type') updated.category = (categories[value] || [])[0] || '';
      return updated;
    }));
  }

  function toggleSelect(id) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function toggleAll() {
    setSelected(prev => prev.size === rows.length ? new Set() : new Set(rows.map(r => r.id)));
  }

  async function handleImport() {
    setImporting(true);
    const toImport = rows.filter(r => selected.has(r.id));
    for (const tx of toImport) {
      const clean = { ...tx };
      clean.id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      clean.createdAt = new Date().toISOString();
      await onAddTransaction(clean);
    }
    setImportedCount(toImport.length);
    setImporting(false);
    setRows([]); setSelected(new Set());
  }

  if (!status) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Connection card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${status.connected ? 'bg-emerald-50' : 'bg-gray-100'}`}>
              📧
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">Gmail Auto-sync</p>
              {status.connected
                ? <p className="text-xs text-emerald-600">Connected{status.lastSync ? ` · Last synced ${new Date(status.lastSync).toLocaleDateString('en-IN')}` : ' · Never synced'}</p>
                : <p className="text-xs text-gray-500">Not connected</p>
              }
            </div>
          </div>
          {status.connected
            ? <div className="flex gap-2">
                <button onClick={handleSync} disabled={syncing}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {syncing ? 'Scanning…' : '🔄 Sync Now'}
                </button>
                <button onClick={handleDisconnect} className="px-3 py-2 text-xs text-gray-400 hover:text-rose-600 border border-gray-200 rounded-lg hover:border-rose-200">
                  Disconnect
                </button>
              </div>
            : <button onClick={handleConnect}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">
                <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Connect Gmail
              </button>
          }
        </div>

        {!status.connected && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
            <p className="font-semibold mb-1">🔒 Read-only access</p>
            <p>The app can only read emails — it can never send, delete, or modify anything in your Gmail.</p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg">{error}</div>
      )}

      {/* Syncing state */}
      {syncing && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="font-semibold text-gray-800 mb-1">Scanning your inbox…</p>
          <p className="text-sm text-gray-500">Claude is reading bank emails and extracting transactions</p>
        </div>
      )}

      {/* Results */}
      {!syncing && rows.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={selected.size === rows.length} onChange={toggleAll} className="w-4 h-4 accent-indigo-600" />
              <span className="text-sm text-gray-600">
                <span className="font-semibold text-gray-800">{selected.size}</span> of {rows.length} selected
                {emailsScanned !== null && <span className="text-gray-400"> · {emailsScanned} emails scanned</span>}
              </span>
            </div>
            <button onClick={handleImport} disabled={selected.size === 0 || importing}
              className="px-4 py-1.5 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {importing ? 'Saving…' : `Save ${selected.size} transaction${selected.size !== 1 ? 's' : ''}`}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="w-8 px-3 py-2" />
                  <th className="text-left px-3 py-2 text-gray-500 font-medium">Date</th>
                  <th className="text-left px-3 py-2 text-gray-500 font-medium">Type</th>
                  <th className="text-left px-3 py-2 text-gray-500 font-medium">Category</th>
                  <th className="text-right px-3 py-2 text-gray-500 font-medium">Amount</th>
                  <th className="text-left px-3 py-2 text-gray-500 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map(row => {
                  const isEditing = editingId === row.id;
                  const cats = [...(categories[row.type] || [])].sort();
                  return (
                    <tr key={row.id} className={`hover:bg-gray-50 ${!selected.has(row.id) ? 'opacity-40' : ''}`}>
                      <td className="px-3 py-2">
                        <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleSelect(row.id)} className="w-4 h-4 accent-indigo-600" />
                      </td>
                      <td className="px-3 py-2 text-gray-700 whitespace-nowrap text-xs">{row.date}</td>
                      <td className="px-3 py-2">
                        {isEditing
                          ? <select value={row.type} onChange={e => updateRow(row.id, 'type', e.target.value)} className="border border-gray-300 rounded px-1 py-0.5 text-xs bg-white">
                              {['debit','credit','investment','selfTransfer'].map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                            </select>
                          : <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${TYPE_COLOR[row.type]}`}>{TYPE_LABELS[row.type]}</span>
                        }
                      </td>
                      <td className="px-3 py-2">
                        {isEditing
                          ? <select value={row.category} onChange={e => updateRow(row.id, 'category', e.target.value)} className="border border-gray-300 rounded px-1 py-0.5 text-xs bg-white max-w-[130px]">
                              {cats.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          : <span className="text-gray-800 font-medium text-xs">{row.category}</span>
                        }
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className={`font-semibold text-sm ${AMOUNT_COLOR[row.type]}`}>{formatCurrency(row.amount)}</span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500 text-xs truncate max-w-[160px]">{row.notes || '—'}</span>
                          <button onClick={() => setEditingId(isEditing ? null : row.id)}
                            className={`shrink-0 text-xs px-1.5 py-0.5 rounded ${isEditing ? 'bg-indigo-100 text-indigo-700' : 'text-gray-400 hover:text-indigo-600'}`}>
                            {isEditing ? 'Done' : '✏️'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No results */}
      {!syncing && emailsScanned !== null && rows.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
          No new transactions found in the scanned emails.
        </div>
      )}

      {/* Success */}
      {importedCount > 0 && (
        <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg font-medium">
          ✅ {importedCount} transaction{importedCount !== 1 ? 's' : ''} saved successfully!
        </div>
      )}
    </div>
  );
}
