import multer from 'multer';
import Anthropic from '@anthropic-ai/sdk';
import { getSetting } from './db.js';
import { requireAuth } from './auth.js';
import { DEFAULT_CATEGORIES, DEFAULT_SUBCATEGORIES } from '../src/data/defaults.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function extractText(file) {
  const name = file.originalname.toLowerCase();
  if (name.endsWith('.pdf')) {
    const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
    const data = await pdfParse(file.buffer);
    return data.text;
  }
  return file.buffer.toString('utf-8');
}

function extractJSON(text) {
  const start = text.search(/[\[{]/);
  const end   = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
  if (start === -1 || end === -1) throw new Error('No JSON found in Claude response');
  return JSON.parse(text.slice(start, end + 1));
}

function buildBankPrompt(rawText, categories, subcategories) {
  return `You are a financial transaction parser for an Indian expense manager app.

Analyse the following bank/credit-card statement and extract every individual transaction.

TRANSACTION TYPES AND THEIR CATEGORIES:
- debit (money going out):   ${categories.debit.join(', ')}
- credit (money coming in):  ${categories.credit.join(', ')}
- investment:                ${categories.investment.join(', ')}
- selfTransfer (transfers between own accounts / repayments): ${categories.selfTransfer.join(', ')}

AVAILABLE SUB-CATEGORIES (optional, pick the best match or leave blank):
${subcategories.join(', ')}

RULES:
1. Every transaction must have: date, amount (positive number), type, category, subCategory, notes.
2. date must be in YYYY-MM-DD format.
3. Pick the most logical category. Do NOT invent new categories.
4. subCategory is optional — use only when a good match exists.
5. notes = original description from statement (under 80 chars).
6. Ignore opening/closing balances, summary rows, header rows.
7. For UPI/NEFT/IMPS, infer category from merchant name.

Respond with ONLY valid JSON:
{"transactions":[{"date":"YYYY-MM-DD","amount":0,"type":"debit","category":"Food","subCategory":"","notes":"description"}]}

STATEMENT:
${rawText.slice(0, 60000)}`;
}

function buildExpenseManagerPrompt(rawText, categories, subcategories) {
  return `You are migrating data from one expense manager app to another for an Indian user.

The input is an export file (CSV or text) from their old expense manager app.
Map every transaction to the new category system below.

NEW TRANSACTION TYPES AND CATEGORIES:
- debit (money going out):   ${categories.debit.join(', ')}
- credit (money coming in):  ${categories.credit.join(', ')}
- investment:                ${categories.investment.join(', ')}
- selfTransfer (own account transfers / friend repayments): ${categories.selfTransfer.join(', ')}

NEW SUB-CATEGORIES (optional):
${subcategories.join(', ')}

RULES:
1. Map old categories to the closest matching new category. Do NOT invent new categories.
2. Every transaction must have: date, amount (positive number), type, category, subCategory, notes.
3. date must be in YYYY-MM-DD format.
4. notes = original description or old category (so user can verify the mapping).
5. Ignore totals, summaries, headers.
6. If the old app had sub-categories, map them to the new sub-categories list if possible.

Respond with ONLY valid JSON:
{"transactions":[{"date":"YYYY-MM-DD","amount":0,"type":"debit","category":"Food","subCategory":"","notes":"original info"}]}

EXPORT DATA:
${rawText.slice(0, 60000)}`;
}

export function setupImportRoute(app) {
  app.post('/api/import', requireAuth, upload.single('statement'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      const rawText = await extractText(req.file);
      if (!rawText.trim()) return res.status(400).json({ error: 'Could not extract text from file' });

      const userId      = req.user.userId;
      const sourceType  = req.body.sourceType || 'bank'; // 'bank' | 'expense_manager'
      const categories    = await getSetting(userId, 'categories',    DEFAULT_CATEGORIES);
      const subcategories = await getSetting(userId, 'subcategories', DEFAULT_SUBCATEGORIES);

      const prompt = sourceType === 'expense_manager'
        ? buildExpenseManagerPrompt(rawText, categories, subcategories)
        : buildBankPrompt(rawText, categories, subcategories);

      const message = await anthropic.messages.create({
        model:      'claude-opus-4-5',
        max_tokens: 8096,
        messages:   [{ role: 'user', content: prompt }],
      });

      const parsed = extractJSON(message.content[0].text);
      const transactions = (parsed.transactions || parsed).map((t, i) => ({
        id:          `import-${Date.now()}-${i}`,
        type:        t.type        || 'debit',
        amount:      parseFloat(t.amount) || 0,
        date:        t.date        || new Date().toISOString().slice(0, 10),
        category:    t.category    || 'Other',
        subCategory: t.subCategory || '',
        notes:       t.notes       || '',
        createdAt:   new Date().toISOString(),
      }));

      res.json({ transactions });
    } catch (err) {
      console.error('Import error:', err);
      res.status(500).json({ error: err.message || 'Import failed' });
    }
  });
}
