import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateSession } from './lib/auth';
import prisma from './lib/prisma';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const session = await validateSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // GET - Get user's team or list teams they own
  if (req.method === 'GET') {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        team: {
          include: {
            members: {
              select: { id: true, email: true, name: true },
            },
            owner: {
              select: { id: true, email: true, name: true },
            },
          },
        },
        ownedTeams: {
          include: {
            members: {
              select: { id: true, email: true, name: true },
            },
          },
        },
      },
    });

    return res.status(200).json({
      currentTeam: user?.team || null,
      ownedTeams: user?.ownedTeams || [],
      isTeamOwner: (user?.ownedTeams || []).length > 0,
    });
  }

  // POST - Create a new team
  if (req.method === 'POST') {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Team name is required' });
    }

    // Check if user already owns a team
    const existingTeam = await prisma.team.findFirst({
      where: { ownerId: session.userId },
    });

    if (existingTeam) {
      return res.status(400).json({ error: 'You already own a team' });
    }

    const team = await prisma.team.create({
      data: {
        name,
        ownerId: session.userId,
        members: {
          connect: { id: session.userId },
        },
      },
      include: {
        members: {
          select: { id: true, email: true, name: true },
        },
        owner: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    return res.status(201).json(team);
  }

  // PUT - Update team or manage members
  if (req.method === 'PUT') {
    const { teamId, action, email, name } = req.body;

    if (!teamId) {
      return res.status(400).json({ error: 'teamId is required' });
    }

    // Verify user owns this team
    const team = await prisma.team.findFirst({
      where: { id: teamId, ownerId: session.userId },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found or access denied' });
    }

    // Handle different actions
    switch (action) {
      case 'rename':
        if (!name) {
          return res.status(400).json({ error: 'New name is required' });
        }

        const renamedTeam = await prisma.team.update({
          where: { id: teamId },
          data: { name },
          include: {
            members: { select: { id: true, email: true, name: true } },
          },
        });

        return res.status(200).json(renamedTeam);

      case 'invite':
        if (!email) {
          return res.status(400).json({ error: 'Email is required' });
        }

        // Find user by email
        const userToInvite = await prisma.user.findUnique({
          where: { email },
        });

        if (!userToInvite) {
          return res.status(404).json({ error: 'User not found. They must sign up first.' });
        }

        // Check if already in a team
        if (userToInvite.teamId) {
          return res.status(400).json({ error: 'User is already in a team' });
        }

        // Add to team
        await prisma.user.update({
          where: { id: userToInvite.id },
          data: { teamId },
        });

        const updatedTeam = await prisma.team.findUnique({
          where: { id: teamId },
          include: {
            members: { select: { id: true, email: true, name: true } },
          },
        });

        return res.status(200).json(updatedTeam);

      case 'remove':
        if (!email) {
          return res.status(400).json({ error: 'Email is required' });
        }

        const userToRemove = await prisma.user.findFirst({
          where: { email, teamId },
        });

        if (!userToRemove) {
          return res.status(404).json({ error: 'User not found in team' });
        }

        // Can't remove owner
        if (userToRemove.id === session.userId) {
          return res.status(400).json({ error: 'Cannot remove yourself as owner' });
        }

        await prisma.user.update({
          where: { id: userToRemove.id },
          data: { teamId: null },
        });

        const teamAfterRemove = await prisma.team.findUnique({
          where: { id: teamId },
          include: {
            members: { select: { id: true, email: true, name: true } },
          },
        });

        return res.status(200).json(teamAfterRemove);

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  }

  // DELETE - Delete team or leave team
  if (req.method === 'DELETE') {
    const teamId = req.query.teamId as string;
    const action = req.query.action as string;

    if (!teamId) {
      return res.status(400).json({ error: 'teamId is required' });
    }

    if (action === 'leave') {
      // Leave team (for members)
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
      });

      if (user?.teamId !== teamId) {
        return res.status(400).json({ error: 'You are not in this team' });
      }

      // Check if owner
      const team = await prisma.team.findUnique({
        where: { id: teamId },
      });

      if (team?.ownerId === session.userId) {
        return res.status(400).json({ error: 'Owner cannot leave. Transfer ownership or delete the team.' });
      }

      await prisma.user.update({
        where: { id: session.userId },
        data: { teamId: null },
      });

      return res.status(200).json({ success: true });
    }

    // Delete team (owner only)
    const team = await prisma.team.findFirst({
      where: { id: teamId, ownerId: session.userId },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found or access denied' });
    }

    // Remove all members from team first
    await prisma.user.updateMany({
      where: { teamId },
      data: { teamId: null },
    });

    // Delete the team
    await prisma.team.delete({
      where: { id: teamId },
    });

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
