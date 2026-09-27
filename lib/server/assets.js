const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');
const { ApiError } = require('./errors');

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']);
const MAX_SIZE = 8 * 1024 * 1024; // 8MB

function extFromName(name) {
  const ext = path.extname(name || '').toLowerCase();
  return ext && ext.length <= 6 ? ext : '';
}

async function listAssets() {
  return db.all('SELECT * FROM assets ORDER BY id DESC');
}

async function saveUploadedFile(file) {
  if (!file) throw new ApiError(400, 'No file was uploaded (expected form field "file")');
  if (file.size > MAX_SIZE) throw new ApiError(400, 'File exceeds the 8MB limit');
  if (file.type && !ALLOWED_MIME.has(file.type)) {
    throw new ApiError(400, `Unsupported file type "${file.type}". Allowed: PNG, JPEG, WebP, GIF, SVG.`);
  }

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const ext = extFromName(file.name) || '.bin';
  const filename = `${crypto.randomBytes(10).toString('hex')}${ext}`;
  const diskPath = path.join(UPLOAD_DIR, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(diskPath, buffer);

  const url = `/uploads/${filename}`;
  const info = await db.run(
    'INSERT INTO assets (filename, original_name, mime_type, size, url) VALUES (?, ?, ?, ?, ?)',
    [filename, file.name || filename, file.type || null, buffer.length, url]
  );

  return db.get('SELECT * FROM assets WHERE id = ?', [info.lastInsertRowid]);
}

async function deleteAsset(id) {
  const row = await db.get('SELECT * FROM assets WHERE id = ?', [id]);
  if (!row) throw new ApiError(404, 'Asset not found');
  const diskPath = path.join(UPLOAD_DIR, row.filename);
  try {
    fs.unlinkSync(diskPath);
  } catch {
    // file already missing on disk — still clean up the DB record
  }
  await db.run('DELETE FROM assets WHERE id = ?', [id]);
}

module.exports = { listAssets, saveUploadedFile, deleteAsset };
