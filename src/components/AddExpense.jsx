import { useState } from 'react';
import { today } from '../utils/dateHelpers';

const TYPE_CONFIG = {
  debit:       { label: 'Debit',         color: 'rose',   key: 'debit' },
  credit:      { label: 'Credit',        color: 'emerald', key: 'credit' },
  investment:  { label: 'Investment',    color: 'violet',  key: 'investment' },
  selfTransfer:{ label: 'Self Transfer', color: 'sky',     key: 'selfTransfer' },
};

const ACTIVE_CLASSES = {
  debit:        'bg-rose-500 text-white border-rose-500',
  credit:       'bg-emerald-500 text-white border-emerald-500',
  investment:   'bg-violet-500 text-white border-violet-500',
  selfTransfer: 'bg-sky-500 text-white border-sky-500',
};

function InlineAddInput({ placeholder, onAdd, onCancel }) {
  const [val, setVal] = useState('');
  return (
    <div className="flex gap-2 mt-2">
      <input
        autoFocus
        className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        placeholder={placeholder}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { onAdd(val.trim()); setVal(''); } if (e.key === 'Escape') onCancel(); }}
      />
      <button
        type="button"
        onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal(''); } }}
        className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
      >Add</button>
      <button type="button" onClick={onCancel} className="px-3 py-1.5 text-gray-500 text-sm hover:text-gray-700">Cancel</button>
    </div>
  );
}

export default function AddExpense({ categories, subCategories, onAddCategory, onAddSubCategory, onAddTransaction }) {
  const [type, setType] = useState('debit');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [showAddCat, setShowAddCat] = useState(false);
  const [showAddSub, setShowAddSub] = useState(false);
  const [success, setSuccess] = useState(false);

  const typeKey = TYPE_CONFIG[type].key;
  const currentCats = [...(categories[typeKey] || [])].sort();
  const currentSubs = ['', ...subCategories];

  function handleTypeChange(t) {
    setType(t);
    setCategory('');
    setSubCategory('');
  }

  function handleAddCategory(name) {
    if (!name) return;
    onAddCategory(typeKey, name);
    setCategory(name);
    setShowAddCat(false);
  }

  function handleAddSubCategory(name) {
    if (!name) return;
    onAddSubCategory(name);
    setSubCategory(name);
    setShowAddSub(false);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!amount || !category) return;
    onAddTransaction({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      amount: parseFloat(amount),
      date,
      category,
      subCategory,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    });
    setAmount('');
    setCategory('');
    setSubCategory('');
    setNotes('');
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2500);
  }

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-xl font-semibold text-gray-800 mb-5">Add Transaction</h2>

      {success && (
        <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-medium">
          Transaction saved successfully!
        </div>
      )}

      {/* Type selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            type="button"
            onClick={() => handleTypeChange(key)}
            className={`py-2.5 rounded-lg border text-sm font-medium transition-all ${
              type === key ? ACTIVE_CLASSES[key] : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
            }`}
          >
            {cfg.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 text-gray-900"
            />
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 text-gray-900"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
          <select
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 text-gray-900 bg-white"
          >
            <option value="">Select category</option>
            {currentCats.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {!showAddCat && (
            <button
              type="button"
              onClick={() => setShowAddCat(true)}
              className="mt-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              + Add new category
            </button>
          )}
          {showAddCat && (
            <InlineAddInput
              placeholder="New category name"
              onAdd={handleAddCategory}
              onCancel={() => setShowAddCat(false)}
            />
          )}
        </div>

        {/* Sub-category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sub-category</label>
          <select
            value={subCategory}
            onChange={(e) => setSubCategory(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 text-gray-900 bg-white"
          >
            <option value="">None</option>
            {subCategories.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {!showAddSub && (
            <button
              type="button"
              onClick={() => setShowAddSub(true)}
              className="mt-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              + Add new sub-category
            </button>
          )}
          {showAddSub && (
            <InlineAddInput
              placeholder="New sub-category name"
              onAdd={handleAddSubCategory}
              onCancel={() => setShowAddSub(false)}
            />
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Optional notes..."
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 text-gray-900 resize-none"
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Save Transaction
        </button>
      </form>
    </div>
  );
}
