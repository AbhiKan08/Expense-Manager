import { useState, useRef, useCallback } from 'react';
import { formatCurrency } from '../utils/dateHelpers';
import { api } from '../api';

const SOURCE_TYPES = [
  {
    key: 'bank',
    label: 'Bank / Credit Card Statement',
    desc: 'PDF or CSV downloaded directly from your bank or card app',
    icon: '🏦',
  },
  {
    key: 'expense_manager',
    label: 'Expense Manager Export',
    desc: 'CSV export from Walnut, Money Manager, Spendee, or any other app',
    icon: '📱',
  },
];

const TYPE_OPTIONS   = ['debit', 'credit', 'investment', 'selfTransfer'];
const TYPE_LABELS    = { debit: 'Debit', credit: 'Credit', investment: 'Investment', selfTransfer: 'Transfer' };
const TYPE_COLOR     = {
  debit:        'bg-rose-50 text-rose-700 border-rose-200',
  credit:       'bg-emerald-50 text-emerald-700 border-emerald-200',
  investment:   'bg-violet-50 text-violet-700 border-violet-200',
  selfTransfer: 'bg-sky-50 text-sky-700 border-sky-200',
};

const AMOUNT_COLOR   = { debit: 'text-rose-600', credit: 'text-emerald-600', investment: 'text-violet-600', selfTransfer: 'text-sky-600' };

function StepBadge({ n, label, active, done }) {
  return (
    <div className={`flex items-center gap-2 text-sm font-medium ${active ? 'text-indigo-600' : done ? 'text-emerald-600' : 'text-gray-400'}`}>
      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
        done   ? 'bg-emerald-500 border-emerald-500 text-white' :
        active ? 'border-indigo-600 text-indigo-600' :
                 'border-gray-300 text-gray-400'
      }`}>
        {done ? '✓' : n}
      </span>
      {label}
    </div>
  );
}

export default function ImportStatement({ categories, subCategories, onAddTransaction }) {
  const [step, setStep]           = useState('source');   // source | upload | processing | review | done
  const [sourceType, setSourceType] = useState('bank');
  const [dragOver, setDragOver]   = useState(false);
  const [fileName, setFileName]   = useState('');
  const [error, setError]         = useState('');
  const [rows, setRows]           = useState([]);
  const [selected, setSelected]   = useState(new Set());
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const fileRef = useRef();

  // ── helpers ──────────────────────────────────────────────────────────────
  const typeCategories = useCallback((type) =>
    [...(categories[type] || [])].sort()
  , [categories]);

  // ── upload ────────────────────────────────────────────────────────────────
  async function processFile(file) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf','csv','txt','xls','xlsx'].includes(ext)) {
      setError('Please upload a PDF or CSV file.');
      return;
    }
    setFileName(file.name);
    setError('');
    setStep('processing');

    try {
      const data = await api.importStatement(file, sourceType);

      const txs = data.transactions.map(t => ({ ...t, _editing: false }));
      setRows(txs);
      setSelected(new Set(txs.map(t => t.id)));
      setStep('review');
    } catch (err) {
      setError(err.message);
      setStep('upload');
    }
  }

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false);
    processFile(e.dataTransfer.files[0]);
  }

  function handleFileInput(e) { processFile(e.target.files[0]); }

  // ── row editing ───────────────────────────────────────────────────────────
  function updateRow(id, field, value) {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      // reset category when type changes
      if (field === 'type') updated.category = (categories[value] || [])[0] || '';
      return updated;
    }));
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(prev =>
      prev.size === rows.length ? new Set() : new Set(rows.map(r => r.id))
    );
  }

  // ── import ────────────────────────────────────────────────────────────────
  async function handleImport() {
    setImporting(true);
    const toImport = rows.filter(r => selected.has(r.id));
    for (const tx of toImport) {
      const { _editing, ...clean } = tx;
      clean.id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      clean.createdAt = new Date().toISOString();
      await onAddTransaction(clean);
    }
    setImportedCount(toImport.length);
    setImporting(false);
    setStep('done');
  }

  function reset() {
    setStep('source'); setRows([]); setSelected(new Set());
    setFileName(''); setError(''); setImportedCount(0); setEditingId(null);
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-xl font-semibold text-gray-800 mb-2">Import Statement</h2>
      <p className="text-sm text-gray-500 mb-5">Upload a bank or credit card statement — Claude will read and categorise every transaction automatically.</p>

      {/* Steps */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        <StepBadge n="1" label="Source"     active={step==='source'}     done={step!=='source'} />
        <div className="flex-1 h-px bg-gray-200 min-w-[16px]" />
        <StepBadge n="2" label="Upload"     active={step==='upload'}     done={!['source','upload'].includes(step)} />
        <div className="flex-1 h-px bg-gray-200 min-w-[16px]" />
        <StepBadge n="3" label="Processing" active={step==='processing'} done={step==='review'||step==='done'} />
        <div className="flex-1 h-px bg-gray-200 min-w-[16px]" />
        <StepBadge n="4" label="Review"     active={step==='review'}     done={step==='done'} />
        <div className="flex-1 h-px bg-gray-200 min-w-[16px]" />
        <StepBadge n="5" label="Done"       active={step==='done'}       done={false} />
      </div>

      {/* ── STEP 0: Source type ── */}
      {step === 'source' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-700 mb-4">What are you importing?</p>
          <div className="grid sm:grid-cols-2 gap-3 mb-6">
            {SOURCE_TYPES.map((s) => (
              <button key={s.key} onClick={() => setSourceType(s.key)}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  sourceType === s.key ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                <div className="text-2xl mb-2">{s.icon}</div>
                <p className={`font-semibold text-sm mb-1 ${sourceType === s.key ? 'text-indigo-700' : 'text-gray-800'}`}>{s.label}</p>
                <p className="text-xs text-gray-500">{s.desc}</p>
              </button>
            ))}
          </div>
          <button onClick={() => setStep('upload')}
            className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
            Continue →
          </button>
        </div>
      )}

      {/* ── STEP 1: Upload ── */}
      {step === 'upload' && (
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-indigo-300 hover:bg-gray-50'
            }`}
          >
            <div className="text-4xl mb-3">📄</div>
            <p className="font-semibold text-gray-700 mb-1">Drop your statement here</p>
            <p className="text-sm text-gray-400">or click to browse — PDF or CSV supported</p>
            <input ref={fileRef} type="file" accept=".pdf,.csv,.txt,.xls,.xlsx" className="hidden" onChange={handleFileInput} />
          </div>

          {error && (
            <div className="mt-4 px-4 py-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg">{error}</div>
          )}

          <div className="mt-5 p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 space-y-1">
            <p className="font-semibold">Tips for best results:</p>
            <p>• Download statement as PDF directly from your bank/card app</p>
            <p>• CSV exports from bank websites also work well</p>
            <p>• Statements up to 20 MB are supported</p>
          </div>
        </div>
      )}

      {/* ── STEP 2: Processing ── */}
      {step === 'processing' && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-semibold text-gray-800 mb-1">Analysing <span className="text-indigo-600">{fileName}</span></p>
          <p className="text-sm text-gray-500">Claude is reading your statement and categorising transactions…</p>
          <p className="text-xs text-gray-400 mt-2">This usually takes 10–30 seconds</p>
        </div>
      )}

      {/* ── STEP 3: Review ── */}
      {step === 'review' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Toolbar */}
          <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={selected.size === rows.length} onChange={toggleAll}
                className="w-4 h-4 accent-indigo-600" />
              <span className="text-sm text-gray-600">
                <span className="font-semibold text-gray-800">{selected.size}</span> of {rows.length} selected
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={reset} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg">
                ← Re-upload
              </button>
              <button
                onClick={handleImport}
                disabled={selected.size === 0 || importing}
                className="px-4 py-1.5 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? 'Importing…' : `Import ${selected.size} transaction${selected.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="w-8 px-3 py-2"></th>
                  <th className="text-left px-3 py-2 text-gray-500 font-medium">Date</th>
                  <th className="text-left px-3 py-2 text-gray-500 font-medium">Type</th>
                  <th className="text-left px-3 py-2 text-gray-500 font-medium">Category</th>
                  <th className="text-left px-3 py-2 text-gray-500 font-medium">Sub-category</th>
                  <th className="text-right px-3 py-2 text-gray-500 font-medium">Amount</th>
                  <th className="text-left px-3 py-2 text-gray-500 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map(row => {
                  const isEditing = editingId === row.id;
                  const cats      = typeCategories(row.type);
                  return (
                    <tr key={row.id}
                      className={`hover:bg-gray-50 transition-colors ${!selected.has(row.id) ? 'opacity-40' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-2">
                        <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleSelect(row.id)}
                          className="w-4 h-4 accent-indigo-600" />
                      </td>

                      {/* Date */}
                      <td className="px-3 py-2">
                        {isEditing
                          ? <input type="date" value={row.date} onChange={e => updateRow(row.id, 'date', e.target.value)}
                              className="border border-gray-300 rounded px-2 py-1 text-xs w-32" />
                          : <span className="text-gray-700 whitespace-nowrap">{row.date}</span>
                        }
                      </td>

                      {/* Type */}
                      <td className="px-3 py-2">
                        {isEditing
                          ? <select value={row.type} onChange={e => updateRow(row.id, 'type', e.target.value)}
                              className="border border-gray-300 rounded px-2 py-1 text-xs bg-white">
                              {TYPE_OPTIONS.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                            </select>
                          : <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${TYPE_COLOR[row.type]}`}>
                              {TYPE_LABELS[row.type]}
                            </span>
                        }
                      </td>

                      {/* Category */}
                      <td className="px-3 py-2">
                        {isEditing
                          ? <select value={row.category} onChange={e => updateRow(row.id, 'category', e.target.value)}
                              className="border border-gray-300 rounded px-2 py-1 text-xs bg-white max-w-[140px]">
                              {cats.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          : <span className="text-gray-800 font-medium">{row.category}</span>
                        }
                      </td>

                      {/* Sub-category */}
                      <td className="px-3 py-2">
                        {isEditing
                          ? <select value={row.subCategory} onChange={e => updateRow(row.id, 'subCategory', e.target.value)}
                              className="border border-gray-300 rounded px-2 py-1 text-xs bg-white max-w-[140px]">
                              <option value="">None</option>
                              {subCategories.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          : <span className="text-gray-500 text-xs">{row.subCategory || '—'}</span>
                        }
                      </td>

                      {/* Amount */}
                      <td className="px-3 py-2 text-right">
                        {isEditing
                          ? <input type="number" min="0" step="0.01" value={row.amount}
                              onChange={e => updateRow(row.id, 'amount', parseFloat(e.target.value) || 0)}
                              className="border border-gray-300 rounded px-2 py-1 text-xs w-24 text-right" />
                          : <span className={`font-semibold ${AMOUNT_COLOR[row.type]}`}>
                              {formatCurrency(row.amount)}
                            </span>
                        }
                      </td>

                      {/* Notes + edit button */}
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {isEditing
                            ? <input value={row.notes} onChange={e => updateRow(row.id, 'notes', e.target.value)}
                                className="border border-gray-300 rounded px-2 py-1 text-xs flex-1 min-w-[120px]" />
                            : <span className="text-gray-500 text-xs truncate max-w-[180px]" title={row.notes}>
                                {row.notes || '—'}
                              </span>
                          }
                          <button
                            onClick={() => setEditingId(isEditing ? null : row.id)}
                            className={`shrink-0 p-1 rounded text-xs ${isEditing
                              ? 'bg-indigo-100 text-indigo-700 font-medium px-2'
                              : 'text-gray-400 hover:text-indigo-600'}`}
                          >
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

          {/* Summary footer */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 flex flex-wrap gap-4">
            {['debit','credit','investment','selfTransfer'].map(t => {
              const count = rows.filter(r => r.type === t).length;
              return count > 0
                ? <span key={t}><span className="font-medium text-gray-700">{count}</span> {TYPE_LABELS[t].toLowerCase()}{count>1?'s':''}</span>
                : null;
            })}
          </div>
        </div>
      )}

      {/* ── STEP 4: Done ── */}
      {step === 'done' && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <p className="text-lg font-semibold text-gray-800 mb-1">
            {importedCount} transaction{importedCount !== 1 ? 's' : ''} imported!
          </p>
          <p className="text-sm text-gray-500 mb-6">They're now in your Transactions and Dashboard.</p>
          <div className="flex justify-center gap-3">
            <button onClick={reset} className="px-5 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50">
              Import another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
