const db = require('./db');
const { ApiError } = require('./errors');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATUSES = ['new', 'read'];

function clean(v, max) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

// Called from the public ContactForm block. reCAPTCHA (if configured) is
// verified by the route handler before this runs — this layer only owns
// validation and persistence of the submission itself.
async function createSubmission({ name, email, message, pagePath, locale }) {
  const cleanName = clean(name, 200);
  const cleanEmail = clean(email, 320);
  const cleanMessage = clean(message, 5000);

  if (!cleanName) throw new ApiError(400, 'Name is required');
  if (!cleanEmail || !EMAIL_RE.test(cleanEmail)) throw new ApiError(400, 'A valid email is required');
  if (!cleanMessage) throw new ApiError(400, 'Message is required');

  const info = await db.run(
    'INSERT INTO contact_submissions (name, email, message, page_path, locale) VALUES (?, ?, ?, ?, ?)',
    [cleanName, cleanEmail, cleanMessage, clean(pagePath, 300) || null, clean(locale, 10) || null]
  );
  return db.get('SELECT * FROM contact_submissions WHERE id = ?', [info.lastInsertRowid]);
}

async function listSubmissions({ status, search, limit = 100, offset = 0 } = {}) {
  const where = [];
  const args = [];
  if (status) {
    where.push('status = ?');
    args.push(status);
  }
  if (search) {
    const esc = String(search).replace(/[\\%_]/g, (c) => `\\${c}`);
    where.push("(name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\' OR message LIKE ? ESCAPE '\\')");
    args.push(`%${esc}%`, `%${esc}%`, `%${esc}%`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const lim = Math.min(Number(limit) || 100, 500);
  const off = Math.max(Number(offset) || 0, 0);

  const rows = await db.all(
    `SELECT * FROM contact_submissions ${whereSql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
    [...args, lim, off]
  );
  const { c } = await db.get(`SELECT COUNT(*) AS c FROM contact_submissions ${whereSql}`, args);
  const { n } = await db.get("SELECT COUNT(*) AS n FROM contact_submissions WHERE status = 'new'");
  return { items: rows, total: c, newCount: n };
}

async function countNew() {
  const { n } = await db.get("SELECT COUNT(*) AS n FROM contact_submissions WHERE status = 'new'");
  return n;
}

async function getSubmissionById(id) {
  const row = await db.get('SELECT * FROM contact_submissions WHERE id = ?', [id]);
  if (!row) throw new ApiError(404, 'Submission not found');
  return row;
}

async function updateStatus(id, status) {
  if (!STATUSES.includes(status)) throw new ApiError(400, `Status must be one of: ${STATUSES.join(', ')}`);
  await getSubmissionById(id);
  await db.run('UPDATE contact_submissions SET status = ? WHERE id = ?', [status, id]);
  return getSubmissionById(id);
}

async function deleteSubmission(id) {
  await getSubmissionById(id);
  await db.run('DELETE FROM contact_submissions WHERE id = ?', [id]);
}

module.exports = {
  createSubmission,
  listSubmissions,
  countNew,
  getSubmissionById,
  updateStatus,
  deleteSubmission,
};
