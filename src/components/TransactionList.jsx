import { useState, useMemo } from 'react';
import { formatCurrency, formatDate, today } from '../utils/dateHelpers';

const TYPE_BADGE = {
  debit:        'bg-rose-50 text-rose-700 border-rose-200',
  credit:       'bg-emerald-50 text-emerald-700 border-emerald-200',
  investment:   'bg-violet-50 text-violet-700 border-violet-200',
  selfTransfer: 'bg-sky-50 text-sky-700 border-sky-200',
};

const TYPE_LABELS = {
  debit: 'Debit', credit: 'Credit', investment: 'Investment', selfTransfer: 'Transfer',
};

const AMOUNT_COLOR = {
  debit: 'text-rose-600', credit: 'text-emerald-600',
  investment: 'text-violet-600', selfTransfer: 'text-sky-600',
};

const AMOUNT_PREFIX = { debit: '- ', credit: '+ ', investment: '', selfTransfer: '' };

function EditModal({ tx, categories, subCategories, onAddCategory, onAddSubCategory, onSave, onClose }) {
  const [amount, setAmount] = useState(String(tx.amount));
  const [date, setDate] = useState(tx.date);
  const [category, setCategory] = useState(tx.category);
  const [subCategory, setSubCategory] = useState(tx.subCategory || '');
  const [notes, setNotes] = useState(tx.notes || '');
  const [newCat, setNewCat] = useState('');
  const [showNewCat, setShowNewCat] = useState(false);
  const [newSub, setNewSub] = useState('');
  const [showNewSub, setShowNewSub] = useState(false);

  const typeKey = tx.type;
  const cats = [...(categories[typeKey] || [])].sort();

  function save() {
    if (!amount || !category) return;
    onSave({ amount: parseFloat(amount), date, category, subCategory, notes });
    onClose();
  }

  function addCat() {
    if (!newCat.trim()) return;
    onAddCategory(typeKey, newCat.trim());
    setCategory(newCat.trim());
    setNewCat(''); setShowNewCat(false);
  }

  function addSub() {
    if (!newSub.trim()) return;
    onAddSubCategory(newSub.trim());
    setSubCategory(newSub.trim());
    setNewSub(''); setShowNewSub(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Edit Transaction</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Amount</label>
            <input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <option value="">Select</option>
              {cats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {!showNewCat
              ? <button type="button" onClick={() => setShowNewCat(true)} className="text-xs text-indigo-600 mt-1">+ Add new category</button>
              : <div className="flex gap-2 mt-1"><input className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs" value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="Category name" /><button onClick={addCat} className="text-xs bg-indigo-600 text-white px-2 py-1 rounded">Add</button><button onClick={() => setShowNewCat(false)} className="text-xs text-gray-400">Cancel</button></div>
            }
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Sub-category</label>
            <select value={subCategory} onChange={e => setSubCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <option value="">None</option>
              {subCategories.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {!showNewSub
              ? <button type="button" onClick={() => setShowNewSub(true)} className="text-xs text-indigo-600 mt-1">+ Add new sub-category</button>
              : <div className="flex gap-2 mt-1"><input className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs" value={newSub} onChange={e => setNewSub(e.target.value)} placeholder="Sub-category name" /><button onClick={addSub} className="text-xs bg-indigo-600 text-white px-2 py-1 rounded">Add</button><button onClick={() => setShowNewSub(false)} className="text-xs text-gray-400">Cancel</button></div>
            }
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Notes</label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={save} className="flex-1 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">Save</button>
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50">Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function TransactionList({ transactions, onDelete, onUpdate, categories, subCategories, onAddCategory, onAddSubCategory }) {
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');
  const [editingTx, setEditingTx] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = useMemo(() => {
    let list = [...transactions];
    if (filterType !== 'all') list = list.filter(t => t.type === filterType);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.category?.toLowerCase().includes(q) ||
        t.subCategory?.toLowerCase().includes(q) ||
        t.notes?.toLowerCase().includes(q) ||
        String(t.amount).includes(q)
      );
    }
    return list;
  }, [transactions, filterType, search]);

  const TYPE_FILTER_TABS = [
    { key: 'all', label: 'All' },
    { key: 'debit', label: 'Debit' },
    { key: 'credit', label: 'Credit' },
    { key: 'investment', label: 'Investment' },
    { key: 'selfTransfer', label: 'Transfer' },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold text-gray-800 mb-5">Transactions</h2>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 space-y-3">
        <input
          type="search"
          placeholder="Search by category, notes, amount..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <div className="flex flex-wrap gap-2">
          {TYPE_FILTER_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilterType(t.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filterType === t.key ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-gray-400 mb-3 px-1">{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</p>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-sm text-gray-400">
          No transactions found
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((tx) => (
            <div key={tx.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${TYPE_BADGE[tx.type]}`}>
                    {TYPE_LABELS[tx.type]}
                  </span>
                  <span className="text-sm font-medium text-gray-800 truncate">{tx.category}</span>
                  {tx.subCategory && (
                    <span className="text-xs text-gray-400">/ {tx.subCategory}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-400">{formatDate(tx.date)}</span>
                  {tx.notes && <span className="text-xs text-gray-400 truncate">{tx.notes}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`font-semibold text-sm ${AMOUNT_COLOR[tx.type]}`}>
                  {AMOUNT_PREFIX[tx.type]}{formatCurrency(tx.amount)}
                </span>
                <button
                  onClick={() => setEditingTx(tx)}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                  title="Edit"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => setConfirmDelete(tx.id)}
                  className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                  title="Delete"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-5 max-w-sm w-full">
            <p className="font-semibold text-gray-800 mb-2">Delete transaction?</p>
            <p className="text-sm text-gray-500 mb-4">This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => { onDelete(confirmDelete); setConfirmDelete(null); }}
                className="flex-1 py-2 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700">Delete</button>
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingTx && (
        <EditModal
          tx={editingTx}
          categories={categories}
          subCategories={subCategories}
          onAddCategory={onAddCategory}
          onAddSubCategory={onAddSubCategory}
          onSave={(updates) => onUpdate(editingTx.id, updates)}
          onClose={() => setEditingTx(null)}
        />
      )}
    </div>
  );
}
