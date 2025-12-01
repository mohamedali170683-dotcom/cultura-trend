import React, { useState, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { Bell, Search, Download, Plus, Settings, TrendingUp } from 'lucide-react';
import './App.css';

// Types
interface Signal {
  id: number;
  keyword: string;
  brand: string;
  brandColor: string;
  phase: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  r0: number;
  snr: number;
  velocity: number;
  peakDays: number;
  firstMoverDays: number;
  urgency: string;
  confidence: number;
  category: string;
  searchVolume: number;
  growth: number;
  pattern: string;
}

// Constants
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

// Mock Data
const MOCK_SIGNALS: Signal[] = [
  { id: 1, keyword: "Ozempic Ernährung", brand: "Nestlé", brandColor: '#e11d48', phase: "breakout", priority: "critical", r0: 2.34, snr: 12.5, velocity: 3.2, peakDays: 14, firstMoverDays: 11, urgency: "immediate", confidence: 0.92, category: "Health & Wellness", searchVolume: 145000, growth: 340, pattern: 'breakout' },
  { id: 2, keyword: "KI Chatbot Integration", brand: "Deutsche Telekom", brandColor: '#e20074', phase: "acceleration", priority: "high", r0: 1.85, snr: 6.8, velocity: 1.8, peakDays: 28, firstMoverDays: 25, urgency: "same_day", confidence: 0.88, category: "Technology", searchVolume: 89000, growth: 180, pattern: 'acceleration' },
  { id: 3, keyword: "Pflanzliche Proteine", brand: "Nestlé", brandColor: '#e11d48', phase: "early_signal", priority: "medium", r0: 1.25, snr: 3.2, velocity: 0.9, peakDays: 56, firstMoverDays: 53, urgency: "fast_track", confidence: 0.82, category: "Food & Nutrition", searchVolume: 67000, growth: 95, pattern: 'emerging' },
  { id: 4, keyword: "5G Smart Home", brand: "Deutsche Telekom", brandColor: '#e20074', phase: "emerging", priority: "medium", r0: 1.12, snr: 2.1, velocity: 0.6, peakDays: 90, firstMoverDays: 87, urgency: "standard", confidence: 0.75, category: "Technology", searchVolume: 34000, growth: 45, pattern: 'emerging' },
  { id: 5, keyword: "Premium Katzenfutter Bio", brand: "Purina", brandColor: '#dc2626', phase: "acceleration", priority: "high", r0: 1.68, snr: 5.4, velocity: 1.4, peakDays: 35, firstMoverDays: 32, urgency: "same_day", confidence: 0.85, category: "Pet Care", searchVolume: 28000, growth: 120, pattern: 'acceleration' },
  { id: 6, keyword: "Digitale Pflege App", brand: "Hartmann", brandColor: '#0891b2', phase: "early_signal", priority: "medium", r0: 1.32, snr: 3.8, velocity: 1.1, peakDays: 45, firstMoverDays: 42, urgency: "fast_track", confidence: 0.79, category: "Healthcare", searchVolume: 19000, growth: 85, pattern: 'emerging' },
  { id: 7, keyword: "Weihnachtsgeschenke 2025", brand: "All Clients", brandColor: '#059669', phase: "emerging", priority: "low", r0: 0.95, snr: 1.8, velocity: 0.4, peakDays: 120, firstMoverDays: 117, urgency: "planned", confidence: 0.93, category: "Seasonal", searchVolume: 450000, growth: 15, pattern: 'seasonal' },
  { id: 8, keyword: "Insektenprotein Hundefutter", brand: "Purina", brandColor: '#dc2626', phase: "emerging", priority: "low", r0: 1.08, snr: 1.9, velocity: 0.5, peakDays: 180, firstMoverDays: 177, urgency: "planned", confidence: 0.68, category: "Pet Care", searchVolume: 8500, growth: 65, pattern: 'emerging' }
];

// Utility Functions
const generateTrendData = (pattern: string, days = 90) => {
  const data = [];
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const date = new Date(now.getTime() - (days - i) * 24 * 60 * 60 * 1000);
    let value: number;
    const baseline = 25;
    switch (pattern) {
      case 'breakout':
        value = i < 70 ? baseline + Math.random() * 5 : baseline + Math.pow(1.15, i - 70) * 10;
        break;
      case 'acceleration':
        value = baseline + Math.pow(1.03, i) * 5 + Math.random() * 3;
        break;
      case 'emerging':
        value = i < 60 ? baseline + Math.random() * 5 : baseline + (i - 60) * 1.5 + Math.random() * 3;
        break;
      case 'seasonal':
        value = baseline + 30 * Math.sin((i / days) * Math.PI * 2) + Math.random() * 5;
        break;
      default:
        value = baseline + Math.random() * 8;
    }
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: Math.max(0, Math.round(value)),
      baseline
    });
  }
  return data;
};

// Components
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
  trend?: string;
  color?: keyof typeof COLORS;
}> = ({ title, value, subtitle, icon, trend, color = 'primary' }) => (
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
    {trend && (
      <div className="mt-4 flex items-center">
        <span className="text-green-500 mr-1">↑</span>
        <span className="text-sm text-green-600 font-medium">{trend}</span>
      </div>
    )}
  </div>
);

const SignalCard: React.FC<{ signal: Signal; onClick: (s: Signal) => void }> = ({ signal, onClick }) => {
  const urgencyLabels: Record<string, string> = {
    immediate: '⚡ IMMEDIATE',
    same_day: '🔥 Same Day',
    fast_track: '⏰ Fast Track',
    standard: '📅 Standard',
    planned: '📋 Planned'
  };
  const urgencyColors: Record<string, string> = {
    immediate: '#ef4444',
    same_day: '#f97316',
    fast_track: '#eab308',
    standard: '#3b82f6',
    planned: '#22c55e'
  };
  const trendData = useMemo(() => generateTrendData(signal.pattern), [signal.pattern]);

  return (
    <div
      className={`card card-clickable overflow-hidden ${signal.priority === 'critical' ? 'pulse-critical' : ''}`}
      onClick={() => onClick(signal)}
    >
      <div className="p-5">
        <div className="flex justify-between items-center mb-3">
          <div className="flex gap-2">
            <Badge variant={signal.priority}>{signal.priority.toUpperCase()}</Badge>
            <PhaseBadge phase={signal.phase} />
          </div>
          <span
            className="text-xs font-medium px-2 py-1 rounded-full"
            style={{ backgroundColor: `${signal.brandColor}20`, color: signal.brandColor }}
          >
            {signal.brand}
          </span>
        </div>
        <h3 className="font-bold text-gray-900 text-lg mb-1">{signal.keyword}</h3>
        <p className="text-sm text-gray-500">{signal.category}</p>
      </div>

      <div style={{ height: '96px', padding: '0 8px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trendData.slice(-30)}>
            <defs>
              <linearGradient id={`gradient-${signal.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={PHASE_CONFIG[signal.phase]?.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={PHASE_CONFIG[signal.phase]?.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={PHASE_CONFIG[signal.phase]?.color}
              strokeWidth={2}
              fill={`url(#gradient-${signal.id})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-4 gap-2 p-4 bg-gray-50 border-t">
        <div className="text-center">
          <p className="text-xs text-gray-500">R₀</p>
          <p className="font-bold" style={{ color: signal.r0 > 1.5 ? COLORS.critical : signal.r0 > 1 ? COLORS.high : COLORS.low }}>
            {signal.r0.toFixed(2)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">Peak</p>
          <p className="font-bold text-gray-900">{signal.peakDays}d</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">Growth</p>
          <p className="font-bold text-green-600">+{signal.growth}%</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">Conf.</p>
          <p className="font-bold text-gray-900">{Math.round(signal.confidence * 100)}%</p>
        </div>
      </div>

      <div className="px-4 py-3 flex justify-between items-center border-t">
        <span className="text-sm font-semibold" style={{ color: urgencyColors[signal.urgency] }}>
          {urgencyLabels[signal.urgency]}
        </span>
        <span className="text-xs text-gray-400">{signal.firstMoverDays}d first-mover window →</span>
      </div>
    </div>
  );
};

const SignalModal: React.FC<{ signal: Signal | null; onClose: () => void }> = ({ signal, onClose }) => {
  if (!signal) return null;
  const trendData = useMemo(() => generateTrendData(signal.pattern), [signal.pattern]);

  const recommendations: Record<string, Array<{ type: string; time: string; priority: string }>> = {
    immediate: [
      { type: 'Real-time Social Post', time: '< 2 hours', priority: 'critical' },
      { type: 'Newsjacking Thread', time: '< 4 hours', priority: 'high' }
    ],
    same_day: [
      { type: 'Social Media Series', time: '24 hours', priority: 'high' },
      { type: 'Blog Post Draft', time: '48 hours', priority: 'medium' }
    ],
    fast_track: [
      { type: 'Thought Leadership', time: '1 week', priority: 'medium' },
      { type: 'Video Explainer', time: '1-2 weeks', priority: 'medium' }
    ],
    standard: [
      { type: 'Pillar Content', time: '2-3 weeks', priority: 'medium' },
      { type: 'Video Series', time: '3-4 weeks', priority: 'low' }
    ],
    planned: [
      { type: 'Long-form Content', time: '1-2 months', priority: 'low' },
      { type: 'Campaign Strategy', time: '2-3 months', priority: 'low' }
    ]
  };

  const recs = recommendations[signal.urgency] || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex gap-2 mb-2 flex-wrap">
                <Badge variant={signal.priority}>{signal.priority.toUpperCase()}</Badge>
                <PhaseBadge phase={signal.phase} />
                <span
                  className="badge"
                  style={{ backgroundColor: `${signal.brandColor}20`, color: signal.brandColor }}
                >
                  {signal.brand}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">{signal.keyword}</h2>
              <p className="text-gray-500 mt-1">
                {signal.category} • {signal.searchVolume.toLocaleString()} monthly searches
              </p>
            </div>
            <button onClick={onClose} className="close-btn">×</button>
          </div>
        </div>

        <div className="modal-body">
          {/* Metrics Grid */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="metric-card metric-card-red">
              <p className="text-xs text-gray-600 font-medium">R₀ Score</p>
              <p className="text-3xl font-bold" style={{ color: signal.r0 > 1.5 ? COLORS.critical : COLORS.high }}>
                {signal.r0.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {signal.r0 > 2 ? '🔥 Super Viral' : signal.r0 > 1.5 ? '📈 Viral' : '✓ Spreading'}
              </p>
            </div>
            <div className="metric-card metric-card-blue">
              <p className="text-xs text-gray-600 font-medium">Signal/Noise</p>
              <p className="text-3xl font-bold text-blue-600">{signal.snr.toFixed(1)}</p>
              <p className="text-xs text-gray-500 mt-1">{signal.snr > 5 ? 'Very Strong' : 'Strong'}</p>
            </div>
            <div className="metric-card metric-card-purple">
              <p className="text-xs text-gray-600 font-medium">Est. Peak</p>
              <p className="text-3xl font-bold text-purple-600">{signal.peakDays}d</p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(Date.now() + signal.peakDays * 86400000).toLocaleDateString()}
              </p>
            </div>
            <div className="metric-card metric-card-green">
              <p className="text-xs text-gray-600 font-medium">Confidence</p>
              <p className="text-3xl font-bold text-green-600">{Math.round(signal.confidence * 100)}%</p>
              <p className="text-xs text-gray-500 mt-1">Multi-source validated</p>
            </div>
          </div>

          {/* Chart */}
          <div className="mb-8">
            <h3 className="font-semibold text-gray-900 mb-4">Trend Evolution (90 Days)</h3>
            <div className="bg-gray-50 rounded-xl p-4" style={{ height: '256px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Line type="monotone" dataKey="baseline" stroke="#94a3b8" strokeDasharray="5 5" dot={false} />
                  <Area type="monotone" dataKey="value" stroke={COLORS.primary} strokeWidth={2} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* First Mover Window */}
          <div className="first-mover-card mb-8">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div>
                <p className="text-blue-100 text-sm">First-Mover Advantage Window</p>
                <p className="text-3xl font-bold text-white">{signal.firstMoverDays} days remaining</p>
              </div>
              <div className="text-right">
                <p className="text-blue-100 text-sm">Optimal publish by</p>
                <p className="text-xl font-semibold text-white">
                  {new Date(Date.now() + Math.min(3, signal.firstMoverDays) * 86400000).toLocaleDateString('de-DE', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
            <div className="progress-bar mt-4">
              <div
                className="progress-fill"
                style={{ width: `${Math.min(100, (signal.firstMoverDays / signal.peakDays) * 100)}%` }}
              />
            </div>
          </div>

          {/* Recommendations */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">📝 Recommended Content Actions</h3>
            <div className="flex flex-col gap-3">
              {recs.map((rec, i) => (
                <div key={i} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Badge variant={rec.priority}>{rec.priority}</Badge>
                    <span className="font-medium text-gray-900">{rec.type}</span>
                  </div>
                  <span className="text-sm text-gray-500">⏱ {rec.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 flex-wrap pt-4 border-t">
            <button className="btn btn-primary flex-1">✨ Generate Content Brief</button>
            <button className="btn btn-secondary">Add to Campaign</button>
            <button className="btn btn-outline">Dismiss</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main App
export default function App() {
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterBrand, setFilterBrand] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSignals = useMemo(() => {
    return MOCK_SIGNALS.filter((s) => {
      if (filterPriority !== 'all' && s.priority !== filterPriority) return false;
      if (filterBrand !== 'all' && s.brand !== filterBrand) return false;
      if (searchQuery && !s.keyword.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    }).sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.priority] - order[b.priority];
    });
  }, [filterPriority, filterBrand, searchQuery]);

  const stats = useMemo(() => ({
    total: MOCK_SIGNALS.length,
    critical: MOCK_SIGNALS.filter((s) => s.priority === 'critical').length,
    high: MOCK_SIGNALS.filter((s) => s.priority === 'high').length,
    avgLeadTime: Math.round(MOCK_SIGNALS.reduce((acc, s) => acc + s.peakDays, 0) / MOCK_SIGNALS.length),
    avgR0: (MOCK_SIGNALS.reduce((acc, s) => acc + s.r0, 0) / MOCK_SIGNALS.length).toFixed(2)
  }), []);

  const priorityData = [
    { name: 'Critical', value: stats.critical, color: COLORS.critical },
    { name: 'High', value: stats.high, color: COLORS.high },
    { name: 'Medium', value: MOCK_SIGNALS.filter((s) => s.priority === 'medium').length, color: COLORS.medium },
    { name: 'Low', value: MOCK_SIGNALS.filter((s) => s.priority === 'low').length, color: COLORS.low }
  ];

  const brands = [...new Set(MOCK_SIGNALS.map((s) => s.brand))];

  return (
    <div className="app">
      {/* Navigation */}
      <nav className="nav">
        <div className="container nav-inner">
          <div className="flex items-center gap-3">
            <div className="logo-icon">
              <TrendingUp size={24} color="white" />
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">TrendPulse</h1>
              <p className="text-xs text-gray-500">Cultural Trend Prediction</p>
            </div>
          </div>

          <div className="nav-links">
            <span className="nav-link active">📊 Dashboard</span>
            <span className="nav-link">⚡ Signals</span>
            <span className="nav-link">🏢 Brands</span>
            <span className="nav-link">📄 Reports</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="notification-btn">
              <Bell size={20} />
              {stats.critical > 0 && <span className="notification-dot" />}
            </div>
            <div className="avatar">MA</div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Active Signals"
            value={stats.total}
            subtitle={`${stats.critical} critical alerts`}
            icon={<TrendingUp size={24} color={COLORS.primary} />}
            color="primary"
            trend="+3 this week"
          />
          <StatCard
            title="Critical Alerts"
            value={stats.critical}
            subtitle="Require immediate action"
            icon={<Bell size={24} color={COLORS.critical} />}
            color="critical"
          />
          <StatCard
            title="Avg Lead Time"
            value={`${stats.avgLeadTime}d`}
            subtitle="Before peak"
            icon={<TrendingUp size={24} color={COLORS.accent} />}
            color="accent"
          />
          <StatCard
            title="Avg R₀ Score"
            value={stats.avgR0}
            subtitle="Viral spread rate"
            icon={<TrendingUp size={24} color={COLORS.high} />}
            color="high"
          />
        </div>

        {/* Filters */}
        <div className="card p-4 mb-6">
          <div className="flex gap-4 items-center flex-wrap">
            <div className="search-wrapper flex-1">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Search trends..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input"
              />
            </div>
            <div className="flex gap-3 items-center">
              <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="select">
                <option value="all">All Priorities</option>
                <option value="critical">🔴 Critical</option>
                <option value="high">🟠 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
              <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)} className="select">
                <option value="all">All Brands</option>
                {brands.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              <button className="btn btn-primary">
                <Download size={18} />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                Active Trend Signals
                <span className="text-sm font-normal text-gray-500 ml-2">({filteredSignals.length} results)</span>
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {filteredSignals.map((signal) => (
                <SignalCard key={signal.id} signal={signal} onClick={setSelectedSignal} />
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-6">
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Priority Distribution</h3>
              <div style={{ height: '192px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={priorityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {priorityData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-3 flex-wrap justify-center mt-2">
                {priorityData.map((entry, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-xs text-gray-600">{entry.name}: {entry.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="flex flex-col gap-3">
                <button className="action-btn action-btn-primary">✨ Generate Weekly Report</button>
                <button className="action-btn">🔔 Configure Alerts</button>
                <button className="action-btn">
                  <Plus size={18} />
                  Add Keywords
                </button>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Signals by Brand</h3>
              <div className="flex flex-col gap-3">
                {brands.map((brand) => {
                  const brandSignals = MOCK_SIGNALS.filter((s) => s.brand === brand);
                  const critical = brandSignals.filter((s) => s.priority === 'critical').length;
                  return (
                    <div key={brand} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-900">{brand}</p>
                        <p className="text-xs text-gray-500">{brandSignals.length} signals</p>
                      </div>
                      {critical > 0 && <Badge variant="critical">{critical} critical</Badge>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container py-6">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={20} color={COLORS.primary} />
              <span className="font-semibold gradient-text">TrendPulse</span>
              <span className="text-gray-400">|</span>
              <span className="text-sm text-gray-500">Demo Version</span>
            </div>
            <div className="text-sm text-gray-500">Built by WPP Media Germany • Powered by R₀ Science</div>
          </div>
        </div>
      </footer>

      {/* Modal */}
      <SignalModal signal={selectedSignal} onClose={() => setSelectedSignal(null)} />
    </div>
  );
}
