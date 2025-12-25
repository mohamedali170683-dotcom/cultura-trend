import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { Bell, Search, Download, Plus, TrendingUp, LogOut, Settings, Tag, Users, Sparkles, RefreshCw, FileText, BarChart2, Zap } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Auth } from './components/Auth';
import { KeywordManager } from './components/KeywordManager';
import { dataApi, exportApi, aiApi, alertsApi, teamsApi, type AggregatedTrend, type AIAnalysis, type AlertSettings } from './lib/api';
import './App.css';

const COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
  primary: '#3b82f6',
  accent: '#8b5cf6'
};

const PHASE_CONFIG: Record<string, { color: string; label: string; icon: string }> = {
  baseline: { color: '#94a3b8', label: 'Baseline', icon: '➖' },
  emerging: { color: '#22c55e', label: 'Emerging', icon: '🌱' },
  early_signal: { color: '#eab308', label: 'Early Signal', icon: '🔔' },
  acceleration: { color: '#f97316', label: 'Acceleration', icon: '📈' },
  breakout: { color: '#ef4444', label: 'Breakout', icon: '🚨' },
  peak: { color: '#8b5cf6', label: 'Peak', icon: '⭐' },
  decline: { color: '#64748b', label: 'Decline', icon: '📉' }
};

const Badge: React.FC<{ variant: string; children: React.ReactNode }> = ({ variant, children }) => (
  <span className={`badge badge-${variant}`}>{children}</span>
);

const PhaseBadge: React.FC<{ phase: string }> = ({ phase }) => {
  const config = PHASE_CONFIG[phase] || { color: '#94a3b8', label: phase, icon: '●' };
  return (
    <span className="badge" style={{ backgroundColor: config.color, color: 'white' }}>
      {config.icon} {config.label}
    </span>
  );
};

const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: keyof typeof COLORS;
}> = ({ title, value, subtitle, icon, color = 'primary' }) => (
  <div className="card p-6">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
      </div>
      <div className="p-3 rounded-xl" style={{ backgroundColor: `${COLORS[color]}15` }}>
        {icon}
      </div>
    </div>
  </div>
);

const SignalCard: React.FC<{
  signal: AggregatedTrend;
  onClick: (s: AggregatedTrend) => void;
  selected?: boolean;
  onCompareToggle?: (s: AggregatedTrend) => void;
  compareMode?: boolean;
}> = ({ signal, onClick, selected, onCompareToggle, compareMode }) => {
  const urgencyLabels: Record<string, string> = {
    immediate: '⚡ IMMEDIATE',
    same_day: '🔥 Same Day',
    fast_track: '⏰ Fast Track',
    standard: '📅 Standard',
    planned: '📋 Planned'
  };

  return (
    <div
      className={`card card-clickable overflow-hidden ${signal.priority === 'critical' ? 'pulse-critical' : ''} ${selected ? 'ring-2 ring-blue-500' : ''}`}
      onClick={() => onClick(signal)}
    >
      <div className="p-5">
        <div className="flex justify-between items-center mb-3">
          <div className="flex gap-2">
            <Badge variant={signal.priority}>{signal.priority.toUpperCase()}</Badge>
            <PhaseBadge phase={signal.phase} />
          </div>
          <div className="flex items-center gap-2">
            {signal.brand && (
              <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ backgroundColor: `${signal.brandColor || '#3b82f6'}20`, color: signal.brandColor || '#3b82f6' }}>
                {signal.brand}
              </span>
            )}
            {compareMode && (
              <input type="checkbox" checked={selected} onChange={(e) => { e.stopPropagation(); onCompareToggle?.(signal); }} className="w-4 h-4" />
            )}
          </div>
        </div>
        <h3 className="font-bold text-gray-900 text-lg mb-1">{signal.keyword}</h3>
        <div className="flex gap-2 mt-2 text-xs text-gray-500">
          <span>📰 {signal.sources.news.articles}</span>
          <span>🔗 {signal.sources.reddit.mentions}</span>
          <span>📊 {signal.sources.google.interest}</span>
        </div>
      </div>
      <div style={{ height: '80px', padding: '0 8px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={signal.historicalData.slice(-30)}>
            <defs>
              <linearGradient id={`gradient-${signal.keyword}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={PHASE_CONFIG[signal.phase]?.color || '#3b82f6'} stopOpacity={0.3} />
                <stop offset="95%" stopColor={PHASE_CONFIG[signal.phase]?.color || '#3b82f6'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="value" stroke={PHASE_CONFIG[signal.phase]?.color || '#3b82f6'} strokeWidth={2} fill={`url(#gradient-${signal.keyword})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-4 gap-2 p-4 bg-gray-50 border-t">
        <div className="text-center">
          <p className="text-xs text-gray-500">R₀</p>
          <p className="font-bold" style={{ color: signal.r0 > 1.5 ? COLORS.critical : signal.r0 > 1 ? COLORS.high : COLORS.low }}>{signal.r0.toFixed(2)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">Peak</p>
          <p className="font-bold text-gray-900">{signal.peakDays}d</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">Velocity</p>
          <p className={`font-bold ${signal.velocity > 0 ? 'text-green-600' : 'text-red-500'}`}>{signal.velocity > 0 ? '+' : ''}{(signal.velocity * 100).toFixed(0)}%</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">Conf.</p>
          <p className="font-bold text-gray-900">{Math.round(signal.confidence * 100)}%</p>
        </div>
      </div>
      <div className="px-4 py-3 flex justify-between items-center border-t">
        <span className="text-sm font-semibold" style={{ color: COLORS[signal.priority as keyof typeof COLORS] || '#64748b' }}>{urgencyLabels[signal.urgency] || signal.urgency}</span>
        <span className="text-xs text-gray-400">{signal.firstMoverDays}d first-mover →</span>
      </div>
    </div>
  );
};

const SignalModal: React.FC<{ signal: AggregatedTrend | null; onClose: () => void }> = ({ signal, onClose }) => {
  if (!signal) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex gap-2 mb-2 flex-wrap">
                <Badge variant={signal.priority}>{signal.priority.toUpperCase()}</Badge>
                <PhaseBadge phase={signal.phase} />
                {signal.brand && <span className="badge" style={{ backgroundColor: `${signal.brandColor}20`, color: signal.brandColor }}>{signal.brand}</span>}
              </div>
              <h2 className="text-2xl font-bold text-gray-900">{signal.keyword}</h2>
            </div>
            <button onClick={onClose} className="close-btn">×</button>
          </div>
        </div>
        <div className="modal-body">
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="metric-card metric-card-red">
              <p className="text-xs text-gray-600 font-medium">R₀ Score</p>
              <p className="text-3xl font-bold" style={{ color: signal.r0 > 1.5 ? COLORS.critical : COLORS.high }}>{signal.r0.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">{signal.r0 > 2 ? '🔥 Super Viral' : signal.r0 > 1.5 ? '📈 Viral' : '✓ Spreading'}</p>
            </div>
            <div className="metric-card metric-card-blue">
              <p className="text-xs text-gray-600 font-medium">Signal/Noise</p>
              <p className="text-3xl font-bold text-blue-600">{signal.snr.toFixed(1)}</p>
            </div>
            <div className="metric-card metric-card-purple">
              <p className="text-xs text-gray-600 font-medium">Est. Peak</p>
              <p className="text-3xl font-bold text-purple-600">{signal.peakDays}d</p>
            </div>
            <div className="metric-card metric-card-green">
              <p className="text-xs text-gray-600 font-medium">Confidence</p>
              <p className="text-3xl font-bold text-green-600">{Math.round(signal.confidence * 100)}%</p>
            </div>
          </div>
          <div className="mb-8">
            <h3 className="font-semibold text-gray-900 mb-4">Data Sources</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl"><span className="text-lg">📰</span> News: {signal.sources.news.score}</div>
              <div className="p-4 bg-gray-50 rounded-xl"><span className="text-lg">🔗</span> Reddit: {signal.sources.reddit.score}</div>
              <div className="p-4 bg-gray-50 rounded-xl"><span className="text-lg">📊</span> Google: {signal.sources.google.score}</div>
            </div>
          </div>
          <div className="mb-8">
            <h3 className="font-semibold text-gray-900 mb-4">Trend Evolution</h3>
            <div className="bg-gray-50 rounded-xl p-4" style={{ height: '200px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={signal.historicalData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke={COLORS.primary} fill={`${COLORS.primary}30`} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="first-mover-card mb-6">
            <p className="text-blue-100 text-sm">First-Mover Window</p>
            <p className="text-3xl font-bold text-white">{signal.firstMoverDays} days</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Recommendations</h3>
            {signal.recommendations.map((rec, i) => (
              <div key={i} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl mb-2">
                <span className="font-medium">{rec.type}</span>
                <span className="text-sm text-gray-500">{rec.deadline}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ComparisonModal: React.FC<{ trends: AggregatedTrend[]; onClose: () => void }> = ({ trends, onClose }) => {
  if (trends.length < 2) return null;
  const chartData = trends[0].historicalData.map((d, i) => {
    const point: any = { date: d.date };
    trends.forEach((t, j) => { point[`trend${j}`] = t.historicalData[i]?.value || 0; });
    return point;
  });
  const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f97316', '#8b5cf6'];
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '900px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="text-2xl font-bold">Trend Comparison</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        <div className="modal-body">
          <div className="bg-gray-50 rounded-xl p-4 mb-6" style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                {trends.map((t, i) => (
                  <Line key={t.keyword} type="monotone" dataKey={`trend${i}`} name={t.keyword} stroke={colors[i % colors.length]} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <table className="w-full">
            <thead><tr className="border-b"><th className="p-3 text-left">Metric</th>{trends.map(t => <th key={t.keyword} className="p-3 text-center">{t.keyword}</th>)}</tr></thead>
            <tbody>
              <tr className="border-b"><td className="p-3">Priority</td>{trends.map(t => <td key={t.keyword} className="p-3 text-center"><Badge variant={t.priority}>{t.priority}</Badge></td>)}</tr>
              <tr className="border-b"><td className="p-3">R₀</td>{trends.map(t => <td key={t.keyword} className="p-3 text-center font-bold">{t.r0.toFixed(2)}</td>)}</tr>
              <tr className="border-b"><td className="p-3">Peak</td>{trends.map(t => <td key={t.keyword} className="p-3 text-center">{t.peakDays}d</td>)}</tr>
              <tr className="border-b"><td className="p-3">Velocity</td>{trends.map(t => <td key={t.keyword} className={`p-3 text-center ${t.velocity > 0 ? 'text-green-600' : 'text-red-500'}`}>{(t.velocity * 100).toFixed(0)}%</td>)}</tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const AIInsightsPanel: React.FC<{ analysis: AIAnalysis | null; loading: boolean }> = ({ analysis, loading }) => {
  if (loading) return <div className="card p-6"><div className="flex items-center gap-2 mb-4"><Sparkles size={20} className="text-purple-500" /><h3 className="font-semibold">AI Insights</h3></div><div className="animate-pulse space-y-3"><div className="h-4 bg-gray-200 rounded w-3/4"></div><div className="h-4 bg-gray-200 rounded w-1/2"></div></div></div>;
  if (!analysis) return null;
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2"><Sparkles size={20} className="text-purple-500" /><h3 className="font-semibold">AI Insights</h3></div>
        <span className="text-lg font-bold text-purple-600">{analysis.opportunityScore}</span>
      </div>
      <p className="text-sm text-gray-600 mb-4">{analysis.summary}</p>
      {analysis.recommendations.slice(0, 2).map((rec, i) => (
        <div key={i} className="p-3 bg-gray-50 rounded-lg mb-2">
          <div className="flex items-center gap-2"><Badge variant={rec.priority}>{rec.type}</Badge><span className="font-medium text-sm">{rec.title}</span></div>
        </div>
      ))}
      {analysis.contentIdeas.length > 0 && <div className="mt-4"><p className="text-xs text-gray-500 mb-2">Content Ideas</p>{analysis.contentIdeas.slice(0, 3).map((idea, i) => <p key={i} className="text-xs text-gray-600">💡 {idea}</p>)}</div>}
    </div>
  );
};

function Navigation() {
  const { user, signOut, isDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  return (
    <nav className="nav">
      <div className="container nav-inner">
        <div className="flex items-center gap-3">
          <div className="logo-icon"><TrendingUp size={24} color="white" /></div>
          <div><h1 className="text-xl font-bold gradient-text">TrendPulse</h1><p className="text-xs text-gray-500">v2.0</p></div>
        </div>
        <div className="nav-links">
          <span className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`} onClick={() => navigate('/dashboard')}>📊 Dashboard</span>
          <span className={`nav-link ${isActive('/keywords') ? 'active' : ''}`} onClick={() => navigate('/keywords')}><Tag size={16} style={{ display: 'inline', marginRight: '4px' }} />Keywords</span>
          <span className={`nav-link ${isActive('/reports') ? 'active' : ''}`} onClick={() => navigate('/reports')}><FileText size={16} style={{ display: 'inline', marginRight: '4px' }} />Reports</span>
          <span className={`nav-link ${isActive('/settings') ? 'active' : ''}`} onClick={() => navigate('/settings')}><Settings size={16} style={{ display: 'inline', marginRight: '4px' }} />Settings</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="notification-btn"><Bell size={20} /></div>
          {isDemo ? <div className="demo-badge">Demo</div> : (
            <div className="flex items-center gap-2">
              <div className="avatar">{user?.email?.charAt(0).toUpperCase() || 'U'}</div>
              <button onClick={() => { signOut(); navigate('/'); }} className="btn btn-outline" style={{ padding: '0.5rem' }}><LogOut size={18} /></button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

function Dashboard() {
  const [signals, setSignals] = useState<AggregatedTrend[]>([]);
  const [selectedSignal, setSelectedSignal] = useState<AggregatedTrend | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterBrand, setFilterBrand] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<AggregatedTrend[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dataApi.analyzeUserKeywords();
      setSignals(data.results);
      setAiLoading(true);
      const ai = await aiApi.getRecommendations(data.results.map(r => ({ keyword: r.keyword, brand: r.brand, priority: r.priority, r0: r.r0, phase: r.phase })));
      setAiAnalysis(ai);
    } catch (error) { console.error('Failed to fetch:', error); }
    finally { setLoading(false); setAiLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredSignals = useMemo(() => signals.filter(s => {
    if (filterPriority !== 'all' && s.priority !== filterPriority) return false;
    if (filterBrand !== 'all' && s.brand !== filterBrand) return false;
    if (searchQuery && !s.keyword.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }), [signals, filterPriority, filterBrand, searchQuery]);

  const stats = useMemo(() => ({
    total: signals.length,
    critical: signals.filter(s => s.priority === 'critical').length,
    high: signals.filter(s => s.priority === 'high').length,
    avgR0: signals.length > 0 ? (signals.reduce((a, s) => a + s.r0, 0) / signals.length).toFixed(2) : '0',
    avgPeak: signals.length > 0 ? Math.round(signals.reduce((a, s) => a + s.peakDays, 0) / signals.length) : 0
  }), [signals]);

  const priorityData = [
    { name: 'Critical', value: stats.critical, color: COLORS.critical },
    { name: 'High', value: stats.high, color: COLORS.high },
    { name: 'Medium', value: signals.filter(s => s.priority === 'medium').length, color: COLORS.medium },
    { name: 'Low', value: signals.filter(s => s.priority === 'low').length, color: COLORS.low }
  ];

  const brands = [...new Set(signals.map(s => s.brand).filter(Boolean))] as string[];

  const handleExport = async (format: 'csv' | 'json' | 'html') => {
    try {
      const blob = await exportApi.export(format, filteredSignals);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `trendpulse.${format}`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error('Export failed:', e); }
  };

  const toggleCompare = (signal: AggregatedTrend) => {
    setSelectedForCompare(prev => {
      const exists = prev.find(s => s.keyword === signal.keyword);
      if (exists) return prev.filter(s => s.keyword !== signal.keyword);
      if (prev.length >= 5) return prev;
      return [...prev, signal];
    });
  };

  return (
    <>
      <Navigation />
      <main className="container py-8">
        <div className="grid grid-cols-4 gap-6 mb-8">
          <StatCard title="Active Signals" value={stats.total} subtitle={`${stats.critical} critical`} icon={<TrendingUp size={24} color={COLORS.primary} />} />
          <StatCard title="Critical Alerts" value={stats.critical} subtitle="Immediate action" icon={<Zap size={24} color={COLORS.critical} />} color="critical" />
          <StatCard title="Avg Lead Time" value={`${stats.avgPeak}d`} subtitle="Before peak" icon={<BarChart2 size={24} color={COLORS.accent} />} color="accent" />
          <StatCard title="Avg R₀" value={stats.avgR0} subtitle="Spread rate" icon={<TrendingUp size={24} color={COLORS.high} />} color="high" />
        </div>

        <div className="card p-4 mb-6">
          <div className="flex gap-4 items-center flex-wrap">
            <div className="search-wrapper flex-1"><Search size={18} className="search-icon" /><input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="input" /></div>
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="select">
              <option value="all">All Priorities</option>
              <option value="critical">🔴 Critical</option>
              <option value="high">🟠 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select>
            <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)} className="select">
              <option value="all">All Brands</option>
              {brands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <button className={`btn ${compareMode ? 'btn-primary' : 'btn-outline'}`} onClick={() => { setCompareMode(!compareMode); if (compareMode) setSelectedForCompare([]); }}><BarChart2 size={18} />Compare</button>
            <div className="relative group">
              <button className="btn btn-secondary"><Download size={18} />Export</button>
              <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border hidden group-hover:block z-10">
                <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2 hover:bg-gray-50">CSV</button>
                <button onClick={() => handleExport('json')} className="w-full text-left px-4 py-2 hover:bg-gray-50">JSON</button>
                <button onClick={() => handleExport('html')} className="w-full text-left px-4 py-2 hover:bg-gray-50">HTML</button>
              </div>
            </div>
            <button onClick={fetchData} className="btn btn-outline" disabled={loading}><RefreshCw size={18} className={loading ? 'animate-spin' : ''} /></button>
          </div>
          {compareMode && selectedForCompare.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
              <span className="text-sm text-blue-700">{selectedForCompare.length} selected</span>
              <button className="btn btn-primary" onClick={() => setShowComparison(true)} disabled={selectedForCompare.length < 2}>Compare</button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Active Signals <span className="text-sm font-normal text-gray-500">({filteredSignals.length})</span></h2>
            {loading ? (
              <div className="grid grid-cols-2 gap-4">{[1,2,3,4].map(i => <div key={i} className="card p-6 animate-pulse"><div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div><div className="h-6 bg-gray-200 rounded w-3/4"></div></div>)}</div>
            ) : filteredSignals.length === 0 ? (
              <div className="card p-12 text-center"><p className="text-gray-500 mb-4">No trends. Add keywords to start!</p><button className="btn btn-primary" onClick={() => navigate('/keywords')}><Plus size={18} />Add Keywords</button></div>
            ) : (
              <div className="grid grid-cols-2 gap-4">{filteredSignals.map(s => <SignalCard key={s.keyword} signal={s} onClick={setSelectedSignal} compareMode={compareMode} selected={selectedForCompare.some(x => x.keyword === s.keyword)} onCompareToggle={toggleCompare} />)}</div>
            )}
          </div>
          <div className="flex flex-col gap-6">
            <AIInsightsPanel analysis={aiAnalysis} loading={aiLoading} />
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Priority Distribution</h3>
              <div style={{ height: '180px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={priorityData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value">{priorityData.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip /></PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-3 flex-wrap justify-center mt-2">{priorityData.map((e, i) => <div key={i} className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: e.color }} /><span className="text-xs">{e.name}: {e.value}</span></div>)}</div>
            </div>
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Data Sources</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl"><span>📰 News API</span><span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">Active</span></div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl"><span>🔗 Reddit</span><span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">Active</span></div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl"><span>📊 Google</span><span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">Active</span></div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <footer className="footer"><div className="container py-6 flex justify-between items-center"><div className="flex items-center gap-2"><TrendingUp size={20} color={COLORS.primary} /><span className="font-semibold gradient-text">TrendPulse</span></div><span className="text-sm text-gray-500">Cultural Trend Prediction • R₀ Science</span></div></footer>
      <SignalModal signal={selectedSignal} onClose={() => setSelectedSignal(null)} />
      {showComparison && <ComparisonModal trends={selectedForCompare} onClose={() => setShowComparison(false)} />}
    </>
  );
}

function KeywordsPage() {
  return <><Navigation /><main className="container py-8"><h1 className="text-2xl font-bold text-gray-900 mb-2">Keyword Management</h1><p className="text-gray-500 mb-6">Add brands and keywords to track</p><KeywordManager /></main></>;
}

function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const handleExport = async (format: 'csv' | 'json' | 'html') => {
    setLoading(true);
    try {
      const blob = await exportApi.export(format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `report.${format}`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  return (
    <><Navigation /><main className="container py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Reports & Exports</h1>
      <p className="text-gray-500 mb-6">Generate trend analysis reports</p>
      <div className="grid grid-cols-3 gap-6">
        <div className="card p-6 hover:shadow-lg cursor-pointer" onClick={() => handleExport('csv')}><div className="text-4xl mb-4">📄</div><h3 className="font-semibold mb-2">CSV Export</h3><p className="text-sm text-gray-500">Raw data for spreadsheets</p></div>
        <div className="card p-6 hover:shadow-lg cursor-pointer" onClick={() => handleExport('json')}><div className="text-4xl mb-4">📋</div><h3 className="font-semibold mb-2">JSON Export</h3><p className="text-sm text-gray-500">Structured data for APIs</p></div>
        <div className="card p-6 hover:shadow-lg cursor-pointer" onClick={() => handleExport('html')}><div className="text-4xl mb-4">📊</div><h3 className="font-semibold mb-2">HTML Report</h3><p className="text-sm text-gray-500">Visual report for sharing</p></div>
      </div>
      {loading && <div className="mt-8 text-center"><RefreshCw className="animate-spin inline-block" /><p className="mt-2 text-gray-500">Generating...</p></div>}
    </main></>
  );
}

function SettingsPage() {
  const { user, isDemo } = useAuth();
  const [alertSettings, setAlertSettings] = useState<AlertSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [teamData, setTeamData] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const settings = await alertsApi.getSettings();
        setAlertSettings(settings);
        const teams = await teamsApi.get();
        setTeamData(teams);
      } catch (e) { console.error(e); }
    };
    load();
  }, []);

  const updateSetting = async (key: string, value: any) => {
    if (!alertSettings) return;
    setSaving(true);
    try { const updated = await alertsApi.updateSettings({ [key]: value }); setAlertSettings(updated); }
    catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const createTeam = async () => {
    if (!teamName.trim()) return;
    try { await teamsApi.create(teamName); const teams = await teamsApi.get(); setTeamData(teams); setTeamName(''); }
    catch (e) { console.error(e); }
  };

  const inviteMember = async () => {
    if (!inviteEmail.trim() || !teamData?.ownedTeams[0]) return;
    try { await teamsApi.invite(teamData.ownedTeams[0].id, inviteEmail); const teams = await teamsApi.get(); setTeamData(teams); setInviteEmail(''); }
    catch (e) { console.error(e); }
  };

  return (
    <><Navigation /><main className="container py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
      <p className="text-gray-500 mb-6">Manage account, alerts, and team</p>
      <div className="grid grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-semibold mb-4">Account</h3>
          {isDemo ? <p className="text-gray-500">Demo mode</p> : <><p className="text-sm text-gray-500">Email</p><p className="font-medium">{user?.email}</p></>}
        </div>
        <div className="card p-6">
          <h3 className="font-semibold mb-4">Alert Notifications</h3>
          {alertSettings ? (
            <div className="space-y-3">
              <label className="flex items-center justify-between"><span>Email alerts</span><input type="checkbox" checked={alertSettings.emailEnabled} onChange={e => updateSetting('emailEnabled', e.target.checked)} /></label>
              <label className="flex items-center justify-between"><span>Critical alerts</span><input type="checkbox" checked={alertSettings.criticalAlerts} onChange={e => updateSetting('criticalAlerts', e.target.checked)} /></label>
              <label className="flex items-center justify-between"><span>High alerts</span><input type="checkbox" checked={alertSettings.highAlerts} onChange={e => updateSetting('highAlerts', e.target.checked)} /></label>
              <div><label className="text-sm text-gray-500">Frequency</label><select value={alertSettings.digestFrequency} onChange={e => updateSetting('digestFrequency', e.target.value)} className="select w-full mt-1"><option value="instant">Instant</option><option value="daily">Daily</option><option value="weekly">Weekly</option></select></div>
            </div>
          ) : <div className="animate-pulse"><div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div><div className="h-4 bg-gray-200 rounded w-1/2"></div></div>}
          {saving && <p className="text-xs text-gray-400 mt-2">Saving...</p>}
        </div>
        <div className="card p-6">
          <h3 className="font-semibold mb-4">Slack Integration</h3>
          {alertSettings && (
            <div className="space-y-3">
              <label className="flex items-center justify-between"><span>Enable Slack</span><input type="checkbox" checked={alertSettings.slackEnabled} onChange={e => updateSetting('slackEnabled', e.target.checked)} /></label>
              {alertSettings.slackEnabled && <input type="text" placeholder="Webhook URL" value={alertSettings.slackWebhook || ''} onChange={e => updateSetting('slackWebhook', e.target.value)} className="input w-full" style={{ paddingLeft: '1rem' }} />}
            </div>
          )}
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4"><Users size={20} /><h3 className="font-semibold">Team</h3></div>
          {teamData?.currentTeam ? (
            <div>
              <p className="font-medium">{teamData.currentTeam.name}</p>
              <p className="text-sm text-gray-500 mb-4">{teamData.currentTeam.members?.length || 0} members</p>
              {teamData.isTeamOwner && <div className="flex gap-2"><input type="email" placeholder="Invite email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="input flex-1" style={{ paddingLeft: '1rem' }} /><button onClick={inviteMember} className="btn btn-primary">Invite</button></div>}
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-4">Create a team to collaborate</p>
              <div className="flex gap-2"><input type="text" placeholder="Team name" value={teamName} onChange={e => setTeamName(e.target.value)} className="input flex-1" style={{ paddingLeft: '1rem' }} /><button onClick={createTeam} className="btn btn-primary">Create</button></div>
            </div>
          )}
        </div>
      </div>
    </main></>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/keywords" element={<KeywordsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
