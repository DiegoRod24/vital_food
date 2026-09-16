export async function onRequestGet({ env }) {
  const configured = Boolean(env.DB)
  let database = 'not-configured'
  if (configured) {
    try {
      await env.DB.prepare('SELECT 1 AS ok').first()
      database = 'ok'
    } catch {
      database = 'error'
    }
  }

  return Response.json({
    ok: configured && database === 'ok',
    service: 'vital-foods-cloudflare',
    database,
    timestamp: new Date().toISOString()
  }, { status: configured && database === 'ok' ? 200 : 503 })
}
