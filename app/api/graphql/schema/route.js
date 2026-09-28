import { NextResponse } from 'next/server';
import { getSchemaSDL } from '../../../../lib/server/graphql';
import { jsonError } from '../../../../lib/server/routeHelpers';

// Public: the schema is the API contract, and introspection exposes it anyway.
export async function GET() {
  try {
    return new NextResponse(await getSchemaSDL(), {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    return jsonError(err);
  }
}
