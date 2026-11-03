-- Oulipo: reservations carry the language they hobble. Locale is stamped
-- at reservation time from the member's UI language (writings.locale is
-- unreliable — saveDraft never set it, so it is NULL on human writings).
ALTER TABLE bq_keyword_proposals ADD COLUMN locale TEXT;
UPDATE bq_keyword_proposals
SET locale = COALESCE((SELECT locale FROM writings WHERE writings.id = bq_keyword_proposals.source_writing_id), 'es');
