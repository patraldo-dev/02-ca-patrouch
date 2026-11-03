-- Projects v1: group writings into ordered serials/collections.
-- Strictly scoped — no covers, compile, co-writing or export (those wait
-- for demand). First customer: Sappho's constrained weekly serial
-- ('La palabra prohibida', sappho-serial-01).

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  locale TEXT DEFAULT 'es',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS project_follows (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE (project_id, user_id)
);

ALTER TABLE writings ADD COLUMN project_id TEXT;
ALTER TABLE writings ADD COLUMN project_order INTEGER;

-- Sappho's serial (Oulipo scoreboard: every reserved word vanishes from
-- the story world, cumulatively, week by week).
INSERT OR IGNORE INTO projects (id, user_id, title, description, locale) VALUES (
  'sappho-serial-01',
  'sappho-agent-001',
  'La palabra prohibida',
  'Serie semanal de Sappho. Cada palabra que la comunidad reserva es otra cuerda alrededor de Gulliver — y en el pueblo de la historia, esa palabra desaparece.',
  'es'
);
