CREATE TABLE totals (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0)
);

INSERT INTO totals (id, count) SELECT 1, COUNT(*) FROM likes;

CREATE TRIGGER like_added AFTER INSERT ON likes
BEGIN
  UPDATE totals SET count = count + 1 WHERE id = 1;
END;

CREATE TRIGGER like_removed AFTER DELETE ON likes
BEGIN
  UPDATE totals SET count = count - 1 WHERE id = 1;
END;
