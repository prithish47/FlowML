import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import { motion } from 'framer-motion';
import { Trophy, Medal, TrendingUp } from 'lucide-react';

export default function MetricsDashboard({ results }) {
    if (!results || Object.keys(results).length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-48 opacity-40">
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#94a3b8]">Metrics Pending</p>
                <p className="text-[10px] text-[#64748b] mt-2 italic font-bold">Awaiting pipeline execution for data insight extraction.</p>
            </div>
        );
    }

    // Extract metrics, chart data, and comparison results
    let metrics = {};
    let chartData = { predictions: [], feature_importance: [], model_comparison: [] };
    let comparisonResult = null;

    Object.entries(results).forEach(([key, value]) => {
        if (key.includes('_comparison') && value?.rankings) {
            comparisonResult = value;
        } else if (key.includes('chart')) {
            chartData = { ...chartData, ...value };
        } else if (value && typeof value === 'object') {
            metrics = { ...metrics, ...value };
        }
    });

    const isComparison = comparisonResult !== null;

    // Standard metric cards (for single-model or comparison summary)
    const metricCards = isComparison
        ? [
            { label: 'Best Model', value: comparisonResult.best_model?.replace(/_/g, ' ').toUpperCase(), color: '#2563eb' },
            { label: 'Best R² Score', value: comparisonResult.best_score, color: '#16a34a' },
            { label: 'Models Compared', value: comparisonResult.total_models, color: '#8b5cf6' },
            { label: 'Problem Type', value: comparisonResult.problem_type?.toUpperCase(), color: '#0891b2' },
        ].filter(m => m.value !== undefined)
        : [
            { label: 'R² Core Accuracy', value: metrics.r2_score, color: '#2563eb' },
            { label: 'RMS Error (RMSE)', value: metrics.rmse, color: '#0891b2' },
            { label: 'Mean Absolute Err', value: metrics.mae, color: '#ca8a04' },
            { label: 'Evaluation Samples', value: metrics.test_samples, color: '#16a34a' },
        ].filter(m => m.value !== undefined);

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            {/* Metric Cards */}
            <div className="grid grid-cols-4 gap-6">
                {metricCards.map((m, i) => (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={i}
                        className="bg-[#ffffff] rounded-2xl border border-black/5 p-5 relative overflow-hidden flex flex-col justify-between group hover:border-[#2563eb]/20 transition-all shadow-sm"
                    >
                        <div className="absolute top-0 left-0 w-full h-[2px] opacity-20 group-hover:opacity-60 transition-opacity" style={{ backgroundColor: m.color }} />
                        <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest block mb-1">{m.label}</span>
                        <div className="flex items-baseline gap-2">
                            <p className="text-2xl font-bold text-[#0f172a] tabular-nums tracking-tight">
                                {typeof m.value === 'number' ?
                                    (m.value % 1 === 0 ? m.value : m.value.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 }))
                                    : m.value}
                            </p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Model Comparison Table */}
            {isComparison && comparisonResult.rankings && (
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-[#ffffff] rounded-2xl border border-black/5 p-6 shadow-xl"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h4 className="text-[11px] font-bold text-[#475569] uppercase tracking-[0.2em] flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />
                            Model Performance Comparison
                        </h4>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200/50 rounded-full">
                            <Trophy size={12} className="text-amber-500" />
                            <span className="text-[9px] font-bold text-amber-700 uppercase tracking-wider">
                                Winner: {comparisonResult.best_model?.replace(/_/g, ' ')}
                            </span>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-black/5">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-[#f8fafc] border-b border-black/5">
                                    <th className="px-5 py-3 text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Rank</th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Model</th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-right">R² Score</th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-right">RMSE</th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-right">MAE</th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-right">Samples</th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {comparisonResult.rankings.map((r, idx) => (
                                    <motion.tr
                                        key={r.model}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.4 + idx * 0.1 }}
                                        className={`border-b border-black/[0.03] transition-colors ${r.is_best
                                            ? 'bg-gradient-to-r from-blue-50/50 to-emerald-50/30 hover:from-blue-50 hover:to-emerald-50/50'
                                            : 'hover:bg-[#fafbfc]'
                                            }`}
                                    >
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2">
                                                {r.rank === 1 ? (
                                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-md shadow-amber-200/50">
                                                        <Trophy size={13} className="text-white" />
                                                    </div>
                                                ) : (
                                                    <div className="w-7 h-7 rounded-full bg-[#f1f5f9] flex items-center justify-center border border-black/5">
                                                        <span className="text-[11px] font-bold text-[#94a3b8]">{r.rank}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`text-[13px] font-bold ${r.is_best ? 'text-[#0f172a]' : 'text-[#475569]'}`}>
                                                {r.model?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <span className={`text-[13px] font-bold tabular-nums ${r.is_best ? 'text-[#16a34a]' : 'text-[#475569]'}`}>
                                                {r.r2_score?.toFixed(4)}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <span className="text-[13px] font-medium text-[#64748b] tabular-nums">{r.rmse?.toFixed(4)}</span>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <span className="text-[13px] font-medium text-[#64748b] tabular-nums">{r.mae?.toFixed(4)}</span>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <span className="text-[13px] font-medium text-[#64748b] tabular-nums">{r.test_samples}</span>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            {r.is_best ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-emerald-500 to-green-500 text-white text-[9px] font-bold uppercase tracking-wider rounded-full shadow-md shadow-emerald-200/50">
                                                    <TrendingUp size={10} />
                                                    Best
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#f1f5f9] text-[#94a3b8] text-[9px] font-bold uppercase tracking-wider rounded-full border border-black/5">
                                                    <Medal size={10} />
                                                    Runner
                                                </span>
                                            )}
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}

            {/* Model Comparison Bar Chart */}
            {chartData.model_comparison && chartData.model_comparison.length > 1 && (
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-[#ffffff] rounded-2xl border border-black/5 p-6 shadow-xl h-64"
                >
                    <h4 className="text-[11px] font-bold text-[#475569] uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#2563eb]" />
                        R² Score Comparison
                    </h4>
                    <div className="h-[calc(100%-40px)]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData.model_comparison} margin={{ left: 10, right: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" vertical={false} />
                                <XAxis
                                    dataKey="model"
                                    tick={{ fontSize: 11, fill: '#475569', fontWeight: 700 }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(v) => v?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                                    axisLine={false}
                                    tickLine={false}
                                    domain={[0, 1]}
                                />
                                <Tooltip
                                    contentStyle={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '12px', fontSize: '11px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}
                                    formatter={(value) => [value?.toFixed(4), 'R² Score']}
                                />
                                <Bar dataKey="r2_score" radius={[6, 6, 0, 0]} barSize={60}>
                                    {chartData.model_comparison.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.is_best ? '#2563eb' : '#cbd5e1'}
                                            opacity={entry.is_best ? 1 : 0.6}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            )}

            {/* Standard Charts (for single model or also shown in comparison) */}
            <div className="grid grid-cols-2 gap-8 min-h-[450px]">
                {/* Prediction Chart */}
                {chartData.predictions && chartData.predictions.length > 0 && (
                    <div className="bg-[#ffffff] rounded-2xl border border-black/5 p-6 shadow-xl flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <h4 className="text-[11px] font-bold text-[#475569] uppercase tracking-[0.2em] flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#2563eb]" />
                                Residual Projection Analysis
                            </h4>
                            <div className="flex gap-4">
                                <span className="flex items-center gap-1.5 text-[9px] font-bold text-[#2563eb]">
                                    <div className="w-2 h-0.5 bg-[#2563eb]" /> ACTUAL
                                </span>
                                <span className="flex items-center gap-1.5 text-[9px] font-bold text-[#94a3b8]">
                                    <div className="w-2 h-0.5 border-t border-dashed border-[#cbd5e1]" /> PREDICTED
                                </span>
                            </div>
                        </div>
                        <div className="flex-1 min-h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData.predictions.slice(0, 30)}>
                                    <defs>
                                        <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.02)" vertical={false} />
                                    <XAxis dataKey="index" hide />
                                    <YAxis tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '12px', fontSize: '11px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                                        itemStyle={{ fontSize: '11px', fontWeight: 700, padding: 0 }}
                                    />
                                    <Area type="monotone" dataKey="actual" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorActual)" name="Actual" dot={false} />
                                    <Line type="monotone" dataKey="predicted" stroke="#cbd5e1" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Predicted" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* Feature Importance */}
                {chartData.feature_importance && chartData.feature_importance.length > 0 && (
                    <div className="bg-[#ffffff] rounded-2xl border border-black/5 p-6 shadow-xl flex flex-col">
                        <h4 className="text-[11px] font-bold text-[#475569] uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#0891b2]" />
                            Feature Influence Weights
                        </h4>
                        <div className="flex-1 min-h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart 
                                    data={chartData.feature_importance.slice(0, 8)} 
                                    layout="vertical" 
                                    margin={{ left: 40, right: 20, top: 0, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.02)" horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis 
                                        type="category" 
                                        dataKey="feature" 
                                        tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} 
                                        width={120}
                                        axisLine={false} 
                                        tickLine={false} 
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                                        contentStyle={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '12px', fontSize: '11px' }}
                                    />
                                    <Bar dataKey="importance" fill="#0891b2" radius={[0, 4, 4, 0]} barSize={12}>
                                        {chartData.feature_importance.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index === 0 ? '#2563eb' : '#0891b2'} opacity={1 - (index * 0.1)} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
