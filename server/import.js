import multer from 'multer';
import Anthropic from '@anthropic-ai/sdk';
import { getSetting } from './db.js';
import { DEFAULT_CATEGORIES, DEFAULT_SUBCATEGORIES } from '../src/data/defaults.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function extractText(file) {
  const name = file.originalname.toLowerCase();

  if (name.endsWith('.pdf')) {
    // Dynamically import pdf-parse (CJS module)
    const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
    const data = await pdfParse(file.buffer);
    return data.text;
  }

  // CSV / TXT / Excel exported as CSV
  return file.buffer.toString('utf-8');
}

function extractJSON(text) {
  // Find first { or [ and last } or ]
  const start = text.search(/[\[{]/);
  const end   = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
  if (start === -1 || end === -1) throw new Error('No JSON found in response');
  return JSON.parse(text.slice(start, end + 1));
}

export function setupImportRoute(app) {
  app.post('/api/import', upload.single('statement'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      const rawText = await extractText(req.file);
      if (!rawText.trim()) return res.status(400).json({ error: 'Could not extract text from file' });

      const categories    = await getSetting('categories',    DEFAULT_CATEGORIES);
      const subcategories = await getSetting('subcategories', DEFAULT_SUBCATEGORIES);

      const prompt = `You are a financial transaction parser for an Indian expense manager app.

Analyse the following bank/credit-card statement and extract every individual transaction.

TRANSACTION TYPES AND THEIR CATEGORIES:
- debit (money going out):   ${categories.debit.join(', ')}
- credit (money coming in):  ${categories.credit.join(', ')}
- investment:                ${categories.investment.join(', ')}
- selfTransfer (transfers between own accounts / repayments): ${categories.selfTransfer.join(', ')}

AVAILABLE SUB-CATEGORIES (optional, pick the best match or leave blank):
${subcategories.join(', ')}

RULES:
1. Every transaction must have: date, amount (positive number, no currency symbol), type, category, subCategory, notes.
2. date must be in YYYY-MM-DD format.
3. Pick the most logical category from the list above. Do NOT invent new categories.
4. subCategory is optional — use it only when a good match exists.
5. notes = original description from the statement (keep it short, under 80 chars).
6. Ignore opening/closing balances, summary rows, and header rows.
7. For UPI/NEFT/IMPS transfers to known merchants, infer the category from the merchant name.

Respond with ONLY valid JSON, no explanation, no markdown:
{"transactions":[{"date":"YYYY-MM-DD","amount":0,"type":"debit","category":"Food","subCategory":"","notes":"original description"}]}

STATEMENT:
${rawText.slice(0, 60000)}`; // cap at ~60k chars to stay within context

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
