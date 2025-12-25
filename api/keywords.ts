import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from './lib/prisma';
import { validateSession, getTokenFromHeader } from './lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Validate session
  const token = getTokenFromHeader(req.headers.authorization || null);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = await validateSession(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  try {
    // GET - List keywords
    if (req.method === 'GET') {
      const keywords = await prisma.keyword.findMany({
        where: { userId: user.id },
        include: {
          brand: {
            select: { id: true, name: true, color: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json(keywords);
    }

    // POST - Create keyword
    if (req.method === 'POST') {
      const { keyword, brandId, category } = req.body;

      if (!keyword || !brandId) {
        return res.status(400).json({ error: 'Keyword and brand ID are required' });
      }

      // Verify brand ownership
      const brand = await prisma.brand.findFirst({
        where: { id: brandId, userId: user.id },
      });

      if (!brand) {
        return res.status(404).json({ error: 'Brand not found' });
      }

      const newKeyword = await prisma.keyword.create({
        data: {
          userId: user.id,
          brandId,
          keyword,
          category,
        },
        include: {
          brand: {
            select: { id: true, name: true, color: true },
          },
        },
      });

      return res.status(201).json(newKeyword);
    }

    // DELETE - Delete keyword
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Keyword ID is required' });
      }

      // Verify ownership
      const keyword = await prisma.keyword.findFirst({
        where: { id, userId: user.id },
      });

      if (!keyword) {
        return res.status(404).json({ error: 'Keyword not found' });
      }

      await prisma.keyword.delete({
        where: { id },
      });

      return res.status(200).json({ message: 'Keyword deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Keywords API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
