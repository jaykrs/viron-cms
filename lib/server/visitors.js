const db = require('./db');
const { ApiError } = require('./errors');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Called when a visitor clicks "Accept" on the cookie banner and submits
// their email. Upserts by visitor_uid so re-submitting (e.g. after
// clearing cookies mid-session) doesn't create duplicate rows.
async function upsertVisitor({ visitorUid, email, userAgent }) {
  if (!visitorUid) throw new ApiError(400, 'visitorUid is required');
  if (!email || !EMAIL_RE.test(email)) throw new ApiError(400, 'A valid email is required');

  const existing = await db.get('SELECT * FROM visitors WHERE visitor_uid = ?', [visitorUid]);
  if (existing) {
    await db.run(
      "UPDATE visitors SET email = ?, user_agent = COALESCE(?, user_agent), last_seen_at = datetime('now') WHERE id = ?",
      [email, userAgent || null, existing.id]
    );
    return db.get('SELECT * FROM visitors WHERE id = ?', [existing.id]);
  }

  const info = await db.run('INSERT INTO visitors (visitor_uid, email, user_agent) VALUES (?, ?, ?)', [
    visitorUid,
    email,
    userAgent || null,
  ]);
  return db.get('SELECT * FROM visitors WHERE id = ?', [info.lastInsertRowid]);
}

// Called on every page view once a visitor has accepted (client only fires
// this when it already holds a visitor_uid cookie set by upsertVisitor).
// Unknown visitor_uid (never consented, or cookies were cleared) is treated
// as a no-op rather than an error — there's nothing to log against.
async function trackPageView({ visitorUid, path, title, referrer }) {
  if (!visitorUid || !path) throw new ApiError(400, 'visitorUid and path are required');
  const visitor = await db.get('SELECT * FROM visitors WHERE visitor_uid = ?', [visitorUid]);
  if (!visitor) return { tracked: false };

  await db.run('INSERT INTO page_views (visitor_id, path, page_title, referrer) VALUES (?, ?, ?, ?)', [
    visitor.id,
    path,
    title || null,
    referrer || null,
  ]);
  await db.run("UPDATE visitors SET last_seen_at = datetime('now') WHERE id = ?", [visitor.id]);
  return { tracked: true };
}

async function listVisitors() {
  return db.all(
    `SELECT v.id, v.email, v.user_agent, v.first_seen_at, v.last_seen_at,
            COUNT(pv.id) AS page_view_count
     FROM visitors v
     LEFT JOIN page_views pv ON pv.visitor_id = v.id
     GROUP BY v.id
     ORDER BY v.last_seen_at DESC`
  );
}

async function getVisitorJourney(id) {
  const visitor = await db.get('SELECT * FROM visitors WHERE id = ?', [id]);
  if (!visitor) throw new ApiError(404, 'Visitor not found');
  const views = await db.all('SELECT * FROM page_views WHERE visitor_id = ? ORDER BY created_at ASC', [id]);
  return { visitor, views };
}

// Supports a visitor's deletion/erasure request.
async function deleteVisitor(id) {
  const existing = await db.get('SELECT * FROM visitors WHERE id = ?', [id]);
  if (!existing) throw new ApiError(404, 'Visitor not found');
  await db.run('DELETE FROM visitors WHERE id = ?', [id]); // page_views cascade
}

module.exports = { upsertVisitor, trackPageView, listVisitors, getVisitorJourney, deleteVisitor };
