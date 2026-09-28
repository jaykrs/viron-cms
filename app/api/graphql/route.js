import { NextResponse } from 'next/server';
import { executeGraphQL } from '../../../lib/server/graphql';
import { getAuthUser } from '../../../lib/server/auth';

// Content is meant to be consumed by other sites/apps, so CORS is open.
// Auth is a Bearer token (never cookies), so "*" does not expose sessions.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

function respond({ status, body }) {
  return NextResponse.json(body, { status, headers: { ...CORS, 'Cache-Control': 'no-store' } });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// GET  /api/graphql?query=...&variables={...}   — queries only, public
export async function GET(request) {
  const sp = new URL(request.url).searchParams;
  let variables;
  try {
    variables = sp.get('variables') ? JSON.parse(sp.get('variables')) : undefined;
  } catch {
    return respond({ status: 400, body: { errors: [{ message: '"variables" must be valid JSON' }] } });
  }
  return respond(
    await executeGraphQL({
      query: sp.get('query'),
      variables,
      operationName: sp.get('operationName'),
      user: getAuthUser(request),
      method: 'GET',
    })
  );
}

// POST /api/graphql  {query, variables, operationName}
// Queries are public; mutations (create / update / delete) need a token.
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return respond({ status: 400, body: { errors: [{ message: 'Request body must be JSON' }] } });
  }
  if (Array.isArray(body) || typeof body !== 'object' || body === null) {
    return respond({ status: 400, body: { errors: [{ message: 'Send a single {query, variables} object (batching is not supported)' }] } });
  }
  return respond(
    await executeGraphQL({
      query: body.query,
      variables: body.variables,
      operationName: body.operationName,
      user: getAuthUser(request),
      method: 'POST',
    })
  );
}
