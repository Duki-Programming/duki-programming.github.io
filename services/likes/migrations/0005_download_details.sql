-- Preserve historical unknown values; record metadata only for future downloads.
ALTER TABLE platform_votes ADD COLUMN source_ip TEXT;
ALTER TABLE platform_votes ADD COLUMN downloaded_at TEXT;
ALTER TABLE downloads ADD COLUMN source_ip TEXT;
ALTER TABLE downloads ADD COLUMN downloaded_at TEXT;
