import React, { useState, useEffect } from 'react';
import { Plus, X, Building2, Tag, Loader, Lightbulb, ArrowRight, TrendingUp, Zap, Clock, Target } from 'lucide-react';
import { brandsApi, keywordsApi, Brand, Keyword } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const BRAND_COLORS = [
  '#e11d48', '#e20074', '#dc2626', '#0891b2', '#059669',
  '#7c3aed', '#2563eb', '#ea580c', '#16a34a', '#9333ea'
];

const CATEGORIES = [
  'Technology', 'Health & Wellness', 'Food & Nutrition',
  'Pet Care', 'Healthcare', 'Seasonal', 'Fashion',
  'Entertainment', 'Finance', 'Travel'
];

// Example keywords to inspire users
const EXAMPLE_KEYWORDS: Record<string, string[]> = {
  'Technology': ['AI chatbots', 'Web3 gaming', 'Quantum computing', 'AR glasses', 'Electric vehicles'],
  'Health & Wellness': ['Ozempic', 'Gut health', 'Cold plunge', 'Sleep optimization', 'Adaptogens'],
  'Food & Nutrition': ['Plant-based protein', 'Functional mushrooms', 'Probiotic drinks', 'Air fryer recipes', 'Oat milk'],
  'Fashion': ['Quiet luxury', 'Y2K fashion', 'Sustainable fashion', 'Athleisure', 'Vintage denim'],
  'Entertainment': ['K-pop', 'True crime podcasts', 'Cozy gaming', 'BookTok', 'Reality TV'],
  'Finance': ['Passive income', 'Crypto staking', 'FIRE movement', 'Side hustles', 'Budget apps'],
};

interface KeywordManagerProps {
  onKeywordsChange?: (keywords: Keyword[]) => void;
}

export function KeywordManager({ onKeywordsChange }: KeywordManagerProps) {
  const { user, isDemo } = useAuth();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'welcome' | 'brand' | 'keywords' | 'done'>('welcome');

  // Quick add form (simplified)
  const [quickBrandName, setQuickBrandName] = useState('');
  const [quickBrandColor, setQuickBrandColor] = useState(BRAND_COLORS[0]);
  const [quickKeyword, setQuickKeyword] = useState('');
  const [quickCategory, setQuickCategory] = useState('Technology');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isDemo) {
      setBrands([{ id: '1', userId: 'demo', name: 'My Brand', color: '#e11d48', createdAt: '' }]);
      setKeywords([]);
      setLoading(false);
      setStep('done');
      return;
    }
    if (user) {
      fetchData();
    }
  }, [user, isDemo]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [brandsData, keywordsData] = await Promise.all([
        brandsApi.list(),
        keywordsApi.list()
      ]);
      setBrands(brandsData);
      setKeywords(keywordsData);
      onKeywordsChange?.(keywordsData);

      // Determine initial step based on data
      if (brandsData.length === 0) {
        setStep('welcome');
      } else if (keywordsData.length === 0) {
        setStep('keywords');
      } else {
        setStep('done');
      }
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const addBrand = async () => {
    if (!quickBrandName.trim()) return;
    setSaving(true);
    try {
      if (isDemo) {
        const newBrand: Brand = {
          id: Date.now().toString(),
          userId: 'demo',
          name: quickBrandName,
          color: quickBrandColor,
          createdAt: new Date().toISOString()
        };
        setBrands([...brands, newBrand]);
      } else {
        const brand = await brandsApi.create(quickBrandName, quickBrandColor);
        setBrands([...brands, brand]);
      }
      setQuickBrandName('');
      setStep('keywords');
    } catch (err) {
      setError('Failed to create brand');
    } finally {
      setSaving(false);
    }
  };

  const addKeyword = async () => {
    if (!quickKeyword.trim() || brands.length === 0) return;
    setSaving(true);
    try {
      const brandId = brands[0].id;
      if (isDemo) {
        const brand = brands[0];
        const newKw: Keyword = {
          id: Date.now().toString(),
          userId: 'demo',
          brandId,
          keyword: quickKeyword,
          category: quickCategory,
          createdAt: new Date().toISOString(),
          brand: { id: brand.id, name: brand.name, color: brand.color }
        };
        const updated = [...keywords, newKw];
        setKeywords(updated);
        onKeywordsChange?.(updated);
      } else {
        const keyword = await keywordsApi.create(quickKeyword, brandId, quickCategory);
        const updated = [...keywords, keyword];
        setKeywords(updated);
        onKeywordsChange?.(updated);
      }
      setQuickKeyword('');
    } catch (err) {
      setError('Failed to add keyword');
    } finally {
      setSaving(false);
    }
  };

  const addExampleKeyword = async (kw: string) => {
    setQuickKeyword(kw);
  };

  const removeKeyword = async (keywordId: string) => {
    try {
      if (!isDemo) await keywordsApi.delete(keywordId);
      const updated = keywords.filter(k => k.id !== keywordId);
      setKeywords(updated);
      onKeywordsChange?.(updated);
    } catch (err) {
      setError('Failed to delete keyword');
    }
  };

  const removeBrand = async (brandId: string) => {
    try {
      if (!isDemo) await brandsApi.delete(brandId);
      setBrands(brands.filter(b => b.id !== brandId));
      const updated = keywords.filter(k => k.brandId !== brandId);
      setKeywords(updated);
      onKeywordsChange?.(updated);
    } catch (err) {
      setError('Failed to delete brand');
    }
  };

  if (loading) {
    return (
      <div className="card p-12 flex items-center justify-center">
        <Loader className="animate-spin" size={32} />
      </div>
    );
  }

  // Welcome / Onboarding Screen
  if (step === 'welcome' && brands.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {/* Hero Section */}
        <div className="card p-8 text-center bg-gradient-to-br from-blue-50 to-purple-50">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <TrendingUp size={32} color="white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to TrendPulse!</h2>
          <p className="text-gray-600 max-w-lg mx-auto mb-6">
            Predict cultural trends before they go viral using epidemiological R₀ modeling.
            Get 7-14 days early warning on emerging trends.
          </p>

          {/* How it works */}
          <div className="grid grid-cols-3 gap-4 mb-8 text-left">
            <div className="bg-white rounded-xl p-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                <Target size={20} className="text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">1. Add Keywords</h4>
              <p className="text-sm text-gray-500">Tell us what trends to track for your brand</p>
            </div>
            <div className="bg-white rounded-xl p-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                <Zap size={20} className="text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">2. We Analyze</h4>
              <p className="text-sm text-gray-500">AI scans News, Reddit & Google for signals</p>
            </div>
            <div className="bg-white rounded-xl p-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                <Clock size={20} className="text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">3. Get Alerts</h4>
              <p className="text-sm text-gray-500">Know when to act before trends peak</p>
            </div>
          </div>

          <button onClick={() => setStep('brand')} className="btn btn-primary text-lg px-8 py-3">
            Get Started <ArrowRight size={20} className="ml-2" />
          </button>
        </div>
      </div>
    );
  }

  // Step 1: Create Brand
  if (step === 'brand' && brands.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="card p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Building2 size={24} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-xl text-gray-900">Step 1: Name Your Brand</h3>
              <p className="text-gray-500">What company or project are you tracking trends for?</p>
            </div>
          </div>

          {error && <div className="auth-error mb-4">{error}</div>}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Brand Name</label>
              <input
                type="text"
                placeholder="e.g., My Company, Personal Brand, Client Name"
                value={quickBrandName}
                onChange={(e) => setQuickBrandName(e.target.value)}
                className="input w-full text-lg"
                style={{ paddingLeft: '1rem', padding: '1rem' }}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Brand Color</label>
              <div className="flex gap-2">
                {BRAND_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setQuickBrandColor(color)}
                    className="w-10 h-10 rounded-full transition-transform hover:scale-110"
                    style={{
                      backgroundColor: color,
                      border: quickBrandColor === color ? '3px solid #1e293b' : '3px solid transparent',
                      transform: quickBrandColor === color ? 'scale(1.1)' : 'scale(1)'
                    }}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={addBrand}
              disabled={!quickBrandName.trim() || saving}
              className="btn btn-primary w-full text-lg py-3 mt-4"
            >
              {saving ? 'Creating...' : 'Continue'} <ArrowRight size={20} className="ml-2" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Add Keywords (or manage if already has keywords)
  if (step === 'keywords' || (step === 'done' && keywords.length === 0)) {
    return (
      <div className="flex flex-col gap-6">
        <div className="card p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Tag size={24} className="text-purple-600" />
            </div>
            <div>
              <h3 className="font-bold text-xl text-gray-900">Step 2: Add Keywords to Track</h3>
              <p className="text-gray-500">What trends do you want to monitor?</p>
            </div>
          </div>

          {error && <div className="auth-error mb-4">{error}</div>}

          {/* Quick Add Form */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="flex gap-3 mb-3">
              <input
                type="text"
                placeholder="Enter a keyword or trend..."
                value={quickKeyword}
                onChange={(e) => setQuickKeyword(e.target.value)}
                className="input flex-1"
                style={{ paddingLeft: '1rem' }}
                onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
              />
              <select
                value={quickCategory}
                onChange={(e) => setQuickCategory(e.target.value)}
                className="select"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <button
                onClick={addKeyword}
                disabled={!quickKeyword.trim() || saving}
                className="btn btn-primary"
              >
                {saving ? '...' : <Plus size={20} />}
              </button>
            </div>
          </div>

          {/* Example Keywords */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb size={18} className="text-yellow-500" />
              <span className="text-sm font-medium text-gray-700">Need inspiration? Try these:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_KEYWORDS[quickCategory]?.map(kw => (
                <button
                  key={kw}
                  onClick={() => addExampleKeyword(kw)}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:border-blue-500 hover:text-blue-600 transition-colors"
                >
                  {kw}
                </button>
              ))}
            </div>
          </div>

          {/* Added Keywords */}
          {keywords.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Your Keywords ({keywords.length})</h4>
              <div className="flex flex-wrap gap-2">
                {keywords.map(kw => (
                  <span
                    key={kw.id}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg"
                  >
                    {kw.keyword}
                    <button onClick={() => removeKeyword(kw.id)} className="hover:text-red-500">
                      <X size={16} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setStep('done')}
            disabled={keywords.length === 0}
            className="btn btn-primary w-full text-lg py-3"
          >
            {keywords.length === 0 ? 'Add at least one keyword' : `Done - View Dashboard (${keywords.length} keywords)`}
            <ArrowRight size={20} className="ml-2" />
          </button>
        </div>
      </div>
    );
  }

  // Full Management View (after setup)
  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="auth-error">
          {error}
          <button onClick={() => setError(null)} className="ml-2">×</button>
        </div>
      )}

      {/* Quick Add Bar */}
      <div className="card p-4">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Add a new keyword to track..."
            value={quickKeyword}
            onChange={(e) => setQuickKeyword(e.target.value)}
            className="input flex-1"
            style={{ paddingLeft: '1rem' }}
            onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
          />
          <select
            value={quickCategory}
            onChange={(e) => setQuickCategory(e.target.value)}
            className="select"
          >
            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <button onClick={addKeyword} disabled={!quickKeyword.trim() || saving} className="btn btn-primary">
            <Plus size={18} /> Add
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Brands */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Building2 size={20} /> Brands ({brands.length})
            </h3>
          </div>
          <div className="space-y-2">
            {brands.map(brand => (
              <div key={brand.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: brand.color }} />
                  <span className="font-medium">{brand.name}</span>
                  <span className="text-xs text-gray-400">
                    {keywords.filter(k => k.brandId === brand.id).length} keywords
                  </span>
                </div>
                <button onClick={() => removeBrand(brand.id)} className="text-gray-400 hover:text-red-500">
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Keywords */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Tag size={20} /> Keywords ({keywords.length})
            </h3>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {keywords.length === 0 ? (
              <p className="text-gray-500 text-sm">No keywords yet</p>
            ) : (
              keywords.map(kw => {
                const brand = kw.brand || brands.find(b => b.id === kw.brandId);
                return (
                  <div key={kw.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: brand?.color || '#94a3b8' }} />
                      <span className="font-medium">{kw.keyword}</span>
                      <span className="text-xs text-gray-400">{kw.category}</span>
                    </div>
                    <button onClick={() => removeKeyword(kw.id)} className="text-gray-400 hover:text-red-500">
                      <X size={18} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Suggestions */}
      <div className="card p-4 bg-yellow-50 border-yellow-200">
        <div className="flex items-start gap-3">
          <Lightbulb size={20} className="text-yellow-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-800">Pro Tip</h4>
            <p className="text-sm text-yellow-700">
              Track competitor brand names, industry buzzwords, and emerging hashtags.
              The more specific your keywords, the better the trend predictions!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
