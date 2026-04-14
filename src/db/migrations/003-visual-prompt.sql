-- Add visual prompt data to writings
ALTER TABLE writings ADD COLUMN visual_prompt_text TEXT;
ALTER TABLE writings ADD COLUMN visual_artwork_url TEXT;
