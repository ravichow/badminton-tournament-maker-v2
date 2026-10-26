// Cloudflare Pages Function: /api/tournaments
// Manages tournaments in Cloudflare D1 serverless SQLite database

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
  const { request, env } = context;

  if (!env.DB) {
    return new Response(
      JSON.stringify({ error: 'Cloudflare D1 database binding (DB) is missing.' }),
      { status: 503, headers: jsonHeaders }
    );
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  try {
    if (id) {
      const result = await env.DB.prepare(
        'SELECT state_json FROM tournaments WHERE id = ?'
      )
        .bind(id)
        .first<{ state_json: string }>();

      if (!result || !result.state_json) {
        return new Response(
          JSON.stringify({ error: 'Tournament not found', tournament: null }),
          { status: 404, headers: jsonHeaders }
        );
      }

      return new Response(
        JSON.stringify({ tournament: JSON.parse(result.state_json) }),
        { headers: jsonHeaders }
      );
    }

    // List all tournaments ordered by creation date
    const { results } = await env.DB.prepare(
      'SELECT id, name, current_stage, created_at, updated_at, ended_at, state_json FROM tournaments ORDER BY created_at DESC'
    ).all<{
      id: string;
      name: string;
      current_stage: string;
      created_at: number;
      updated_at: number;
      ended_at: number | null;
      state_json: string;
    }>();

    const tournaments = (results || []).map((row) => {
      try {
        return JSON.parse(row.state_json);
      } catch (e) {
        return {
          id: row.id,
          name: row.name,
          currentStage: row.current_stage,
          createdAt: row.created_at,
          endedAt: row.ended_at,
        };
      }
    });

    return new Response(JSON.stringify({ tournaments }), {
      headers: jsonHeaders,
    });
  } catch (error: any) {
    console.error('Error fetching tournaments from D1:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to fetch tournaments' }),
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
    const body = (await request.json()) as any;
    const action = body?.action || 'sync';

    if (action === 'delete') {
      const id = body?.id;
      if (!id) {
        return new Response(JSON.stringify({ error: 'Missing tournament id' }), {
          status: 400,
          headers: jsonHeaders,
        });
      }

      await env.DB.prepare('DELETE FROM tournaments WHERE id = ?')
        .bind(id)
        .run();

      return new Response(JSON.stringify({ success: true, id }), {
        headers: jsonHeaders,
      });
    }

    if (action === 'clean_drafts') {
      const currentId = body?.currentId || '';
      const { results } = await env.DB.prepare(
        'SELECT id, state_json FROM tournaments WHERE id != ?'
      )
        .bind(currentId)
        .all<{ id: string; state_json: string }>();

      let deletedCount = 0;
      for (const row of results || []) {
        try {
          const t = JSON.parse(row.state_json);
          const matches = Object.values(t.matches || {});
          const hasCompletedMatch = matches.some((m: any) => m && m.isComplete);
          if (!hasCompletedMatch) {
            await env.DB.prepare('DELETE FROM tournaments WHERE id = ?')
              .bind(row.id)
              .run();
            deletedCount++;
          }
        } catch (e) {}
      }

      return new Response(JSON.stringify({ success: true, deletedCount }), {
        headers: jsonHeaders,
      });
    }

    // Default action: sync tournament state
    const t = body?.tournament || body;
    if (!t || !t.id) {
      return new Response(
        JSON.stringify({ error: 'Missing tournament payload or id' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const id = t.id;
    const name = t.name || 'Badminton Tournament';
    const currentStage = t.currentStage || 'upcoming';
    const createdAt = Number(t.createdAt) || Date.now();
    const updatedAt = Date.now();
    const endedAt = t.endedAt ? Number(t.endedAt) : null;
    const stateJson = JSON.stringify(t);

    await env.DB.prepare(`
      INSERT INTO tournaments (id, name, current_stage, state_json, created_at, updated_at, ended_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        current_stage = excluded.current_stage,
        state_json = excluded.state_json,
        updated_at = excluded.updated_at,
        ended_at = excluded.ended_at
    `)
      .bind(id, name, currentStage, stateJson, createdAt, updatedAt, endedAt)
      .run();

    return new Response(JSON.stringify({ success: true, id }), {
      headers: jsonHeaders,
    });
  } catch (error: any) {
    console.error('Error in POST /api/tournaments:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to update tournament' }),
      { status: 500, headers: jsonHeaders }
    );
  }
};
