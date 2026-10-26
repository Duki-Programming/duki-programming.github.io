-- One public vote per IP across manual likes, both platforms, and older pages.
CREATE TABLE supporters (ip_hash TEXT PRIMARY KEY NOT NULL) WITHOUT ROWID;
INSERT INTO supporters (ip_hash)
SELECT ip_hash FROM platform_votes UNION SELECT ip_hash FROM likes UNION SELECT ip_hash FROM downloads;

CREATE TABLE support_total (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0)
);
INSERT INTO support_total (id, count) SELECT 1, COUNT(*) FROM supporters;
CREATE TRIGGER supporter_added AFTER INSERT ON supporters BEGIN
  UPDATE support_total SET count = count + 1 WHERE id = 1;
END;
CREATE TRIGGER supporter_removed AFTER DELETE ON supporters BEGIN
  UPDATE support_total SET count = count - 1 WHERE id = 1;
END;
CREATE TRIGGER platform_support_added AFTER INSERT ON platform_votes BEGIN
  INSERT OR IGNORE INTO supporters (ip_hash) VALUES (NEW.ip_hash);
END;
CREATE TRIGGER legacy_download_support_added AFTER INSERT ON downloads BEGIN
  INSERT OR IGNORE INTO supporters (ip_hash) VALUES (NEW.ip_hash);
END;
CREATE TRIGGER legacy_like_support_added AFTER INSERT ON likes BEGIN
  INSERT OR IGNORE INTO supporters (ip_hash) VALUES (NEW.ip_hash);
END;
