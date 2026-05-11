import { useState, useEffect, useCallback } from 'react';
import { api } from './api';
import { DEFAULT_CATEGORIES, DEFAULT_SUBCATEGORIES } from './data/defaults';
import AddExpense from './components/AddExpense';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import ManageCategories from './components/ManageCategories';
import ImportStatement from './components/ImportStatement';
import GmailSync from './components/GmailSync';
import Login from './components/Login';

const NAV = [
  { id: 'add', label: 'Add', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )},
  { id: 'dashboard', label: 'Dashboard', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )},
  { id: 'transactions', label: 'Transactions', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )},
  { id: 'categories', label: 'Categories', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  )},
  { id: 'import', label: 'Import', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  )},
];

function ImportView({ categories, subCategories, onAddTransaction }) {
  const [tab, setTab] = useState('statement');
  return (
    <div className="max-w-5xl mx-auto">
      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-5 w-fit">
        <button
          onClick={() => setTab('statement')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            tab === 'statement' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📄 Statement
        </button>
        <button
          onClick={() => setTab('gmail')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            tab === 'gmail' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📧 Gmail Auto-sync
        </button>
      </div>

      {tab === 'statement' && (
        <ImportStatement categories={categories} subCategories={subCategories} onAddTransaction={onAddTransaction} />
      )}
      {tab === 'gmail' && (
        <GmailSync categories={categories} subCategories={subCategories} onAddTransaction={onAddTransaction} />
      )}
    </div>
  );
}

export default function App() {
  const [user, setUser]               = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [view, setView]               = useState('add');
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories]     = useState(DEFAULT_CATEGORIES);
  const [subCategories, setSubCategories] = useState(DEFAULT_SUBCATEGORIES);
  const [loading, setLoading]           = useState(true);

  // ── Check stored token on mount ───────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('em_token');
    if (!token) { setAuthChecked(true); setLoading(false); return; }

    api.getMe()
      .then((u) => { setUser(u); setAuthChecked(true); })
      .catch(() => {
        localStorage.removeItem('em_token');
        setAuthChecked(true);
        setLoading(false);
      });
  }, []);

  // ── Load data once authenticated ──────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([api.getSettings(), api.getTransactions()])
      .then(([settings, txs]) => {
        setCategories(settings.categories);
        setSubCategories(settings.subcategories);
        setTransactions(txs);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  // ── Auth handlers ─────────────────────────────────────────────────────────
  const handleLogin = useCallback((token, userData) => {
    localStorage.setItem('em_token', token);
    setUser(userData);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('em_token');
    setUser(null);
    setTransactions([]);
    setCategories(DEFAULT_CATEGORIES);
    setSubCategories(DEFAULT_SUBCATEGORIES);
  }, []);

  // ── Transaction handlers ──────────────────────────────────────────────────
  const addTransaction = useCallback(async (tx) => {
    const saved = await api.createTransaction(tx);
    setTransactions((prev) => [saved, ...prev]);
  }, []);

  const deleteTransaction = useCallback(async (id) => {
    await api.deleteTransaction(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateTransaction = useCallback(async (id, updates) => {
    await api.updateTransaction(id, updates);
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }, []);

  // ── Category handlers ─────────────────────────────────────────────────────
  const addCategory = useCallback(async (type, name) => {
    const updated = { ...categories, [type]: [...(categories[type] || []), name] };
    setCategories(updated);
    await api.updateSettings({ categories: updated });
  }, [categories]);

  const removeCategory = useCallback(async (type, name) => {
    const updated = { ...categories, [type]: categories[type].filter((c) => c !== name) };
    setCategories(updated);
    await api.updateSettings({ categories: updated });
  }, [categories]);

  const addSubCategory = useCallback(async (name) => {
    const updated = [...subCategories, name].sort();
    setSubCategories(updated);
    await api.updateSettings({ subcategories: updated });
  }, [subCategories]);

  const removeSubCategory = useCallback(async (name) => {
    const updated = subCategories.filter((s) => s !== name);
    setSubCategories(updated);
    await api.updateSettings({ subcategories: updated });
  }, [subCategories]);

  // ── Render states ─────────────────────────────────────────────────────────
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Login onLogin={handleLogin} />;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading your data…</p>
        </div>
      </div>
    );
  }

  const sharedCategoryProps = {
    categories, subCategories,
    onAddCategory: addCategory,
    onAddSubCategory: addSubCategory,
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-white border-r border-gray-200 shrink-0">
        <div className="px-6 py-5 border-b border-gray-100">
          <h1 className="text-lg font-bold text-indigo-600">Expense Manager</h1>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => (
            <button key={item.id} onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                view === item.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {item.icon}{item.label}
            </button>
          ))}
        </nav>
        {/* User info + logout */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            {user.picture
              ? <img src={user.picture} alt="" className="w-8 h-8 rounded-full" />
              : <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm">
                  {(user.name || user.email || 'U')[0].toUpperCase()}
                </div>
            }
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{user.name}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full text-xs text-gray-500 hover:text-rose-600 py-1.5 hover:bg-rose-50 rounded-lg transition-colors">
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <h1 className="text-base font-bold text-indigo-600">Expense Manager</h1>
          <div className="flex items-center gap-2">
            {user.picture
              ? <img src={user.picture} alt="" className="w-7 h-7 rounded-full" />
              : <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-xs">
                  {(user.name || 'U')[0].toUpperCase()}
                </div>
            }
            <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-rose-600">Sign out</button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6 pb-24 md:pb-6">
          {view === 'add'          && <AddExpense {...sharedCategoryProps} onAddTransaction={addTransaction} />}
          {view === 'dashboard'    && <Dashboard transactions={transactions} />}
          {view === 'transactions' && <TransactionList transactions={transactions} onDelete={deleteTransaction} onUpdate={updateTransaction} {...sharedCategoryProps} />}
          {view === 'categories'   && <ManageCategories categories={categories} subCategories={subCategories} onAddCategory={addCategory} onRemoveCategory={removeCategory} onAddSubCategory={addSubCategory} onRemoveSubCategory={removeSubCategory} />}
          {view === 'import'       && <ImportView categories={categories} subCategories={subCategories} onAddTransaction={addTransaction} />}
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex z-10">
          {NAV.map((item) => (
            <button key={item.id} onClick={() => setView(item.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors ${
                view === item.id ? 'text-indigo-600' : 'text-gray-500'
              }`}
            >
              {item.icon}{item.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
