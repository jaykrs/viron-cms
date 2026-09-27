const { NextResponse } = require('next/server');

function jsonError(err) {
  const status = err.status || 500;
  if (status === 500) console.error(err);
  return NextResponse.json({ error: err.message || 'Internal server error' }, { status });
}

function requireAuth(request) {
  const { getAuthUser } = require('./auth');
  const user = getAuthUser(request);
  if (!user) {
    const err = new Error('Missing or invalid token');
    err.status = 401;
    throw err;
  }
  return user;
}

module.exports = { jsonError, requireAuth };
