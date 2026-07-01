# Portal ID Migration Record
# Executed 2026-07-01 — all layers aligned

## Canonical IDs (current, all kebab-case)

| Canonical ID          | Environment   | Status        |
|-----------------------|---------------|---------------|
| arboleda              | forest        | unchanged     |
| fiesta                | celebration   | unchanged     |
| oceano                | ocean         | unchanged     |
| narrador              | theater       | unchanged     |
| cosmos                | space         | renamed       |
| urbano                | city          | unchanged     |
| suenos                | dream         | renamed       |
| nostalgias            | memory        | renamed       |
| passage-to-the-past   | memory        | renamed+new   |
| spectral-dreams       | dream         | renamed+new   |
| mysterious-market     | city          | renamed+new   |

## Legacy Aliases (do not use in new code)

| Legacy D1 ID                  | Canonical ID          | Notes                          |
|-------------------------------|-----------------------|--------------------------------|
| espacio                       | cosmos                | renamed in D1                  |
| fantasia                      | suenos                | renamed in D1                  |
| nostalgic-voyage-portal       | nostalgias            | renamed in D1                  |
| passage_to_the_past           | passage-to-the-past   | underscore → kebab             |
| nostalgias-espirituales       | spectral-dreams       | renamed in D1                  |
| mercado-misterioso            | mysterious-market     | renamed in D1                  |

## Naming Rules

1. All canonical portal IDs are lowercase kebab-case.
2. Static filename = D1 portal ID = portal_link target = route key.
3. Legacy IDs are aliases only — not used in new code or configs.
4. New portals must follow kebab-case and get a static config before D1 entry.

## Verification

All three layers verified aligned on 2026-07-01:
- `static/scenes/*.json` — 11 files, all canonical IDs
- D1 `portals.id` — 11 rows, all canonical IDs
- D1 `portal_scenes.portal_id` — 11 rows, all canonical IDs
