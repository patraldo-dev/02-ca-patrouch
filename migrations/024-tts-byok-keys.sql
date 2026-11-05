-- BYOK text-to-speech: per-user encrypted keys for the new engines.
-- Same XOR-envelope scheme as the existing elevenlabs/deepinfra columns
-- (see api/tts/*-api-key routes). Applied directly to both live DBs.
ALTER TABLE users ADD COLUMN cartesia_key_encrypted TEXT;
ALTER TABLE users ADD COLUMN gemini_key_encrypted TEXT;
ALTER TABLE users ADD COLUMN openai_key_encrypted TEXT;
