import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { findOrCreateUser } from './db.js';

const gClient  = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const SECRET   = process.env.JWT_SECRET || 'dev-secret-please-change';

export function createToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, name: user.name, picture: user.picture },
    SECRET,
    { expiresIn: '60d' }
  );
}

// Middleware — attaches req.user or returns 401
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorised' });
  try {
    req.user = jwt.verify(header.slice(7), SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function setupAuthRoutes(app) {
  // POST /api/auth/google  — exchange Google credential for our JWT
  app.post('/api/auth/google', async (req, res) => {
    try {
      const { credential } = req.body;
      const ticket  = await gClient.verifyIdToken({
        idToken:  credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const { sub: googleId, email, name, picture } = ticket.getPayload();
      const user  = await findOrCreateUser({ googleId, email, name, picture });
      res.json({ token: createToken(user), user });
    } catch (err) {
      console.error('Google auth error:', err.message);
      res.status(401).json({ error: 'Google authentication failed' });
    }
  });

  // GET /api/auth/me  — validate stored token
  app.get('/api/auth/me', requireAuth, (req, res) => res.json(req.user));

  // GET /api/config  — public config the frontend needs (Google client ID)
  app.get('/api/config', (_, res) => {
    res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID || '' });
  });
}
