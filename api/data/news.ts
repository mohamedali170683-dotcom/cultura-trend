import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateSession } from '../lib/auth';

// NewsAPI.org integration (free tier: 100 requests/day)
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const NEWS_API_URL = 'https://newsapi.org/v2';

interface NewsArticle {
  title: string;
  description: string;
  source: { name: string };
  publishedAt: string;
  url: string;
  sentiment?: number;
}

interface NewsResult {
  keyword: string;
  articles: NewsArticle[];
  totalResults: number;
  trendScore: number;
  velocity: number;
  sentiment: number;
  sources: string[];
}

// Simple sentiment analysis (would use a proper NLP service in production)
function analyzeSentiment(text: string): number {
  const positiveWords = ['growth', 'surge', 'boom', 'success', 'innovative', 'breakthrough', 'popular', 'trending', 'viral', 'rising'];
  const negativeWords = ['decline', 'fall', 'crash', 'fail', 'controversy', 'scandal', 'problem', 'issue', 'concern', 'drop'];

  const lowerText = text.toLowerCase();
  let score = 0;

  positiveWords.forEach(word => {
    if (lowerText.includes(word)) score += 0.1;
  });

  negativeWords.forEach(word => {
    if (lowerText.includes(word)) score -= 0.1;
  });

  return Math.max(-1, Math.min(1, score));
}

// Calculate trend score based on news volume and recency
function calculateTrendScore(articles: NewsArticle[]): number {
  if (articles.length === 0) return 0;

  const now = Date.now();
  let score = 0;

  articles.forEach(article => {
    const age = (now - new Date(article.publishedAt).getTime()) / (1000 * 60 * 60); // hours
    const recencyWeight = Math.max(0, 1 - age / 168); // Decay over 1 week
    score += recencyWeight;
  });

  // Normalize to 0-100 scale
  return Math.min(100, score * 10);
}

// Calculate velocity (rate of change in news volume)
function calculateVelocity(articles: NewsArticle[]): number {
  if (articles.length < 2) return 0;

  const now = Date.now();
  const last24h = articles.filter(a =>
    (now - new Date(a.publishedAt).getTime()) < 24 * 60 * 60 * 1000
  ).length;
  const prev24h = articles.filter(a => {
    const age = now - new Date(a.publishedAt).getTime();
    return age >= 24 * 60 * 60 * 1000 && age < 48 * 60 * 60 * 1000;
  }).length;

  if (prev24h === 0) return last24h > 0 ? 1 : 0;
  return (last24h - prev24h) / prev24h;
}

async function fetchNews(keyword: string): Promise<NewsResult> {
  // If no API key, return simulated data
  if (!NEWS_API_KEY) {
    return simulateNewsData(keyword);
  }

  try {
    const response = await fetch(
      `${NEWS_API_URL}/everything?` +
      `q=${encodeURIComponent(keyword)}&` +
      `sortBy=publishedAt&` +
      `language=en&` +
      `pageSize=50`,
      {
        headers: {
          'X-Api-Key': NEWS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      console.error('News API error:', response.status);
      return simulateNewsData(keyword);
    }

    const data = await response.json();
    const articles: NewsArticle[] = (data.articles || []).map((a: any) => ({
      title: a.title,
      description: a.description,
      source: a.source,
      publishedAt: a.publishedAt,
      url: a.url,
      sentiment: analyzeSentiment(`${a.title} ${a.description || ''}`),
    }));

    const sources = [...new Set(articles.map(a => a.source.name))];
    const avgSentiment = articles.length > 0
      ? articles.reduce((sum, a) => sum + (a.sentiment || 0), 0) / articles.length
      : 0;

    return {
      keyword,
      articles: articles.slice(0, 10), // Return top 10
      totalResults: data.totalResults || articles.length,
      trendScore: calculateTrendScore(articles),
      velocity: calculateVelocity(articles),
      sentiment: avgSentiment,
      sources,
    };
  } catch (error) {
    console.error('News fetch error:', error);
    return simulateNewsData(keyword);
  }
}

// Simulated data when API key is not available
function simulateNewsData(keyword: string): NewsResult {
  const hash = keyword.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const baseScore = (hash % 60) + 20;
  const velocity = ((hash % 100) - 50) / 100;

  const sampleSources = ['TechCrunch', 'The Verge', 'Bloomberg', 'Reuters', 'Forbes', 'CNN', 'BBC'];
  const now = new Date();

  const articles: NewsArticle[] = Array.from({ length: 5 }, (_, i) => ({
    title: `${keyword}: Latest developments in ${['technology', 'business', 'culture', 'trends'][i % 4]}`,
    description: `Analysis of ${keyword} and its impact on the market...`,
    source: { name: sampleSources[i % sampleSources.length] },
    publishedAt: new Date(now.getTime() - i * 12 * 60 * 60 * 1000).toISOString(),
    url: '#',
    sentiment: Math.random() * 0.6 - 0.1,
  }));

  return {
    keyword,
    articles,
    totalResults: baseScore,
    trendScore: baseScore,
    velocity,
    sentiment: 0.2,
    sources: sampleSources.slice(0, 3),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Validate authentication
  const session = await validateSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const keyword = req.query.keyword as string;
    if (!keyword) {
      return res.status(400).json({ error: 'Keyword is required' });
    }

    const result = await fetchNews(keyword);
    return res.status(200).json(result);
  }

  if (req.method === 'POST') {
    const { keywords } = req.body;
    if (!keywords || !Array.isArray(keywords)) {
      return res.status(400).json({ error: 'Keywords array is required' });
    }

    const results = await Promise.all(keywords.map(k => fetchNews(k)));
    return res.status(200).json({ results });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
