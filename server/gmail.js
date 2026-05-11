import { google } from 'googleapis';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from './auth.js';
import {
  getGmailTokens, saveGmailTokens, updateGmailLastSync,
  deleteGmailTokens, getSetting,
} from './db.js';
import { DEFAULT_CATEGORIES, DEFAULT_SUBCATEGORIES } from '../src/data/defaults.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

// Gmail search: common Indian bank/payment transaction email patterns
const GMAIL_QUERY =
  '(subject:(transaction OR debit OR credit OR "amount debited" OR "amount credited" OR ' +
  '"payment alert" OR "payment successful" OR "spent on" OR "transaction alert") ' +
  'OR from:(hdfcbank.com OR icicibank.com OR sbi.co.in OR axisbank.com OR ' +
  'kotak.com OR yesbank.in OR indusind.com OR paytm.com OR amazonpay.in OR ' +
  'alerts.phonepe.com OR notify.paytmbank.com))';

function makeOAuth2(userId) {
  const appUrl = process.env.APP_URL || 'http://localhost:3001';
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${appUrl}/api/gmail/callback`
  );
  if (userId) client._userId = userId;
  return client;
}

async function getAuthedClient(userId) {
  const tokens = await getGmailTokens(userId);
  if (!tokens?.refresh_token) throw new Error('Gmail not connected');
  const client = makeOAuth2(userId);
  client.setCredentials({
    access_token:  tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date:   tokens.expiry ? parseInt(tokens.expiry) : undefined,
  });
  // Auto-save refreshed tokens
  client.on('tokens', async (newTokens) => {
    await saveGmailTokens(userId, newTokens);
  });
  return client;
}

function decodeBase64(str) {
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
}

function extractEmailText(payload) {
  if (!payload) return '';
  // Try plain text first
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64(payload.body.data);
  }
  // Try parts recursively
  if (payload.parts) {
    for (const part of payload.parts) {
      const text = extractEmailText(part);
      if (text) return text;
    }
  }
  // Fall back to HTML (strip tags crudely)
  if (payload.mimeType === 'text/html' && payload.body?.data) {
    return decodeBase64(payload.body.data).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  return '';
}

async function parseEmailsWithClaude(emailTexts, categories, subcategories) {
  if (!emailTexts.length) return [];

  const combined = emailTexts.map((e, i) =>
    `--- EMAIL ${i + 1} (${e.date}) ---\nSubject: ${e.subject}\n${e.body.slice(0, 1500)}`
  ).join('\n\n');

  const prompt = `You are parsing bank/payment transaction emails for an Indian expense manager.

Below are ${emailTexts.length} emails. Extract ONLY real financial transactions (ignore OTPs, offers, newsletters, account statements).

TRANSACTION TYPES AND CATEGORIES:
- debit (money going out):   ${categories.debit.join(', ')}
- credit (money coming in):  ${categories.credit.join(', ')}
- investment:                ${categories.investment.join(', ')}
- selfTransfer:              ${categories.selfTransfer.join(', ')}

SUB-CATEGORIES (optional): ${subcategories.join(', ')}

RULES:
1. Only include emails that clearly describe a single transaction (debit/credit/payment).
2. amount = positive number, no currency symbol.
3. date = YYYY-MM-DD (use email date if not in body).
4. notes = merchant name or brief description (under 60 chars).
5. Skip emails with no clear transaction amount.

Respond ONLY with valid JSON:
{"transactions":[{"date":"YYYY-MM-DD","amount":0,"type":"debit","category":"Food","subCategory":"","notes":"merchant"}]}

EMAILS:
${combined}`;

  const message = await anthropic.messages.create({
    model:      'claude-opus-4-5',
    max_tokens: 4096,
    messages:   [{ role: 'user', content: prompt }],
  });

  const text  = message.content[0].text;
  const start = text.search(/[\[{]/);
  const end   = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
  if (start === -1 || end === -1) return [];

  const parsed = JSON.parse(text.slice(start, end + 1));
  return (parsed.transactions || parsed).map((t, i) => ({
    id:          `gmail-${Date.now()}-${i}`,
    type:        t.type        || 'debit',
    amount:      parseFloat(t.amount) || 0,
    date:        t.date        || new Date().toISOString().slice(0, 10),
    category:    t.category    || 'Other',
    subCategory: t.subCategory || '',
    notes:       t.notes       || '',
    createdAt:   new Date().toISOString(),
  }));
}

export function setupGmailRoutes(app) {
  // ── Step 1: Start OAuth flow ───────────────────────────────────────────────
  app.get('/api/gmail/connect', requireAuth, (req, res) => {
    const client = makeOAuth2();
    const url = client.generateAuthUrl({
      access_type: 'offline',
      scope:       GMAIL_SCOPE,
      state:       req.user.userId,
      prompt:      'consent',
    });
    res.redirect(url);
  });

  // ── Step 2: OAuth callback ─────────────────────────────────────────────────
  app.get('/api/gmail/callback', async (req, res) => {
    const { code, state: userId } = req.query;
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    try {
      const client = makeOAuth2();
      const { tokens } = await client.getToken(code);
      await saveGmailTokens(userId, tokens);
      res.redirect(`${appUrl}/?gmail=connected`);
    } catch (err) {
      console.error('Gmail callback error:', err.message);
      res.redirect(`${appUrl}/?gmail=error`);
    }
  });

  // ── Status ─────────────────────────────────────────────────────────────────
  app.get('/api/gmail/status', requireAuth, async (req, res) => {
    const tokens = await getGmailTokens(req.user.userId);
    res.json({
      connected: !!tokens?.refresh_token,
      lastSync:  tokens?.last_sync || null,
    });
  });

  // ── Sync emails ────────────────────────────────────────────────────────────
  app.post('/api/gmail/sync', requireAuth, async (req, res) => {
    try {
      const userId  = req.user.userId;
      const client  = await getAuthedClient(userId);
      const gmail   = google.gmail({ version: 'v1', auth: client });
      const tokens  = await getGmailTokens(userId);

      // Only fetch emails since last sync (or last 60 days for first sync)
      const sinceDate = tokens?.last_sync
        ? new Date(tokens.last_sync)
        : new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      const afterEpoch = Math.floor(sinceDate.getTime() / 1000);
      const query = `${GMAIL_QUERY} after:${afterEpoch}`;

      // List matching emails (max 100)
      const listRes = await gmail.users.messages.list({
        userId: 'me',
        q:      query,
        maxResults: 100,
      });

      const messages = listRes.data.messages || [];
      if (!messages.length) {
        await updateGmailLastSync(userId);
        return res.json({ transactions: [], emailsScanned: 0 });
      }

      // Fetch each email (in parallel, max 20 at a time)
      const emailData = [];
      for (let i = 0; i < messages.length; i += 20) {
        const batch = messages.slice(i, i + 20);
        const results = await Promise.all(
          batch.map(m => gmail.users.messages.get({ userId: 'me', id: m.id, format: 'full' }))
        );
        for (const r of results) {
          const headers = r.data.payload?.headers || [];
          const subject = headers.find(h => h.name === 'Subject')?.value || '';
          const dateStr = headers.find(h => h.name === 'Date')?.value || '';
          const body    = extractEmailText(r.data.payload);
          if (body) emailData.push({
            subject,
            date: dateStr ? new Date(dateStr).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
            body,
          });
        }
      }

      // Parse with Claude in batches of 30
      const categories    = await getSetting(userId, 'categories',    DEFAULT_CATEGORIES);
      const subcategories = await getSetting(userId, 'subcategories', DEFAULT_SUBCATEGORIES);
      const allTransactions = [];

      for (let i = 0; i < emailData.length; i += 30) {
        const batch = emailData.slice(i, i + 30);
        const txs   = await parseEmailsWithClaude(batch, categories, subcategories);
        allTransactions.push(...txs);
      }

      await updateGmailLastSync(userId);
      res.json({ transactions: allTransactions, emailsScanned: emailData.length });
    } catch (err) {
      console.error('Gmail sync error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Disconnect ─────────────────────────────────────────────────────────────
  app.delete('/api/gmail/disconnect', requireAuth, async (req, res) => {
    await deleteGmailTokens(req.user.userId);
    res.json({ ok: true });
  });
}
