-- KatelyaTV-CF: 重建记录类表，使其与 src/lib/d1.db.ts 的 SQL 匹配
-- 背景：线上这四张表曾用 user_id/record_key 结构初始化，而代码按 username/key 查询，
-- 导致 /api/playrecords、/api/favorites、/api/searchhistory、/api/skip-configs 返回 500。
-- 四表在修复时均为空（0 行），重建无数据丢失。
PRAGMA foreign_keys=OFF;

DROP TABLE IF EXISTS play_records;
CREATE TABLE play_records (
  username TEXT NOT NULL,
  key TEXT NOT NULL,
  title TEXT,
  source_name TEXT,
  cover TEXT,
  year TEXT,
  index_episode INTEGER,
  total_episodes INTEGER,
  play_time REAL,
  total_time REAL,
  save_time INTEGER,
  search_title TEXT,
  PRIMARY KEY (username, key)
);

DROP TABLE IF EXISTS favorites;
CREATE TABLE favorites (
  username TEXT NOT NULL,
  key TEXT NOT NULL,
  title TEXT,
  source_name TEXT,
  cover TEXT,
  year TEXT,
  total_episodes INTEGER,
  save_time INTEGER,
  search_title TEXT,
  PRIMARY KEY (username, key)
);

DROP TABLE IF EXISTS search_history;
CREATE TABLE search_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  keyword TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS skip_configs;
CREATE TABLE skip_configs (
  username TEXT NOT NULL,
  key TEXT NOT NULL,
  source TEXT,
  video_id TEXT,
  title TEXT,
  segments TEXT,
  updated_time INTEGER,
  PRIMARY KEY (username, key)
);

CREATE INDEX IF NOT EXISTS idx_play_records_username ON play_records(username);
CREATE INDEX IF NOT EXISTS idx_favorites_username ON favorites(username);
CREATE INDEX IF NOT EXISTS idx_search_history_username ON search_history(username);
CREATE INDEX IF NOT EXISTS idx_skip_configs_username ON skip_configs(username);

PRAGMA foreign_keys=ON;
