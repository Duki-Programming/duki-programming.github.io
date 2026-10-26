CREATE TABLE platform_votes (
  platform TEXT NOT NULL CHECK (platform IN ('windows', 'macos')),
  ip_hash TEXT NOT NULL,
  downloaded INTEGER NOT NULL DEFAULT 0 CHECK (downloaded IN (0, 1)),
  PRIMARY KEY (platform, ip_hash)
) WITHOUT ROWID;

CREATE TABLE platform_totals (
  platform TEXT PRIMARY KEY CHECK (platform IN ('windows', 'macos')),
  likes INTEGER NOT NULL DEFAULT 0 CHECK (likes >= 0),
  downloads INTEGER NOT NULL DEFAULT 0 CHECK (downloads >= 0)
) WITHOUT ROWID;

INSERT INTO platform_totals (platform) VALUES ('windows'), ('macos');

CREATE TRIGGER platform_vote_added AFTER INSERT ON platform_votes
BEGIN
  UPDATE platform_totals SET likes = likes + 1, downloads = downloads + NEW.downloaded WHERE platform = NEW.platform;
END;

CREATE TRIGGER platform_download_added AFTER UPDATE OF downloaded ON platform_votes
WHEN OLD.downloaded = 0 AND NEW.downloaded = 1
BEGIN
  UPDATE platform_totals SET downloads = downloads + 1 WHERE platform = NEW.platform;
END;

CREATE TRIGGER platform_vote_removed AFTER DELETE ON platform_votes
BEGIN
  UPDATE platform_totals SET likes = likes - 1, downloads = downloads - OLD.downloaded WHERE platform = OLD.platform;
END;
