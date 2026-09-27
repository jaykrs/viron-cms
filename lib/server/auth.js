const jwt = require('jsonwebtoken');
const db = require('./db');

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '12h' });
}

// Returns the decoded user payload, or null if missing/invalid — callers
// decide whether to respond 401. Synchronous: verifying a JWT touches no
// database, only the in-memory secret.
function getAuthUser(request) {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

// NOTE: demo-grade (plaintext) password storage/compare, matching the rest
// of the auth system — replace with bcrypt hashing before real deployment.
async function changePassword(userId, currentPassword, newPassword) {
  const user = await db.get('SELECT * FROM admin_users WHERE id = ?', [userId]);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  if (user.password !== currentPassword) {
    const err = new Error('Current password is incorrect');
    err.status = 401;
    throw err;
  }
  if (!newPassword || newPassword.length < 6) {
    const err = new Error('New password must be at least 6 characters');
    err.status = 400;
    throw err;
  }
  await db.run('UPDATE admin_users SET password = ? WHERE id = ?', [newPassword, userId]);
}

module.exports = { signToken, getAuthUser, changePassword };
