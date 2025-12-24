import type { VercelRequest, VercelResponse } from '@vercel/node';

// Trend Analysis Engine
class TrendEngine {
  static calculateR0(values: number[], window: number = 7): number {
    if (values.length < window + 3) return 0;

    const r0Values: number[] = [];
    for (let i = window; i < values.length; i++) {
      const prevMean = values.slice(i - window, i).reduce((a, b) => a + b, 0) / window;
      if (prevMean > 0) {
        r0Values.push(values[i] / prevMean);
      }
    }

    if (r0Values.length === 0) return 0;
    const last3 = r0Values.slice(-3);
    return last3.reduce((a, b) => a + b, 0) / last3.length;
  }

  static calculateStd(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  static analyze(values: number[], keyword: string) {
    if (values.length < 5) {
      return { error: 'At least 5 data points required' };
    }

    // Calculate baseline
    const baselineEnd = Math.max(5, Math.floor(values.length * 0.3));
    const baseline = values.slice(0, baselineEnd);
    const baselineMean = baseline.reduce((a, b) => a + b, 0) / baseline.length;
    const baselineStd = this.calculateStd(baseline);

    // Current value
    const current = values[values.length - 1];

    // Calculate SNR
    const snr = baselineStd > 0 ? (current - baselineMean) / baselineStd : 0;

    // Calculate velocity
    let velocity = 0;
    if (values.length >= 5) {
      const recent = values.slice(-5);
      velocity = (recent[recent.length - 1] - recent[0]) / Math.max(recent[0], 1) / 5;
    }

    // Calculate R0
    const r0 = this.calculateR0(values);

    // Classify phase and priority
    let phase: string, priority: string;
    if (snr >= 5 && velocity >= 0.5 && r0 >= 2) {
      phase = 'breakout';
      priority = 'critical';
    } else if (snr >= 3 && velocity >= 0.2 && r0 >= 1) {
      phase = 'acceleration';
      priority = 'high';
    } else if (snr >= 2 && velocity >= 0.1) {
      phase = 'early_signal';
      priority = 'medium';
    } else if (snr >= 1.5 || velocity > 0) {
      phase = 'emerging';
      priority = 'low';
    } else {
      phase = 'baseline';
      priority = 'low';
    }

    // Estimate timing
    let peakDays = 999;
    if (r0 > 1 && velocity > 0) {
      peakDays = Math.floor(60 / Math.max(r0, 0.5) / Math.max(velocity + 1, 1));
      peakDays = Math.max(7, Math.min(365, peakDays));
    }

    const firstMoverDays = Math.max(0, peakDays - 3);

    // Determine urgency
    let urgency: string;
    if (phase === 'breakout' || peakDays < 7) {
      urgency = 'immediate';
    } else if (phase === 'acceleration' || peakDays < 14) {
      urgency = 'same_day';
    } else if (peakDays < 30) {
      urgency = 'fast_track';
    } else if (peakDays < 60) {
      urgency = 'standard';
    } else {
      urgency = 'planned';
    }

    // Calculate confidence
    const dataQuality = Math.min(1.0, values.length / 90);
    const confidence = dataQuality * 0.25 + Math.min(1, Math.abs(snr) / 5) * 0.25 +
      (r0 > 0.5 ? Math.min(1, r0 / 2) * 0.25 : 0) + 0.2;

    // Recommendations
    const recommendations: Record<string, Array<{ type: string; deadline: string; priority: string }>> = {
      immediate: [
        { type: 'Real-time Social Post', deadline: '< 2 hours', priority: 'critical' },
        { type: 'Newsjacking Thread', deadline: '< 4 hours', priority: 'high' },
      ],
      same_day: [
        { type: 'Social Media Series', deadline: '24 hours', priority: 'high' },
        { type: 'Blog Post Draft', deadline: '48 hours', priority: 'medium' },
      ],
      fast_track: [
        { type: 'Thought Leadership', deadline: '1 week', priority: 'medium' },
        { type: 'Video Explainer', deadline: '1-2 weeks', priority: 'medium' },
      ],
      standard: [
        { type: 'Pillar Content', deadline: '2-3 weeks', priority: 'medium' },
        { type: 'Video Series', deadline: '3-4 weeks', priority: 'low' },
      ],
      planned: [
        { type: 'Long-form Content', deadline: '1-2 months', priority: 'low' },
        { type: 'Campaign Strategy', deadline: '2-3 months', priority: 'low' },
      ],
    };

    return {
      keyword,
      phase,
      priority,
      r0: Math.round(r0 * 1000) / 1000,
      snr: Math.round(snr * 100) / 100,
      velocity: Math.round(velocity * 1000) / 1000,
      peak_days: peakDays,
      first_mover_days: firstMoverDays,
      confidence: Math.round(confidence * 100) / 100,
      urgency,
      recommendations: recommendations[urgency] || [],
    };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      message: 'TrendPulse API v1.0.0',
      description: 'Cultural Trend Prediction Platform',
      status: 'healthy',
    });
  }

  if (req.method === 'POST') {
    try {
      const { keyword, values, trends } = req.body;

      // Single analysis
      if (keyword && values) {
        const result = TrendEngine.analyze(values, keyword);
        return res.status(200).json(result);
      }

      // Batch analysis
      if (trends && Array.isArray(trends)) {
        const results = trends
          .filter((t: any) => t.keyword && t.values)
          .map((t: any) => {
            const result = TrendEngine.analyze(t.values, t.keyword);
            if (t.brand) (result as any).brand = t.brand;
            return result;
          });

        const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        results.sort((a: any, b: any) =>
          (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4)
        );

        return res.status(200).json({ results, count: results.length });
      }

      return res.status(400).json({ error: 'Missing keyword and values' });
    } catch (error) {
      console.error('Analyze error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
