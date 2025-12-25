import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateSession } from './lib/auth';
import prisma from './lib/prisma';

// Generate CSV content
function generateCSV(data: any[], headers: string[]): string {
  const headerRow = headers.join(',');
  const rows = data.map(item =>
    headers.map(h => {
      const value = item[h];
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value ?? '';
    }).join(',')
  );
  return [headerRow, ...rows].join('\n');
}

// Generate JSON report
function generateJSONReport(trends: any[], summary: any): string {
  return JSON.stringify({
    report: {
      generatedAt: new Date().toISOString(),
      summary,
      trends,
    },
  }, null, 2);
}

// Generate simple HTML/PDF-ready report
function generateHTMLReport(trends: any[], summary: any): string {
  const priorityColors: Record<string, string> = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#22c55e',
  };

  const trendRows = trends.map(t => `
    <tr>
      <td>${t.keyword}</td>
      <td>${t.brand || '-'}</td>
      <td style="color: ${priorityColors[t.priority] || '#000'}">${t.priority.toUpperCase()}</td>
      <td>${t.phase}</td>
      <td>${t.r0}</td>
      <td>${t.snr}</td>
      <td>${t.velocity}</td>
      <td>${t.peakDays}d</td>
      <td>${Math.round(t.confidence * 100)}%</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <title>TrendPulse Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; }
    h1 { color: #1e293b; }
    .summary { display: flex; gap: 20px; margin: 20px 0; }
    .stat-card { padding: 20px; border-radius: 12px; background: #f8fafc; }
    .stat-value { font-size: 2rem; font-weight: bold; }
    .stat-label { color: #64748b; font-size: 0.875rem; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f8fafc; font-weight: 600; }
    .critical { color: #ef4444; }
    .high { color: #f97316; }
    .medium { color: #eab308; }
    .low { color: #22c55e; }
  </style>
</head>
<body>
  <h1>📊 TrendPulse Report</h1>
  <p>Generated: ${new Date().toLocaleString()}</p>

  <div class="summary">
    <div class="stat-card">
      <div class="stat-value">${summary.total}</div>
      <div class="stat-label">Total Trends</div>
    </div>
    <div class="stat-card">
      <div class="stat-value critical">${summary.critical}</div>
      <div class="stat-label">Critical</div>
    </div>
    <div class="stat-card">
      <div class="stat-value high">${summary.high}</div>
      <div class="stat-label">High Priority</div>
    </div>
    <div class="stat-card">
      <div class="stat-value medium">${summary.medium}</div>
      <div class="stat-label">Medium Priority</div>
    </div>
  </div>

  <h2>Trend Analysis</h2>
  <table>
    <thead>
      <tr>
        <th>Keyword</th>
        <th>Brand</th>
        <th>Priority</th>
        <th>Phase</th>
        <th>R₀</th>
        <th>SNR</th>
        <th>Velocity</th>
        <th>Peak</th>
        <th>Confidence</th>
      </tr>
    </thead>
    <tbody>
      ${trendRows}
    </tbody>
  </table>

  <footer style="margin-top: 40px; color: #64748b; font-size: 0.875rem;">
    <p>TrendPulse - Cultural Trend Prediction Platform</p>
  </footer>
</body>
</html>
  `.trim();
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
    const { format, trends, filters } = req.body;

    if (!format || !['csv', 'json', 'pdf', 'html'].includes(format)) {
      return res.status(400).json({ error: 'Valid format required (csv, json, pdf, html)' });
    }

    // If no trends provided, fetch user's analyzed trends
    let trendData = trends;
    if (!trendData) {
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

      trendData = keywords
        .filter(k => k.analyses.length > 0)
        .map(k => ({
          keyword: k.keyword,
          brand: k.brand.name,
          category: k.category,
          ...k.analyses[0],
        }));
    }

    // Calculate summary
    const summary = {
      total: trendData.length,
      critical: trendData.filter((t: any) => t.priority === 'critical').length,
      high: trendData.filter((t: any) => t.priority === 'high').length,
      medium: trendData.filter((t: any) => t.priority === 'medium').length,
      low: trendData.filter((t: any) => t.priority === 'low').length,
      avgR0: trendData.length > 0
        ? trendData.reduce((sum: number, t: any) => sum + (t.r0 || 0), 0) / trendData.length
        : 0,
    };

    // Record export
    const exportRecord = await prisma.export.create({
      data: {
        userId: session.userId,
        type: format,
        status: 'completed',
        fileName: `trendpulse-report-${Date.now()}.${format}`,
        filters: filters ? JSON.stringify(filters) : null,
      },
    });

    // Generate output based on format
    let content: string;
    let contentType: string;
    let filename: string;

    switch (format) {
      case 'csv':
        content = generateCSV(trendData, [
          'keyword', 'brand', 'category', 'priority', 'phase',
          'r0', 'snr', 'velocity', 'peakDays', 'confidence',
        ]);
        contentType = 'text/csv';
        filename = `trendpulse-${Date.now()}.csv`;
        break;

      case 'json':
        content = generateJSONReport(trendData, summary);
        contentType = 'application/json';
        filename = `trendpulse-${Date.now()}.json`;
        break;

      case 'html':
      case 'pdf':
        content = generateHTMLReport(trendData, summary);
        contentType = 'text/html';
        filename = `trendpulse-${Date.now()}.html`;
        break;

      default:
        return res.status(400).json({ error: 'Invalid format' });
    }

    // Set download headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    return res.status(200).send(content);
  }

  // GET - List user's exports
  if (req.method === 'GET') {
    const exports = await prisma.export.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return res.status(200).json(exports);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
