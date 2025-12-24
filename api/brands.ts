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
    // GET - List brands
    if (req.method === 'GET') {
      const brands = await prisma.brand.findMany({
        where: { userId: user.id },
        include: {
          _count: {
            select: { keywords: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      return res.status(200).json(brands);
    }

    // POST - Create brand
    if (req.method === 'POST') {
      const { name, color } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Brand name is required' });
      }

      const brand = await prisma.brand.create({
        data: {
          userId: user.id,
          name,
          color: color || '#3b82f6',
        },
      });

      return res.status(201).json(brand);
    }

    // DELETE - Delete brand
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Brand ID is required' });
      }

      // Verify ownership
      const brand = await prisma.brand.findFirst({
        where: { id, userId: user.id },
      });

      if (!brand) {
        return res.status(404).json({ error: 'Brand not found' });
      }

      await prisma.brand.delete({
        where: { id },
      });

      return res.status(200).json({ message: 'Brand deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Brands API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
