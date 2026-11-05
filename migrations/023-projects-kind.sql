-- Serials vs collections: one column distinguishes them. Serials keep
-- project_order + prev/next navigation; collections are unordered
-- thematic groups (listed by date, no part numbers). Existing projects
-- default to 'serial' — Sappho's serial and any v1 data unchanged.
ALTER TABLE projects ADD COLUMN kind TEXT DEFAULT 'serial';
UPDATE projects SET kind = 'serial' WHERE kind IS NULL;
