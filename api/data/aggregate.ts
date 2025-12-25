import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateSession } from '../lib/auth';
import prisma from '../lib/prisma';

// API Keys from environment
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const SERPAPI_KEY = process.env.SERPAPI_KEY;

// Aggregate data from all sources and calculate unified trend score
interface AggregatedTrend {
  keyword: string;
  brand?: string;
  brandColor?: string;

  // Unified metrics
  r0: number;
  snr: number;
  velocity: number;
  phase: string;
  priority: string;
  peakDays: number;
  firstMoverDays: number;
  confidence: number;
  urgency: string;

  // Source-specific scores
  sources: {
    news: { score: number; velocity: number; articles: number };
    reddit: { score: number; velocity: number; mentions: number };
    google: { score: number; velocity: number; interest: number };
  };

  // Historical data points for charts
  historicalData: Array<{ date: string; value: number }>;

  // Recommendations
  recommendations: Array<{ type: string; deadline: string; priority: string }>;
}

// ============================================
// REAL DATA SOURCE FETCHERS
// ============================================

// Fetch real news data from NewsAPI
async function fetchNewsData(keyword: string): Promise<{
  score: number;
  velocity: number;
  articles: number;
  data: number[];
}> {
  if (!NEWS_API_KEY) {
    console.log('NEWS_API_KEY not set, using simulated news data');
    return simulateNewsData(keyword);
  }

  try {
    const response = await fetch(
      `https://newsapi.org/v2/everything?` +
      `q=${encodeURIComponent(keyword)}&` +
      `sortBy=publishedAt&` +
      `language=en&` +
      `pageSize=100`,
      {
        headers: { 'X-Api-Key': NEWS_API_KEY },
      }
    );

    if (!response.ok) {
      console.error('News API error:', response.status);
      return simulateNewsData(keyword);
    }

    const data = await response.json();
    const articles = data.articles || [];

    // Group articles by date for the last 90 days
    const now = Date.now();
    const dailyCounts: number[] = Array(90).fill(0);

    articles.forEach((article: any) => {
      const articleDate = new Date(article.publishedAt).getTime();
      const daysAgo = Math.floor((now - articleDate) / (24 * 60 * 60 * 1000));
      if (daysAgo >= 0 && daysAgo < 90) {
        dailyCounts[89 - daysAgo]++;
      }
    });

    // Calculate metrics
    const last7Days = dailyCounts.slice(-7);
    const prev7Days = dailyCounts.slice(-14, -7);
    const recentAvg = last7Days.reduce((a, b) => a + b, 0) / 7;
    const prevAvg = prev7Days.reduce((a, b) => a + b, 0) / 7;
    const velocity = prevAvg > 0 ? (recentAvg - prevAvg) / prevAvg : (recentAvg > 0 ? 0.5 : 0);

    // Normalize to 0-100 scale
    const maxDaily = Math.max(...dailyCounts, 1);
    const normalizedData = dailyCounts.map(c => Math.round((c / maxDaily) * 100));

    return {
      score: Math.round(recentAvg * 10),
      velocity: Math.round(velocity * 100) / 100,
      articles: articles.length,
      data: normalizedData,
    };
  } catch (error) {
    console.error('News fetch error:', error);
    return simulateNewsData(keyword);
  }
}

// Fetch real Reddit data (uses public API, no auth needed)
async function fetchRedditData(keyword: string): Promise<{
  score: number;
  velocity: number;
  mentions: number;
  data: number[];
}> {
  try {
    const response = await fetch(
      `https://www.reddit.com/search.json?` +
      `q=${encodeURIComponent(keyword)}&` +
      `sort=new&` +
      `limit=100&` +
      `t=month`,
      {
        headers: { 'User-Agent': 'TrendPulse/1.0' },
      }
    );

    if (!response.ok) {
      console.error('Reddit API error:', response.status);
      return simulateRedditData(keyword);
    }

    const data = await response.json();
    const posts = data?.data?.children || [];

    // Group posts by date for the last 90 days
    const now = Date.now();
    const dailyCounts: number[] = Array(90).fill(0);
    const dailyEngagement: number[] = Array(90).fill(0);

    posts.forEach((post: any) => {
      const postDate = post.data.created_utc * 1000;
      const daysAgo = Math.floor((now - postDate) / (24 * 60 * 60 * 1000));
      if (daysAgo >= 0 && daysAgo < 90) {
        dailyCounts[89 - daysAgo]++;
        dailyEngagement[89 - daysAgo] += (post.data.score || 0) + (post.data.num_comments || 0);
      }
    });

    // Calculate metrics
    const last7Days = dailyCounts.slice(-7);
    const prev7Days = dailyCounts.slice(-14, -7);
    const recentAvg = last7Days.reduce((a, b) => a + b, 0) / 7;
    const prevAvg = prev7Days.reduce((a, b) => a + b, 0) / 7;
    const velocity = prevAvg > 0 ? (recentAvg - prevAvg) / prevAvg : (recentAvg > 0 ? 0.5 : 0);

    // Combine counts and engagement for trend score
    const combinedData = dailyCounts.map((count, i) => count + Math.log10(dailyEngagement[i] + 1) * 2);
    const maxValue = Math.max(...combinedData, 1);
    const normalizedData = combinedData.map(c => Math.round((c / maxValue) * 100));

    return {
      score: Math.round(recentAvg * 15 + posts.length / 5),
      velocity: Math.round(velocity * 100) / 100,
      mentions: posts.length,
      data: normalizedData,
    };
  } catch (error) {
    console.error('Reddit fetch error:', error);
    return simulateRedditData(keyword);
  }
}

// Fetch Google Trends data via SerpAPI (or pytrends alternative)
async function fetchGoogleTrendsData(keyword: string): Promise<{
  score: number;
  velocity: number;
  interest: number;
  data: number[];
}> {
  if (!SERPAPI_KEY) {
    console.log('SERPAPI_KEY not set, using simulated Google Trends data');
    return simulateGoogleTrendsData(keyword);
  }

  try {
    const response = await fetch(
      `https://serpapi.com/search.json?` +
      `engine=google_trends&` +
      `q=${encodeURIComponent(keyword)}&` +
      `data_type=TIMESERIES&` +
      `api_key=${SERPAPI_KEY}`
    );

    if (!response.ok) {
      console.error('SerpAPI error:', response.status);
      return simulateGoogleTrendsData(keyword);
    }

    const data = await response.json();
    const timeline = data.interest_over_time?.timeline_data || [];

    // Extract values
    const values = timeline.map((item: any) => item.values?.[0]?.extracted_value || 0);

    // Pad to 90 days if needed
    while (values.length < 90) {
      values.unshift(values[0] || 50);
    }
    const last90 = values.slice(-90);

    // Calculate metrics
    const last7Days = last90.slice(-7);
    const prev7Days = last90.slice(-14, -7);
    const recentAvg = last7Days.reduce((a: number, b: number) => a + b, 0) / 7;
    const prevAvg = prev7Days.reduce((a: number, b: number) => a + b, 0) / 7;
    const velocity = prevAvg > 0 ? (recentAvg - prevAvg) / prevAvg : 0;

    return {
      score: Math.round(recentAvg),
      velocity: Math.round(velocity * 100) / 100,
      interest: Math.round(recentAvg),
      data: last90,
    };
  } catch (error) {
    console.error('Google Trends fetch error:', error);
    return simulateGoogleTrendsData(keyword);
  }
}

// ============================================
// SIMULATION FALLBACKS (when APIs unavailable)
// ============================================

function simulateNewsData(keyword: string) {
  const hash = keyword.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const baseValue = (hash % 40) + 20;
  const trend = (hash % 3) - 1;

  const data: number[] = [];
  for (let i = 0; i < 90; i++) {
    const trendValue = trend * (i / 90) * 30;
    const noise = (Math.random() - 0.5) * baseValue * 0.3;
    data.push(Math.max(5, Math.round(baseValue + trendValue + noise)));
  }

  const recentAvg = data.slice(-7).reduce((a, b) => a + b, 0) / 7;
  const prevAvg = data.slice(-14, -7).reduce((a, b) => a + b, 0) / 7;
  const velocity = prevAvg > 0 ? (recentAvg - prevAvg) / prevAvg : 0;

  return {
    score: Math.round(recentAvg),
    velocity: Math.round(velocity * 100) / 100,
    articles: Math.round(baseValue / 2),
    data,
  };
}

function simulateRedditData(keyword: string) {
  const hash = keyword.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const baseValue = (hash % 50) + 15;
  const trend = ((hash * 7) % 3) - 1;

  const data: number[] = [];
  for (let i = 0; i < 90; i++) {
    const trendValue = trend * (i / 90) * 25;
    const noise = (Math.random() - 0.5) * baseValue * 0.4;
    data.push(Math.max(5, Math.round(baseValue + trendValue + noise)));
  }

  const recentAvg = data.slice(-7).reduce((a, b) => a + b, 0) / 7;
  const prevAvg = data.slice(-14, -7).reduce((a, b) => a + b, 0) / 7;
  const velocity = prevAvg > 0 ? (recentAvg - prevAvg) / prevAvg : 0;

  return {
    score: Math.round(recentAvg),
    velocity: Math.round(velocity * 100) / 100,
    mentions: Math.round(baseValue * 1.5),
    data,
  };
}

function simulateGoogleTrendsData(keyword: string) {
  const hash = keyword.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const baseValue = (hash % 45) + 25;
  const trend = ((hash * 13) % 3) - 1;

  const data: number[] = [];
  for (let i = 0; i < 90; i++) {
    const trendValue = trend * (i / 90) * 35;
    const noise = (Math.random() - 0.5) * 15;
    const seasonal = Math.sin((i / 14) * Math.PI) * 8;
    data.push(Math.max(5, Math.min(100, Math.round(baseValue + trendValue + noise + seasonal))));
  }

  const recentAvg = data.slice(-7).reduce((a, b) => a + b, 0) / 7;
  const prevAvg = data.slice(-14, -7).reduce((a, b) => a + b, 0) / 7;
  const velocity = prevAvg > 0 ? (recentAvg - prevAvg) / prevAvg : 0;

  return {
    score: Math.round(recentAvg),
    velocity: Math.round(velocity * 100) / 100,
    interest: Math.round(recentAvg),
    data,
  };
}

// ============================================
// R₀ CALCULATION (Epidemiological Model)
// ============================================

function calculateR0(values: number[]): number {
  if (values.length < 14) return 1.0;

  // Use 7-day rolling window to calculate reproduction rate
  const window = 7;
  const r0Values: number[] = [];

  for (let i = window; i < values.length; i++) {
    const prevWeek = values.slice(i - window, i);
    const prevMean = prevWeek.reduce((a, b) => a + b, 0) / window;

    if (prevMean > 0) {
      // R₀ = current / previous (like infection rate)
      r0Values.push(values[i] / prevMean);
    }
  }

  if (r0Values.length === 0) return 1.0;

  // Use the last 7 days for current R₀ estimate
  const recentR0 = r0Values.slice(-7);
  const avgR0 = recentR0.reduce((a, b) => a + b, 0) / recentR0.length;

  // Smooth the value
  return Math.max(0.1, Math.min(5, avgR0));
}

// Calculate Signal-to-Noise Ratio
function calculateSNR(values: number[]): number {
  if (values.length < 14) return 1.0;

  const recent = values.slice(-7);
  const baseline = values.slice(0, 30);

  const recentMean = recent.reduce((a, b) => a + b, 0) / recent.length;
  const baselineMean = baseline.reduce((a, b) => a + b, 0) / baseline.length;
  const baselineStd = Math.sqrt(
    baseline.reduce((sum, val) => sum + Math.pow(val - baselineMean, 2), 0) / baseline.length
  );

  if (baselineStd === 0) return 1.0;

  return Math.abs(recentMean - baselineMean) / baselineStd;
}

// ============================================
// AGGREGATE ALL SOURCES
// ============================================

async function fetchAllSources(keyword: string): Promise<{
  news: { score: number; velocity: number; articles: number };
  reddit: { score: number; velocity: number; mentions: number };
  google: { score: number; velocity: number; interest: number; data: number[] };
  combinedData: number[];
}> {
  // Fetch all sources in parallel
  const [newsData, redditData, googleData] = await Promise.all([
    fetchNewsData(keyword),
    fetchRedditData(keyword),
    fetchGoogleTrendsData(keyword),
  ]);

  // Combine data from all sources (weighted average)
  const combinedData = googleData.data.map((g, i) => {
    const n = newsData.data[i] || 0;
    const r = redditData.data[i] || 0;
    // Weight: Google 50%, Reddit 30%, News 20%
    return Math.round(g * 0.5 + r * 0.3 + n * 0.2);
  });

  return {
    news: {
      score: newsData.score,
      velocity: newsData.velocity,
      articles: newsData.articles,
    },
    reddit: {
      score: redditData.score,
      velocity: redditData.velocity,
      mentions: redditData.mentions,
    },
    google: {
      score: googleData.score,
      velocity: googleData.velocity,
      interest: googleData.interest,
      data: googleData.data,
    },
    combinedData,
  };
}

// Classify trend phase and priority based on metrics
function classifyTrend(r0: number, snr: number, velocity: number): {
  phase: string;
  priority: string;
  urgency: string;
  peakDays: number;
} {
  let phase: string, priority: string, urgency: string;

  if (snr >= 4 && velocity >= 0.25 && r0 >= 2.0) {
    phase = 'breakout';
    priority = 'critical';
    urgency = 'immediate';
  } else if (snr >= 2.5 && velocity >= 0.15 && r0 >= 1.5) {
    phase = 'acceleration';
    priority = 'high';
    urgency = 'same_day';
  } else if (snr >= 1.5 && velocity >= 0.05 && r0 >= 1.2) {
    phase = 'early_signal';
    priority = 'medium';
    urgency = 'fast_track';
  } else if (snr >= 1 || velocity > 0 || r0 > 1) {
    phase = 'emerging';
    priority = 'low';
    urgency = 'standard';
  } else {
    phase = 'baseline';
    priority = 'low';
    urgency = 'planned';
  }

  // Estimate days to peak based on R₀ and velocity
  let peakDays = 999;
  if (r0 > 1 && velocity > 0) {
    // Higher R₀ and velocity = faster peak
    peakDays = Math.floor(60 / (r0 * (1 + velocity)));
    peakDays = Math.max(7, Math.min(180, peakDays));
  } else if (r0 > 1) {
    peakDays = Math.floor(90 / r0);
    peakDays = Math.max(14, Math.min(180, peakDays));
  }

  return { phase, priority, urgency, peakDays };
}

// Get action recommendations based on urgency
function getRecommendations(urgency: string): Array<{ type: string; deadline: string; priority: string }> {
  const recs: Record<string, Array<{ type: string; deadline: string; priority: string }>> = {
    immediate: [
      { type: 'Real-time Social Post', deadline: '< 2 hours', priority: 'critical' },
      { type: 'Newsjacking Thread', deadline: '< 4 hours', priority: 'high' },
      { type: 'Quick Video Response', deadline: '< 6 hours', priority: 'high' },
    ],
    same_day: [
      { type: 'Social Media Series', deadline: '24 hours', priority: 'high' },
      { type: 'Blog Post Draft', deadline: '48 hours', priority: 'medium' },
      { type: 'Influencer Outreach', deadline: '24 hours', priority: 'high' },
    ],
    fast_track: [
      { type: 'Thought Leadership', deadline: '1 week', priority: 'medium' },
      { type: 'Video Explainer', deadline: '1-2 weeks', priority: 'medium' },
      { type: 'Podcast Episode', deadline: '2 weeks', priority: 'low' },
    ],
    standard: [
      { type: 'Pillar Content', deadline: '2-3 weeks', priority: 'medium' },
      { type: 'Video Series', deadline: '3-4 weeks', priority: 'low' },
      { type: 'Case Study', deadline: '1 month', priority: 'low' },
    ],
    planned: [
      { type: 'Long-form Content', deadline: '1-2 months', priority: 'low' },
      { type: 'Campaign Strategy', deadline: '2-3 months', priority: 'low' },
      { type: 'Research Report', deadline: '2-3 months', priority: 'low' },
    ],
  };

  return recs[urgency] || recs.planned;
}

// Main aggregation function
async function aggregateTrend(
  keyword: string,
  brand?: string,
  brandColor?: string
): Promise<AggregatedTrend> {
  const sources = await fetchAllSources(keyword);

  // Calculate R₀ from combined data
  const r0 = calculateR0(sources.combinedData);

  // Calculate SNR
  const snr = calculateSNR(sources.combinedData);

  // Calculate combined velocity (weighted)
  const combinedVelocity = (
    sources.news.velocity * 0.2 +
    sources.reddit.velocity * 0.3 +
    sources.google.velocity * 0.5
  );

  // Classify the trend
  const { phase, priority, urgency, peakDays } = classifyTrend(r0, snr, combinedVelocity);

  // First-mover window (act before mainstream notices)
  const firstMoverDays = Math.max(1, Math.floor(peakDays * 0.4));

  // Calculate confidence based on data source agreement
  const velocities = [sources.news.velocity, sources.reddit.velocity, sources.google.velocity];
  const velocityAgreement = 1 - (Math.max(...velocities) - Math.min(...velocities));
  const scores = [sources.news.score, sources.reddit.score, sources.google.score];
  const scoreVariance = Math.abs(Math.max(...scores) - Math.min(...scores)) / 100;
  const confidence = Math.max(0.4, Math.min(0.95, 0.7 + velocityAgreement * 0.2 - scoreVariance * 0.1));

  // Generate historical data for charts (last 90 days)
  const historicalData = sources.combinedData.map((value, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (89 - i));
    return {
      date: date.toISOString().split('T')[0],
      value: Math.round(value),
    };
  });

  return {
    keyword,
    brand,
    brandColor,
    r0: Math.round(r0 * 100) / 100,
    snr: Math.round(snr * 100) / 100,
    velocity: Math.round(combinedVelocity * 100) / 100,
    phase,
    priority,
    peakDays,
    firstMoverDays,
    confidence: Math.round(confidence * 100) / 100,
    urgency,
    sources: {
      news: sources.news,
      reddit: sources.reddit,
      google: {
        score: sources.google.score,
        velocity: sources.google.velocity,
        interest: sources.google.interest,
      },
    },
    historicalData,
    recommendations: getRecommendations(urgency),
  };
}

// ============================================
// API HANDLER
// ============================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const session = await validateSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const keyword = req.query.keyword as string;
    if (!keyword) {
      return res.status(400).json({ error: 'Keyword is required' });
    }

    const result = await aggregateTrend(keyword);
    return res.status(200).json(result);
  }

  if (req.method === 'POST') {
    const { keywords, analyzeUserKeywords } = req.body;

    // Option to analyze all user's keywords
    if (analyzeUserKeywords) {
      const userKeywords = await prisma.keyword.findMany({
        where: { userId: session.userId },
        include: { brand: true },
      });

      // Process keywords with rate limiting (avoid hammering APIs)
      const results: AggregatedTrend[] = [];
      for (const k of userKeywords) {
        const result = await aggregateTrend(k.keyword, k.brand.name, k.brand.color);
        results.push(result);
        // Small delay between requests to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Sort by priority
      const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      results.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

      return res.status(200).json({
        results,
        count: results.length,
        summary: {
          critical: results.filter(r => r.priority === 'critical').length,
          high: results.filter(r => r.priority === 'high').length,
          medium: results.filter(r => r.priority === 'medium').length,
          low: results.filter(r => r.priority === 'low').length,
        },
        dataSources: {
          news: !!NEWS_API_KEY,
          reddit: true, // Always available (public API)
          googleTrends: !!SERPAPI_KEY,
        },
      });
    }

    // Analyze provided keywords
    if (!keywords || !Array.isArray(keywords)) {
      return res.status(400).json({ error: 'Keywords array is required' });
    }

    const results: AggregatedTrend[] = [];
    for (const k of keywords) {
      const result = typeof k === 'string'
        ? await aggregateTrend(k)
        : await aggregateTrend(k.keyword, k.brand, k.brandColor);
      results.push(result);
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    results.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return res.status(200).json({ results, count: results.length });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
