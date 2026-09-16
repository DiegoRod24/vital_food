PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS app_state (
  workspace_id TEXT PRIMARY KEY,
  state_json TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS sync_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  device_id TEXT,
  event_type TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_events_workspace_revision
  ON sync_events (workspace_id, revision DESC);

CREATE INDEX IF NOT EXISTS idx_sync_events_created_at
  ON sync_events (created_at DESC);
