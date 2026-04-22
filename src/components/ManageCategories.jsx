import { useState } from 'react';

const TYPE_CONFIG = [
  { key: 'debit',        label: 'Debit Categories',         color: 'rose' },
  { key: 'credit',       label: 'Credit Categories',        color: 'emerald' },
  { key: 'investment',   label: 'Investment Categories',    color: 'violet' },
  { key: 'selfTransfer', label: 'Self-Transfer Categories', color: 'sky' },
];

const COLOR_MAP = {
  rose:    { pill: 'bg-rose-50 text-rose-700 border-rose-200',    btn: 'bg-rose-500',    header: 'text-rose-600' },
  emerald: { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', btn: 'bg-emerald-500', header: 'text-emerald-600' },
  violet:  { pill: 'bg-violet-50 text-violet-700 border-violet-200',  btn: 'bg-violet-500',  header: 'text-violet-600' },
  sky:     { pill: 'bg-sky-50 text-sky-700 border-sky-200',        btn: 'bg-sky-500',    header: 'text-sky-600' },
};

function AddInput({ onAdd, placeholder }) {
  const [val, setVal] = useState('');
  return (
    <div className="flex gap-2 mt-2">
      <input
        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        placeholder={placeholder}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && val.trim()) { onAdd(val.trim()); setVal(''); } }}
      />
      <button
        onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal(''); } }}
        className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
      >
        Add
      </button>
    </div>
  );
}

function CategoryGroup({ typeKey, label, color, items, onAdd, onRemove }) {
  const c = COLOR_MAP[color];
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className={`font-semibold text-sm mb-3 ${c.header}`}>{label}</h3>
      <div className="flex flex-wrap gap-2 mb-3">
        {[...items].sort().map((item) => (
          <span key={item} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${c.pill}`}>
            {item}
            <button
              onClick={() => onRemove(typeKey, item)}
              className="leading-none hover:opacity-60 transition-opacity text-sm"
              title="Remove"
            >
              &times;
            </button>
          </span>
        ))}
        {items.length === 0 && <p className="text-xs text-gray-400">No categories yet</p>}
      </div>
      <AddInput onAdd={(name) => onAdd(typeKey, name)} placeholder="New category name..." />
    </div>
  );
}

export default function ManageCategories({
  categories, subCategories,
  onAddCategory, onRemoveCategory,
  onAddSubCategory, onRemoveSubCategory,
}) {
  const [subSearch, setSubSearch] = useState('');

  const filteredSubs = subSearch.trim()
    ? subCategories.filter(s => s.toLowerCase().includes(subSearch.toLowerCase()))
    : subCategories;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <h2 className="text-xl font-semibold text-gray-800">Manage Categories</h2>

      {/* Category groups */}
      {TYPE_CONFIG.map((cfg) => (
        <CategoryGroup
          key={cfg.key}
          typeKey={cfg.key}
          label={cfg.label}
          color={cfg.color}
          items={categories[cfg.key] || []}
          onAdd={onAddCategory}
          onRemove={onRemoveCategory}
        />
      ))}

      {/* Sub-categories */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-sm text-indigo-600 mb-3">Sub-categories</h3>
        <input
          type="search"
          placeholder="Search sub-categories..."
          value={subSearch}
          onChange={(e) => setSubSearch(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <div className="flex flex-wrap gap-2 mb-3">
          {filteredSubs.map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium bg-indigo-50 text-indigo-700 border-indigo-200">
              {s}
              <button
                onClick={() => onRemoveSubCategory(s)}
                className="leading-none hover:opacity-60 transition-opacity text-sm"
                title="Remove"
              >
                &times;
              </button>
            </span>
          ))}
          {filteredSubs.length === 0 && <p className="text-xs text-gray-400">No sub-categories found</p>}
        </div>
        <AddInput onAdd={onAddSubCategory} placeholder="New sub-category name..." />
      </div>
    </div>
  );
}
