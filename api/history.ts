import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateSession } from './lib/auth';
import prisma from './lib/prisma';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const session = await validateSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // GET - Retrieve trend history for a keyword
  if (req.method === 'GET') {
    const keywordId = req.query.keywordId as string;
    const days = parseInt(req.query.days as string) || 90;

    if (!keywordId) {
      return res.status(400).json({ error: 'keywordId is required' });
    }

    // Verify user owns this keyword
    const keyword = await prisma.keyword.findFirst({
      where: { id: keywordId, userId: session.userId },
    });

    if (!keyword) {
      return res.status(404).json({ error: 'Keyword not found' });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const history = await prisma.trendHistory.findMany({
      where: {
        keywordId,
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    });

    // Calculate trend statistics
    const values = history.map(h => h.r0);
    const avgR0 = values.length > 0
      ? values.reduce((a, b) => a + b, 0) / values.length
      : 0;

    const recentValues = history.slice(-7).map(h => h.r0);
    const prevValues = history.slice(-14, -7).map(h => h.r0);

    const recentAvg = recentValues.length > 0
      ? recentValues.reduce((a, b) => a + b, 0) / recentValues.length
      : 0;
    const prevAvg = prevValues.length > 0
      ? prevValues.reduce((a, b) => a + b, 0) / prevValues.length
      : 0;

    const trendDirection = prevAvg > 0
      ? ((recentAvg - prevAvg) / prevAvg) * 100
      : 0;

    return res.status(200).json({
      history,
      stats: {
        avgR0: Math.round(avgR0 * 100) / 100,
        maxR0: Math.max(...values, 0),
        minR0: Math.min(...values, 0),
        trendDirection: Math.round(trendDirection * 10) / 10,
        dataPoints: history.length,
      },
    });
  }

  // POST - Record a new history entry
  if (req.method === 'POST') {
    const { keywordId, r0, snr, velocity, phase, priority, newsVolume, redditVolume, googleVolume } = req.body;

    if (!keywordId || r0 === undefined) {
      return res.status(400).json({ error: 'keywordId and r0 are required' });
    }

    // Verify user owns this keyword
    const keyword = await prisma.keyword.findFirst({
      where: { id: keywordId, userId: session.userId },
    });

    if (!keyword) {
      return res.status(404).json({ error: 'Keyword not found' });
    }

    const entry = await prisma.trendHistory.create({
      data: {
        keywordId,
        r0,
        snr: snr || 0,
        velocity: velocity || 0,
        phase: phase || 'unknown',
        priority: priority || 'low',
        newsVolume,
        redditVolume,
        googleVolume,
      },
    });

    return res.status(201).json(entry);
  }

  // DELETE - Clear history for a keyword
  if (req.method === 'DELETE') {
    const keywordId = req.query.keywordId as string;

    if (!keywordId) {
      return res.status(400).json({ error: 'keywordId is required' });
    }

    // Verify user owns this keyword
    const keyword = await prisma.keyword.findFirst({
      where: { id: keywordId, userId: session.userId },
    });

    if (!keyword) {
      return res.status(404).json({ error: 'Keyword not found' });
    }

    await prisma.trendHistory.deleteMany({
      where: { keywordId },
    });

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
