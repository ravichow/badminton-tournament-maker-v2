// Cloudflare Pages Function: /api/roster
// Manages predefined roster in Cloudflare D1 serverless SQLite database

interface Env {
  DB: D1Database;
}

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { headers: jsonHeaders });
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;

  if (!env.DB) {
    return new Response(
      JSON.stringify({ error: 'Cloudflare D1 database binding (DB) is missing.' }),
      { status: 503, headers: jsonHeaders }
    );
  }

  try {
    const row = await env.DB.prepare(
      'SELECT data_json FROM predefined_rosters WHERE id = ?'
    )
      .bind('default')
      .first<{ data_json: string }>();

    if (!row || !row.data_json) {
      return new Response(JSON.stringify({ roster: null }), {
        headers: jsonHeaders,
      });
    }

    return new Response(
      JSON.stringify({ roster: JSON.parse(row.data_json) }),
      { headers: jsonHeaders }
    );
  } catch (error: any) {
    console.error('Error in GET /api/roster:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to fetch roster' }),
      { status: 500, headers: jsonHeaders }
    );
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (!env.DB) {
    return new Response(
      JSON.stringify({ error: 'Cloudflare D1 database binding (DB) is missing.' }),
      { status: 503, headers: jsonHeaders }
    );
  }

  try {
    const roster = await request.json();
    if (!roster) {
      return new Response(JSON.stringify({ error: 'Missing roster data' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const dataJson = JSON.stringify(roster);
    const updatedAt = Date.now();

    await env.DB.prepare(`
      INSERT INTO predefined_rosters (id, data_json, updated_at)
      VALUES ('default', ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        data_json = excluded.data_json,
        updated_at = excluded.updated_at
    `)
      .bind(dataJson, updatedAt)
      .run();

    return new Response(JSON.stringify({ success: true }), {
      headers: jsonHeaders,
    });
  } catch (error: any) {
    console.error('Error in POST /api/roster:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to update roster' }),
      { status: 500, headers: jsonHeaders }
    );
  }
};
