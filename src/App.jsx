import { useState, useEffect, useCallback } from 'react';
import { api } from './api';
import { DEFAULT_CATEGORIES, DEFAULT_SUBCATEGORIES } from './data/defaults';
import AddExpense from './components/AddExpense';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import ManageCategories from './components/ManageCategories';
import ImportStatement from './components/ImportStatement';

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

export default function App() {
  const [view, setView] = useState('add');
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [subCategories, setSubCategories] = useState(DEFAULT_SUBCATEGORIES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([api.getSettings(), api.getTransactions()])
      .then(([settings, txs]) => {
        setCategories(settings.categories);
        setSubCategories(settings.subcategories);
        setTransactions(txs);
        setLoading(false);
      })
      .catch(() => {
        setError('Cannot reach the server. Make sure the backend is running.');
        setLoading(false);
      });
  }, []);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-xl border border-red-200 p-6 max-w-sm text-center">
          <p className="text-rose-600 font-semibold mb-2">Connection Error</p>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const sharedCategoryProps = { categories, subCategories, onAddCategory: addCategory, onAddSubCategory: addSubCategory };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-white border-r border-gray-200 shrink-0">
        <div className="px-6 py-5 border-b border-gray-100">
          <h1 className="text-lg font-bold text-indigo-600">Expense Manager</h1>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                view === item.id
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3">
          <h1 className="text-base font-bold text-indigo-600">Expense Manager</h1>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6 pb-24 md:pb-6">
          {view === 'add'          && <AddExpense {...sharedCategoryProps} onAddTransaction={addTransaction} />}
          {view === 'dashboard'    && <Dashboard transactions={transactions} />}
          {view === 'transactions' && <TransactionList transactions={transactions} onDelete={deleteTransaction} onUpdate={updateTransaction} {...sharedCategoryProps} />}
          {view === 'categories'   && <ManageCategories categories={categories} subCategories={subCategories} onAddCategory={addCategory} onRemoveCategory={removeCategory} onAddSubCategory={addSubCategory} onRemoveSubCategory={removeSubCategory} />}
          {view === 'import'       && <ImportStatement categories={categories} subCategories={subCategories} onAddTransaction={addTransaction} />}
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex z-10">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors ${
                view === item.id ? 'text-indigo-600' : 'text-gray-500'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
