import React, { useState, useEffect } from 'react';
import { Plus, X, Building2, Tag, Loader } from 'lucide-react';
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

interface KeywordManagerProps {
  onKeywordsChange?: (keywords: Keyword[]) => void;
}

export function KeywordManager({ onKeywordsChange }: KeywordManagerProps) {
  const { user, isDemo } = useAuth();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New brand form
  const [showBrandForm, setShowBrandForm] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandColor, setNewBrandColor] = useState(BRAND_COLORS[0]);
  const [brandLoading, setBrandLoading] = useState(false);

  // New keyword form
  const [showKeywordForm, setShowKeywordForm] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [keywordLoading, setKeywordLoading] = useState(false);

  useEffect(() => {
    if (isDemo) {
      // Demo data
      setBrands([
        { id: '1', userId: 'demo', name: 'My Brand', color: '#e11d48', createdAt: '' }
      ]);
      setKeywords([]);
      setLoading(false);
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
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addBrand = async () => {
    if (!newBrandName.trim()) return;

    if (isDemo) {
      const newBrand: Brand = {
        id: Date.now().toString(),
        userId: 'demo',
        name: newBrandName,
        color: newBrandColor,
        createdAt: new Date().toISOString()
      };
      setBrands([...brands, newBrand]);
      setNewBrandName('');
      setShowBrandForm(false);
      return;
    }

    try {
      setBrandLoading(true);
      const brand = await brandsApi.create(newBrandName, newBrandColor);
      setBrands([...brands, brand]);
      setNewBrandName('');
      setShowBrandForm(false);
    } catch (err) {
      setError('Failed to create brand');
    } finally {
      setBrandLoading(false);
    }
  };

  const removeBrand = async (brandId: string) => {
    if (isDemo) {
      setBrands(brands.filter(b => b.id !== brandId));
      setKeywords(keywords.filter(k => k.brandId !== brandId));
      return;
    }

    try {
      await brandsApi.delete(brandId);
      setBrands(brands.filter(b => b.id !== brandId));
      const updatedKeywords = keywords.filter(k => k.brandId !== brandId);
      setKeywords(updatedKeywords);
      onKeywordsChange?.(updatedKeywords);
    } catch (err) {
      setError('Failed to delete brand');
    }
  };

  const addKeyword = async () => {
    if (!newKeyword.trim() || !selectedBrandId) return;

    if (isDemo) {
      const brand = brands.find(b => b.id === selectedBrandId);
      const newKw: Keyword = {
        id: Date.now().toString(),
        userId: 'demo',
        brandId: selectedBrandId,
        keyword: newKeyword,
        category: selectedCategory,
        createdAt: new Date().toISOString(),
        brand: brand ? { id: brand.id, name: brand.name, color: brand.color } : undefined
      };
      const updated = [...keywords, newKw];
      setKeywords(updated);
      onKeywordsChange?.(updated);
      setNewKeyword('');
      setShowKeywordForm(false);
      return;
    }

    try {
      setKeywordLoading(true);
      const keyword = await keywordsApi.create(newKeyword, selectedBrandId, selectedCategory);
      const updated = [...keywords, keyword];
      setKeywords(updated);
      onKeywordsChange?.(updated);
      setNewKeyword('');
      setShowKeywordForm(false);
    } catch (err) {
      setError('Failed to create keyword');
    } finally {
      setKeywordLoading(false);
    }
  };

  const removeKeyword = async (keywordId: string) => {
    if (isDemo) {
      const updated = keywords.filter(k => k.id !== keywordId);
      setKeywords(updated);
      onKeywordsChange?.(updated);
      return;
    }

    try {
      await keywordsApi.delete(keywordId);
      const updated = keywords.filter(k => k.id !== keywordId);
      setKeywords(updated);
      onKeywordsChange?.(updated);
    } catch (err) {
      setError('Failed to delete keyword');
    }
  };

  if (loading) {
    return (
      <div className="card p-6 flex items-center justify-center">
        <Loader className="animate-spin" size={24} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="auth-error">
          {error}
          <button onClick={() => setError(null)} className="ml-2">×</button>
        </div>
      )}

      {/* Brands Section */}
      <div className="card p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Building2 size={20} />
            Your Brands
          </h3>
          <button
            onClick={() => setShowBrandForm(!showBrandForm)}
            className="btn btn-outline"
            style={{ padding: '0.5rem 0.75rem' }}
          >
            <Plus size={16} />
            Add Brand
          </button>
        </div>

        {showBrandForm && (
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <input
              type="text"
              placeholder="Brand name"
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
              className="input mb-3"
              style={{ paddingLeft: '1rem' }}
            />
            <div className="flex gap-2 mb-3">
              {BRAND_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setNewBrandColor(color)}
                  className="w-8 h-8 rounded-full"
                  style={{
                    backgroundColor: color,
                    border: newBrandColor === color ? '3px solid #1e293b' : 'none'
                  }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={addBrand}
                className="btn btn-primary"
                disabled={brandLoading}
              >
                {brandLoading ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setShowBrandForm(false)} className="btn btn-outline">
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {brands.length === 0 ? (
            <p className="text-gray-500 text-sm">No brands yet. Add your first brand!</p>
          ) : (
            brands.map(brand => (
              <div key={brand.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: brand.color }}
                  />
                  <span className="font-medium">{brand.name}</span>
                  <span className="text-xs text-gray-400">
                    {keywords.filter(k => k.brandId === brand.id).length} keywords
                  </span>
                </div>
                <button
                  onClick={() => removeBrand(brand.id)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Keywords Section */}
      <div className="card p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Tag size={20} />
            Tracked Keywords
          </h3>
          <button
            onClick={() => setShowKeywordForm(!showKeywordForm)}
            className="btn btn-primary"
            style={{ padding: '0.5rem 0.75rem' }}
            disabled={brands.length === 0}
          >
            <Plus size={16} />
            Add Keyword
          </button>
        </div>

        {showKeywordForm && (
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <input
              type="text"
              placeholder="Keyword to track"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              className="input mb-3"
              style={{ paddingLeft: '1rem' }}
            />
            <div className="flex gap-3 mb-3">
              <select
                value={selectedBrandId}
                onChange={(e) => setSelectedBrandId(e.target.value)}
                className="select flex-1"
              >
                <option value="">Select Brand</option>
                {brands.map(brand => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
              </select>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="select flex-1"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={addKeyword}
                className="btn btn-primary"
                disabled={!selectedBrandId || keywordLoading}
              >
                {keywordLoading ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setShowKeywordForm(false)} className="btn btn-outline">
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {keywords.length === 0 ? (
            <p className="text-gray-500 text-sm">
              {brands.length === 0
                ? 'Add a brand first, then you can track keywords.'
                : 'No keywords tracked yet. Add keywords to start monitoring trends!'}
            </p>
          ) : (
            keywords.map(kw => {
              const brand = kw.brand || brands.find(b => b.id === kw.brandId);
              return (
                <div key={kw.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: brand?.color || '#94a3b8' }}
                    />
                    <span className="font-medium">{kw.keyword}</span>
                    <span className="text-xs text-gray-400">{kw.category}</span>
                  </div>
                  <button
                    onClick={() => removeKeyword(kw.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X size={18} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
