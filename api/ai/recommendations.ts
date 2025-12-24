import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateSession } from '../lib/auth';
import prisma from '../lib/prisma';

// OpenAI API for recommendations (optional)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface TrendInsight {
  keyword: string;
  brand?: string;
  priority: string;
  r0: number;
  phase: string;
}

interface Recommendation {
  type: 'content' | 'timing' | 'strategy' | 'risk';
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  actionItems: string[];
  relatedTrends: string[];
}

interface AIAnalysis {
  summary: string;
  recommendations: Recommendation[];
  contentIdeas: string[];
  riskAlerts: string[];
  opportunityScore: number;
}

// Generate recommendations using GPT (or fallback to rule-based)
async function generateAIRecommendations(trends: TrendInsight[]): Promise<AIAnalysis> {
  if (!OPENAI_API_KEY || trends.length === 0) {
    return generateRuleBasedRecommendations(trends);
  }

  try {
    const trendSummary = trends.map(t =>
      `- ${t.keyword} (${t.brand || 'No brand'}): ${t.priority} priority, R₀=${t.r0}, phase=${t.phase}`
    ).join('\n');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are a cultural trend analyst helping brands capitalize on emerging trends.
            Analyze trends using R₀ (viral spread rate) and phase data to provide actionable recommendations.
            Focus on content strategy, timing, and risk assessment.`
          },
          {
            role: 'user',
            content: `Analyze these trends and provide strategic recommendations:\n\n${trendSummary}\n\n
            Respond in JSON format with:
            {
              "summary": "Brief overview",
              "recommendations": [{"type": "content|timing|strategy|risk", "title": "", "description": "", "priority": "", "actionItems": [], "relatedTrends": []}],
              "contentIdeas": ["idea1", "idea2"],
              "riskAlerts": ["risk1"],
              "opportunityScore": 0-100
            }`
          }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status);
      return generateRuleBasedRecommendations(trends);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
    }

    return generateRuleBasedRecommendations(trends);
  } catch (error) {
    console.error('AI recommendation error:', error);
    return generateRuleBasedRecommendations(trends);
  }
}

// Rule-based recommendations when AI is not available
function generateRuleBasedRecommendations(trends: TrendInsight[]): AIAnalysis {
  const recommendations: Recommendation[] = [];
  const contentIdeas: string[] = [];
  const riskAlerts: string[] = [];

  // Sort by priority
  const sortedTrends = [...trends].sort((a, b) => {
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.priority] || 4) - (order[b.priority] || 4);
  });

  const criticalTrends = sortedTrends.filter(t => t.priority === 'critical');
  const highTrends = sortedTrends.filter(t => t.priority === 'high');
  const breakoutTrends = sortedTrends.filter(t => t.phase === 'breakout');

  // Critical trend recommendations
  if (criticalTrends.length > 0) {
    recommendations.push({
      type: 'timing',
      title: 'Immediate Action Required',
      description: `${criticalTrends.length} trend(s) are at critical priority and require immediate response within 24-48 hours.`,
      priority: 'critical',
      actionItems: [
        'Draft social media response immediately',
        'Prepare newsjacking content',
        'Alert content team for rapid production',
        'Consider influencer activation',
      ],
      relatedTrends: criticalTrends.map(t => t.keyword),
    });

    criticalTrends.forEach(t => {
      contentIdeas.push(`Real-time thread about ${t.keyword}`);
      contentIdeas.push(`Quick-take video on ${t.keyword} developments`);
    });
  }

  // Breakout trend opportunities
  if (breakoutTrends.length > 0) {
    recommendations.push({
      type: 'strategy',
      title: 'Breakout Trend Opportunity',
      description: `${breakoutTrends.length} trend(s) are breaking out. This is the optimal window for maximum reach.`,
      priority: 'high',
      actionItems: [
        'Accelerate content production timeline',
        'Increase paid media budget allocation',
        'Engage thought leaders in the space',
        'Document for case study',
      ],
      relatedTrends: breakoutTrends.map(t => t.keyword),
    });
  }

  // High R0 trends
  const viralTrends = sortedTrends.filter(t => t.r0 > 2);
  if (viralTrends.length > 0) {
    recommendations.push({
      type: 'content',
      title: 'High Viral Potential',
      description: `${viralTrends.length} trend(s) show R₀ > 2.0, indicating strong viral potential.`,
      priority: 'high',
      actionItems: [
        'Create shareable, snackable content',
        'Optimize for social algorithms',
        'Prepare for increased engagement',
        'Have response templates ready',
      ],
      relatedTrends: viralTrends.map(t => t.keyword),
    });

    viralTrends.forEach(t => {
      contentIdeas.push(`Carousel post: "Everything you need to know about ${t.keyword}"`);
    });
  }

  // Emerging trends for early positioning
  const emergingTrends = sortedTrends.filter(t => t.phase === 'emerging' || t.phase === 'early_signal');
  if (emergingTrends.length > 0) {
    recommendations.push({
      type: 'strategy',
      title: 'Early Mover Opportunities',
      description: `${emergingTrends.length} trend(s) are in early stages - perfect for establishing thought leadership.`,
      priority: 'medium',
      actionItems: [
        'Create foundational content pieces',
        'Build SEO presence early',
        'Engage in community discussions',
        'Monitor for acceleration signals',
      ],
      relatedTrends: emergingTrends.map(t => t.keyword),
    });

    emergingTrends.forEach(t => {
      contentIdeas.push(`In-depth guide: "The Rise of ${t.keyword}"`);
      contentIdeas.push(`Podcast discussion on ${t.keyword} implications`);
    });
  }

  // Risk assessment
  const decliningTrends = sortedTrends.filter(t => t.phase === 'decline' || t.r0 < 1);
  if (decliningTrends.length > 0) {
    riskAlerts.push(`${decliningTrends.length} trend(s) showing decline - avoid major investment`);

    recommendations.push({
      type: 'risk',
      title: 'Declining Trends Alert',
      description: 'Some tracked trends are losing momentum. Consider reallocating resources.',
      priority: 'low',
      actionItems: [
        'Reduce content production for declining trends',
        'Archive learnings for future reference',
        'Reallocate budget to rising trends',
      ],
      relatedTrends: decliningTrends.map(t => t.keyword),
    });
  }

  // Calculate opportunity score
  const criticalWeight = criticalTrends.length * 25;
  const highWeight = highTrends.length * 15;
  const breakoutWeight = breakoutTrends.length * 20;
  const viralWeight = viralTrends.length * 10;
  const opportunityScore = Math.min(100, criticalWeight + highWeight + breakoutWeight + viralWeight + 20);

  // Generate summary
  const summary = trends.length === 0
    ? 'No trends to analyze. Add keywords to start tracking.'
    : `Analyzing ${trends.length} trend(s): ${criticalTrends.length} critical, ${highTrends.length} high priority. ` +
      `${breakoutTrends.length} in breakout phase with ${viralTrends.length} showing viral potential (R₀ > 2).`;

  return {
    summary,
    recommendations,
    contentIdeas: contentIdeas.slice(0, 10),
    riskAlerts,
    opportunityScore,
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

  if (req.method === 'POST') {
    const { trends } = req.body;

    if (!trends || !Array.isArray(trends)) {
      // Fetch user's latest analyses
      const keywords = await prisma.keyword.findMany({
        where: { userId: session.userId },
        include: {
          brand: true,
          analyses: {
            orderBy: { analyzedAt: 'desc' },
            take: 1,
          },
        },
      });

      const userTrends: TrendInsight[] = keywords
        .filter(k => k.analyses.length > 0)
        .map(k => ({
          keyword: k.keyword,
          brand: k.brand.name,
          priority: k.analyses[0].priority,
          r0: k.analyses[0].r0,
          phase: k.analyses[0].phase,
        }));

      const analysis = await generateAIRecommendations(userTrends);
      return res.status(200).json(analysis);
    }

    const analysis = await generateAIRecommendations(trends);
    return res.status(200).json(analysis);
  }

  // GET - Quick recommendations based on stored analyses
  if (req.method === 'GET') {
    const keywords = await prisma.keyword.findMany({
      where: { userId: session.userId },
      include: {
        brand: true,
        analyses: {
          orderBy: { analyzedAt: 'desc' },
          take: 1,
        },
      },
    });

    const trends: TrendInsight[] = keywords
      .filter(k => k.analyses.length > 0)
      .map(k => ({
        keyword: k.keyword,
        brand: k.brand.name,
        priority: k.analyses[0].priority,
        r0: k.analyses[0].r0,
        phase: k.analyses[0].phase,
      }));

    const analysis = await generateAIRecommendations(trends);
    return res.status(200).json(analysis);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
