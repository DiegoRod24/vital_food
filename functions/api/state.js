const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  }
})

const bad = (message, status = 400) => json({ ok: false, message }, status)

export async function onRequestGet({ request, env }) {
  if (!env.DB) return bad('D1 no configurado. Agrega el binding DB en Cloudflare Pages.', 503)
  const url = new URL(request.url)
  const workspace = (url.searchParams.get('workspace') || '').trim()
  if (!workspace) return bad('workspace es obligatorio')

  const row = await env.DB.prepare(
    'SELECT workspace_id, state_json, revision, updated_at, updated_by FROM app_state WHERE workspace_id = ?'
  ).bind(workspace).first()

  if (!row) return json({ ok: false, message: 'Sin datos remotos todavía' }, 404)

  return json({
    ok: true,
    workspace: row.workspace_id,
    state: JSON.parse(row.state_json),
    revision: row.revision,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by
  })
}

export async function onRequestPut({ request, env }) {
  if (!env.DB) return bad('D1 no configurado. Agrega el binding DB en Cloudflare Pages.', 503)

  let body
  try {
    body = await request.json()
  } catch {
    return bad('JSON inválido')
  }

  const workspace = String(body.workspace || '').trim()
  const deviceId = String(body.deviceId || 'unknown').slice(0, 120)
  const clientRevision = Number(body.revision || 0)
  const state = body.state

  if (!workspace) return bad('workspace es obligatorio')
  if (!state || typeof state !== 'object' || Array.isArray(state)) return bad('state inválido')

  const current = await env.DB.prepare(
    'SELECT state_json, revision FROM app_state WHERE workspace_id = ?'
  ).bind(workspace).first()

  if (current && Number(current.revision) !== clientRevision) {
    return json({
      ok: false,
      conflict: true,
      revision: current.revision,
      state: JSON.parse(current.state_json)
    }, 409)
  }

  const nextRevision = (current ? Number(current.revision) : 0) + 1
  const updatedAt = new Date().toISOString()
  const stateJson = JSON.stringify(state)

  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO app_state (workspace_id, state_json, revision, updated_at, updated_by)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(workspace_id) DO UPDATE SET
        state_json = excluded.state_json,
        revision = excluded.revision,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by
    `).bind(workspace, stateJson, nextRevision, updatedAt, deviceId),
    env.DB.prepare(`
      INSERT INTO sync_events (workspace_id, revision, device_id, event_type, created_at)
      VALUES (?, ?, ?, 'state_saved', ?)
    `).bind(workspace, nextRevision, deviceId, updatedAt)
  ])

  return json({ ok: true, revision: nextRevision, updatedAt })
}
