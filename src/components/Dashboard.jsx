import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { filterByPeriod, formatCurrency, today } from '../utils/dateHelpers';
import { startOfMonth, format } from 'date-fns';

const PERIODS = ['daily', 'weekly', 'monthly', 'yearly', 'custom'];
const PERIOD_LABELS = { daily: 'Today', weekly: 'This Week', monthly: 'This Month', yearly: 'This Year', custom: 'Custom' };

const TYPE_TABS = [
  { key: 'debit',        label: 'Debits',      color: '#f43f5e' },
  { key: 'credit',       label: 'Credits',     color: '#10b981' },
  { key: 'investment',   label: 'Investments', color: '#8b5cf6' },
  { key: 'selfTransfer', label: 'Transfers',   color: '#0ea5e9' },
];

const BAR_COLORS = [
  '#6366f1','#f43f5e','#10b981','#f59e0b','#8b5cf6',
  '#0ea5e9','#ec4899','#14b8a6','#f97316','#84cc16',
];

function SummaryCard({ label, amount, color, sub }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{formatCurrency(amount)}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function BreakdownTable({ data, total, label }) {
  if (!data.length) return <p className="text-sm text-gray-400 py-4 text-center">No data for this period</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-2 px-2 text-gray-500 font-medium">{label}</th>
            <th className="text-right py-2 px-2 text-gray-500 font-medium">Amount</th>
            <th className="text-right py-2 px-2 text-gray-500 font-medium">%</th>
            <th className="text-right py-2 px-2 text-gray-500 font-medium">Count</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row.name} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="py-2 px-2 font-medium text-gray-800">{row.name}</td>
              <td className="py-2 px-2 text-right text-gray-700">{formatCurrency(row.amount)}</td>
              <td className="py-2 px-2 text-right text-gray-500">
                {total > 0 ? ((row.amount / total) * 100).toFixed(1) : 0}%
              </td>
              <td className="py-2 px-2 text-right text-gray-500">{row.count}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-200">
            <td className="py-2 px-2 font-semibold text-gray-800">Total</td>
            <td className="py-2 px-2 text-right font-semibold text-gray-800">{formatCurrency(total)}</td>
            <td className="py-2 px-2 text-right text-gray-500">100%</td>
            <td className="py-2 px-2 text-right text-gray-500">{data.reduce((s, r) => s + r.count, 0)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow p-3 text-sm">
      <p className="font-medium text-gray-800 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.fill }}>{formatCurrency(p.value)}</p>
      ))}
    </div>
  );
};

export default function Dashboard({ transactions }) {
  const [period, setPeriod] = useState('monthly');
  const [customStart, setCustomStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(today());
  const [activeType, setActiveType] = useState('debit');
  const [chartView, setChartView] = useState('category');

  const filtered = useMemo(
    () => filterByPeriod(transactions, period, customStart, customEnd),
    [transactions, period, customStart, customEnd]
  );

  const totalDebit = useMemo(() => filtered.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0), [filtered]);
  const totalCredit = useMemo(() => filtered.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0), [filtered]);
  const totalInvest = useMemo(() => filtered.filter(t => t.type === 'investment').reduce((s, t) => s + t.amount, 0), [filtered]);
  const net = totalCredit - totalDebit - totalInvest;

  const typeFiltered = useMemo(
    () => filtered.filter(t => t.type === activeType),
    [filtered, activeType]
  );

  function groupBy(key) {
    const map = {};
    typeFiltered.forEach((t) => {
      const k = t[key] || 'Uncategorised';
      if (!map[k]) map[k] = { name: k, amount: 0, count: 0 };
      map[k].amount += t.amount;
      map[k].count += 1;
    });
    return Object.values(map).sort((a, b) => b.amount - a.amount);
  }

  const catData = useMemo(() => groupBy('category'), [typeFiltered]);
  const subData = useMemo(() => groupBy('subCategory'), [typeFiltered]);
  const displayData = chartView === 'category' ? catData : subData;
  const typeTotal = typeFiltered.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold text-gray-800">Dashboard</h2>

      {/* Period selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-2 mb-3">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                period === p ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="flex flex-wrap gap-3 items-center mt-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <label className="font-medium">From</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <label className="font-medium">To</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Total Debit" amount={totalDebit} color="text-rose-500" />
        <SummaryCard label="Total Credit" amount={totalCredit} color="text-emerald-500" />
        <SummaryCard label="Investments" amount={totalInvest} color="text-violet-500" />
        <SummaryCard
          label="Net Savings"
          amount={Math.abs(net)}
          color={net >= 0 ? 'text-emerald-600' : 'text-rose-600'}
          sub={net >= 0 ? 'surplus' : 'deficit'}
        />
      </div>

      {/* Type tabs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-100">
          {TYPE_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveType(t.key)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeType === t.key
                  ? 'border-b-2 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              style={activeType === t.key ? { borderBottomColor: t.color } : {}}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {/* Category / Sub-category toggle */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              <button
                onClick={() => setChartView('category')}
                className={`px-3 py-1 rounded-full text-xs font-medium ${chartView === 'category' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                By Category
              </button>
              <button
                onClick={() => setChartView('subCategory')}
                className={`px-3 py-1 rounded-full text-xs font-medium ${chartView === 'subCategory' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                By Sub-category
              </button>
            </div>
            <span className="text-sm font-semibold text-gray-700">{formatCurrency(typeTotal)}</span>
          </div>

          {/* Bar chart */}
          {displayData.length > 0 ? (
            <>
              <div className="h-56 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={displayData} margin={{ top: 4, right: 4, left: 0, bottom: 40 }}>
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      angle={-35}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} width={50} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                      {displayData.map((_, i) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Pie chart */}
              {displayData.length <= 12 && (
                <div className="h-48 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={displayData}
                        dataKey="amount"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        innerRadius={30}
                      >
                        {displayData.map((_, i) => (
                          <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatCurrency(v)} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              <BreakdownTable
                data={displayData}
                total={typeTotal}
                label={chartView === 'category' ? 'Category' : 'Sub-category'}
              />
            </>
          ) : (
            <p className="text-sm text-gray-400 py-8 text-center">No transactions for this period</p>
          )}
        </div>
      </div>
    </div>
  );
}
