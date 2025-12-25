import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateSession } from '../lib/auth';
import prisma from '../lib/prisma';

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

// Calculate R0 from aggregated data
function calculateR0(values: number[]): number {
  if (values.length < 10) return 1.0;

  const window = 7;
  const r0Values: number[] = [];

  for (let i = window; i < values.length; i++) {
    const prevMean = values.slice(i - window, i).reduce((a, b) => a + b, 0) / window;
    if (prevMean > 0) {
      r0Values.push(values[i] / prevMean);
    }
  }

  if (r0Values.length === 0) return 1.0;
  const last3 = r0Values.slice(-3);
  return last3.reduce((a, b) => a + b, 0) / last3.length;
}

// Simulate fetching from all sources (in production, would call actual endpoints)
async function fetchAllSources(keyword: string): Promise<{
  news: { score: number; velocity: number; articles: number };
  reddit: { score: number; velocity: number; mentions: number };
  google: { score: number; velocity: number; interest: number; data: number[] };
}> {
  // Deterministic simulation based on keyword
  const hash = keyword.split('').reduce((a, b) => a + b.charCodeAt(0), 0);

  // Generate 90 days of combined data
  const baseValue = (hash % 40) + 20;
  const trendDirection = (hash % 3) - 1; // -1, 0, or 1 for down, flat, up
  const volatility = (hash % 30) / 100;

  const data: number[] = [];
  for (let i = 0; i < 90; i++) {
    const trend = trendDirection * (i / 90) * 30;
    const noise = (Math.random() - 0.5) * baseValue * volatility;
    const seasonal = Math.sin((i / 14) * Math.PI) * 5;
    data.push(Math.max(5, baseValue + trend + noise + seasonal));
  }

  // Calculate source scores
  const recentData = data.slice(-7);
  const prevData = data.slice(-14, -7);
  const recentAvg = recentData.reduce((a, b) => a + b, 0) / 7;
  const prevAvg = prevData.reduce((a, b) => a + b, 0) / 7;
  const velocity = prevAvg > 0 ? (recentAvg - prevAvg) / prevAvg : 0;

  return {
    news: {
      score: Math.round(recentAvg + (hash % 20)),
      velocity: Math.round(velocity * 100) / 100 + ((hash % 40) - 20) / 100,
      articles: Math.round(recentAvg / 2),
    },
    reddit: {
      score: Math.round(recentAvg * 0.8 + (hash % 15)),
      velocity: Math.round(velocity * 100) / 100 + ((hash % 30) - 15) / 100,
      mentions: Math.round(recentAvg * 1.5),
    },
    google: {
      score: Math.round(recentAvg + (hash % 25)),
      velocity: Math.round(velocity * 100) / 100,
      interest: Math.round(recentAvg),
      data,
    },
  };
}

// Classify phase and priority
function classifyTrend(r0: number, snr: number, velocity: number): {
  phase: string;
  priority: string;
  urgency: string;
  peakDays: number;
} {
  let phase: string, priority: string, urgency: string;

  if (snr >= 5 && velocity >= 0.3 && r0 >= 2.5) {
    phase = 'breakout';
    priority = 'critical';
    urgency = 'immediate';
  } else if (snr >= 3 && velocity >= 0.15 && r0 >= 1.8) {
    phase = 'acceleration';
    priority = 'high';
    urgency = 'same_day';
  } else if (snr >= 2 && velocity >= 0.05 && r0 >= 1.3) {
    phase = 'early_signal';
    priority = 'medium';
    urgency = 'fast_track';
  } else if (snr >= 1 || velocity > 0) {
    phase = 'emerging';
    priority = 'low';
    urgency = 'standard';
  } else {
    phase = 'baseline';
    priority = 'low';
    urgency = 'planned';
  }

  // Estimate peak days
  let peakDays = 999;
  if (r0 > 1 && velocity > 0) {
    peakDays = Math.floor(60 / Math.max(r0, 0.5) / Math.max(velocity + 1, 1));
    peakDays = Math.max(7, Math.min(365, peakDays));
  }

  return { phase, priority, urgency, peakDays };
}

// Get recommendations based on urgency
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

  return recs[urgency] || [];
}

async function aggregateTrend(
  keyword: string,
  brand?: string,
  brandColor?: string
): Promise<AggregatedTrend> {
  const sources = await fetchAllSources(keyword);

  // Calculate unified metrics
  const combinedScore = (sources.news.score + sources.reddit.score + sources.google.score) / 3;
  const combinedVelocity = (sources.news.velocity + sources.reddit.velocity + sources.google.velocity) / 3;

  // Calculate SNR (signal-to-noise ratio)
  const baseline = 30; // baseline value
  const snr = Math.abs(combinedScore - baseline) / 15;

  // Calculate R0 from Google data
  const r0 = calculateR0(sources.google.data);

  // Classify
  const { phase, priority, urgency, peakDays } = classifyTrend(r0, snr, combinedVelocity);
  const firstMoverDays = Math.max(0, peakDays - 3);

  // Calculate confidence based on data agreement
  const scoreVariance = Math.abs(sources.news.score - sources.reddit.score) +
    Math.abs(sources.reddit.score - sources.google.score);
  const confidence = Math.max(0.5, 1 - scoreVariance / 100);

  // Generate historical data for charts
  const historicalData = sources.google.data.map((value, i) => {
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

      const results = await Promise.all(
        userKeywords.map(k =>
          aggregateTrend(k.keyword, k.brand.name, k.brand.color)
        )
      );

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
      });
    }

    // Analyze provided keywords
    if (!keywords || !Array.isArray(keywords)) {
      return res.status(400).json({ error: 'Keywords array is required' });
    }

    const results = await Promise.all(
      keywords.map((k: any) =>
        typeof k === 'string'
          ? aggregateTrend(k)
          : aggregateTrend(k.keyword, k.brand, k.brandColor)
      )
    );

    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    results.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return res.status(200).json({ results, count: results.length });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
