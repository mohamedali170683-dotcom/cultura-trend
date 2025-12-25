import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateSession } from './lib/auth';
import prisma from './lib/prisma';

// Resend API for email (optional)
const RESEND_API_KEY = process.env.RESEND_API_KEY;

interface AlertPayload {
  to: string;
  subject: string;
  html: string;
}

// Send email via Resend (or log if not configured)
async function sendEmail(payload: AlertPayload): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.log('Email would be sent:', payload.subject, 'to', payload.to);
    return true; // Simulate success
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'TrendPulse <alerts@trendpulse.app>',
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

// Send Slack notification
async function sendSlack(webhookUrl: string, message: string): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    });
    return response.ok;
  } catch (error) {
    console.error('Slack send error:', error);
    return false;
  }
}

// Generate alert email HTML
function generateAlertEmail(trends: any[]): string {
  const trendList = trends.map(t => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
        <strong>${t.keyword}</strong>
        <br><span style="color: #64748b;">${t.brand || 'No brand'}</span>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: ${
        t.priority === 'critical' ? '#ef4444' :
        t.priority === 'high' ? '#f97316' : '#eab308'
      }">
        ${t.priority.toUpperCase()}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${t.r0}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${t.peakDays}d</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  </style>
</head>
<body style="padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto;">
    <h1 style="color: #1e293b;">🚨 TrendPulse Alert</h1>
    <p>The following trends require your attention:</p>

    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <thead>
        <tr style="background: #f8fafc;">
          <th style="padding: 12px; text-align: left;">Trend</th>
          <th style="padding: 12px; text-align: left;">Priority</th>
          <th style="padding: 12px; text-align: left;">R₀</th>
          <th style="padding: 12px; text-align: left;">Peak</th>
        </tr>
      </thead>
      <tbody>
        ${trendList}
      </tbody>
    </table>

    <p>
      <a href="https://trendpulse.app/dashboard" style="display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px;">
        View Dashboard →
      </a>
    </p>

    <p style="color: #64748b; font-size: 0.875rem; margin-top: 40px;">
      You're receiving this because you have alerts enabled in TrendPulse.
    </p>
  </div>
</body>
</html>
  `.trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const session = await validateSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // GET - Get user's alert settings
  if (req.method === 'GET') {
    let settings = await prisma.alertSettings.findUnique({
      where: { userId: session.userId },
    });

    // Create default settings if none exist
    if (!settings) {
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
      });

      settings = await prisma.alertSettings.create({
        data: {
          userId: session.userId,
          emailAddress: user?.email,
        },
      });
    }

    return res.status(200).json(settings);
  }

  // PUT - Update alert settings
  if (req.method === 'PUT') {
    const {
      emailEnabled,
      emailAddress,
      criticalAlerts,
      highAlerts,
      mediumAlerts,
      lowAlerts,
      digestFrequency,
      slackEnabled,
      slackWebhook,
    } = req.body;

    const settings = await prisma.alertSettings.upsert({
      where: { userId: session.userId },
      update: {
        emailEnabled: emailEnabled ?? undefined,
        emailAddress: emailAddress ?? undefined,
        criticalAlerts: criticalAlerts ?? undefined,
        highAlerts: highAlerts ?? undefined,
        mediumAlerts: mediumAlerts ?? undefined,
        lowAlerts: lowAlerts ?? undefined,
        digestFrequency: digestFrequency ?? undefined,
        slackEnabled: slackEnabled ?? undefined,
        slackWebhook: slackWebhook ?? undefined,
      },
      create: {
        userId: session.userId,
        emailEnabled: emailEnabled ?? true,
        emailAddress,
        criticalAlerts: criticalAlerts ?? true,
        highAlerts: highAlerts ?? true,
        mediumAlerts: mediumAlerts ?? false,
        lowAlerts: lowAlerts ?? false,
        digestFrequency: digestFrequency ?? 'daily',
        slackEnabled: slackEnabled ?? false,
        slackWebhook,
      },
    });

    return res.status(200).json(settings);
  }

  // POST - Trigger alert (internal use or manual trigger)
  if (req.method === 'POST') {
    const { trends, testMode } = req.body;

    const settings = await prisma.alertSettings.findUnique({
      where: { userId: session.userId },
    });

    if (!settings) {
      return res.status(404).json({ error: 'Alert settings not found' });
    }

    // Filter trends based on alert settings
    const alertTrends = (trends || []).filter((t: any) => {
      if (t.priority === 'critical' && settings.criticalAlerts) return true;
      if (t.priority === 'high' && settings.highAlerts) return true;
      if (t.priority === 'medium' && settings.mediumAlerts) return true;
      if (t.priority === 'low' && settings.lowAlerts) return true;
      return false;
    });

    if (alertTrends.length === 0) {
      return res.status(200).json({ sent: false, reason: 'No trends match alert criteria' });
    }

    const results = {
      email: false,
      slack: false,
    };

    // Send email
    if (settings.emailEnabled && settings.emailAddress) {
      const emailHtml = generateAlertEmail(alertTrends);
      results.email = await sendEmail({
        to: settings.emailAddress,
        subject: `🚨 TrendPulse: ${alertTrends.length} trend(s) require attention`,
        html: emailHtml,
      });
    }

    // Send Slack
    if (settings.slackEnabled && settings.slackWebhook) {
      const slackMessage = `🚨 *TrendPulse Alert*\n\n${alertTrends.length} trend(s) require attention:\n\n` +
        alertTrends.map((t: any) =>
          `• *${t.keyword}* (${t.priority.toUpperCase()}) - R₀: ${t.r0}, Peak in ${t.peakDays}d`
        ).join('\n');

      results.slack = await sendSlack(settings.slackWebhook, slackMessage);
    }

    return res.status(200).json({
      sent: results.email || results.slack,
      results,
      alertCount: alertTrends.length,
      testMode: testMode || false,
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
